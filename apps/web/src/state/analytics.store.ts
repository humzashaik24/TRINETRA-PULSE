import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  NetworkAnalytics,
  AnalyticsFilter,
  CentralityType,
} from '@trinetra-pulse/types';
import { DEFAULT_ANALYTICS_FILTER } from '@trinetra-pulse/types';
import { getNetworkAnalytics } from '@/services/network-analytics.service';
import { isMockData } from '@/lib/api/config';
import {
  getNetworkAnalytics as fetchApiAnalytics,
  type RealAnalyticsOverview,
} from '@/lib/api/investigations';

// ============================================================
// ANALYTICS STORE (Phase 8, extended Phase 17.3)
// ============================================================
// Holds the computed analytics bundle for the open network plus
// the analyst's live selection (metric, entity, group, pattern)
// and the graph overlay mode. Filter changes mark the bundle stale
// and trigger a background recompute; selection/overlay are
// instant and drive the inspector and graph highlighting.
//
// Phase 17.3: API mode fetches from GET /api/v2/networks/{id}/analytics
// and maps the AnalyticsOverview into the NetworkAnalytics shape.
// Centrality, communities, bridges, patterns, and temporal remain null
// in API mode (backend computes summary metrics only).
// ============================================================

// ------------------------------------------------------------
// Phase 17.3 — real API analytics mapping
// ------------------------------------------------------------

const now = () => new Date().toISOString();

/**
 * Map the backend AnalyticsOverview (summary-only metrics) into the
 * full NetworkAnalytics shape expected by all frontend components.
 *
 * Fields available from the API: entity_count, relationship_count,
 * connected_components, average_degree, flagged/verified/high_risk counts.
 *
 * Fields NOT available from the API (remain null/empty):
 * centrality (degree/betweenness/closeness/pagerank), influence,
 * communities, components, density, bridges, patterns, temporal.
 *
 * The UI gracefully handles these via null checks and empty-state renders.
 */
export function mapApiAnalyticsToNetworkAnalytics(
  apiAnalytics: RealAnalyticsOverview,
  networkId: string,
): NetworkAnalytics {
  const entityCount = apiAnalytics.entity_count;
  const relCount = apiAnalytics.relationship_count;
  const possibleEdges = entityCount > 1 ? (entityCount * (entityCount - 1)) / 2 : 0;

  return {
    networkId,
    status: 'complete',
    filters: { ...DEFAULT_ANALYTICS_FILTER },
    summary: {
      networkId,
      nodes: entityCount,
      relationships: relCount,
      connectedComponents: apiAnalytics.connected_components,
      communityCount: 0,
      averageDegree: apiAnalytics.average_degree,
      density: possibleEdges > 0 ? relCount / possibleEdges : 0,
      averagePathLength: null,
      diameter: null,
      bridgeEntityCount: 0,
      bridgeRelationshipCount: 0,
      topConnectedEntity: null,
      topBridgeEntity: null,
    },
    degree: null,
    betweenness: null,
    closeness: null,
    pagerank: null,
    influence: null,
    communities: [],
    components: [],
    density: possibleEdges > 0
      ? {
          density: relCount / possibleEdges,
          possibleEdges,
          actualEdges: relCount,
          interpretation:
            relCount / possibleEdges > 0.5
              ? 'Dense network — many direct relationships observed.'
              : 'Sparse network — few direct relationships relative to possible connections.',
        }
      : null,
    bridges: [],
    bridgeRelationships: [],
    patterns: [],
    temporal: null,
    metadata: {
      algorithm: 'analytics-overview',
      version: '1.0.0',
      computedAt: now(),
      scope: networkId,
      relationshipTypes: [],
      timeRange: { from: null, to: null },
      nodeCount: entityCount,
    },
    error: null,
  };
}

export type AnalyticsOverlay =
  | 'none'
  | 'degree'
  | 'betweenness'
  | 'closeness'
  | 'pagerank'
  | 'influence'
  | 'community'
  | 'component'
  | 'bridge';

interface AnalyticsState {
  networkId: string | null;
  filters: AnalyticsFilter;
  bundle: NetworkAnalytics | null;
  status: NetworkAnalytics['status'];
  error: string | null;

  selectedMetric: CentralityType | null;
  selectedEntityId: string | null;
  selectedCommunityId: string | null;
  selectedComponentId: string | null;
  selectedPatternId: string | null;
  selectedBridgeId: string | null;
  selectedInfluenceId: string | null;
  overlay: AnalyticsOverlay;

  loadAnalytics: (networkId: string, filter?: AnalyticsFilter) => Promise<void>;
  setFilter: (filter: AnalyticsFilter) => void;
  setSelectedMetric: (t: CentralityType | null) => void;
  selectEntity: (entityId: string | null) => void;
  selectCommunity: (id: string | null) => void;
  selectComponent: (id: string | null) => void;
  selectPattern: (id: string | null) => void;
  selectBridge: (id: string | null) => void;
  selectInfluence: (id: string | null) => void;
  setOverlay: (o: AnalyticsOverlay) => void;
  clear: () => void;
}

function clearSelections(set: (fn: (s: AnalyticsState) => Partial<AnalyticsState>) => void, keep: Partial<AnalyticsState> = {}) {
  set((s) => ({
    ...s,
    selectedMetric: null,
    selectedEntityId: null,
    selectedCommunityId: null,
    selectedComponentId: null,
    selectedPatternId: null,
    selectedBridgeId: null,
    selectedInfluenceId: null,
    ...keep,
  }));
}

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      networkId: null,
      filters: { ...DEFAULT_ANALYTICS_FILTER },
      bundle: null,
      status: 'idle',
      error: null,

      selectedMetric: null,
      selectedEntityId: null,
      selectedCommunityId: null,
      selectedComponentId: null,
      selectedPatternId: null,
      selectedBridgeId: null,
      selectedInfluenceId: null,
      overlay: 'none',

      loadAnalytics: async (networkId, filter) => {
        const nextFilter = filter ?? get().filters;
        set({ networkId, filters: { ...nextFilter }, status: 'queued', error: null });
        set({ status: 'computing' });

        if (isMockData()) {
          // --- Mock path: existing behavior ---
          try {
            const bundle = await getNetworkAnalytics(networkId, { filter: nextFilter });
            set({ bundle, status: bundle.status, error: null });
          } catch (err) {
            set({
              status: 'failed',
              error: err instanceof Error ? err.message : 'Analytics computation failed',
            });
          }
        } else {
          // --- Real API path (Phase 17.3) ---
          try {
            const apiAnalytics = await fetchApiAnalytics(networkId);
            const bundle = mapApiAnalyticsToNetworkAnalytics(apiAnalytics, networkId);
            set({ bundle, status: 'complete', error: null });
          } catch (err) {
            set({
              status: 'failed',
              error: err instanceof Error ? err.message : 'Analytics computation failed',
            });
          }
        }
      },

      setFilter: (filter) => {
        const { networkId, loadAnalytics } = get();
        set({ filters: { ...filter }, status: 'stale' });
        clearSelections(set);
        if (networkId) {
          void loadAnalytics(networkId, filter);
        }
      },

      setSelectedMetric: (t) => {
        set({ selectedMetric: t, overlay: t ? (t as AnalyticsOverlay) : 'none' });
      },

      selectEntity: (entityId) =>
        clearSelections(set, { selectedEntityId: entityId }),

      selectCommunity: (id) =>
        clearSelections(set, { selectedCommunityId: id }),

      selectComponent: (id) =>
        clearSelections(set, { selectedComponentId: id }),

      selectPattern: (id) =>
        clearSelections(set, { selectedPatternId: id }),

      selectBridge: (id) =>
        clearSelections(set, { selectedBridgeId: id }),

      selectInfluence: (id) =>
        clearSelections(set, { selectedInfluenceId: id }),

      setOverlay: (o) => set({ overlay: o }),

      clear: () =>
        set({
          networkId: null,
          filters: { ...DEFAULT_ANALYTICS_FILTER },
          bundle: null,
          status: 'idle',
          error: null,
          selectedMetric: null,
          selectedEntityId: null,
          selectedCommunityId: null,
          selectedComponentId: null,
          selectedPatternId: null,
          selectedBridgeId: null,
          selectedInfluenceId: null,
          overlay: 'none',
        }),
    }),
    { name: 'analytics' }
  )
);
