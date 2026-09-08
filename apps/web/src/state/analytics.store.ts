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
  type RealAnalyticsResponse,
} from '@/lib/api/investigations';
import {
  getInvestigationPatterns,
  mapPatternDetectionToStructuralPattern,
} from '@/lib/api/patterns';

// ============================================================
// ANALYTICS STORE (Phase 8, extended Phase 19)
// ============================================================
// Holds the computed analytics bundle for the open network plus
// the analyst's live selection (metric, entity, group, pattern)
// and the graph overlay mode. Filter changes mark the bundle stale
// and trigger a background recompute; selection/overlay are
// instant and drive the inspector and graph highlighting.
//
// Phase 19: API mode consumes the server-computed advanced bundle. Missing
// sections remain explicitly unavailable; the Phase 8 engine is only used
// by the mock service.
// ============================================================

// ------------------------------------------------------------
// Phase 19 — real API analytics mapping
// ------------------------------------------------------------

const now = () => new Date().toISOString();
const record = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' ? value as Record<string, any> : {};
const pick = <T>(value: unknown, ...keys: string[]): T | undefined => {
  const source = record(value);
  for (const key of keys) if (source[key] !== undefined) return source[key] as T;
  return undefined;
};

function mapApiMetadata(value: unknown, networkId: string, nodeCount: number) {
  const metadata = record(value);
  return {
    algorithm: pick<string>(metadata, 'algorithm') ?? 'server-analytics',
    version: pick<string>(metadata, 'version') ?? '1.0.0',
    computedAt: pick<string>(metadata, 'computedAt', 'computed_at') ?? now(),
    scope: pick<string>(metadata, 'scope') ?? networkId,
    relationshipTypes: pick<any[]>(metadata, 'relationshipTypes', 'relationship_types') ?? [],
    timeRange: pick<{ from: string | null; to: string | null }>(metadata, 'timeRange', 'time_range') ?? { from: null, to: null },
    nodeCount: pick<number>(metadata, 'nodeCount', 'node_count') ?? nodeCount,
  };
}

function mapApiCentrality(value: unknown, networkId: string): NetworkAnalytics['degree'] {
  if (value === null || value === undefined) return null;
  const source = record(value);
  const metadata = mapApiMetadata(source.metadata, networkId, 0);
  const type = pick<CentralityType>(source, 'type') ?? 'degree';
  const metricMap =
    value && typeof value === 'object' && !Array.isArray(value)
      ? source
      : {};
  const resultItems = Array.isArray(source.results)
    ? source.results
    : Array.isArray(value)
      ? value
      : Object.entries(metricMap).map(([entityId, score]) => ({
          entity_id: entityId,
          score: typeof score === 'number' ? score : 0,
        }));
  return {
    type,
    label: pick<string>(source, 'label') ?? 'Centrality',
    definition: pick<string>(source, 'definition') ?? 'Structural centrality in the observed network.',
    results: resultItems.map((item) => {
      const r = record(item);
      return {
        entityId: pick<string>(r, 'entityId', 'entity_id') ?? '',
        score: pick<number>(r, 'score') ?? 0,
        normalizedScore: pick<number>(r, 'normalizedScore', 'normalized_score') ?? 0,
        rank: pick<number>(r, 'rank') ?? 0,
        degree: pick<number>(r, 'degree'),
        inDegree: pick<number>(r, 'inDegree', 'in_degree'),
        outDegree: pick<number>(r, 'outDegree', 'out_degree'),
        normalizedDegree: pick<number>(r, 'normalizedDegree', 'normalized_degree'),
        affectedComponents: pick<number>(r, 'affectedComponents', 'affected_components'),
        bridgePotential: pick<number>(r, 'bridgePotential', 'bridge_potential'),
        metadata: mapApiMetadata(r.metadata, networkId, 0),
      };
    }),
    metadata,
  };
}

function mapApiAdvancedSections(raw: RealAnalyticsResponse, networkId: string) {
  const communities = raw.communities?.map((item: any) => ({
    id: pick<string>(item, 'id', 'community_id') ?? '',
    label: pick<string>(item, 'label') ?? '',
    nodeIds: pick<string[]>(item, 'nodeIds', 'node_ids') ?? [],
    internalEdgeCount: pick<number>(item, 'internalEdgeCount', 'internal_edge_count') ?? 0,
    size: pick<number>(item, 'size') ?? 0,
    density: pick<number>(item, 'density') ?? 0,
    cohesion: pick<number>(item, 'cohesion') ?? 0,
    representativeEntities: pick<string[]>(item, 'representativeEntities', 'representative_entities') ?? [],
    bridgeEntityIds: pick<string[]>(item, 'bridgeEntityIds', 'bridge_entity_ids') ?? [],
  })) ?? [];
  const components = raw.components?.map((item: any) => ({
    componentId: pick<string>(item, 'componentId', 'component_id') ?? '',
    nodeCount: pick<number>(item, 'nodeCount', 'node_count') ?? 0,
    edgeCount: pick<number>(item, 'edgeCount', 'edge_count') ?? 0,
    density: pick<number>(item, 'density') ?? 0,
    representativeNode: pick<string>(item, 'representativeNode', 'representative_node') ?? '',
    nodeIds: pick<string[]>(item, 'nodeIds', 'node_ids') ?? [],
  })) ?? [];
  const bridges = raw.bridges?.map((item: any) => ({
    entityId: pick<string>(item, 'entityId', 'entity_id') ?? '',
    bridgeScore: pick<number>(item, 'bridgeScore', 'bridge_score') ?? 0,
    connectedComponents: pick<string[]>(item, 'connectedComponents', 'connected_components') ?? [],
    connectedCommunities: pick<string[]>(item, 'connectedCommunities', 'connected_communities') ?? [],
    shortestPathContribution: pick<number>(item, 'shortestPathContribution', 'shortest_path_contribution') ?? 0,
    rank: pick<number>(item, 'rank') ?? 0,
  })) ?? [];
  const bridgeRelationships = (raw.bridge_relationships ?? raw.bridgeRelationships)?.map((item: any) => ({
    relationshipId: pick<string>(item, 'relationshipId', 'relationship_id') ?? '',
    sourceEntityId: pick<string>(item, 'sourceEntityId', 'source_entity_id') ?? '',
    targetEntityId: pick<string>(item, 'targetEntityId', 'target_entity_id') ?? '',
    bridgeScore: pick<number>(item, 'bridgeScore', 'bridge_score') ?? 0,
    connectedComponents: pick<string[]>(item, 'connectedComponents', 'connected_components') ?? [],
  })) ?? [];
  const influence = raw.influence?.map((item: any) => ({
    entityId: pick<string>(item, 'entityId', 'entity_id') ?? '',
    importance: pick<number>(item, 'importance') ?? 0,
    components: pick<any>(item, 'components') ?? { degree: 0, betweenness: 0, closeness: 0, pagerank: 0 },
    rank: pick<number>(item, 'rank') ?? 0,
    metadata: mapApiMetadata(item.metadata, networkId, 0),
  })) ?? null;
  const patterns = raw.patterns?.map((item: any) => {
    const p = record(item);
    if (p.pattern_type) {
      return mapPatternDetectionToStructuralPattern(p as any);
    }
    return {
      id: pick<string>(p, 'id') ?? '',
      type: pick<any>(p, 'type') ?? 'pattern_unavailable',
      title: pick<string>(p, 'title') ?? 'Structural pattern',
      description: pick<string>(p, 'description') ?? '',
      confidence: pick<number>(p, 'confidence') ?? 0,
      severity: (() => {
        const severity = String(pick<any>(p, 'severity') ?? 'info').toLowerCase();
        return (severity === 'critical' ? 'high' : severity === 'medium' ? 'medium' : severity === 'high' ? 'high' : 'info') as 'info' | 'high' | 'medium';
      })(),
      affectedEntities: pick<string[]>(p, 'affectedEntities', 'affected_entities') ?? [],
      affectedRelationships: pick<string[]>(p, 'affectedRelationships', 'affected_relationships') ?? [],
      detectedAt: pick<string>(p, 'detectedAt', 'detected_at') ?? '',
      evidenceReferences: pick<string[]>(p, 'evidenceReferences', 'evidence_references', 'evidence_ids') ?? [],
      period: pick<any>(p, 'period') ?? { from: '', to: '' },
      sources: pick<string[]>(p, 'sources') ?? [],
    };
  }) ?? [];
  const temporalRaw = record(raw.temporal);
  const temporal = raw.temporal === null || raw.temporal === undefined ? null : {
    snapshots: (pick<any[]>(temporalRaw, 'snapshots') ?? []).map((item) => {
      const s = record(item);
      return {
        period: pick<string>(s, 'period') ?? '',
        label: pick<string>(s, 'label') ?? '',
        nodeCount: pick<number>(s, 'nodeCount', 'node_count') ?? 0,
        relationshipCount: pick<number>(s, 'relationshipCount', 'relationship_count') ?? 0,
        newNodes: pick<number>(s, 'newNodes', 'new_nodes') ?? 0,
        newRelationships: pick<number>(s, 'newRelationships', 'new_relationships') ?? 0,
        inactiveRelationships: pick<number>(s, 'inactiveRelationships', 'inactive_relationships') ?? 0,
        communityCount: pick<number>(s, 'communityCount', 'community_count') ?? 0,
        averageDegree: pick<number>(s, 'averageDegree', 'average_degree') ?? 0,
        density: pick<number>(s, 'density') ?? 0,
        metrics: pick<any>(s, 'metrics') ?? {},
        centralityChange: pick<any>(s, 'centralityChange', 'centrality_change') ?? {},
        topEntities: pick<string[]>(s, 'topEntities', 'top_entities') ?? [],
        activeEdgeIds: pick<string[]>(s, 'activeEdgeIds', 'active_edge_ids') ?? [],
      };
    }),
    periodLabels: pick<string[]>(temporalRaw, 'periodLabels', 'period_labels') ?? [],
  };
  return { communities, components, bridges, bridgeRelationships, influence, patterns, temporal };
}

/**
 * Map either the legacy overview or the Phase 19 advanced response into the
 * full NetworkAnalytics shape expected by all frontend components.
 *
 * Fields available from the API: entity_count, relationship_count,
 * connected_components, average_degree, flagged/verified/high_risk counts.
 *
 * A missing/null server section is retained as an explicit unavailable
 * section; it is never replaced with a mock-engine calculation.
 */
export function mapApiAnalyticsToNetworkAnalytics(
  apiAnalytics: RealAnalyticsResponse,
  networkId: string,
  filter: AnalyticsFilter = DEFAULT_ANALYTICS_FILTER,
): NetworkAnalytics {
  const source = (apiAnalytics as RealAnalyticsResponse & { analytics?: RealAnalyticsResponse }).analytics ?? apiAnalytics;
  const centrality = record(source.centrality);
  const raw = {
    ...source,
    degree: source.degree !== undefined ? source.degree : centrality.degree,
    betweenness: source.betweenness !== undefined ? source.betweenness : centrality.betweenness,
    closeness: source.closeness !== undefined ? source.closeness : centrality.closeness,
    pagerank: source.pagerank !== undefined ? source.pagerank : centrality.pagerank,
    communities: source.communities !== undefined ? source.communities : source.groups,
    components: source.components !== undefined ? source.components : source.connected_components_detail,
    bridges: source.bridges !== undefined ? source.bridges : source.bridge_entities,
    temporal: source.temporal !== undefined ? source.temporal : (source as any).timeline,
  } as RealAnalyticsResponse;
  const centralityRows = Array.isArray(raw.centrality) ? raw.centrality : [];
  const centralityMetric = (key: 'degree' | 'betweenness' | 'closeness' | 'pagerank') =>
    centralityRows.map((item) => {
      const row = record(item);
      return {
        entity_id: pick<string>(row, 'entity_id', 'entityId') ?? '',
        score: pick<number>(row, key) ?? 0,
        degree: pick<number>(row, 'degree'),
        in_degree: pick<number>(row, 'in_degree', 'inDegree'),
        out_degree: pick<number>(row, 'out_degree', 'outDegree'),
        normalized_degree: pick<number>(row, 'normalized_degree', 'normalizedDegree'),
      };
    });
  const entityCount = raw.entity_count ?? raw.summary?.nodes ?? 0;
  const relCount = raw.relationship_count ?? raw.summary?.relationships ?? 0;
  const possibleEdges = entityCount > 1 ? (entityCount * (entityCount - 1)) / 2 : 0;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key) ||
    (['degree', 'betweenness', 'closeness', 'pagerank'].includes(key) && Object.prototype.hasOwnProperty.call(centrality, key));
  const unavailableSections = ['degree', 'betweenness', 'closeness', 'pagerank', 'influence', 'communities', 'components', 'bridges', 'patterns', 'temporal']
    .filter((key) => !has(key) || raw[key as keyof RealAnalyticsResponse] === null);
  const sections = mapApiAdvancedSections(raw, networkId);
  const densityValue = record(raw.density);
  const density = typeof raw.density === 'number'
    ? {
        density: raw.density,
        possibleEdges,
        actualEdges: relCount,
        interpretation: raw.density > 0.5
          ? 'Dense network — many direct relationships observed.'
          : 'Sparse network — few direct relationships relative to possible connections.',
      }
    : raw.density && typeof raw.density === 'object'
      ? {
          density: pick<number>(densityValue, 'density') ?? 0,
          possibleEdges: pick<number>(densityValue, 'possibleEdges', 'possible_edges') ?? possibleEdges,
          actualEdges: pick<number>(densityValue, 'actualEdges', 'actual_edges') ?? relCount,
          interpretation: pick<string>(densityValue, 'interpretation') ?? 'Observed network density.',
        }
      : null;
  const apiSummary = raw.summary as (Partial<NonNullable<RealAnalyticsResponse['summary']>> & Record<string, unknown>) | null | undefined;
  const summary = Object.prototype.hasOwnProperty.call(source, 'summary') && source.summary === null
    ? null
    : apiSummary
    ? {
        networkId,
        nodes: (apiSummary.nodes as number | undefined) ?? entityCount,
        relationships: (apiSummary.relationships as number | undefined) ?? relCount,
        connectedComponents: (apiSummary.connectedComponents as number | undefined) ?? (apiSummary.connected_components as number | undefined) ?? raw.connected_components ?? 0,
        communityCount: (apiSummary.communityCount as number | undefined) ?? (apiSummary.community_count as number | undefined) ?? (Array.isArray(raw.communities) ? raw.communities.length : 0),
        averageDegree: (apiSummary.averageDegree as number | undefined) ?? (apiSummary.average_degree as number | undefined) ?? raw.average_degree ?? 0,
        density: (apiSummary.density as number | undefined) ?? (possibleEdges > 0 ? relCount / possibleEdges : 0),
        averagePathLength: (apiSummary.averagePathLength as number | undefined) ?? (apiSummary.average_path_length as number | undefined) ?? null,
        diameter: (apiSummary.diameter as number | undefined) ?? null,
        bridgeEntityCount: (apiSummary.bridgeEntityCount as number | undefined) ?? (apiSummary.bridge_entity_count as number | undefined) ?? (Array.isArray(raw.bridges) ? raw.bridges.length : 0),
        bridgeRelationshipCount: (apiSummary.bridgeRelationshipCount as number | undefined) ?? (apiSummary.bridge_relationship_count as number | undefined) ?? (Array.isArray(raw.bridge_relationships ?? raw.bridgeRelationships) ? (raw.bridge_relationships ?? raw.bridgeRelationships)!.length : 0),
        topConnectedEntity: (apiSummary.topConnectedEntity as string | null | undefined) ?? (apiSummary.top_connected_entity as string | null | undefined) ?? null,
        topBridgeEntity: (apiSummary.topBridgeEntity as string | null | undefined) ?? (apiSummary.top_bridge_entity as string | null | undefined) ?? null,
        networkInfluenceLeader: (apiSummary.networkInfluenceLeader as string | null | undefined) ?? (apiSummary.network_influence_leader_id as string | null | undefined) ?? null,
        largestComponentSize: (apiSummary.largestComponentSize as number | undefined) ?? (apiSummary.largest_component_size as number | undefined) ?? 0,
        isolatedEntityCount: (apiSummary.isolatedEntityCount as number | undefined) ?? (apiSummary.isolated_entity_count as number | undefined) ?? 0,
      }
    : {
        networkId,
        nodes: entityCount,
        relationships: relCount,
        connectedComponents: raw.connected_components ?? 0,
        communityCount: Array.isArray(raw.communities) ? raw.communities.length : 0,
        averageDegree: raw.average_degree ?? 0,
        density: possibleEdges > 0 ? relCount / possibleEdges : 0,
        averagePathLength: null,
        diameter: null,
        bridgeEntityCount: Array.isArray(raw.bridges) ? raw.bridges.length : 0,
        bridgeRelationshipCount: Array.isArray(raw.bridge_relationships ?? raw.bridgeRelationships) ? (raw.bridge_relationships ?? raw.bridgeRelationships)!.length : 0,
        topConnectedEntity: null,
        topBridgeEntity: null,
        networkInfluenceLeader: raw.network_influence_leader_id ?? null,
        largestComponentSize: raw.largest_component_size ?? 0,
        isolatedEntityCount: raw.isolated_entity_count ?? 0,
      };

  return {
    networkId,
    status: raw.status === 'failed' ? 'failed' : 'complete',
    filters: { ...DEFAULT_ANALYTICS_FILTER, ...filter, ...(raw.filters ?? {}) },
    summary,
    degree: mapApiCentrality(
      raw.degree ?? (centralityRows.length ? centralityMetric('degree') : null),
      networkId,
    ),
    betweenness: mapApiCentrality(
      raw.betweenness ?? (centralityRows.length ? centralityMetric('betweenness') : null),
      networkId,
    ),
    closeness: mapApiCentrality(
      raw.closeness ?? (centralityRows.length ? centralityMetric('closeness') : null),
      networkId,
    ),
    pagerank: mapApiCentrality(
      raw.pagerank ?? (centralityRows.length ? centralityMetric('pagerank') : null),
      networkId,
    ),
    influence: sections.influence,
    communities: sections.communities,
    components: sections.components,
    density: has('density') ? density : (possibleEdges > 0 ? {
      density: relCount / possibleEdges,
      possibleEdges,
      actualEdges: relCount,
      interpretation: relCount / possibleEdges > 0.5
        ? 'Dense network — many direct relationships observed.'
        : 'Sparse network — few direct relationships relative to possible connections.',
    } : null),
    bridges: sections.bridges,
    bridgeRelationships: sections.bridgeRelationships,
    patterns: sections.patterns,
    temporal: sections.temporal,
    metadata: (() => {
      const metadata = raw.metadata as (Partial<NonNullable<RealAnalyticsResponse['metadata']>> & Record<string, unknown>) | null | undefined;
      return {
        algorithm: metadata?.algorithm ?? (unavailableSections.length ? 'analytics-overview' : 'server-analytics'),
        version: metadata?.version ?? '1.0.0',
        computedAt: (metadata?.computedAt as string | undefined) ?? (metadata?.computed_at as string | undefined) ?? now(),
        scope: metadata?.scope ?? networkId,
        relationshipTypes: (metadata?.relationshipTypes as any) ?? (metadata?.relationship_types as any) ?? [],
        timeRange: (metadata?.timeRange as { from: string | null; to: string | null } | undefined) ?? (metadata?.time_range as { from: string | null; to: string | null } | undefined) ?? { from: null, to: null },
        nodeCount: (metadata?.nodeCount as number | undefined) ?? (metadata?.node_count as number | undefined) ?? entityCount,
        unavailableSections: [...new Set([...(metadata?.unavailableSections as string[] ?? []), ...(metadata?.unavailable_sections as string[] ?? []), ...unavailableSections])],
      };
    })(),
    error: raw.error ?? null,
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
            const hasFilter = nextFilter.entityTypes.length > 0 ||
              nextFilter.relationshipTypes.length > 0 ||
              nextFilter.communityIds.length > 0 ||
              nextFilter.componentIds.length > 0 ||
              nextFilter.sources.length > 0 ||
              nextFilter.from !== null ||
              nextFilter.to !== null ||
              nextFilter.minConfidence > 0;
            const apiAnalytics = !hasFilter
              ? await fetchApiAnalytics(networkId)
              : await fetchApiAnalytics(networkId, { filter: nextFilter });
            const bundle = mapApiAnalyticsToNetworkAnalytics(apiAnalytics, networkId, nextFilter);
            // Older Phase 14/17 servers expose patterns on their dedicated
            // endpoint. This remains an API-only enrichment, never a mock
            // fallback, and is skipped when the advanced bundle supplied it.
            const nestedAnalytics = (apiAnalytics as RealAnalyticsResponse & { analytics?: RealAnalyticsResponse }).analytics;
            const hasApiPatterns = Object.prototype.hasOwnProperty.call(apiAnalytics, 'patterns') ||
              Object.prototype.hasOwnProperty.call(nestedAnalytics ?? {}, 'patterns');
            if (!hasApiPatterns && bundle.metadata?.unavailableSections?.includes('patterns')) {
              try {
                const apiPatterns = await getInvestigationPatterns(networkId);
                bundle.patterns = apiPatterns.patterns.map(mapPatternDetectionToStructuralPattern);
                bundle.metadata.unavailableSections = bundle.metadata.unavailableSections?.filter((s) => s !== 'patterns');
              } catch {
                // Preserve the explicit unavailable state.
              }
            }
            set({ bundle, status: bundle.status, error: bundle.error });
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
