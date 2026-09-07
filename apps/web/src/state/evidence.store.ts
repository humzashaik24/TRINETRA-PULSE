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
} from '@trinetra-pulse/types';
import * as evidenceService from '@/services/evidence.service';

// ============================================================
// EVIDENCE STORE (Phase 12)
// ============================================================
// Investigation-scoped evidence intelligence state.
// Supports selection, search, filters, pagination and sort.
// Clears on investigation switch.
// ============================================================

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
};

export const useEvidenceStore = create<EvidenceState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // --- Investigation scope ---
      setInvestigationId: (id) => {
        const current = get().investigationId;
        if (current === id) return;
        set({ ...initialState, investigationId: id });
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
          set({ selectedItemId: null, selectedItem: null });
          return;
        }
        set({ selectedItemId: id, loading: true, error: null });
        evidenceService
          .getEvidence(id)
          .then((item) => set({ selectedItem: item, loading: false }))
          .catch((err) => set({ error: String(err), loading: false }));
      },

      // --- Data fetching ---
      fetchEvidence: async () => {
        const { investigationId, searchQuery, filters, sortBy, sortOrder, page, pageSize } = get();
        if (!investigationId) return;
        set({ loading: true, error: null });
        try {
          const result = await evidenceService.listEvidence({
            investigationId,
            query: searchQuery || undefined,
            ...filters,
            sortBy,
            sortOrder,
            page,
            pageSize,
          });
          set({
            items: result.items,
            total: result.total,
            totalPages: result.totalPages,
            facets: result.facets,
            loading: false,
          });
        } catch (err) {
          set({ error: String(err), loading: false });
        }
      },

      fetchItem: async (id) => {
        set({ loading: true, error: null });
        try {
          const item = await evidenceService.getEvidence(id);
          set({ selectedItem: item, selectedItemId: id, loading: false });
          return item;
        } catch (err) {
          set({ error: String(err), loading: false });
          throw err;
        }
      },

      fetchCoverage: async () => {
        const { investigationId } = get();
        if (!investigationId) return;
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
        try {
          const support = await evidenceService.getAllFindingEvidenceSupport(investigationId);
          set({ findingSupport: support });
        } catch (err) {
          set({ error: String(err) });
        }
      },

      fetchEntitySummaries: async (entityIds) => {
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
