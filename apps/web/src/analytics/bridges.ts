import type {
  GraphNode,
  GraphEdge,
  BridgeEntity,
  BridgeRelationship,
  Community,
  NetworkComponent,
} from '@trinetra-pulse/types';
import { buildAdjacency, computeBetweenness } from './centrality';

// ============================================================
// BRIDGE ENTITIES & RELATIONSHIPS
// ============================================================
// A bridge entity links otherwise-separate parts of the network
// (components / communities). Identified by articulation points
// (Tarjan) refined with betweenness. Terminology: "bridge entity",
// "connector", "network broker" — connectivity, not criminality.
// ============================================================

export interface BridgeDetection {
  entities: BridgeEntity[];
  relationships: BridgeRelationship[];
}

export function findBridgeEntities(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: Pick<Community, 'id' | 'nodeIds'>[],
  components: NetworkComponent[]
): BridgeDetection {
  const adj = buildAdjacency(nodes, edges);
  const nodeById = new Map<string, GraphNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  // Tarjan articulation points on undirected graph.
  const articulation = findArticulationPoints(adj);
  const betweenness = computeBetweenness(nodes, edges, {
    algorithm: 'betweenness',
    version: '1.0.0',
    computedAt: '',
    scope: '',
    relationshipTypes: [],
    timeRange: { from: null, to: null },
  });
  const betweennessByEntity = new Map<string, number>();
  for (const r of betweenness.results) betweennessByEntity.set(r.entityId, r.normalizedScore);
  const betweennessByNode = new Map<string, number>();
  for (const n of nodes) betweennessByNode.set(n.entityId || n.id, betweennessByEntity.get(n.entityId || n.id) ?? 0);

  // Map nodeId -> set of componentIds it touches.
  const nodeComponents = new Map<string, Set<string>>();
  for (const comp of components) {
    for (const id of comp.nodeIds) {
      if (!nodeComponents.has(id)) nodeComponents.set(id, new Set());
      nodeComponents.get(id)!.add(comp.componentId);
    }
  }
  // Map nodeId -> set of communityIds it touches.
  const nodeCommunities = new Map<string, Set<string>>();
  for (const c of communities) {
    for (const id of c.nodeIds) {
      if (!nodeCommunities.has(id)) nodeCommunities.set(id, new Set());
      nodeCommunities.get(id)!.add(c.id);
    }
  }

  const results: BridgeEntity[] = [];
  for (const n of nodes) {
    const nodeId = n.id;
    const isArticulation = articulation.has(nodeId);
    const joinedComponents = nodeComponents.get(nodeId) ?? new Set<string>();
    const joinedCommunities = nodeCommunities.get(nodeId) ?? new Set<string>();
    if (joinedComponents.size > 1 || isArticulation) {
      const between = betweennessByNode.get(n.entityId || n.id) ?? 0;
      const componentBonus = joinedComponents.size > 1 ? Math.min(0.5, (joinedComponents.size - 1) * 0.25) : 0;
      // Shortest path contribution = proportion of all-pairs paths through this node.
      const shortestPathContribution = between;
      const bridgeScore = Math.min(1, between * 0.6 + componentBonus + (isArticulation ? 0.15 : 0) + Math.min(0.1, joinedCommunities.size * 0.03));
      results.push({
        entityId: n.entityId || n.id,
        bridgeScore: round3(bridgeScore),
        connectedComponents: [...joinedComponents].sort(),
        connectedCommunities: [...joinedCommunities].sort(),
        shortestPathContribution: round3(shortestPathContribution),
        rank: 0,
      });
    }
  }

  results.sort((a, b) => b.bridgeScore - a.bridgeScore);
  results.forEach((r, i) => (r.rank = i + 1));

  // Bridge relationships: edges that bridge components (cross-component ties).
  const relationships: BridgeRelationship[] = [];
  for (const e of edges) {
    const cs = nodeComponents.get(e.source);
    const ct = nodeComponents.get(e.target);
    if (!cs || !ct) continue;
    const crossing = [...cs].filter((c) => !ct.has(c)).length > 0 || [...ct].filter((c) => !cs.has(c)).length > 0;
    if (crossing) {
      relationships.push({
        relationshipId: e.relationshipId || e.id,
        sourceEntityId: nodeIdToEntity(nodeById, e.source),
        targetEntityId: nodeIdToEntity(nodeById, e.target),
        bridgeScore: round3(Math.min(1, (betweennessByNode.get(nodeIdToEntity(nodeById, e.source)) ?? 0) + (betweennessByNode.get(nodeIdToEntity(nodeById, e.target)) ?? 0))),
        connectedComponents: [...new Set([...cs, ...ct])].sort(),
      });
    }
  }
  relationships.sort((a, b) => b.bridgeScore - a.bridgeScore);

  return { entities: results, relationships };
}

// Tarjan's algorithm for articulation points (undirected).
function findArticulationPoints(adj: ReturnType<typeof buildAdjacency>): Set<string> {
  const nodeIds = adj.nodeIds;
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const visited = new Set<string>();
  const articulation = new Set<string>();
  let time = 0;

  for (const root of nodeIds) {
    if (visited.has(root)) continue;
    let rootChildren = 0;
    dfs(root);

    function dfs(u: string) {
      visited.add(u);
      disc.set(u, time);
      low.set(u, time);
      time++;
      for (const v of adj.neighbors.get(u) ?? []) {
        if (!visited.has(v)) {
          parent.set(v, u);
          if (u === root) rootChildren++;
          dfs(v);
          low.set(u, Math.min(low.get(u)!, low.get(v)!));
          if (u !== root && low.get(v)! >= disc.get(u)!) {
            articulation.add(u);
          }
        } else if (v !== parent.get(u)) {
          low.set(u, Math.min(low.get(u)!, disc.get(v)!));
        }
      }
    }

    if (rootChildren > 1) articulation.add(root);
  }

  return articulation;
}

function nodeIdToEntity(nodeById: Map<string, GraphNode>, id: string): string {
  const node = nodeById.get(id);
  return node ? node.entityId || node.id : id;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
