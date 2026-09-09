import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Investigation,
  InvestigationUpdate,
  InvestigationEntity,
  InvestigationRelationship,
  InvestigationEvidence,
  InvestigationEvent,
  InvestigationFinding,
  InvestigationNote,
  InvestigationTimelineItem,
  InvestigationActivityEntry,
  InvestigationMember,
  InvestigationNetwork,
  InvestigationAnalyticsSnapshot,
} from '@trinetra-pulse/types';
import {
  getInvestigation,
  getInvestigationEntities,
  getInvestigationRelationships,
  getInvestigationEvidence,
  getInvestigationFindings,
  getInvestigationNotes,
  getInvestigationTimeline,
  getInvestigationEvents,
  getInvestigationActivity,
  getInvestigationMembers,
  getInvestigationNetworks,
  getInvestigationAnalyticsSnapshots,
  updateInvestigation,
  addEntityToInvestigation,
  removeEntityFromInvestigation,
  addEvidenceToInvestigation,
  removeEvidenceFromInvestigation,
  createFinding,
  updateFinding,
  createNote,
  updateNote,
  deleteNote,
  type AddEvidenceInput,
  type CreateFindingInput,
} from '@/services/investigation.service';
import { isMockData } from '@/lib/api/config';
import {
  loadInvestigationWorkspace,
  persistInvestigationUpdate,
  persistEntityLink,
  persistFindingCreate,
  persistNoteCreate,
} from '@/lib/api/adapter';

// ============================================================
// INVESTIGATION STORE (Phase 9)
// ============================================================
// Owns the detail state of the open investigation workspace plus a
// workspace-level pending-changes (dirty) flag. Linking/removing
// entities & evidence and editing findings & notes mark the
// workspace dirty; the workspace warns before leaving. Comparable
// server round-trips are simulated by the (mock-backed) service.
// ============================================================

export interface InvestigationWorkspaceData {
  investigation: Investigation | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  evidence: InvestigationEvidence[];
  findings: InvestigationFinding[];
  notes: InvestigationNote[];
  /** Canonical events persisted for the investigation (Phase 29). The
   *  timeline feed references these rows by id for the event inspector. */
  events: InvestigationEvent[];
  timeline: InvestigationTimelineItem[];
  activity: InvestigationActivityEntry[];
  members: InvestigationMember[];
  networks: InvestigationNetwork[];
  analyticsSnapshots: InvestigationAnalyticsSnapshot[];
}

interface InvestigationState {
  investigationId: string | null;
  data: InvestigationWorkspaceData;
  loading: boolean;
  error: string | null;

  /** Workspace has unsaved changes (guard before leaving). */
  dirty: boolean;

  loadInvestigation: (id: string) => Promise<void>;
  /** Seed just the active investigation id (used for deep links /
   *  cross-module navigation) without loading the workspace data. */
  seedInvestigation: (id: string | null) => void;
  clear: () => void;

  updateInvestigationMeta: (patch: InvestigationUpdate) => void;

  linkEntity: (input: {
    entity_id: string;
    name: string;
    entity_type: InvestigationEntity['entity_type'];
    role: string;
    association_confidence: number;
    linked_by: string;
  }) => void;
  unlinkEntity: (refId: string) => void;

  linkEvidence: (input: AddEvidenceInput & { isMock: boolean }) => void;
  unlinkEvidence: (refId: string) => void;

  addFinding: (input: CreateFindingInput) => void;
  editFinding: (
    id: string,
    patch: Partial<Pick<InvestigationFinding, 'title' | 'description' | 'category' | 'confidence' | 'tags'>>
  ) => void;

  addNote: (input: { author: string; body: string; category?: string | null }) => void;
  editNote: (id: string, patch: { body?: string; category?: string | null }) => void;
  removeNote: (id: string) => void;

  setDirty: (v: boolean) => void;
}

const emptyData = (): InvestigationWorkspaceData => ({
  investigation: null,
  entities: [],
  relationships: [],
  evidence: [],
  findings: [],
  notes: [],
  events: [],
  timeline: [],
  activity: [],
  members: [],
  networks: [],
  analyticsSnapshots: [],
});

export const useInvestigationStore = create<InvestigationState>()(
  devtools(
    (set, get) => ({
      investigationId: null,
      data: emptyData(),
      loading: false,
      error: null,
      dirty: false,

      loadInvestigation: async (id) => {
        set({ loading: true, error: null, investigationId: id, dirty: false });
        try {
          let data: Omit<InvestigationWorkspaceData, never>;

          if (isMockData()) {
            const [
              investigation,
              entities,
              relationships,
              evidence,
              findings,
              notes,
              timeline,
              events,
              activity,
              members,
              networks,
              analyticsSnapshots,
            ] = await Promise.all([
              getInvestigation(id),
              getInvestigationEntities(id),
              getInvestigationRelationships(id),
              getInvestigationEvidence(id),
              getInvestigationFindings(id),
              getInvestigationNotes(id),
              getInvestigationTimeline(id),
              getInvestigationEvents(id),
              getInvestigationActivity(id),
              getInvestigationMembers(id),
              getInvestigationNetworks(id),
              getInvestigationAnalyticsSnapshots(id),
            ]);
            data = {
              investigation,
              entities,
              relationships,
              evidence,
              findings,
              notes,
              events,
              timeline,
              activity,
              members,
              networks,
              analyticsSnapshots,
            };
          } else {
            data = await loadInvestigationWorkspace(id);
          }

          set({ loading: false, data });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Could not load investigation',
          });
        }
      },

      clear: () =>
        set({ investigationId: null, data: emptyData(), loading: false, error: null, dirty: false }),

      seedInvestigation: (id) => {
        if (id === get().investigationId) return;
        set({
          investigationId: id,
          ...(id === null ? { data: emptyData(), error: null } : {}),
        });
      },

      updateInvestigationMeta: (patch) => {
        const inv = get().data.investigation;
        if (!inv) return;
        set({
          dirty: true,
          data: { ...get().data, investigation: { ...inv, ...patch } },
        });
        if (isMockData()) {
          void updateInvestigation(inv.id, patch);
        } else {
          void persistInvestigationUpdate(inv.id, patch);
        }
      },

      linkEntity: (input) => {
        const { investigationId: id, data } = get();
        if (!id) return;
        const linked = {
          id: `inev-${id}-${data.entities.length + 1}`,
          investigation_id: id,
          entity_id: input.entity_id,
          name: input.name,
          entity_type: input.entity_type,
          association_confidence: input.association_confidence,
          role: input.role,
          linked_by: input.linked_by,
          linked_at: new Date().toISOString(),
          metadata: {},
        };
        set({
          dirty: true,
          data: {
            ...data,
            entities: [linked, ...data.entities],
            investigation: data.investigation
              ? { ...data.investigation, entity_count: data.entities.length + 1 }
              : data.investigation,
          },
        });
        if (isMockData()) {
          void addEntityToInvestigation(id, linked);
        } else {
          void persistEntityLink(linked);
        }
      },

      unlinkEntity: (refId) => {
        const { investigationId: id, data } = get();
        if (!id) return;
        set({
          dirty: true,
          data: {
            ...data,
            entities: data.entities.filter((e) => e.id !== refId),
            investigation: data.investigation
              ? { ...data.investigation, entity_count: Math.max(0, data.entities.length - 1) }
              : data.investigation,
          },
        });
        if (isMockData()) {
          void removeEntityFromInvestigation(id, refId);
        }
      },

      linkEvidence: (input) => {
        const { investigationId: id, data } = get();
        if (!id) return;
        set({
          dirty: true,
          data: {
            ...data,
            // optimistic placeholder; service assigns the real id
            evidence: [
              {
                id: `optimistic-${Date.now()}`,
                investigation_id: id,
                evidence_id: input.evidence_id,
                title: input.title,
                evidence_type: input.evidence_type,
                summary: input.summary,
                linked_by: input.linked_by,
                linked_at: new Date().toISOString(),
                collected_at: null,
                metadata: { is_mock: input.isMock },
              },
              ...data.evidence,
            ],
            investigation: data.investigation
              ? { ...data.investigation, evidence_count: data.evidence.length + 1 }
              : data.investigation,
          },
        });
        if (isMockData()) {
          void addEvidenceToInvestigation(id, input, input.isMock);
        }
      },

      unlinkEvidence: (refId) => {
        const { investigationId: id, data } = get();
        if (!id) return;
        set({
          dirty: true,
          data: {
            ...data,
            evidence: data.evidence.filter((e) => e.id !== refId),
            investigation: data.investigation
              ? { ...data.investigation, evidence_count: Math.max(0, data.evidence.length - 1) }
              : data.investigation,
          },
        });
        if (isMockData()) {
          void removeEvidenceFromInvestigation(id, refId);
        }
      },

      addFinding: (input) => {
        const { investigationId: id, data } = get();
        if (!id) return;
        const findingId = `optimistic-f-${Date.now()}`;
        set({
          dirty: true,
          data: {
            ...data,
            findings: [
              {
                id: findingId,
                investigation_id: id,
                title: input.title,
                description: input.description,
                category: input.category,
                confidence: input.confidence,
                source: input.created_by,
                source_type: 'manual',
                created_by: input.created_by,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                entity_ids: input.entity_ids ?? [],
                evidence_ids: input.evidence_ids ?? [],
                tags: input.tags ?? [],
              },
              ...data.findings,
            ],
          },
        });
        if (isMockData()) {
          void createFinding(id, { ...input, id: findingId });
        } else {
          void persistFindingCreate(id, input);
        }
      },

      editFinding: (id, patch) => {
        const { investigationId: iid, data } = get();
        if (!iid) return;
        set({
          dirty: true,
          data: {
            ...data,
            findings: data.findings.map((f) =>
              f.id === id ? { ...f, ...patch, updated_at: new Date().toISOString() } : f
            ),
          },
        });
        if (isMockData()) {
          void updateFinding(iid, id, patch);
        }
      },

      addNote: (input) => {
        const { investigationId: id, data } = get();
        if (!id) return;
        const noteId = `optimistic-n-${Date.now()}`;
        set({
          dirty: true,
          data: {
            ...data,
            notes: [
              {
                id: noteId,
                investigation_id: id,
                author: input.author,
                body: input.body,
                category: input.category ?? null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...data.notes,
            ],
          },
        });
        if (isMockData()) {
          void createNote(id, { ...input, id: noteId });
        } else {
          void persistNoteCreate(id, input);
        }
      },

      editNote: (id, patch) => {
        const { investigationId: iid, data } = get();
        if (!iid) return;
        set({
          dirty: true,
          data: {
            ...data,
            notes: data.notes.map((n) =>
              n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n
            ),
          },
        });
        if (isMockData()) {
          void updateNote(iid, id, patch);
        }
      },

      removeNote: (id) => {
        const { investigationId: iid, data } = get();
        if (!iid) return;
        set({
          dirty: true,
          data: { ...data, notes: data.notes.filter((n) => n.id !== id) },
        });
        if (isMockData()) {
          void deleteNote(iid, id);
        }
      },

      setDirty: (v) => set({ dirty: v }),
    }),
    { name: 'trinetra-investigation' }
  )
);
