import type {
  GraphNode,
  GraphEdge,
  InfluenceResult,
  AlgorithmMetadata,
  CentralityResultSet,
} from '@trinetra-pulse/types';import {
  computeDegree,
  computeBetweenness,
  computeCloseness,
  computePageRank,
} from './centrality';

// ============================================================
// NETWORK INFLUENCE — COMPOSITE STRUCTURAL IMPORTANCE
// ============================================================
// Blends degree, betweenness, closeness and pagerank into a
// single 0-100 "structural importance" called NETWORK INFLUENCE.
// Explicitly framed as connectivity importance, never guilt.
// ============================================================

export interface InfluenceOptions {
  weights?: { degree?: number; betweenness?: number; closeness?: number; pagerank?: number };
}

export function computeInfluence(
  nodes: GraphNode[],
  edges: GraphEdge[],
  meta: Omit<AlgorithmMetadata, 'nodeCount'>,
  options: InfluenceOptions = {}
): InfluenceResult[] {
  const weights = {
    degree: options.weights?.degree ?? 0.35,
    betweenness: options.weights?.betweenness ?? 0.3,
    closeness: options.weights?.closeness ?? 0.15,
    pagerank: options.weights?.pagerank ?? 0.2,
  };

  const degree = computeDegree(nodes, edges, meta);
  const betweenness = computeBetweenness(nodes, edges, meta);
  const closeness = computeCloseness(nodes, edges, meta);
  const pagerank = computePageRank(nodes, edges, meta);

  const byEntity = <T extends CentralityResultSet>(set: T) => {
    const m = new Map<string, number>();
    for (const r of set.results) m.set(r.entityId, r.score);
    return m;
  };

  // Normalize each within the set to 0-1 for a fair blend.
  const norm = (m: Map<string, number>) => {
    const vals = [...m.values()];
    const max = vals.length ? Math.max(...vals) : 1;
    const out = new Map<string, number>();
    for (const [k, v] of m) out.set(k, max > 0 ? v / max : 0);
    return out;
  };

  const deg = norm(byEntity(degree));
  const bet = norm(byEntity(betweenness));
  const clo = norm(byEntity(closeness));
  const pr = norm(byEntity(pagerank));

  const entityIds = new Set(nodes.map((n) => n.entityId || n.id));
  const out: InfluenceResult[] = [];
  for (const id of entityIds) {
    const raw =
      (deg.get(id) ?? 0) * weights.degree +
      (bet.get(id) ?? 0) * weights.betweenness +
      (clo.get(id) ?? 0) * weights.closeness +
      (pr.get(id) ?? 0) * weights.pagerank;
    out.push({
      entityId: id,
      importance: Math.round(raw * 1000) / 10,
      components: {
        degree: round2(deg.get(id) ?? 0),
        betweenness: round2(bet.get(id) ?? 0),
        closeness: round2(clo.get(id) ?? 0),
        pagerank: round2(pr.get(id) ?? 0),
      },
      rank: 0,
      metadata: { ...meta, nodeCount: nodes.length },
    });
  }

  out.sort((a, b) => b.importance - a.importance);
  out.forEach((r, i) => (r.rank = i + 1));
  return out;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
