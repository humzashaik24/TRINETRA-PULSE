import type { EntityType } from './entity';
import type { RelationshipKind, ExtractionMethod } from './entity-intelligence';
import type { VerificationStatus } from './relationship';

// ============================================================
// PHASE 7 — NETWORK INTELLIGENCE
// ============================================================
// Knowledge graph contracts for the investigation workspace.
//
// Graph nodes reference canonical entities and graph edges
// reference canonical relationships wherever possible. The graph
// is an investigation interface, not a duplicate entity store.
//
// Terminology is intentionally neutral: relationships are
// "observed"/"inferred" evidence with confidence in the
// extraction — never a claim about criminality.
// ============================================================

// ------------------------------------------------------------
// GRAPH LAYOUT
// ------------------------------------------------------------

export type GraphLayoutType = 'force' | 'hierarchical' | 'radial';

export const GRAPH_LAYOUT_TYPES: readonly GraphLayoutType[] = [
  'force',
  'hierarchical',
  'radial',
];

// ------------------------------------------------------------
// GRAPH NODES
// ------------------------------------------------------------

export interface GraphNodePosition {
  x: number;
  y: number;
}

export interface GraphNodeStyle {
  /** Radius of the primary node glyph in px. */
  size: number;
  /** Accent color (hex / hsl). Falls back to the entity palette. */
  color?: string;
  /** Shape of the node glyph. */
  shape?: 'circle' | 'rounded' | 'square' | 'diamond';
}

export type GraphNodeStatus =
  | 'confirmed'
  | 'probable'
  | 'possible'
  | 'needs_review'
  | 'rejected'
  | 'active'
  | 'inactive';

export interface GraphNode {
  id: string;
  /** Canonical entity identifier (Entity.id) when known. */
  entityId: string;
  type: EntityType;
  label: string;
  displayLabel: string;
  status: GraphNodeStatus;
  /** Confidence in entity identification / resolution (0-1). */
  confidence: number;
  position: GraphNodePosition;
  size: number;
  style: GraphNodeStyle;
  /** Direct degree within the loaded network. */
  connections: number;
  /** Source datasets supporting this node. */
  sources: string[];
  /** Latest activity timestamp (ISO) where available. */
  activityAt?: string;
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// GRAPH EDGES
// ------------------------------------------------------------

export type GraphEdgeDirection = 'directed' | 'undirected';

export type GraphEdgeStatus =
  | 'confirmed'
  | 'probable'
  | 'possible'
  | 'needs_review'
  | 'rejected'
  | 'candidate';

export interface GraphEdge {
  id: string;
  /** Canonical relationship identifier (Relationship.id) when known. */
  relationshipId: string;
  source: string;
  target: string;
  type: RelationshipKind;
  label: string;
  confidence: number;
  status: GraphEdgeStatus;
  direction: GraphEdgeDirection;
  weight: number;
  /** Dataset / source supporting this relationship. */
  sourceRecordLabel: string;
  /** Optional timestamp for timeline filtering. */
  timestamp?: string;
  evidence: string[];
  extractionMethod: ExtractionMethod;
  metadata: Record<string, unknown>;
  /** Phase 21 — optional relationship-intelligence summary on the edge. */
  intelligence?: {
    status: string;
    confidence: number;
    confidenceLabel: string;
    sourceCount: number;
    correlationKey: string;
  };
}

// ------------------------------------------------------------
// CLUSTERS
// ------------------------------------------------------------

export interface GraphCluster {
  id: string;
  label: string;
  nodeIds: string[];
  confidence: number;
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// NETWORK SUMMARY
// ------------------------------------------------------------

export type NetworkStatus = 'ready' | 'building' | 'error';

export interface NetworkDateRange {
  start: string | null;
  end: string | null;
}

export interface NetworkSummary {
  id: string;
  name: string;
  description: string;
  status: NetworkStatus;
  nodeCount: number;
  relationshipCount: number;
  clusterCount: number;
  connectedComponents: number;
  sources: string[];
  dateRange: NetworkDateRange;
  createdAt: string;
  updatedAt: string;
  caseId?: string | null;
  seedEntityId?: string | null;
}

// ------------------------------------------------------------
// NETWORK GRAPH
// ------------------------------------------------------------

export interface NetworkGraphMetadata {
  seedEntityId: string | null;
  caseId: string | null;
  sources: string[];
  connectedComponents: number;
  nodeCount: number;
  relationshipCount: number;
}

export interface NetworkGraph {
  id: string;
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
  metadata: NetworkGraphMetadata;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// STATISTICS
// ------------------------------------------------------------

export interface NetworkStatistics {
  networkId: string;
  nodes: number;
  relationships: number;
  clusters: number;
  connectedComponents: number;
  averageDegree: number;
  density: number;
  visibleNodes?: number;
  visibleEdges?: number;
  selectedNodes?: number;
  selectedEdges?: number;
}

// ------------------------------------------------------------
// FILTERS
// ------------------------------------------------------------

export interface GraphFilters {
  entityTypes: EntityType[];
  relationshipTypes: RelationshipKind[];
  minConfidence: number;
  statuses: GraphNodeStatus[];
  sources: string[];
  activity: 'all' | 'active' | 'recent' | 'inactive';
  /** Phase 21 — optional relationship-intelligence status filter. */
  intelligenceStatuses: string[];
}

export interface GraphTimelineRange {
  from: string | null;
  to: string | null;
}

// ------------------------------------------------------------
// PATH EXPLORATION
// ------------------------------------------------------------

export interface NetworkPath {
  startEntityId: string;
  endEntityId: string;
  nodeIds: string[];
  edgeIds: string[];
  length: number;
  confidence: number;
}

// ------------------------------------------------------------
// NEIGHBORHOOD
// ------------------------------------------------------------

export interface GraphNeighborhood {
  centerId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ------------------------------------------------------------
// SEARCH
// ------------------------------------------------------------

export interface NetworkSearchResult {
  id: string;
  kind: 'node' | 'edge' | 'entity';
  entityId: string;
  label: string;
  type: EntityType | RelationshipKind | 'relationship';
  confidence: number;
  connections?: number;
  sourcesCount?: number;
  status?: GraphNodeStatus | GraphEdgeStatus;
}