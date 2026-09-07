import type {
  GraphNode,
  GraphEdge,
  NetworkComponent,
  NetworkDensityResult,
  NetworkAnalyticsSummary,
} from '@trinetra-pulse/types';
import { buildAdjacency } from './centrality';

// ============================================================
// COMPONENTS, DENSITY & NETWORK SUMMARY
// ============================================================

export function findConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): NetworkComponent[] {
  const adj = buildAdjacency(nodes, edges);
  const visited = new Set<string>();
  const nodeById = new Map<string, GraphNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  const components: NetworkComponent[] = [];

  for (const start of adj.nodeIds) {
    if (visited.has(start)) continue;
    const stack = [start];
    const members: string[] = [];
    visited.add(start);
    while (stack.length) {
      const v = stack.pop()!;
      members.push(v);
      for (const nb of adj.neighbors.get(v) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          stack.push(nb);
        }
      }
    }
    const memberSet = new Set(members);
    let edgeCount = 0;
    for (const e of edges) {
      if (memberSet.has(e.source) && memberSet.has(e.target)) edgeCount++;
    }
    const size = members.length;
    const possible = (size * (size - 1)) / 2;
    const nodeIds = [...members].sort((a, b) => a.localeCompare(b));
    components.push({
      componentId: `comp${components.length + 1}`,
      nodeCount: size,
      edgeCount,
      density: possible > 0 ? round3(edgeCount / possible) : 0,
      representativeNode: nodeIdToEntity(nodeById, nodeIds[0]),
      nodeIds,
    });
  }

  return components.sort((a, b) => b.nodeCount - a.nodeCount);
}

export function calculateDensity(nodes: GraphNode[], edges: GraphEdge[]): NetworkDensityResult {
  const n = nodes.length;
  const actualEdges = edges.length;
  const possibleEdges = (n * (n - 1)) / 2;
  const density = possibleEdges > 0 ? actualEdges / possibleEdges : 0;
  let interpretation: string;
  if (density < 0.1) interpretation = 'Sparse — mostly low-connectivity structure.';
  else if (density < 0.35) interpretation = 'Moderate — a mix of tight and loose areas.';
  else interpretation = 'Dense — relationships are closely interconnected across the network.';
  return { density: round3(density), possibleEdges, actualEdges, interpretation };
}

export function calculateSummary(
  networkId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  components: NetworkComponent[],
  communityCount: number,
  bridges: string[],
  avgPathLength: number | null,
  diameter: number | null
): NetworkAnalyticsSummary {
  const adj = buildAdjacency(nodes, edges);
  const totalDegree = [...adj.neighbors.values()].reduce((acc, s) => acc + s.size, 0);
  const avgDegree = nodes.length > 0 ? totalDegree / nodes.length : 0;

  let topConnected: string | null = null;
  let maxDegree = -1;
  const nodeById = new Map<string, GraphNode>();
  for (const n of nodes) nodeById.set(n.id, n);
  for (const n of nodes) {
    const d = adj.neighbors.get(n.id)?.size ?? 0;
    if (d > maxDegree) {
      maxDegree = d;
      topConnected = n.entityId || n.id;
    }
  }

  return {
    networkId,
    nodes: nodes.length,
    relationships: edges.length,
    connectedComponents: components.length,
    communityCount,
    averageDegree: round3(avgDegree),
    density: calculateDensity(nodes, edges).density,
    averagePathLength: avgPathLength,
    diameter,
    bridgeEntityCount: bridges.length,
    bridgeRelationshipCount: 0,
    topConnectedEntity: topConnected,
    topBridgeEntity: bridges[0] ?? null,
  };
}

export function computeAveragePathLengthAndDiameter(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { averagePathLength: number | null; diameter: number | null } {
  const adj = buildAdjacency(nodes, edges);
  const n = adj.nodeIds.length;
  let sum = 0;
  let pairs = 0;
  let maxDist = 0;

  for (const s of adj.nodeIds) {
    const dist = new Map<string, number>();
    for (const id of adj.nodeIds) dist.set(id, -1);
    dist.set(s, 0);
    const queue = [s];
    while (queue.length) {
      const v = queue.shift()!;
      for (const w of adj.neighbors.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
      }
    }
    for (const id of adj.nodeIds) {
      const d = dist.get(id)!;
      if (d > 0) {
        sum += d;
        pairs++;
        maxDist = Math.max(maxDist, d);
      }
    }
  }

  return {
    averagePathLength: pairs > 0 ? round3(sum / pairs) : null,
    diameter: pairs > 0 ? maxDist : null,
  };
}

function nodeIdToEntity(nodeById: Map<string, GraphNode>, id: string): string {
  const node = nodeById.get(id);
  return node ? node.entityId || node.id : id;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
