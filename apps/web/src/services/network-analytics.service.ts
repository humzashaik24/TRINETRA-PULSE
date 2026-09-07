import type {
  NetworkAnalytics,
  AnalyticsFilter,
  CentralityResultSet,
  CentralityType,
  Community,
  NetworkComponent,
  NetworkDensityResult,
  NetworkAnalyticsSummary,
  BridgeEntity,
  BridgeRelationship,
  InfluenceResult,
  StructuralPattern,
  TemporalAnalyticsResult,
  GraphNode,
  GraphEdge,
} from '@trinetra-pulse/types';
import { DEFAULT_ANALYTICS_FILTER } from '@trinetra-pulse/types';
import { mockNetworkGraphById } from '@/mock/networks';
import { NetworkAnalyticsEngine, AnalyticsCache } from '@/analytics/network-analytics-engine';
import { analyticsFiltersEqual, analyticsFilterKey } from '@/analytics/filter';

// ============================================================
// NETWORK ANALYTICS SERVICE (engine-backed)
// ============================================================
// Public analytics surface consumed by the analytics store / UI.
// Backed by the pure NetworkAnalyticsEngine over the loaded mock
// network graph. Results are cached keyed by network+filter+version
// and returned through a deterministic latency window. The API
// mirrors eventual server endpoints so it can be swapped for a
// remote implementation without UI changes.
// ============================================================

const LATENCY = 120;
const ENGINE_VERSION = '1.0.0';

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const cache = new AnalyticsCache();
const inFlight = new Map<string, Promise<NetworkAnalytics>>();

function requireGraph(id: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const graph = mockNetworkGraphById.get(id);
  if (!graph) throw new Error(`Network not found: ${id}`);
  return { nodes: graph.nodes, edges: graph.edges };
}

function sortFilter(filter: AnalyticsFilter): AnalyticsFilter {
  return {
    ...filter,
    entityTypes: [...filter.entityTypes].sort(),
    relationshipTypes: [...filter.relationshipTypes].sort(),
    communityIds: [...filter.communityIds].sort(),
    componentIds: [...filter.componentIds].sort(),
    sources: [...filter.sources].sort(),
  };
}

function computeBundle(networkId: string, filter: AnalyticsFilter): NetworkAnalytics {
  const { nodes, edges } = requireGraph(networkId);
  const engine = new NetworkAnalyticsEngine({ networkId, filter });
  return engine.computeAll(nodes, edges);
}

// Fully-specified, cached, deduped bundle computation.
async function bundleFor(networkId: string, filter: AnalyticsFilter = DEFAULT_ANALYTICS_FILTER): Promise<NetworkAnalytics> {
  const normalized = sortFilter(filter);
  const hit = cache.get(networkId, normalized, ENGINE_VERSION);
  if (hit) {
    await delay(30);
    return hit;
  }
  const key = cache.key(networkId, normalized, ENGINE_VERSION);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const promise = (async () => {
    await delay(LATENCY);
    const result = computeBundle(networkId, normalized);
    cache.set(networkId, normalized, result, ENGINE_VERSION);
    return result;
  })();
  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

// ------------------------------------------------------------
// Illuminate the filtered subset used for a given request
// ------------------------------------------------------------

export interface AnalyticsRequestOptions {
  filter?: AnalyticsFilter;
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export async function getNetworkAnalytics(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<NetworkAnalytics> {
  return bundleFor(networkId, options.filter);
}

export async function getCentrality(
  networkId: string,
  type: CentralityType,
  options: AnalyticsRequestOptions = {}
): Promise<CentralityResultSet> {
  const bundle = await bundleFor(networkId, options.filter);
  switch (type) {
    case 'degree':
      return bundle.degree as CentralityResultSet;
    case 'betweenness':
      return bundle.betweenness as CentralityResultSet;
    case 'closeness':
      return bundle.closeness as CentralityResultSet;
    case 'pagerank':
      return bundle.pagerank as CentralityResultSet;
    default:
      throw new Error(`Unknown centrality type: ${type}`);
  }
}

export async function getInfluence(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<InfluenceResult[]> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.influence ?? [];
}

export async function getCommunities(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<Community[]> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.communities;
}

export async function getComponents(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<NetworkComponent[]> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.components;
}

export async function getDensity(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<NetworkDensityResult | null> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.density;
}

export async function getSummary(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<NetworkAnalyticsSummary | null> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.summary;
}

export async function getBridges(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<{ entities: BridgeEntity[]; relationships: BridgeRelationship[] }> {
  const bundle = await bundleFor(networkId, options.filter);
  return { entities: bundle.bridges, relationships: bundle.bridgeRelationships };
}

export async function getPatterns(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<StructuralPattern[]> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.patterns;
}

export async function getTemporalAnalytics(
  networkId: string,
  options: AnalyticsRequestOptions = {}
): Promise<TemporalAnalyticsResult | null> {
  const bundle = await bundleFor(networkId, options.filter);
  return bundle.temporal;
}

// ------------------------------------------------------------
// Cache + invalidation helpers
// ------------------------------------------------------------

export function clearAnalyticsCache(networkId?: string): void {
  if (networkId) cache.invalidate(networkId);
  else cache.clear();
}

export const _analyticsInternal = {
  engineVersion: ENGINE_VERSION,
  filtersEqual: analyticsFiltersEqual,
  filterKey: analyticsFilterKey,
  cacheSize: () => cache.size,
  cacheHit: (networkId: string, filter: AnalyticsFilter) =>
    Boolean(cache.get(networkId, sortFilter(filter), ENGINE_VERSION)),
};
