import type { GraphEdge, GraphNode } from '@trinetra-pulse/types';

// ============================================================
// GRAPH TRANSFORM (pure)
// ============================================================
// Converts canonical GraphNode/GraphEdge into a library-agnostic
// render descriptor consumed by the GraphEngine. Kept free of
// @xyflow/react so tests never import the ESM package.
// ============================================================

export interface RenderNode {
  id: string;
  entityId: string;
  entityType: GraphNode['type'];
  label: string;
  status: GraphNode['status'];
  confidence: number;
  x: number;
  y: number;
  size: number;
  shape: NonNullable<GraphNode['style']['shape']>;
  color: string;
  connections: number;
  sources: string[];
  activityAt?: string;
  dimmed?: boolean;
  focused?: boolean;
  // Phase 8 analytics overlay visuals (optional; merged by the renderer).
  analyticsSizeScale?: number;
  analyticsTint?: string;
  analyticsAccent?: boolean;
  analyticsDim?: boolean;
  [key: string]: unknown;
}

export interface RenderEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdge['type'];
  label: string;
  confidence: number;
  directed: boolean;
  sourceLabel: string;
  timestamp?: string;
  dimmed?: boolean;
  focused?: boolean;
  [key: string]: unknown;
}

export function transformNode(node: GraphNode): RenderNode {
  return {
    id: node.id,
    entityId: node.entityId,
    entityType: node.type,
    label: node.label,
    status: node.status,
    confidence: node.confidence,
    x: node.position.x,
    y: node.position.y,
    size: node.size,
    shape: node.style.shape ?? 'circle',
    color: node.style.color ?? '',
    connections: node.connections,
    sources: node.sources,
    activityAt: node.activityAt,
    dimmed: false,
    focused: false,
  };
}

export function transformEdge(edge: GraphEdge): RenderEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.type,
    label: edge.label,
    confidence: edge.confidence,
    directed: edge.direction === 'directed',
    sourceLabel: edge.sourceRecordLabel,
    timestamp: edge.timestamp,
    dimmed: false,
    focused: false,
  };
}

export function transformNodes(nodes: GraphNode[]): RenderNode[] {
  return nodes.map(transformNode);
}

export function transformEdges(edges: GraphEdge[]): RenderEdge[] {
  return edges.map(transformEdge);
}

/** Map entity type → accent color in HSL for deterministic theming. */
export function nodeColorFor(entityType: GraphNode['type']): string {
  const palette: Record<GraphNode['type'], number[]> = {
    person: [210, 80, 55],
    phone: [160, 75, 40],
    vehicle: [30, 85, 50],
    location: [120, 60, 45],
    organization: [270, 65, 52],
    account: [340, 70, 50],
    transaction: [15, 80, 50],
    event: [190, 75, 45],
    case: [35, 90, 48],
    document: [200, 70, 50],
    evidence: [315, 70, 52],
  };
  const [h, s, l] = palette[entityType];
  return `hsl(${h}, ${s}%, ${l}%)`;
}
