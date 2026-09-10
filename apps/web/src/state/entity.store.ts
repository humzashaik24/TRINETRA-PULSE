import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  EntityIntelligence,
  EntityListResponse,
  EntitySearchParams,
} from '@trinetra-pulse/types';
import * as entityService from '@/services/entity.service';
import { isMockData } from '@/lib/api/config';
import { loadEntityDetail, loadEntityList } from '@/lib/api/entities';
import { DEMO_INVESTIGATION_ID as JOURNEY_DEMO_INVESTIGATION_ID } from '@/navigation/journey';

// ============================================================
// ENTITY STORE (Phase 6 / 17.7)
// ============================================================
// Investigation-scoped entity intelligence state.
// Supports list loading, selection and data-source branching.
// Clears on investigation switch so no stale entity may remain visible.
//
// Phase 17.7 — the data source branches on ``isMockData()`` exactly like the
// evidence store: mock mode keeps the deterministic in-memory universe, API
// mode reads the persisted /api/v2 entity rows. There is NO silent fallback —
// an API failure surfaces as the store error state, never as fabricated demo
// rows.
//
// Per-entity relationships / evidence / events / activity / sources / resolution
// history are separate domains covered by later phases, so the corresponding
// detail tabs stay honestly empty in API mode.
// ============================================================

/** Investigation id the Entity workspace demonstrates: canonical demo id in
 *  mock mode, the deterministic Operation Meridian uuid in API mode. */
const DEMO_INVESTIGATION_ID = isMockData()
  ? JOURNEY_DEMO_INVESTIGATION_ID
  : '6c887c98-939a-50ce-ac27-f58376941de2';

export interface EntityState {
  // --- Investigation scope ---
  investigationId: string | null;
  setInvestigationId: (id: string | null) => void;

  // --- Entity list (full investigation-scoped set) ---
  items: EntityIntelligence[];
  /** The full investigation-scoped set, before local filtering. The list
   *  endpoint returns the whole scoped set; the table filters locally with
   *  the same queryEntities semantics the mock service uses. */
  all: EntityIntelligence[];
  loading: boolean;
  error: string | null;

  // --- Selection ---
  selectedEntity: EntityIntelligence | null;
  selectedEntityId: string | null;

  // --- Search / filter (applied over the already-scoped dataset) ---
  searchQuery: string;
  entityType: EntitySearchParams['entityType'];
  resolutionState: EntitySearchParams['resolutionState'];
  sortBy: EntitySearchParams['sortBy'];
  sortOrder: EntitySearchParams['sortOrder'];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;

  // --- Actions ---
  setSearchQuery: (query: string) => void;
  setEntityType: (type: EntitySearchParams['entityType']) => void;
  setResolutionState: (state: EntitySearchParams['resolutionState']) => void;
  setSortBy: (sortBy: EntitySearchParams['sortBy']) => void;
  setSortOrder: (order: EntitySearchParams['sortOrder']) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  selectEntity: (id: string | null) => void;

  // --- Data fetching ---
  fetchEntities: () => Promise<void>;
  fetchEntity: (id: string) => Promise<EntityIntelligence>;

  // --- Reset ---
  clear: () => void;
}

const initialState = {
  investigationId: null,
  items: [],
  all: [],
  loading: false,
  error: null,
  selectedEntity: null,
  selectedEntityId: null,
  searchQuery: '',
  entityType: 'all' as const,
  resolutionState: 'all' as const,
  sortBy: 'updated' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
};

export const useEntityStore = create<EntityState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // --- Investigation scope ---
      setInvestigationId: (id) => {
        const current = get().investigationId;
        if (current === id) return;
        set({ ...initialState, investigationId: id });
        if (id) void get().fetchEntities();
      },

      // --- Search / filter ---
      setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
      setEntityType: (entityType) => set({ entityType, page: 1 }),
      setResolutionState: (resolutionState) =>
        set({ resolutionState, page: 1 }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      setPage: (page) => set({ page }),
      setPageSize: (pageSize) => set({ pageSize, page: 1 }),

      // --- Selection: no silent fallback; API miss raises the error state ---
      selectEntity: (id) => {
        if (!id) {
          set({ selectedEntityId: null, selectedEntity: null });
          return;
        }
        set({ selectedEntityId: id, loading: true, error: null });
        void get()
          .fetchEntity(id)
          .then((entity) => set({ selectedEntity: entity, loading: false }))
          .catch((err) => set({ error: String(err), loading: false, selectedEntity: null }));
      },

      // --- Data fetching ---
      fetchEntities: async () => {
        const {
          investigationId,
          searchQuery,
          entityType,
          resolutionState,
          sortBy,
          sortOrder,
          page,
          pageSize,
        } = get();
        if (!investigationId) return;
        set({ loading: true, error: null });
        try {
          const result = isMockData()
            ? await entityService.fetchEntities({
                query: searchQuery || undefined,
                entityType,
                resolutionState,
                sortBy,
                sortOrder,
                page,
                pageSize,
              })
            : await loadEntityList(investigationId, {
                query: searchQuery || undefined,
                entityType,
                resolutionState,
                sortBy,
                sortOrder,
                page,
                pageSize,
              });
          const response: EntityListResponse =
            'response' in result ? result.response : result;
          const all: EntityIntelligence[] =
            'all' in result ? result.all : response.items;
          set({
            items: response.items,
            all,
            total: response.total,
            totalPages: response.totalPages,
            loading: false,
          });
        } catch (err) {
          set({ error: String(err), loading: false });
        }
      },

      fetchEntity: async (id) => {
        const { investigationId } = get();
        if (!isMockData()) {
          // Investigation-scoped read: the backend 404s a cross-investigation
          // entity rather than leaking its existence.
          const { entity } = await loadEntityDetail(id, investigationId ?? undefined);
          set({ selectedEntity: entity, selectedEntityId: id, loading: false });
          return entity;
        }
        const entity = await entityService.fetchEntity(id);
        set({ selectedEntity: entity, selectedEntityId: id, loading: false });
        return entity;
      },

      // --- Reset ---
      clear: () => set({ ...initialState }),
    }),
    { name: 'entity-store' }
  )
);

export { DEMO_INVESTIGATION_ID };