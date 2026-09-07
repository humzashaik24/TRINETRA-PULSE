import type { GraphNode, GraphEdge } from '@trinetra-pulse/types';

// Lightweight test fixture builder for graph analytics. The engine
// only reads a subset of the full GraphNode/GraphEdge contract, so
// fixtures are kept minimal and cast at the call site.

export function node(
  id: string,
  extra: Partial<GraphNode> = {}
): GraphNode {
  return {
    id,
    entityId: id,
    label: id,
    displayLabel: id,
    type: 'person',
    status: 'active',
    confidence: 0.9,
    position: { x: 0, y: 0 },
    size: 1,
    style: { fill: '#fff', stroke: '#000' },
    connections: 0,
    sources: [],
    metadata: {},
    ...extra,
  } as GraphNode;
}

export function edge(
  id: string,
  source: string,
  target: string,
  extra: Partial<GraphEdge> = {}
): GraphEdge {
  return {
    id,
    relationshipId: id,
    source,
    target,
    type: 'KNOWS',
    label: 'knows',
    confidence: 0.9,
    status: 'confirmed',
    direction: 'undirected',
    weight: 1,
    sourceRecordLabel: 'test',
    evidence: [],
    extractionMethod: 'manual',
    metadata: {},
    ...extra,
  } as GraphEdge;
}

/** A star graph: center `a` connects to b, c, d (no other edges). */
export function starGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = [node('a'), node('b'), node('c'), node('d')];
  const edges = [
    edge('ab', 'a', 'b'),
    edge('ac', 'a', 'c'),
    edge('ad', 'a', 'd'),
  ];
  return { nodes, edges };
}

/** Two disjoint pairs: a-b, c-d. */
export function twoComponentGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = [node('a'), node('b'), node('c'), node('d')];
  const edges = [edge('ab', 'a', 'b'), edge('cd', 'c', 'd')];
  return { nodes, edges };
}

const META = { algorithm: 'test', version: '1.0.0', computedAt: '', scope: '', relationshipTypes: [], timeRange: { from: null, to: null } };

export { META };
