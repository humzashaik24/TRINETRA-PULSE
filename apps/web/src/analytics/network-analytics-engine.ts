import type {
  GraphNode,
  GraphEdge,
  NetworkAnalytics,
  NetworkAnalyticsEngine as IEngine,
  AnalyticsFilter,
  AlgorithmMetadata,
  Community,
  NetworkComponent,
  BridgeEntity,
  BridgeRelationship,
  NetworkAnalyticsSummary,
  InfluenceResult,
  StructuralPattern,
  TemporalAnalyticsResult,
  CentralityResultSet,
  NetworkDensityResult,
} from '@trinetra-pulse/types';
import { DEFAULT_ANALYTICS_FILTER } from '@trinetra-pulse/types';
import {
  computeDegree,
  computeBetweenness,
  computeCloseness,
  computePageRank,
} from './centrality';
import { computeInfluence } from './influence';
import { computeCommunities } from './community';
import { findConnectedComponents, calculateDensity, calculateSummary, computeAveragePathLengthAndDiameter } from './components';
import { findBridgeEntities } from './bridges';
import { buildTemporalSnapshots } from './temporal';
import { detectStructuralPatterns } from './patterns';
import { applyAnalyticsFilter, analyticsFilterKey } from './filter';

// ============================================================
// NETWORK ANALYTICS ENGINE
// ============================================================
// Orchestrates every structural algorithm over a filtered graph
// and emits a complete NetworkAnalytics bundle. Pure and
// deterministic: the same network + filter + version always yields
// the same output. Caching and job state are the application's
// concern (see the analytics service / store), not the engine's.
// ============================================================

const VERSION = '1.0.0';

export interface EngineOptions {
  networkId: string;
  filter?: AnalyticsFilter;
  computedAt?: string;
}

export class NetworkAnalyticsEngine implements IEngine {
  private readonly networkId: string;
  private readonly filter: AnalyticsFilter;
  private readonly computedAt: string;

  constructor(options: EngineOptions) {
    this.networkId = options.networkId;
    this.filter = options.filter ?? { ...DEFAULT_ANALYTICS_FILTER };
    this.computedAt = options.computedAt ?? new Date().toISOString();
  }

  private meta(algorithm: string, nodeCount: number): AlgorithmMetadata {
    return {
      algorithm,
      version: VERSION,
      computedAt: this.computedAt,
      scope: this.networkId,
      relationshipTypes: this.filter.relationshipTypes,
      timeRange: { from: this.filter.from, to: this.filter.to },
      nodeCount,
    };
  }

  private scope(nodes: GraphNode[], edges: GraphEdge[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return applyAnalyticsFilter(nodes, edges, this.filter);
  }

  // ------------------------------------------------------------
  // Centalities
  // ------------------------------------------------------------

  calculateDegreeCentrality(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return computeDegree(sc, se, this.meta('degree-centrality', sc.length));
  }

  calculateBetweennessCentrality(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return computeBetweenness(sc, se, this.meta('betweenness-centrality', sc.length));
  }

  calculateClosenessCentrality(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return computeCloseness(sc, se, this.meta('closeness-centrality', sc.length));
  }

  calculatePageRank(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return computePageRank(sc, se, this.meta('pagerank', sc.length));
  }

  calculateInfluence(nodes: GraphNode[], edges: GraphEdge[]): InfluenceResult[] {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return computeInfluence(sc, se, this.meta('network-influence', sc.length));
  }

  // ------------------------------------------------------------
  // Community, components, density
  // ------------------------------------------------------------

  detectCommunities(nodes: GraphNode[], edges: GraphEdge[]): Community[] {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return computeCommunities(sc, se);
  }

  findComponents(nodes: GraphNode[], edges: GraphEdge[]): NetworkComponent[] {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return findConnectedComponents(sc, se);
  }

  calculateDensity(nodes: GraphNode[], edges: GraphEdge[]): NetworkDensityResult {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return calculateDensity(sc, se);
  }

  calculateSummary(nodes: GraphNode[], edges: GraphEdge[]): NetworkAnalyticsSummary {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    const components = findConnectedComponents(sc, se);
    const communities = computeCommunities(sc, se);
    const bridges = findBridgeEntities(sc, se, communities, components);
    const paths = computeAveragePathLengthAndDiameter(sc, se);
    return calculateSummary(
      this.networkId,
      sc,
      se,
      components,
      communities.length,
      bridges.entities.map((b) => b.entityId),
      paths.averagePathLength,
      paths.diameter
    );
  }

  findBridges(nodes: GraphNode[], edges: GraphEdge[]): {
    entities: BridgeEntity[];
    relationships: BridgeRelationship[];
  } {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    const components = findConnectedComponents(sc, se);
    const communities = computeCommunities(sc, se);
    return findBridgeEntities(sc, se, communities, components);
  }

  // ------------------------------------------------------------
  // Temporal + patterns
  // ------------------------------------------------------------

  calculateTemporalSnapshots(nodes: GraphNode[], edges: GraphEdge[]): TemporalAnalyticsResult | null {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    return buildTemporalSnapshots(sc, se);
  }

  detectStructuralPatterns(nodes: GraphNode[], edges: GraphEdge[]): StructuralPattern[] {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    const temporal = buildTemporalSnapshots(sc, se);
    const components = findConnectedComponents(sc, se);
    const influence = computeInfluence(sc, se, this.meta('network-influence', sc.length));
    return detectStructuralPatterns({ temporal, components, influence, nodes: sc, edges: se });
  }

  // ------------------------------------------------------------
  // Full bundle
  // ------------------------------------------------------------

  computeAll(nodes: GraphNode[], edges: GraphEdge[]): NetworkAnalytics {
    const { nodes: sc, edges: se } = this.scope(nodes, edges);
    const components = findConnectedComponents(sc, se);
    const communities = computeCommunities(sc, se);
    const bridges = findBridgeEntities(sc, se, communities, components);
    const degree = computeDegree(sc, se, this.meta('degree-centrality', sc.length));
    const betweenness = computeBetweenness(sc, se, this.meta('betweenness-centrality', sc.length));
    const closeness = computeCloseness(sc, se, this.meta('closeness-centrality', sc.length));
    const pagerank = computePageRank(sc, se, this.meta('pagerank', sc.length));
    const influence = computeInfluence(sc, se, this.meta('network-influence', sc.length));
    const density = calculateDensity(sc, se);
    const temporal = buildTemporalSnapshots(sc, se);
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: sc, edges: se });
    const paths = computeAveragePathLengthAndDiameter(sc, se);
    const summary = calculateSummary(
      this.networkId,
      sc,
      se,
      components,
      communities.length,
      bridges.entities.map((b) => b.entityId),
      paths.averagePathLength,
      paths.diameter
    );
    summary.bridgeRelationshipCount = bridges.relationships.length;

    return {
      networkId: this.networkId,
      status: 'complete',
      filters: { ...this.filter },
      summary,
      degree,
      betweenness,
      closeness,
      pagerank,
      influence,
      communities,
      components,
      density,
      bridges: bridges.entities,
      bridgeRelationships: bridges.relationships,
      patterns,
      temporal,
      metadata: this.meta('network-analytics', sc.length),
      error: null,
    };
  }

  getNodeById(nodes: GraphNode[], idOrEntityId: string): GraphNode | undefined {
    return (
      nodes.find((n) => n.entityId === idOrEntityId) ??
      nodes.find((n) => n.id === idOrEntityId)
    );
  }
}

// ------------------------------------------------------------
// Cache + job helpers (application layer)
// ------------------------------------------------------------

export class AnalyticsCache {
  private map = new Map<string, NetworkAnalytics>();

  key(networkId: string, filter: AnalyticsFilter, version = VERSION): string {
    return `${networkId}::${analyticsFilterKey(filter)}::${version}`;
  }

  get(networkId: string, filter: AnalyticsFilter, version = VERSION): NetworkAnalytics | undefined {
    return this.map.get(this.key(networkId, filter, version));
  }

  set(networkId: string, filter: AnalyticsFilter, value: NetworkAnalytics, version = VERSION): void {
    this.map.set(this.key(networkId, filter, version), value);
  }

  invalidate(networkId: string): void {
    for (const key of this.map.keys()) {
      if (key.startsWith(`${networkId}::`)) this.map.delete(key);
    }
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
