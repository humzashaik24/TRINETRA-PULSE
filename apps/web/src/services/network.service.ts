import type {
  GraphEdge,
  GraphNeighborhood,
  GraphNode,
  GraphTimelineRange,
  NetworkPath,
  NetworkSearchResult,
  NetworkStatistics,
  NetworkSummary,
  NetworkGraph,
} from '@trinetra-pulse/types';
import {
  mockNetworkGraphById,
  mockNetworkGraphs,
  mockNetworkSummaries,
  mockNetworkSummaryById,
} from '@/mock/networks';

// ============================================================
// NETWORK SERVICE (mock-backed)
// ============================================================
// Graph query surface over the Phase 7 mock network catalogue.
// Each method mirrors an eventual REST endpoint so the API client
// can replace this implementation transparently.
// ============================================================

const LATENCY = 160;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const adjacency = (graph: NetworkGraph) => {
  const map = new Map<string, string[]>();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    map.get(e.source)?.push(e.target);
    map.get(e.target)?.push(e.source);
  }
  return map;
};

const requireGraph = (id: string): NetworkGraph => {
  const graph = mockNetworkGraphById.get(id);
  if (!graph) throw new Error(`Network not found: ${id}`);
  return graph;
};

export interface GraphNeighborhoodOptions {
  depth?: number;
  includeEdges?: boolean;
}

/** Discover the k-hop neighborhood around a node (mock). */
export function expandNeighborhood(
  graph: NetworkGraph,
  centerId: string,
  options: GraphNeighborhoodOptions = {}
): GraphNeighborhood {
  const depth = options.depth ?? 1;
  const adj = adjacency(graph);
  const included = new Set<string>([centerId]);
  const frontier = [centerId];
  for (let hop = 0; hop < depth; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adj.get(id) ?? []) {
        if (!included.has(neighbor)) {
          included.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier.splice(0, frontier.length, ...next);
  }
  const nodes = graph.nodes.filter((n) => included.has(n.id));
  const edges = graph.edges.filter(
    (e) => included.has(e.source) && included.has(e.target)
  );
  return {
    centerId,
    nodes,
    edges: options.includeEdges === false ? [] : edges,
  };
}

/** Compute statistics for a graph or a visible subset. */
export function computeStatistics(
  graph: NetworkGraph,
  visible?: { nodes: Set<string>; edges: Set<string> }
): NetworkStatistics {
  const nodeCount = visible ? visible.nodes.size : graph.nodes.length;
  const edgeCount = visible ? visible.edges.size : graph.edges.length;
  const degrees = new Map<string, number>();
  for (const id of visible ? visible.nodes : new Set(graph.nodes.map((n) => n.id))) {
    degrees.set(id, 0);
  }
  const considerEdge = (e: GraphEdge) =>
    !visible || (visible.nodes.has(e.source) && visible.nodes.has(e.target));
  for (const e of graph.edges) {
    if (!considerEdge(e)) continue;
    if (!degrees.has(e.source)) degrees.set(e.source, 0);
    if (!degrees.has(e.target)) degrees.set(e.target, 0);
    degrees.set(e.source, (degrees.get(e.source) ?? 0) + 1);
    degrees.set(e.target, (degrees.get(e.target) ?? 0) + 1);
  }
  const degreeSum = Array.from(degrees.values()).reduce((a, b) => a + b, 0);
  const averageDegree = nodeCount > 0 ? degreeSum / nodeCount : 0;
  const possible = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 0;
  const density = possible > 0 ? edgeCount / possible : 0;
  return {
    networkId: graph.id,
    nodes: nodeCount,
    relationships: edgeCount,
    clusters: graph.clusters.length,
    connectedComponents: graph.metadata.connectedComponents,
    averageDegree: Math.round(averageDegree * 100) / 100,
    density: Math.round(density * 10000) / 10000,
  };
}

// ---- public API ----------------------------------------------------------

export async function getNetworks(): Promise<NetworkSummary[]> {
  await delay(120);
  return [...mockNetworkSummaries];
}

export async function getNetwork(id: string): Promise<NetworkGraph> {
  await delay(140);
  return requireGraph(id);
}

export async function getNetworkSummary(id: string): Promise<NetworkSummary> {
  await delay(100);
  const summary = mockNetworkSummaryById.get(id);
  if (!summary) throw new Error(`Network not found: ${id}`);
  return summary;
}

export async function getNodes(id: string): Promise<GraphNode[]> {
  await delay(100);
  return [...requireGraph(id).nodes];
}

export async function getEdges(id: string): Promise<GraphEdge[]> {
  await delay(100);
  return [...requireGraph(id).edges];
}

export async function getNeighbors(
  id: string,
  nodeId: string,
  options: GraphNeighborhoodOptions = {}
): Promise<GraphNeighborhood> {
  await delay(120);
  return expandNeighborhood(requireGraph(id), nodeId, options);
}

export async function findPath(
  id: string,
  startId: string,
  endId: string
): Promise<NetworkPath | null> {
  await delay(180);
  const graph = requireGraph(id);
  if (startId === endId) {
    return {
      startEntityId: startId,
      endEntityId: endId,
      nodeIds: [startId],
      edgeIds: [],
      length: 0,
      confidence: 1,
    };
  }
  const start = graph.nodes.find((n) => n.id === startId || n.entityId === startId);
  const end = graph.nodes.find((n) => n.id === endId || n.entityId === endId);
  if (!start || !end) throw new Error('Start or end node not found');

  // BFS to find the shortest path, storing predecessor (node) and edge.
  const parentNode = new Map<string, string>();
  const parentEdge = new Map<string, string>();
  const queue = [start.id];
  const visited = new Set([start.id]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === end.id) break;
    for (const e of graph.edges) {
      let neighbor: string | null = null;
      let edgeId = '';
      if (e.source === current) {
        neighbor = e.target;
        edgeId = e.id;
      } else if (e.target === current) {
        neighbor = e.source;
        edgeId = e.id;
      }
      if (neighbor !== null && !visited.has(neighbor)) {
        visited.add(neighbor);
        parentNode.set(neighbor, current);
        parentEdge.set(neighbor, edgeId);
        queue.push(neighbor);
      }
    }
  }
  if (!visited.has(end.id)) return null;

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cursor: string | null = end.id;
  while (cursor !== null && cursor !== start.id) {
    nodeIds.unshift(cursor);
    const e = parentEdge.get(cursor);
    if (e) edgeIds.unshift(e);
    cursor = parentNode.get(cursor) ?? null;
  }
  nodeIds.unshift(start.id);

  const pathEdges = graph.edges.filter((e) => edgeIds.includes(e.id));
  const confidence =
    pathEdges.length > 0
      ? pathEdges.reduce((sum, e) => sum + e.confidence, 0) / pathEdges.length
      : 1;

  return {
    startEntityId: start.entityId,
    endEntityId: end.entityId,
    nodeIds,
    edgeIds,
    length: nodeIds.length - 1,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export interface TimelineFilterInput {
  from?: string;
  to?: string;
}

export async function getTimeline(
  id: string,
  range: GraphTimelineRange = { from: null, to: null }
): Promise<GraphTimelineRange> {
  await delay(100);
  const graph = requireGraph(id);
  const timestamps = graph.edges.map((e) => e.timestamp).filter(Boolean) as string[];
  const min = timestamps.length ? timestamps.reduce((a, b) => (a < b ? a : b)) : graph.createdAt;
  const max = timestamps.length ? timestamps.reduce((a, b) => (a > b ? a : b)) : graph.updatedAt;
  return {
    from: range.from ?? min,
    to: range.to ?? max,
  };
}

export interface NetworkSearchParams {
  query: string;
  networkId?: string;
}

export async function searchNetwork(params: NetworkSearchParams): Promise<NetworkSearchResult[]> {
  await delay(140);
  const q = params.query.trim().toLowerCase();
  if (!q) return [];
  const graphs = params.networkId
    ? [requireGraph(params.networkId)]
    : mockNetworkGraphs;

  const results: NetworkSearchResult[] = [];
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      const haystack = `${node.label} ${node.entityId} ${node.id}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: node.id,
          kind: 'node',
          entityId: node.entityId,
          label: node.label,
          type: node.type,
          confidence: node.confidence,
          connections: node.connections,
          sourcesCount: node.sources.length,
          status: node.status,
        });
      }
    }
    for (const edge of graph.edges) {
      const haystack = edge.label.toLowerCase();
      if (!q || haystack.includes(q) || edge.id.toLowerCase().includes(q)) {
        results.push({
          id: edge.id,
          kind: 'edge',
          entityId: edge.id,
          label: `${edge.label} (${edge.source} → ${edge.target})`,
          type: 'relationship',
          confidence: edge.confidence,
          status: edge.status,
        });
      }
    }
  }
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 40);
}

export async function getClusters(id: string): Promise<NetworkGraph['clusters']> {
  await delay(100);
  return requireGraph(id).clusters;
}

export async function getStatistics(id: string): Promise<NetworkStatistics> {
  await delay(100);
  return computeStatistics(requireGraph(id));
}
