import type { EntityType } from './entity';
import type { RelationshipKind } from './entity-intelligence';
import type { GraphNode, GraphEdge } from './network';

// ============================================================
// PHASE 8 — NETWORK ANALYTICS & INTELLIGENCE ENGINE
// ============================================================
// Structural analytics over the Phase 7 knowledge graph.
//
// Every metric answers an investigator question and is anchored to
// a definition. Output is ANALYTICAL, never ACCUSATORY: metrics
// describe structure / influence / connectivity, not criminality.
//
// Confidence semantics: a pattern's confidence reflects confidence
// in detecting the pattern, not probability of guilt. Terms used:
// "structurally important entity", "highly connected entity",
// "bridge entity", "connected community", "observed/inferred
// relationship", "potential structural anomaly".
// ============================================================

// ------------------------------------------------------------
// Metrology
// ------------------------------------------------------------

export type CentralityType =
  | 'degree'
  | 'betweenness'
  | 'closeness'
  | 'pagerank';

/** Reproducibility metadata attached to every analytics result. */
export interface AlgorithmMetadata {
  algorithm: string;
  /** Engine / algorithm version (bumped when a definition changes). */
  version: string;
  computedAt: string;
  /** Network id the metric was scoped to. */
  scope: string;
  relationshipTypes: RelationshipKind[];
  /** ISO range the metric covers. */
  timeRange: { from: string | null; to: string | null };
  /** Node set the metric was computed over (filtered scope). */
  nodeCount: number;
  /** Sections the server could not calculate for this response. */
  unavailableSections?: string[];
}

// ------------------------------------------------------------
// Analytics filter
// ------------------------------------------------------------

export interface AnalyticsFilter {
  entityTypes: EntityType[];
  relationshipTypes: RelationshipKind[];
  communityIds: string[];
  componentIds: string[];
  from: string | null;
  to: string | null;
  sources: string[];
  minConfidence: number;
}

export const DEFAULT_ANALYTICS_FILTER: AnalyticsFilter = {
  entityTypes: [],
  relationshipTypes: [],
  communityIds: [],
  componentIds: [],
  from: null,
  to: null,
  sources: [],
  minConfidence: 0,
};

// ------------------------------------------------------------
// Centrality
// ------------------------------------------------------------

export interface CentralityResult {
  entityId: string;
  score: number;
  normalizedScore: number;
  rank: number;
  /** Connectivity-resolved direct ties (undirected + directed in). */
  degree?: number;
  inDegree?: number;
  outDegree?: number;
  normalizedDegree?: number;
  /** Betweenness-specific explainers. */
  affectedComponents?: number;
  bridgePotential?: number;
  metadata: AlgorithmMetadata;
}

export interface CentralityResultSet {
  type: CentralityType;
  label: string;
  definition: string;
  results: CentralityResult[];
  metadata: AlgorithmMetadata;
}

export interface InfluenceResult {
  entityId: string;
  /** Scaled 0-100 structural importance (composite, explicit). */
  importance: number;
  components: {
    degree: number;
    betweenness: number;
    closeness: number;
    pagerank: number;
  };
  rank: number;
  metadata: AlgorithmMetadata;
}

// ------------------------------------------------------------
// Communities
// ------------------------------------------------------------

export interface Community {
  id: string;
  label: string;
  nodeIds: string[];
  internalEdgeCount: number;
  size: number;
  density: number;
  cohesion: number;
  representativeEntities: string[];
  bridgeEntityIds: string[];
}

// ------------------------------------------------------------
// Connected components
// ------------------------------------------------------------

export interface NetworkComponent {
  componentId: string;
  nodeCount: number;
  edgeCount: number;
  density: number;
  representativeNode: string;
  nodeIds: string[];
}

// ------------------------------------------------------------
// Bridges
// ------------------------------------------------------------

export interface BridgeEntity {
  entityId: string;
  bridgeScore: number;
  /** Community / component ids this entity links. */
  connectedComponents: string[];
  connectedCommunities: string[];
  shortestPathContribution: number;
  rank: number;
}

export interface BridgeRelationship {
  relationshipId: string;
  sourceEntityId: string;
  targetEntityId: string;
  bridgeScore: number;
  connectedComponents: string[];
}

// ------------------------------------------------------------
// Density / statistics
// ------------------------------------------------------------

export interface NetworkDensityResult {
  density: number;
  possibleEdges: number;
  actualEdges: number;
  interpretation: string;
}

export interface NetworkAnalyticsSummary {
  networkId: string;
  nodes: number;
  relationships: number;
  connectedComponents: number;
  communityCount: number;
  averageDegree: number;
  density: number;
  averagePathLength: number | null;
  diameter: number | null;
  bridgeEntityCount: number;
  bridgeRelationshipCount: number;
  topConnectedEntity: string | null;
  topBridgeEntity: string | null;
  networkInfluenceLeader?: string | null;
  largestComponentSize?: number;
  isolatedEntityCount?: number;
}

// ------------------------------------------------------------
// Structural patterns
// ------------------------------------------------------------

export type StructuralPatternType =
  | 'rapid_connection_growth'
  | 'community_merging'
  | 'community_splitting'
  | 'new_bridge_formation'
  | 'sudden_degree_increase'
  | 'new_isolated_component'
  | 'relationship_concentration'
  | 'pattern_unavailable';

export interface StructuralPattern {
  id: string;
  type: StructuralPatternType;
  title: string;
  description: string;
  confidence: number;
  /** Analytical significance only — NEVER probability of guilt. */
  severity: 'info' | 'medium' | 'high';
  affectedEntities: string[];
  affectedRelationships: string[];
  detectedAt: string;
  evidenceReferences: string[];
  period: { from: string; to: string };
  sources: string[];
}

// ------------------------------------------------------------
// Temporal snapshots
// ------------------------------------------------------------

export interface TemporalSnapshotMetric {
  degree: number;
  betweenness: number;
  closeness: number;
  pagerank: number;
}

export interface TemporalNetworkSnapshot {
  period: string;
  label: string;
  nodeCount: number;
  relationshipCount: number;
  newNodes: number;
  newRelationships: number;
  inactiveRelationships: number;
  communityCount: number;
  averageDegree: number;
  density: number;
  /** entityId → per-metric value for that period. */
  metrics: Record<string, TemporalSnapshotMetric>;
  /** Centrality change vs previous period (entityId → delta). */
  centralityChange: Record<string, Partial<TemporalSnapshotMetric>>;
  topEntities: string[];
  /** Edge ids observed as active during this snapshot period. */
  activeEdgeIds: string[];
}

export interface TemporalAnalyticsResult {
  snapshots: TemporalNetworkSnapshot[];
  periodLabels: string[];
}

// ------------------------------------------------------------
// Computed analytics bundle
// ------------------------------------------------------------

export interface NetworkAnalytics {
  networkId: string;
  status: AnalyticsStatus;
  filters: AnalyticsFilter;
  summary: NetworkAnalyticsSummary | null;
  degree: CentralityResultSet | null;
  betweenness: CentralityResultSet | null;
  closeness: CentralityResultSet | null;
  pagerank: CentralityResultSet | null;
  influence: InfluenceResult[] | null;
  communities: Community[];
  components: NetworkComponent[];
  density: NetworkDensityResult | null;
  bridges: BridgeEntity[];
  bridgeRelationships: BridgeRelationship[];
  patterns: StructuralPattern[];
  temporal: TemporalAnalyticsResult | null;
  metadata: AlgorithmMetadata | null;
  error: string | null;
}

// ------------------------------------------------------------
// Job / computation state
// ------------------------------------------------------------

export type AnalyticsStatus =
  | 'idle'
  | 'queued'
  | 'computing'
  | 'complete'
  | 'failed'
  | 'stale';

export type AnalyticsJob =
  | { status: 'idle' }
  | { status: 'queued'; queuedAt: string }
  | { status: 'computing'; startedAt: string; progress: number }
  | { status: 'complete'; finishedAt: string }
  | { status: 'failed'; message: string }
  | { status: 'stale'; lastCompleteAt: string };

// ------------------------------------------------------------
// Analytics interface (what the app consumes)
// ------------------------------------------------------------

export interface NetworkAnalyticsEngine {
  calculateDegreeCentrality(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet;
  calculateBetweennessCentrality(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet;
  calculateClosenessCentrality(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet;
  calculatePageRank(nodes: GraphNode[], edges: GraphEdge[]): CentralityResultSet;
  calculateInfluence(nodes: GraphNode[], edges: GraphEdge[]): InfluenceResult[];
  detectCommunities(nodes: GraphNode[], edges: GraphEdge[]): Community[];
  findComponents(nodes: GraphNode[], edges: GraphEdge[]): NetworkComponent[];
  calculateDensity(nodes: GraphNode[], edges: GraphEdge[]): NetworkDensityResult;
  findBridges(nodes: GraphNode[], edges: GraphEdge[]): {
    entities: BridgeEntity[];
    relationships: BridgeRelationship[];
  };
  calculateSummary(nodes: GraphNode[], edges: GraphEdge[]): NetworkAnalyticsSummary;
  detectStructuralPatterns(nodes: GraphNode[], edges: GraphEdge[]): StructuralPattern[];
  calculateTemporalSnapshots(nodes: GraphNode[], edges: GraphEdge[]): TemporalAnalyticsResult | null;
}
