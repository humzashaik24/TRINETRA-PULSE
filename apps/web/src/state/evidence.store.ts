import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  EvidenceItem,
  EvidenceSearchResult,
  EvidenceSearchParams,
  EvidenceSearchFilters,
  EvidenceSource,
  EvidenceCoverage,
  EvidenceCollection,
  RelationshipEvidenceSupport,
  FindingEvidenceSupport,
  EventEvidenceSupport,
  EntityEvidenceSummary,
  EvidenceType,
  EvidenceStatus,
  EvidenceAnalysis,
  EvidenceChainEntry,
  EvidenceChainVerification,
} from '@trinetra-pulse/types';
import * as evidenceService from '@/services/evidence.service';
import { isMockData } from '@/lib/api/config';
import {
  analyzeEvidence,
  getEvidenceAnalyses,
  getEvidenceById,
  getEvidenceChain,
  getEvidenceChainVerification,
  loadEvidenceSearch,
  mapEvidenceItem,
  recordEvidenceChainVerification,
  submitLocalTranscription,
} from '@/lib/api/evidence';
import {
  detectLocalWhisperCapability,
  runLocalWhisper,
} from '@/lib/whisper/local-whisper';
import type { LocalWhisperModelId } from '@trinetra-pulse/types';

// ============================================================
// EVIDENCE STORE (Phase 12 / 17.6)
// ============================================================
// Investigation-scoped evidence intelligence state.
// Supports selection, search, filters, pagination and sort.
// Clears on investigation switch.
//
// Phase 17.6 — the data source branches on ``isMockData()`` exactly like the
// investigation store: mock mode keeps the deterministic in-memory universe,
// API mode reads the persisted /api/v2 evidence rows. There is NO silent
// fallback — an API failure surfaces as the store error state, never as
// fabricated demo rows.
//
// Coverage / support / collections have no relational endpoints yet (the
// evidence↔entity/finding/event link model is a Phase 17.7 boundary), so in
// API mode those slices stay empty while list + detail + integrity are fully
// persisted.
//
// Phase 18.2 — the custody chain slice is relational-only. There is NO mock
// chain (fabricating hashes for demo rows would be dishonest), so in mock mode
// ``chainAvailable`` stays ``false`` and the panel explains that chains exist
// when connected to the backend.
// ============================================================

export type LocalTranscriptionStage =
  | 'idle'
  | 'unsupported'
  | 'downloading'
  | 'transcribing'
  | 'submitting'
  | 'succeeded'
  | 'failed';

export interface EvidenceState {
  // --- Investigation scope ---
  investigationId: string | null;
  setInvestigationId: (id: string | null) => void;

  // --- Evidence items ---
  items: EvidenceSource[];
  selectedItem: EvidenceItem | null;
  selectedItemId: string | null;
  loading: boolean;
  error: string | null;

  // --- Search / filter ---
  searchQuery: string;
  filters: EvidenceSearchFilters;
  sortBy: EvidenceSearchParams['sortBy'];
  sortOrder: EvidenceSearchParams['sortOrder'];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  facets: EvidenceSearchResult['facets'] | null;

  // --- Coverage ---
  coverage: EvidenceCoverage[];
  relationshipSupport: RelationshipEvidenceSupport[];
  findingSupport: FindingEvidenceSupport[];
  entitySummaries: EntityEvidenceSummary[];

  // --- Collections ---
  collections: EvidenceCollection[];

  // --- Custody chain (Phase 18.2, relational-only) ---
  chain: EvidenceChainEntry[] | null;
  chainVerification: EvidenceChainVerification | null;
  chainLoading: boolean;
  chainError: string | null;
  chainAvailable: boolean;

  // --- Multimedia understanding (Phase 24, relational-only) ---
  analyses: EvidenceAnalysis[] | null;
  analysisLoading: boolean;
  analysisRunning: boolean;
  analysisError: string | null;
  analysisAvailable: boolean;

  // --- Local (on-device) transcription (Phase 25, relational-only) ---
  localTranscriptionState: LocalTranscriptionStage;
  localTranscriptionError: string | null;

  // --- Actions ---
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<EvidenceSearchFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: EvidenceSearchParams['sortBy']) => void;
  setSortOrder: (sortOrder: EvidenceSearchParams['sortOrder']) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  selectItem: (id: string | null) => void;

  // --- Data fetching ---
  fetchEvidence: () => Promise<void>;
  fetchItem: (id: string) => Promise<EvidenceItem>;
  fetchChain: (evidenceId: string) => Promise<void>;
  verifyChain: (evidenceId: string) => Promise<void>;
  resetChain: () => void;
  fetchAnalyses: (evidenceId: string) => Promise<void>;
  runAnalysis: (evidenceId: string) => Promise<void>;
  resetAnalyses: () => void;
  runLocalTranscription: (
    evidenceId: string,
    checksum: string,
    model: LocalWhisperModelId,
  ) => Promise<void>;
  resetLocalTranscription: () => void;
  fetchCoverage: () => Promise<void>;
  fetchRelationshipSupport: () => Promise<void>;
  fetchFindingSupport: () => Promise<void>;
  fetchEntitySummaries: (entityIds: string[]) => Promise<void>;
  fetchCollections: () => Promise<void>;

  // --- Reset ---
  clear: () => void;
}

const DEFAULT_FILTERS: EvidenceSearchFilters = {};

const initialState = {
  investigationId: null,
  items: [],
  selectedItem: null,
  selectedItemId: null,
  loading: false,
  error: null,
  searchQuery: '',
  filters: DEFAULT_FILTERS,
  sortBy: 'observedAt' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  facets: null,
  coverage: [],
  relationshipSupport: [],
  findingSupport: [],
  entitySummaries: [],
  collections: [],
  chain: null,
  chainVerification: null,
  chainLoading: false,
  chainError: null,
  chainAvailable: false,
  analyses: null,
  analysisLoading: false,
  analysisRunning: false,
  analysisError: null,
  analysisAvailable: false,
  localTranscriptionState: 'idle' as LocalTranscriptionStage,
  localTranscriptionError: null,
};

const CHAIN_RESET = {
  chain: null,
  chainVerification: null,
  chainLoading: false,
  chainError: null,
};

const ANALYSIS_RESET = {
  analyses: null,
  analysisLoading: false,
  analysisRunning: false,
  analysisError: null,
};

const LOCAL_TRANSCRIPTION_RESET = {
  localTranscriptionState: 'idle' as LocalTranscriptionStage,
  localTranscriptionError: null,
};

export const useEvidenceStore = create<EvidenceState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // --- Investigation scope ---
      setInvestigationId: (id) => {
        const current = get().investigationId;
        if (current === id) return;
        set({
          ...initialState,
          ...CHAIN_RESET,
          ...ANALYSIS_RESET,
          ...LOCAL_TRANSCRIPTION_RESET,
          investigationId: id,
        });
        if (id) get().fetchEvidence();
      },

      // --- Search / filter ---
      setSearchQuery: (query) => {
        set({ searchQuery: query, page: 1 });
        get().fetchEvidence();
      },
      setFilters: (newFilters) => {
        set((s) => ({ filters: { ...s.filters, ...newFilters }, page: 1 }));
        get().fetchEvidence();
      },
      clearFilters: () => {
        set({ filters: DEFAULT_FILTERS, searchQuery: '', page: 1 });
        get().fetchEvidence();
      },
      setSortBy: (sortBy) => {
        set({ sortBy });
        get().fetchEvidence();
      },
      setSortOrder: (sortOrder) => {
        set({ sortOrder });
        get().fetchEvidence();
      },
      setPage: (page) => {
        set({ page });
        get().fetchEvidence();
      },
      setPageSize: (pageSize) => {
        set({ pageSize, page: 1 });
        get().fetchEvidence();
      },

      // --- Selection ---
      selectItem: (id) => {
        if (!id) {
          set({
            selectedItemId: null,
            selectedItem: null,
            ...CHAIN_RESET,
            ...ANALYSIS_RESET,
            ...LOCAL_TRANSCRIPTION_RESET,
          });
          return;
        }
        set({
          selectedItemId: id,
          loading: true,
          error: null,
          ...CHAIN_RESET,
          ...ANALYSIS_RESET,
          ...LOCAL_TRANSCRIPTION_RESET,
        });
        // No silent fallback: in API mode a miss raises the error state.
        const load = isMockData()
          ? evidenceService.getEvidence(id)
          : getEvidenceById(id, get().investigationId ?? undefined).then(mapEvidenceItem);
        load
          .then((item) => set({ selectedItem: item, loading: false }))
          .catch((err) => set({ error: String(err), loading: false }));
      },

      // --- Data fetching ---
      fetchEvidence: async () => {
        const { investigationId, searchQuery, filters, sortBy, sortOrder, page, pageSize } = get();
        if (!investigationId) return;
        const scopeId = investigationId;
        set({ loading: true, error: null });
        try {
          const result = isMockData()
            ? await evidenceService.listEvidence({
                investigationId: scopeId,
                query: searchQuery || undefined,
                ...filters,
                sortBy,
                sortOrder,
                page,
                pageSize,
              })
            : await loadEvidenceSearch(scopeId, {
                investigationId: scopeId,
                query: searchQuery || undefined,
                sortBy,
                sortOrder,
                page,
                pageSize,
              });
          if (get().investigationId !== scopeId) return;
          set({
            items: result.items,
            total: result.total,
            totalPages: result.totalPages,
            facets: result.facets,
            loading: false,
          });
        } catch (err) {
          if (get().investigationId !== scopeId) return;
          set({ error: String(err), loading: false });
        }
      },

      fetchItem: async (id) => {
        set({ loading: true, error: null });
        try {
          const item = isMockData()
            ? await evidenceService.getEvidence(id)
            : mapEvidenceItem(await getEvidenceById(id));
          set({
            selectedItem: item,
            selectedItemId: id,
            loading: false,
            ...CHAIN_RESET,
            ...ANALYSIS_RESET,
            ...LOCAL_TRANSCRIPTION_RESET,
          });
          return item;
        } catch (err) {
          set({ error: String(err), loading: false });
          throw err;
        }
      },

      // --- Custody chain (Phase 18.2) ---
      resetChain: () => set({ ...CHAIN_RESET }),

      fetchChain: async (evidenceId) => {
        if (isMockData()) {
          // The mock universe has no persisted chain; never fabricate one.
          set({ chain: null, chainVerification: null, chainAvailable: false, chainLoading: false, chainError: null });
          return;
        }
        set({ chainLoading: true, chainError: null });
        try {
          const scope = get().investigationId ?? undefined;
          const [chain, verification] = await Promise.all([
            getEvidenceChain(evidenceId, scope),
            getEvidenceChainVerification(evidenceId, scope),
          ]);
          set({ chain, chainVerification: verification, chainAvailable: true, chainLoading: false });
        } catch (err) {
          set({ chain: null, chainVerification: null, chainError: String(err), chainLoading: false });
        }
      },

      verifyChain: async (evidenceId) => {
        if (isMockData()) {
          set({ chainAvailable: false, chainLoading: false, chainError: null });
          return;
        }
        set({ chainLoading: true, chainError: null });
        try {
          const verification = await recordEvidenceChainVerification(
            evidenceId,
            get().investigationId ?? undefined,
          );
          set({ chainVerification: verification, chainLoading: false });
        } catch (err) {
          set({ chainError: String(err), chainLoading: false });
        }
      },

      // --- Multimedia understanding (Phase 24) ---
      resetAnalyses: () => set({ ...ANALYSIS_RESET }),

      fetchAnalyses: async (evidenceId) => {
        if (isMockData()) {
          // The mock universe has no persisted analysis; never fabricate one.
          set({ analyses: null, analysisAvailable: false, analysisLoading: false, analysisError: null });
          return;
        }
        set({ analysisLoading: true, analysisError: null });
        try {
          const analyses = await getEvidenceAnalyses(
            evidenceId,
            get().investigationId ?? undefined,
          );
          set({ analyses, analysisAvailable: true, analysisLoading: false });
        } catch (err) {
          set({ analyses: null, analysisError: String(err), analysisLoading: false });
        }
      },

      runAnalysis: async (evidenceId) => {
        if (isMockData()) {
          set({ analysisAvailable: false, analysisRunning: false, analysisError: null });
          return;
        }
        set({ analysisRunning: true, analysisError: null });
        try {
          const latest = await analyzeEvidence(
            evidenceId,
            get().investigationId ?? undefined,
          );
          set((s) => ({
            analyses: [latest, ...(s.analyses ?? []).filter((a) => a.id !== latest.id)],
            analysisAvailable: true,
            analysisRunning: false,
          }));
        } catch (err) {
          set({ analysisError: String(err), analysisRunning: false });
        }
      },

      // --- Local (on-device) transcription (Phase 25) ---
      resetLocalTranscription: () =>
        set({ localTranscriptionState: 'idle', localTranscriptionError: null }),

      runLocalTranscription: async (evidenceId, checksum, model) => {
        if (isMockData()) {
          set({
            localTranscriptionState: 'unsupported',
            localTranscriptionError: null,
          });
          return;
        }
        const capability = detectLocalWhisperCapability();
        if (!capability.supported) {
          set({
            localTranscriptionState: 'unsupported',
            localTranscriptionError: capability.reason,
          });
          return;
        }
        set({ localTranscriptionError: null });
        const setPhase = (state: LocalTranscriptionStage) => {
          if (state !== 'downloading' && state !== 'transcribing') return;
          set({ localTranscriptionState: state });
        };
        set({ localTranscriptionState: 'downloading' });
        try {
          const result = await runLocalWhisper(
            evidenceId,
            get().investigationId ?? undefined,
            checksum,
            model,
            (phase) => setPhase(phase),
          );
          set({ localTranscriptionState: 'submitting' });
          const submitted = await submitLocalTranscription(
            evidenceId,
            {
              mode: 'LOCAL',
              checksum,
              model_id: result.model_id,
              transcript: result.transcript,
              language: result.language,
              duration_seconds: result.duration_seconds,
              segments: result.segments,
              warnings: result.warnings,
            },
            get().investigationId ?? undefined,
          );
          set((s) => ({
            analyses: [
              submitted,
              ...(s.analyses ?? []).filter((a) => a.id !== submitted.id),
            ],
            analysisAvailable: true,
            localTranscriptionState: 'succeeded',
            localTranscriptionError: null,
          }));
        } catch (err) {
          set({
            localTranscriptionState: 'failed',
            localTranscriptionError: String(err),
          });
        }
      },

      fetchCoverage: async () => {
        const { investigationId } = get();
        if (!investigationId) return;
        if (!isMockData()) {
          // Relational evidence↔target coverage endpoints are a Phase 17.7
          // boundary; keep the persisted slice honest and empty.
          set({ coverage: [] });
          return;
        }
        try {
          const coverage = await evidenceService.getInvestigationEvidenceCoverage(investigationId);
          set({ coverage });
        } catch (err) {
          set({ error: String(err) });
        }
      },

      fetchRelationshipSupport: async () => {
        const { investigationId } = get();
        if (!investigationId) return;
        if (!isMockData()) {
          // No relational relationship→evidence support endpoint yet.
          set({ relationshipSupport: [] });
          return;
        }
        try {
          const support = await evidenceService.getAllRelationshipEvidenceSupport(investigationId);
          set({ relationshipSupport: support });
        } catch (err) {
          set({ error: String(err) });
        }
      },

      fetchFindingSupport: async () => {
        const { investigationId } = get();
        if (!investigationId) return;
        if (!isMockData()) {
          // No relational finding→evidence support endpoint yet.
          set({ findingSupport: [] });
          return;
        }
        try {
          const support = await evidenceService.getAllFindingEvidenceSupport(investigationId);
          set({ findingSupport: support });
        } catch (err) {
          set({ error: String(err) });
        }
      },

      fetchEntitySummaries: async (entityIds) => {
        if (!isMockData()) {
          // No relational entity→evidence summary endpoint yet.
          set({ entitySummaries: [] });
          return;
        }
        try {
          const summaries = await Promise.all(
            entityIds.map((id) => evidenceService.getEntityEvidenceSummary(id))
          );
          set({ entitySummaries: summaries.filter((s): s is EntityEvidenceSummary => s !== undefined) });
        } catch (err) {
          set({ error: String(err) });
        }
      },

      fetchCollections: async () => {
        const { investigationId } = get();
        if (!investigationId) return;
        if (!isMockData()) {
          // Collections are not modeled in the relational schema yet.
          set({ collections: [] });
          return;
        }
        try {
          const collections = await evidenceService.getEvidenceCollections(investigationId);
          set({ collections });
        } catch (err) {
          set({ error: String(err) });
        }
      },

      // --- Reset ---
      clear: () => set({ ...initialState }),
    }),
    { name: 'evidence-store' }
  )
);
