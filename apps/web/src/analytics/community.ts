import type { GraphNode, GraphEdge, Community } from '@trinetra-pulse/types';
import { buildAdjacency } from './centrality';

// ============================================================
// COMMUNITY DETECTION — CONNECTED GROUPS
// ============================================================
// Louvain-style modularity optimization. Deterministic: ties are
// resolved by node id ordering so output is reproducible. Results
// describe connected clusters, never criminal groups.
// ============================================================

function computeLouvain(nodes: GraphNode[], edges: GraphEdge[]): Map<string, string> {
  const adj = buildAdjacency(nodes, edges);
  const nodeIds = adj.nodeIds;
  const n = nodeIds.length;
  if (n === 0) return new Map();

  const weight = new Map<string, Map<string, number>>();
  for (const id of nodeIds) weight.set(id, new Map());
  const seen = new Set<string>();
  let totalWeight = 0;
  for (const e of edges) {
    if (!weight.has(e.source) || !weight.has(e.target)) continue;
    const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const w = e.weight > 0 ? e.weight : 1;
    weight.get(e.source)!.set(e.target, w);
    weight.get(e.target)!.set(e.source, w);
    totalWeight += w;
  }
  const m = totalWeight;

  const neiWeight = new Map<string, number>();
  for (const id of nodeIds) {
    let s = 0;
    for (const w of weight.get(id)!.values()) s += w;
    neiWeight.set(id, s);
  }

  let community = new Map<string, string>();
  nodeIds.forEach((id, i) => community.set(id, `c${i}`));

  let improved = true;
  let pass = 0;
  while (improved && pass < 40) {
    improved = false;
    for (const id of [...nodeIds].sort()) {
      const cur = community.get(id)!;
      const k = neiWeight.get(id)!;
      // Accumulate per-community neighbor weights.
      const commWeights = new Map<string, number>();
      let kInCur = 0;
      for (const [nb, w] of weight.get(id)!) {
        const c = community.get(nb)!;
        commWeights.set(c, (commWeights.get(c) ?? 0) + w);
        if (c === cur) kInCur += w;
      }
      if (commWeights.size === 0) continue;

      let best = cur;
      let bestDelta = 0;
      for (const [c, sigmaIn] of [...commWeights.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (c === cur) continue;
        let sigmaTot = 0;
        for (const id2 of nodeIds) {
          if (community.get(id2) === c) sigmaTot += neiWeight.get(id2)!;
        }
        const delta = m > 0 ? (sigmaIn - sigmaTot * k / (2 * m)) / m : 0;
        if (delta > bestDelta) {
          bestDelta = delta;
          best = c;
        }
      }
      if (best !== cur) {
        community.set(id, best);
        improved = true;
      }
    }
    pass++;
  }

  return community;
}

export interface CommunityGraphInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function computeCommunities(
  nodes: GraphNode[],
  edges: GraphEdge[],
  _options: { detail?: 'structural' | 'finegrained' } = {}
): Community[] {
  const nodeById = new Map<string, GraphNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  const community = computeLouvain(nodes, edges);
  const buckets = new Map<string, string[]>();
  for (const id of community.keys()) {
    const c = community.get(id)!;
    if (!buckets.has(c)) buckets.set(c, []);
    buckets.get(c)!.push(id);
  }

  const internalEdges = new Map<string, number>();
  for (const c of buckets.keys()) internalEdges.set(c, 0);
  for (const e of edges) {
    const cs = community.get(e.source);
    const ct = community.get(e.target);
    if (cs !== undefined && cs === ct) internalEdges.set(cs, (internalEdges.get(cs) ?? 0) + 1);
  }

  const sorted = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length);

  return sorted.map(([cId, ids], i) => {
    const size = ids.length;
    const internal = internalEdges.get(cId) ?? 0;
    const possible = (size * (size - 1)) / 2;
    const density = possible > 0 ? internal / possible : 0;

    const present = new Set(ids);
    // Pairwise internal cohesion: closed triads proxy via internal edge ratio.
    let connectedPairs = 0;
    for (const e of edges) {
      if (present.has(e.source) && present.has(e.target)) connectedPairs++;
    }
    const cohesion = possible > 0 ? Math.min(1, connectedPairs / possible) : 0;

    const degreeIn = new Map<string, number>();
    for (const id of ids) degreeIn.set(id, 0);
    for (const e of edges) {
      const cs = community.get(e.source);
      const ct = community.get(e.target);
      if (cs !== undefined && cs === ct && cs === cId) {
        degreeIn.set(e.source, (degreeIn.get(e.source) ?? 0) + 1);
        degreeIn.set(e.target, (degreeIn.get(e.target) ?? 0) + 1);
      }
    }
    const top = [...degreeIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => nodeIdToEntity(nodeById, id));

    const bridgeIds = new Set<string>();
    for (const e of edges) {
      const cs = community.get(e.source);
      const ct = community.get(e.target);
      if (cs === cId && ct !== cId) bridgeIds.add(e.source);
      if (ct === cId && cs !== cId) bridgeIds.add(e.target);
    }

    const sortedInternal = [...ids].sort((a, b) => a.localeCompare(b));
    return {
      id: cId,
      label: `Connected Group ${i + 1}`,
      nodeIds: sortedInternal,
      internalEdgeCount: internal,
      size,
      density: round3(density),
      cohesion: round3(cohesion),
      representativeEntities: top.length ? top : sortedInternal.slice(0, 1).map((id) => nodeIdToEntity(nodeById, id)),
      bridgeEntityIds: [...bridgeIds].map((id) => nodeIdToEntity(nodeById, id)),
    };
  });
}

function nodeIdToEntity(nodeById: Map<string, GraphNode>, id: string): string {
  const node = nodeById.get(id);
  return node ? node.entityId || node.id : id;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
