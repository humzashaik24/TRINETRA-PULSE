import type { GraphEdge, GraphNode, NetworkPath } from '@trinetra-pulse/types';

// ============================================================
// GRAPH PATH (pure)
// ============================================================
// BFS shortest-path discovery over the in-memory graph used by the
// path-exploration tool. Returns a NetworkPath or null when the two
// nodes are in different connected components.
// ============================================================

export interface PathGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function findShortestPath(
  graph: PathGraph,
  startId: string,
  endId: string
): NetworkPath | null {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const start = nodeById.get(startId);
  const end = nodeById.get(endId);
  if (!start || !end) return null;
  if (startId === endId) {
    return {
      startEntityId: start.entityId,
      endEntityId: end.entityId,
      nodeIds: [startId],
      edgeIds: [],
      length: 0,
      confidence: 1,
    };
  }

  const adjacency = new Map<string, { to: string; edgeId: string }[]>();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push({ to: edge.target, edgeId: edge.id });
    adjacency.get(edge.target)?.push({ to: edge.source, edgeId: edge.id });
  }

  const parentNode = new Map<string, string | null>();
  const parentEdge = new Map<string, string | null>();
  parentNode.set(startId, null);

  const queue = [startId];
  const visited = new Set([startId]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === endId) break;
    for (const { to, edgeId } of adjacency.get(current) ?? []) {
      if (!visited.has(to)) {
        visited.add(to);
        parentNode.set(to, current);
        parentEdge.set(to, edgeId);
        queue.push(to);
      }
    }
  }

  if (!visited.has(endId)) return null;

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cursor: string | null = endId;
  while (cursor !== null && cursor !== startId) {
    nodeIds.unshift(cursor);
    edgeIds.unshift(parentEdge.get(cursor) ?? (cursor as string));
    cursor = parentNode.get(cursor) ?? null;
  }
  if (cursor === startId) nodeIds.unshift(startId);

  const pathEdges = edgeIds
    .map((id) => graph.edges.find((e) => e.id === id))
    .filter((e): e is GraphEdge => Boolean(e));
  const confidence =
    pathEdges.length > 0
      ? pathEdges.reduce((sum, e) => sum + e.confidence, 0) / pathEdges.length
      : 0;

  return {
    startEntityId: nodeById.get(startId)!.entityId,
    endEntityId: nodeById.get(endId)!.entityId,
    nodeIds,
    edgeIds: pathEdges.map((e) => e.id),
    length: nodeIds.length - 1,
    confidence: Math.round(confidence * 100) / 100,
  };
}
