import type {
  GraphNode,
  GraphEdge,
  CentralityResultSet,
  CentralityResult,
  AlgorithmMetadata,
} from '@trinetra-pulse/types';

// ============================================================
// CENTRALITY — STRUCTURAL IMPORTANCE OF ENTITIES
// ============================================================
// Pure deterministic algorithms over the graph adjacency model.
// Output reports CONNECTIVITY and STRUCTURAL IMPORTANCE only —
// never criminality. All scores are normalized 0-1 (or 0-100 for
// influence).
// ============================================================

export interface Adjacency {
  /** nodeId -> unique undirected neighbors */
  neighbors: Map<string, Set<string>>;
  /** nodeId -> directed out-neighbors */
  out: Map<string, Set<string>>;
  /** nodeId -> directed in-neighbors */
  in: Map<string, Set<string>>;
  nodeIds: string[];
}

export function buildAdjacency(nodes: GraphNode[], edges: GraphEdge[]): Adjacency {
  const neighbors = new Map<string, Set<string>>();
  const out = new Map<string, Set<string>>();
  const inEdges = new Map<string, Set<string>>();
  const nodeIds = nodes.map((n) => n.id);

  for (const n of nodes) {
    neighbors.set(n.id, new Set());
    out.set(n.id, new Set());
    inEdges.set(n.id, new Set());
  }

  for (const e of edges) {
    if (!neighbors.has(e.source) || !neighbors.has(e.target)) continue;
    neighbors.get(e.source)!.add(e.target);
    neighbors.get(e.target)!.add(e.source);
    out.get(e.source)!.add(e.target);
    inEdges.get(e.target)!.add(e.source);
  }

  return { neighbors, out, in: inEdges, nodeIds };
}

// ------------------------------------------------------------
// DEGREE
// ------------------------------------------------------------

export function computeDegree(
  nodes: GraphNode[],
  edges: GraphEdge[],
  meta: Omit<AlgorithmMetadata, 'nodeCount'>
): CentralityResultSet {
  const adj = buildAdjacency(nodes, edges);
  const out: CentralityResult[] = [];
  const maxDegree = Math.max(
    1,
    ...nodes.map((n) => adj.neighbors.get(n.id)?.size ?? 0)
  );

  for (const n of nodes) {
    const neighbors = adj.neighbors.get(n.id) ?? new Set<string>();
    const outN = adj.out.get(n.id) ?? new Set<string>();
    const inN = adj.in.get(n.id) ?? new Set<string>();
    const degree = neighbors.size;
    out.push({
      entityId: n.entityId || n.id,
      score: degree,
      normalizedScore: degree / maxDegree,
      rank: 0,
      degree,
      inDegree: inN.size,
      outDegree: outN.size,
      normalizedDegree: degree / maxDegree,
      metadata: { ...meta, nodeCount: nodes.length },
    });
  }

  return withRanking(out, 'degree', 'Degree Centrality', 'Direct connections (in + out) an entity holds within the loaded network.', meta, nodes.length);
}

// ------------------------------------------------------------
// BETWEENNESS (Brandes)
// ------------------------------------------------------------

export function computeBetweenness(
  nodes: GraphNode[],
  edges: GraphEdge[],
  meta: Omit<AlgorithmMetadata, 'nodeCount'>
): CentralityResultSet {
  const adj = buildAdjacency(nodes, edges);
  const bc = new Map<string, number>();
  for (const id of adj.nodeIds) bc.set(id, 0);

  for (const s of adj.nodeIds) {
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    for (const id of adj.nodeIds) {
      sigma.set(id, 0);
      dist.set(id, -1);
      predecessors.set(id, []);
    }
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue: string[] = [s];

    while (queue.length) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of adj.neighbors.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0));
          predecessors.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const id of adj.nodeIds) delta.set(id, 0);
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of predecessors.get(w) ?? []) {
        delta.set(v, (delta.get(v) ?? 0) + ((sigma.get(v) ?? 0) / (sigma.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0)));
      }
      if (w !== s) {
        bc.set(w, (bc.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  // Normalize: pairwise sum is (n-1)(n-2)/2 for undirected.
  const n = adj.nodeIds.length;
  const denom = Math.max(1, ((n - 1) * (n - 2)) / 2);
  const maxScore = Math.max(0.000001, ...adj.nodeIds.map((id) => bc.get(id) ?? 0));

  const out: CentralityResult[] = adj.nodeIds.map((id) => {
    const score = bc.get(id) ?? 0;
    return {
      entityId: entitiesById(nodes)[id] ?? id,
      score,
      normalizedScore: score / denom,
      rank: 0,
      affectedComponents: undefined,
      bridgePotential: score / maxScore,
      metadata: { ...meta, nodeCount: nodes.length },
    };
  });

  return withRanking(out, 'betweenness', 'Betweenness Centrality', 'How often an entity sits on shortest paths between other entities — a bridge-entity signal.', meta, nodes.length);
}

// ------------------------------------------------------------
// CLOSENESS
// ------------------------------------------------------------

export function computeCloseness(
  nodes: GraphNode[],
  edges: GraphEdge[],
  meta: Omit<AlgorithmMetadata, 'nodeCount'>
): CentralityResultSet {
  const adj = buildAdjacency(nodes, edges);
  const out: CentralityResult[] = [];

  for (const s of adj.nodeIds) {
    const dist = new Map<string, number>();
    for (const id of adj.nodeIds) dist.set(id, -1);
    dist.set(s, 0);
    const queue: string[] = [s];
    while (queue.length) {
      const v = queue.shift()!;
      for (const w of adj.neighbors.get(v) ?? []) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
      }
    }
    let sum = 0;
    let reachable = 0;
    for (const id of adj.nodeIds) {
      const d = dist.get(id) ?? -1;
      if (d > 0) {
        sum += d;
        reachable++;
      }
    }
    const n = adj.nodeIds.length;
    let score = 0;
    let normalizedScore = 0;
    if (reachable > 0) {
      score = (reachable / (n - 1)) * (reachable / sum);
      normalizedScore = (reachable / Math.max(1, n - 1)) * (reachable / sum);
    }
    out.push({
      entityId: entitiesById(nodes)[s] ?? s,
      score,
      normalizedScore: Math.min(1, normalizedScore),
      rank: 0,
      metadata: { ...meta, nodeCount: nodes.length },
    });
  }

  return withRanking(out, 'closeness', 'Closeness Centrality', 'How quickly an entity can reach the rest of the network through observed connections.', meta, nodes.length);
}

// ------------------------------------------------------------
// PAGERANK
// ------------------------------------------------------------

export function computePageRank(
  nodes: GraphNode[],
  edges: GraphEdge[],
  meta: Omit<AlgorithmMetadata, 'nodeCount'>,
  iterations = 100,
  damping = 0.85
): CentralityResultSet {
  const adj = buildAdjacency(nodes, edges);
  const N = adj.nodeIds.length;
  const rank = new Map<string, number>();
  const next = new Map<string, number>();
  for (const id of adj.nodeIds) rank.set(id, 1 / Math.max(1, N));

  const outDegree = new Map<string, number>();
  for (const id of adj.nodeIds) outDegree.set(id, Math.max(1, (adj.out.get(id)?.size ?? 0)));

  for (let it = 0; it < iterations; it++) {
    let dangling = 0;
    for (const id of adj.nodeIds) {
      if ((adj.out.get(id)?.size ?? 0) === 0) dangling += rank.get(id) ?? 0;
    }
    for (const id of adj.nodeIds) {
      let sum = (1 - damping) / Math.max(1, N);
      if (N > 0) sum += damping * (dangling / N);
      for (const inNode of adj.in.get(id) ?? []) {
        sum += (damping * (rank.get(inNode) ?? 0)) / (outDegree.get(inNode) ?? 1);
      }
      next.set(id, sum);
    }
    for (const id of adj.nodeIds) rank.set(id, next.get(id) ?? 0);
  }

  const maxRank = Math.max(0.000001, ...adj.nodeIds.map((id) => rank.get(id) ?? 0));
  const minRank = Math.min(...adj.nodeIds.map((id) => rank.get(id) ?? 0));
  const range = Math.max(0.000001, maxRank - minRank);

  const out: CentralityResult[] = adj.nodeIds.map((id) => ({
    entityId: entitiesById(nodes)[id] ?? id,
    score: rank.get(id) ?? 0,
    normalizedScore: (range > 0 ? (rank.get(id)! - minRank) / range : 1),
    rank: 0,
    metadata: { ...meta, nodeCount: nodes.length },
  }));

  return withRanking(out, 'pagerank', 'PageRank', 'Network influence: how structurally significant an entity is given who connects to it.', meta, nodes.length);
}

// ------------------------------------------------------------
// Shared ranking
// ------------------------------------------------------------

function withRanking(
  results: CentralityResult[],
  type: CentralityResultSet['type'],
  label: string,
  definition: string,
  meta: Omit<AlgorithmMetadata, 'nodeCount'>,
  nodeCount: number
): CentralityResultSet {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const rankMap = new Map<string, number>();
  sorted.forEach((r, i) => {
    rankMap.set(r.entityId, i + 1);
  });
  const out: CentralityResult[] = results.map((r) => ({
    ...r,
    rank: rankMap.get(r.entityId) ?? results.length,
  }));
  return {
    type,
    label,
    definition,
    results: out,
    metadata: { ...meta, nodeCount },
  };
}

function entitiesById(nodes: GraphNode[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const n of nodes) m[n.id] = n.entityId || n.id;
  return m;
}
