/**
 * Adapter layer bridging the real relational API (/api/v2) to the
 * investigation-workspace UI types.
 *
 * The existing Zustand store and components consume the deterministic
 * ``Investigation*`` shapes from ``@trinetra-pulse/types`` (Phase 9 mock
 * model). When the platform is pointed at a running backend
 * (``NEXT_PUBLIC_USE_MOCK_API=false``), the workspace must read from and
 * write to the real relational API. The relational model is intentionally
 * leaner than the rich UI model, so this module:
 *
 *   - fetches the investigation plus each nested resource in parallel,
 *   - maps relational responses into ``Investigation*`` shapes the UI
 *     already understands (filling UI-only provenance fields with
 *     deterministic defaults), and
 *   - maps UI mutations back into the relational request bodies.
 *
 * This keeps the UI unchanged whether it is backed by mock data or the
 * live API (see ``lib/api/config.ts``).
 */

import type {
  Investigation,
  InvestigationAnalyticsSnapshot,
  InvestigationEntity,
  InvestigationEvidence,
  InvestigationFinding,
  InvestigationMember,
  InvestigationNetwork,
  InvestigationNote,
  InvestigationRelationship,
  InvestigationTimelineItem,
  InvestigationUpdate,
  InvestigationActivityEntry,
} from '@trinetra-pulse/types';
import {
  createEntityForInvestigation,
  createFindingForInvestigation,
  createNoteForInvestigation,
  getInvestigation,
  getInvestigationSummary,
  getNetworkAnalytics,
  getNetworkGraph,
  getTimeline,
  listEntitiesForInvestigation,
  listEvidenceForInvestigation,
  listEventsForInvestigation,
  listFindingsForInvestigation,
  listNotesForInvestigation,
  listRelationshipsForInvestigation,
  updateInvestigation,
  type RealEntity,
  type RealEvidence,
  type RealFinding,
  type RealInvestigation,
  type RealInvestigationSummary,
  type RealNote,
  type RealRelationship,
} from './investigations';
import type { FindingConfidenceLevel } from '@trinetra-pulse/types';

// -------------------------------------------------------------------
// Identity / provenance defaults
// -------------------------------------------------------------------
// The relational model does not carry the rich UI provenance fields
// (linkedBy, linkedAt, role, association_confidence). We derive them from
// the closest relational field or fill deterministic defaults so the UI
// never renders blank provenance.
// -------------------------------------------------------------------

const DEFAULT_LINKED_BY = 'Inspector Mehta';
const DEFAULT_ROLE = 'Linked entity';

const toIso = (value: string | null | undefined): string =>
  value ? new Date(value).toISOString() : new Date().toISOString();

const confidenceToFinding = (value: string | null | undefined): FindingConfidenceLevel => {
  const v = (value ?? '').toUpperCase();
  if (v === 'OBSERVED' || v === 'HIGH') return 'high';
  if (v === 'INFERRED' || v === 'MEDIUM') return 'medium';
  return 'low';
};

// -------------------------------------------------------------------
// Top-level Investigation
// -------------------------------------------------------------------

export function mapInvestigation(
  inv: RealInvestigation,
  summary: RealInvestigationSummary | null,
): Investigation {
  return {
    id: inv.id,
    title: inv.title,
    description: inv.description,
    status: (inv.status as Investigation['status']) ?? 'draft',
    priority: (inv.priority as Investigation['priority']) ?? 'normal',
    lead_investigator: inv.lead_investigator ?? 'Unassigned',
    assigned: inv.assigned_team ?? [],
    tags: inv.tags ?? [],
    case_id: (inv.metadata?.case_id as string | null) ?? null,
    entity_count: summary?.entity_count ?? 0,
    evidence_count: summary?.evidence_count ?? 0,
    relationship_count: summary?.relationship_count ?? 0,
    finding_count: summary?.finding_count ?? 0,
    event_count: summary?.event_count ?? 0,
    created_at: toIso(inv.created_at),
    updated_at: toIso(inv.updated_at),
    last_activity_at: toIso(inv.updated_at),
  };
}

export function mapInvestigationList(
  items: RealInvestigation[],
): Investigation[] {
  return items.map((inv) => mapInvestigation(inv, null));
}

export function mapUpdateToReal(
  patch: InvestigationUpdate,
): Record<string, unknown> {
  return {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.lead_investigator !== undefined
      ? { lead_investigator: patch.lead_investigator }
      : {}),
    ...(patch.assigned !== undefined ? { assigned_team: patch.assigned } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
  };
}

// -------------------------------------------------------------------
// Entities
// -------------------------------------------------------------------

export function mapEntity(entity: RealEntity): InvestigationEntity {
  const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
  return {
    id: entity.id,
    investigation_id: entity.investigation_id,
    entity_id: entity.id,
    name: entity.name,
    entity_type: entity.entity_type as InvestigationEntity['entity_type'],
    association_confidence: entity.confidence,
    role: typeof attrs.role === 'string' ? attrs.role : DEFAULT_ROLE,
    linked_by:
      typeof attrs.linked_by === 'string' ? attrs.linked_by : DEFAULT_LINKED_BY,
    linked_at: toIso(entity.created_at),
    metadata: entity.metadata ?? {},
  };
}

// -------------------------------------------------------------------
// Relationships (names resolved from the loaded entity set)
// -------------------------------------------------------------------

export function mapRelationships(
  relationships: RealRelationship[],
  entities: Map<string, InvestigationEntity>,
): InvestigationRelationship[] {
  return relationships.map((rel) => {
    const source = entities.get(rel.source_entity_id);
    const target = entities.get(rel.target_entity_id);
    return {
      id: rel.id,
      investigation_id: rel.investigation_id,
      relationship_id: rel.id,
      source_entity_id: rel.source_entity_id,
      target_entity_id: rel.target_entity_id,
      source_entity_name: source?.name ?? rel.source_entity_id,
      target_entity_name: target?.name ?? rel.target_entity_id,
      type: rel.relationship_type as InvestigationRelationship['type'],
      confidence: rel.confidence,
      note: rel.description ?? undefined,
      linked_by: DEFAULT_LINKED_BY,
      linked_at: toIso(rel.created_at),
    };
  });
}

// -------------------------------------------------------------------
// Evidence
// -------------------------------------------------------------------

export function mapEvidence(evidence: RealEvidence): InvestigationEvidence {
  return {
    id: evidence.id,
    investigation_id: evidence.investigation_id,
    evidence_id: evidence.id,
    title: evidence.title,
    evidence_type: evidence.evidence_type as InvestigationEvidence['evidence_type'],
    summary: evidence.description ?? '',
    linked_by: evidence.source ?? DEFAULT_LINKED_BY,
    linked_at: toIso(evidence.collected_at ?? evidence.created_at),
    metadata: evidence.metadata ?? {},
  };
}

// -------------------------------------------------------------------
// Findings
// -------------------------------------------------------------------

export function mapFinding(finding: RealFinding): InvestigationFinding {
  return {
    id: finding.id,
    investigation_id: finding.investigation_id,
    title: finding.title,
    description: finding.description ?? '',
    category: (finding.severity ?? 'info').toLowerCase(),
    confidence: confidenceToFinding(finding.confidence),
    source: 'Relational analysis',
    source_type: 'analysis',
    created_by: DEFAULT_LINKED_BY,
    created_at: toIso(finding.created_at),
    updated_at: toIso(finding.updated_at),
    entity_ids: finding.entity_refs ?? [],
    evidence_ids: [],
    tags: (finding.metadata?.tags as string[]) ?? [],
  };
}

// -------------------------------------------------------------------
// Notes
// -------------------------------------------------------------------

export function mapNote(note: RealNote): InvestigationNote {
  return {
    id: note.id,
    investigation_id: note.investigation_id,
    author: note.author,
    body: note.content,
    category: (note.metadata?.category as string | null) ?? null,
    created_at: toIso(note.created_at),
    updated_at: toIso(note.updated_at),
  };
}

// -------------------------------------------------------------------
// Timeline / activity / members / networks / analytics
// -------------------------------------------------------------------

export function mapTimeline(
  entries: Array<{
    kind: string;
    at: string | null;
    title: string | null;
    ref_id: string | null;
    actor: string | null;
    description: string | null;
  }>,
  investigationId: string,
): InvestigationTimelineItem[] {
  // The API timeline is a merged feed (event / note / finding / evidence),
  // but the investigation workspace renders findings from its dedicated
  // findings slice (InvestigationFinding), which the unified timeline tab
  // merges separately. Mock timeline arrays never contain finding entries,
  // so dropping them here keeps API mode identical to mock mode and
  // prevents findings from being listed twice in the timeline UI.
  const source = entries.filter((e) => e.kind !== 'finding');
  return source.map((e, idx) => ({
    id: `tl-${e.ref_id ?? idx}`,
    investigation_id: investigationId,
    timestamp: toIso(e.at),
    category: (e.kind as InvestigationTimelineItem['category']) ?? 'system',
    title: e.title ?? 'Event',
    description: e.description ?? null,
    ref_id: e.ref_id,
    ref_type: e.kind ?? null,
    actor: e.actor ?? null,
  }));
}

export function mapAnalyticsSnapshots(
  overview: {
    investigation_id: string;
    entity_count: number;
    relationship_count: number;
    connected_components: number;
  },
  networkId: string,
): InvestigationAnalyticsSnapshot[] {
  if (!networkId) return [];
  return [
    {
      id: `anas-${networkId}`,
      investigation_id: overview.investigation_id,
      network_id: networkId,
      label: 'Opening snapshot',
      captured_at: toIso(new Date().toISOString()),
      analytics_bundle_id: null,
      summary: {
        nodes: overview.entity_count,
        relationships: overview.relationship_count,
        connectedComponents: overview.connected_components,
        communityCount: overview.connected_components,
        topConnectedEntity: null,
      },
    },
  ];
}

// -------------------------------------------------------------------
// Orchestrated load of a full investigation workspace from the API
// -------------------------------------------------------------------

export interface MappedWorkspace {
  investigation: Investigation | null;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  evidence: InvestigationEvidence[];
  findings: InvestigationFinding[];
  notes: InvestigationNote[];
  timeline: InvestigationTimelineItem[];
  activity: InvestigationActivityEntry[];
  members: InvestigationMember[];
  networks: InvestigationNetwork[];
  analyticsSnapshots: InvestigationAnalyticsSnapshot[];
}

export async function loadInvestigationWorkspace(
  id: string,
): Promise<MappedWorkspace> {
  const [inv, summary, entities, relationships, evidence, findings, notes, timeline, graph, analytics, events] =
    await Promise.all([
      getInvestigation(id).catch(() => null),
      getInvestigationSummary(id).catch(() => null),
      listEntitiesForInvestigation(id).catch(() => [] as RealEntity[]),
      listRelationshipsForInvestigation(id).catch(() => [] as RealRelationship[]),
      listEvidenceForInvestigation(id).catch(() => [] as RealEvidence[]),
      listFindingsForInvestigation(id).catch(() => [] as RealFinding[]),
      listNotesForInvestigation(id).catch(() => [] as RealNote[]),
      getTimeline(id).catch(() => null),
      getNetworkGraph(id).catch(() => null),
      getNetworkAnalytics(id).catch(() => null),
      listEventsForInvestigation(id).catch(() => []),
    ]);

  if (!inv) {
    throw new Error('Could not load investigation');
  }

  const mappedEntities = entities.map(mapEntity);
  const entityMap = new Map(mappedEntities.map((e) => [e.entity_id, e]));
  const mappedRelationships = mapRelationships(relationships, entityMap);
  const mappedEvidence = evidence.map(mapEvidence);
  const mappedFindings = findings.map(mapFinding);
  const mappedNotes = notes.map(mapNote);

  const networkId = graph?.nodes?.length ? id : '';
  const snapshotData = analytics
    ? {
        investigation_id: id,
        entity_count: analytics.entity_count ?? 0,
        relationship_count: analytics.relationship_count ?? 0,
        connected_components: analytics.connected_components ?? 0,
      }
    : { investigation_id: id, entity_count: 0, relationship_count: 0, connected_components: 0 };
  const mappedAnalytics = mapAnalyticsSnapshots(snapshotData, networkId);

  // Activity feed: build a minimal, deterministic record from loaded data
  const activity: InvestigationActivityEntry[] = [
    {
      id: `act-${id}-created`,
      investigation_id: id,
      type: 'created',
      title: 'Investigation created',
      detail: inv.description,
      actor: inv.lead_investigator ?? DEFAULT_LINKED_BY,
      at: toIso(inv.created_at),
    },
  ];

  const members: InvestigationMember[] = inv.lead_investigator
    ? [
        {
          id: `mem-${id}-lead`,
          investigation_id: id,
          user_id: inv.lead_investigator,
          name: inv.lead_investigator,
          role: 'Lead',
          added_at: toIso(inv.created_at),
        },
      ]
    : [];

  const networks: InvestigationNetwork[] = networkId
    ? [
        {
          id: `net-${id}`,
          investigation_id: id,
          network_id: networkId,
          name: 'Investigation network',
          linked_by: DEFAULT_LINKED_BY,
          linked_at: toIso(inv.updated_at),
        },
      ]
    : [];

  void events;

  return {
    investigation: mapInvestigation(inv, summary),
    entities: mappedEntities,
    relationships: mappedRelationships,
    evidence: mappedEvidence,
    findings: mappedFindings,
    notes: mappedNotes,
    timeline: mapTimeline(timeline?.entries ?? [], id),
    activity,
    members,
    networks,
    analyticsSnapshots: mappedAnalytics,
  };
}

// -------------------------------------------------------------------
// Mutations (UI -> relational API -> refreshed UI shape)
// -------------------------------------------------------------------

export async function persistInvestigationUpdate(
  id: string,
  patch: InvestigationUpdate,
): Promise<Investigation> {
  const result = await updateInvestigation(id, mapUpdateToReal(patch));
  return mapInvestigation(result, null);
}

export async function persistEntityLink(
  entity: InvestigationEntity,
): Promise<InvestigationEntity> {
  const created = await createEntityForInvestigation({
    investigation_id: entity.investigation_id,
    entity_type: entity.entity_type,
    name: entity.name,
    description: `Linked as ${entity.role}`,
    attributes: {
      role: entity.role,
      linked_by: entity.linked_by,
      linked_at: entity.linked_at,
      association_confidence: entity.association_confidence,
      is_linked: true,
    },
    confidence: entity.association_confidence,
  });
  return mapEntity(created);
}

export async function persistFindingCreate(
  investigationId: string,
  input: {
    title: string;
    description: string;
    category: string;
    confidence: FindingConfidenceLevel;
    created_by: string;
    entity_ids?: string[];
  },
): Promise<InvestigationFinding> {
  const created = await createFindingForInvestigation({
    investigation_id: investigationId,
    title: input.title,
    description: input.description,
    severity: input.category.toUpperCase(),
    confidence: input.confidence === 'high' ? 'OBSERVED' : input.confidence === 'medium' ? 'INFERRED' : 'INFERRED',
    status: 'OPEN',
    entity_refs: input.entity_ids ?? [],
    metadata: { source_type: 'manual', created_by: input.created_by },
  });
  return mapFinding(created);
}

export async function persistNoteCreate(
  investigationId: string,
  input: { author: string; body: string; category?: string | null },
): Promise<InvestigationNote> {
  const created = await createNoteForInvestigation({
    investigation_id: investigationId,
    content: input.body,
    author: input.author,
    metadata: { category: input.category ?? null },
  });
  return mapNote(created);
}
