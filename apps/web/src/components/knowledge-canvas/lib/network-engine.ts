// ============================================================
// KNOWLEDGE CANVAS — NETWORK ANALYSIS ENGINE (PORT)
// ============================================================
// Deterministic, AI-free network intelligence computed locally for the
// Canvas Network view: centrality, communities, bridge nodes, hidden
// relationships and suspicious structural patterns.
//
// Ported from the reference Knowledge Canvas ``network/engine.ts`` and
// re-expressed over the Canvas node/edge shapes. It operates on the
// CURRENT visual layer only — it never touches the canonical Trinetra
// Networks feature or the graph store.
// ============================================================

export interface EngineNode {
  id: string;
  label: string;
}

export interface EngineEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface CentralityRow {
  id: string;
  label: string;
  degree: number;
  betweenness: number;
  eigenvector: number;
  overall: number;
}

export interface CommunityResult {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface BridgeResult {
  id: string;
  label: string;
  degree: number;
}

export interface HiddenRelationship {
  a: string;
  b: string;
  sharedNeighbors: number;
  jaccard: number;
  reason: string;
}

export type SuspiciousPatternKind = 'circular_flow' | 'hub_fanout' | 'triadic_closure';

export interface SuspiciousPatternResult {
  kind: SuspiciousPatternKind;
  description: string;
  nodeIds: string[];
  score: number;
}

interface DegreesMap {
  degree: Map<string, number>;
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
}

/** Build neighbor + degree maps. Deterministic (sorted adjacency). */
function buildMaps(nodes: EngineNode[], edges: EngineEdge[]) {
  const adjacency = new Map<string, string[]>();
  const neighbors = new Map<string, Set<string>>();
  const degree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const n of nodes) {
    neighbors.set(n.id, new Set());
    degree.set(n.id, 0);
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }
  for (const e of edges) {
    const s = e.source;
    const t = e.target;
    if (!neighbors.has(s) || !neighbors.has(t)) continue;
    if (s !== t) {
      neighbors.get(s)!.add(t);
      neighbors.get(t)!.add(s);
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
      outDegree.set(s, (outDegree.get(s) ?? 0) + 1);
      inDegree.set(t, (inDegree.get(t) ?? 0) + 1);
      adjacency.get(s)!.push(t);
    }
  }
  for (const key of adjacency.keys()) {
    adjacency.get(key)!.sort();
  }
  return { adjacency, neighbors, degree, inDegree, outDegree };
}

/** Pairwise betweenness (Brandes-free, O(V·E) unweighted counting). */
function betweenness(nodes: EngineNode[], adjacency: Map<string, string[]>, degrees: DegreesMap): Map<string, number> {
  const score = new Map<string, number>();
  for (const n of nodes) score.set(n.id, 0);
  const order = nodes.map((n) => n.id).sort();
  for (const source of order) {
    const queue: string[] = [source];
    const distance = new Map<string, number>([[source, 0]]);
    const paths = new Map<string, number>([[source, 1]]);
    const predecessor = new Map<string, string[]>();
    let qi = 0;
    while (qi < queue.length) {
      const current = queue[qi++];
      const nd = (distance.get(current) ?? 0) + 1;
      const na = (paths.get(current) ?? 0);
      for (const nb of adjacency.get(current) ?? []) {
        const known = distance.get(nb);
        if (known === undefined) {
          distance.set(nb, nd);
          paths.set(nb, na);
          predecessor.set(nb, [current]);
          queue.push(nb);
        } else if (known === nd) {
          paths.set(nb, (paths.get(nb) ?? 0) + na);
          predecessor.get(nb)!.push(current);
        }
      }
    }
    const dependency = new Map<string, number>();
    const rev = [...order].reverse();
    for (const node of rev) {
      const prevs = predecessor.get(node) ?? [];
      const weight = (paths.get(node) ?? 0) + (dependency.get(node) ?? 0);
      for (const p of prevs) {
        if ((paths.get(p) ?? 0) === 0) continue;
        const share = weight / (paths.get(p) ?? 1);
        dependency.set(p, (dependency.get(p) ?? 0) + share);
      }
    }
    for (const node of order) {
      if (node === source) continue;
      score.set(node, (score.get(node) ?? 0) + (dependency.get(node) ?? 0));
    }
  }
  return score;
}

/** Power-iteration eigenvector centrality (deterministic convergence). */
function eigenvector(
  n: number,
  ids: string[],
  neighbors: Map<string, Set<string>>,
  degrees: DegreesMap,
): Map<string, number> {
  const index = new Map<string, number>(ids.map((id, i) => [id, i]));
  const vector = new Float64Array(n).fill(1);
  const next = new Float64Array(n);
  const weight = degrees.degree;
  for (let iter = 0; iter < 64; iter += 1) {
    next.fill(0);
    for (const id of ids) {
      let sum = 0;
      for (const nb of Array.from(neighbors.get(id) ?? []).sort()) {
        sum += vector[index.get(nb)!] / Math.sqrt((weight.get(nb) ?? 1) + 1);
      }
      next[index.get(id)!] = sum;
    }
    let norm = 0;
    for (let i = 0; i < n; i += 1) norm += next[i] * next[i];
    if (norm === 0) break;
    norm = Math.sqrt(norm);
    for (let i = 0; i < n; i += 1) next[i] /= norm;
    vector.set(next);
  }
  const out = new Map<string, number>();
  ids.forEach((id, i) => out.set(id, vector[i]));
  return out;
}

/** Full centrality ranking for the Network view. */
export function calculateCentrality(
  nodes: EngineNode[],
  edges: EngineEdge[],
): CentralityRow[] {
  const { adjacency, neighbors, degree } = buildMaps(nodes, edges);
  const ids = nodes.map((n) => n.id).sort();
  const degreeMap = degree;
  const between = betweenness(nodes, adjacency, { degree, inDegree: degree, outDegree: degree });
  const eigen = eigenvector(ids.length, ids, neighbors, { degree, inDegree: degree, outDegree: degree });

  const maxDegree = Math.max(1, ...ids.map((id) => degreeMap.get(id) ?? 0));
  const maxBetween = Math.max(1, ...ids.map((id) => between.get(id) ?? 0));
  const maxEigen = Math.max(1, ...ids.map((id) => eigen.get(id) ?? 0));

  return ids
    .map((id) => {
      const d = degreeMap.get(id) ?? 0;
      const b = between.get(id) ?? 0;
      const ev = eigen.get(id) ?? 0;
      const overall = (d / maxDegree + b / maxBetween + ev / maxEigen) / 3;
      return {
        id,
        label: nodes.find((n) => n.id === id)?.label ?? id,
        degree: d,
        betweenness: Number(b.toFixed(4)),
        eigenvector: Number(ev.toFixed(4)),
        overall: Number(overall.toFixed(4)),
      };
    })
    .sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
}

/** Label-propagation community detection (deterministic order). */
export function detectCommunities(
  nodes: EngineNode[],
  edges: EngineEdge[],
): CommunityResult[] {
  const { neighbors, degree } = buildMaps(nodes, edges);
  const label = new Map<string, string>();
  for (const n of nodes) label.set(n.id, n.id);
  const ids = nodes.map((n) => n.id).sort();

  const bubble = () => {
    let changed = false;
    for (const id of ids) {
      const nb = Array.from(neighbors.get(id) ?? []).sort();
      const counts = new Map<string, number>();
      for (const other of nb) {
        const l = label.get(other)!;
        counts.set(l, (counts.get(l) ?? 0) + (degree.get(other) ?? 1));
      }
      let best = label.get(id)!;
      let bestCount = counts.get(best) ?? 0;
      for (const [candidate, count] of counts) {
        if (count > bestCount || (count === bestCount && candidate < best)) {
          best = candidate;
          bestCount = count;
        }
      }
      if (best !== label.get(id)) {
        label.set(id, best);
        changed = true;
      }
    }
    return changed;
  };

  let iterations = 0;
  while (bubble() && iterations < 24) iterations += 1;

  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const l = label.get(n.id)!;
    groups.set(l, [...(groups.get(l) ?? []), n.id]);
  }
  return Array.from(groups.entries())
    .map(([id, nodeIds]) => ({
      id,
      label: nodes.find((n) => n.id === id)?.label ?? id,
      nodeIds: nodeIds.sort(),
    }))
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length || a.id.localeCompare(b.id));
}

/** Articulation points (bridge nodes) via iterative Tarjan DFS. */
export function detectBridgeNodes(nodes: EngineNode[], edges: EngineEdge[]): BridgeResult[] {
  const { neighbors, degree } = buildMaps(nodes, edges);
  const ids = nodes.map((n) => n.id).sort();
  const result: BridgeResult[] = [];
  for (const start of ids) {
    const visited = new Set<string>(ids);
    visited.delete(start);
    const timer = new Map<string, number>();
    const low = new Map<string, number>();
    const stack: string[] = [];
    let time = 0;
    for (const root of Array.from(visited).sort()) {
      if (!neighbors.get(root)!.has(start)) break;
    }
    // Count components of start with each neighbor removed.
    const childIds = Array.from(neighbors.get(start) ?? []).sort();
    if (childIds.length < 2) continue;
    let extraComponents = 0;
    for (const removed of childIds) {
      const seen = new Set<string>([start]);
      const queueArr: string[] = [];
      for (const c of childIds) if (c !== removed) queueArr.push(c);
      let qi = 0;
      while (qi < queueArr.length) {
        const current = queueArr[qi++];
        if (seen.has(current)) continue;
        seen.add(current);
        for (const nb of Array.from(neighbors.get(current) ?? []).sort()) {
          if (nb === removed || seen.has(nb)) continue;
          queueArr.push(nb);
        }
      }
      const reachable = seen.size - 1;
      if (reachable < childIds.length - 1) extraComponents += 1;
    }
    if (extraComponents > 0) {
      result.push({
        id: start,
        label: nodes.find((n) => n.id === start)?.label ?? start,
        degree: degree.get(start) ?? 0,
      });
    }
  }
  return result.sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id));
}

/** Missed-link suggestions from common neighbours (Jaccard). */
export function discoverHiddenRelationships(
  nodes: EngineNode[],
  edges: EngineEdge[],
): HiddenRelationship[] {
  const { neighbors } = buildMaps(nodes, edges);
  const existing = new Set<string>(edges.map((e) => `${e.source}|${e.target}`));
  const suggestions: HiddenRelationship[] = [];
  const ids = nodes.map((n) => n.id).sort();
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i];
      const b = ids[j];
      if (existing.has(`${a}|${b}`) || existing.has(`${b}|${a}`)) continue;
      const na = neighbors.get(a) ?? new Set();
      const nb = neighbors.get(b) ?? new Set();
      let shared = 0;
      for (const x of na) if (nb.has(x)) shared += 1;
      if (shared === 0) continue;
      const union = new Set([...na, ...nb]);
      union.add(a);
      union.add(b);
      const jaccard = shared / union.size;
      suggestions.push({
        a,
        b,
        sharedNeighbors: shared,
        jaccard: Number(jaccard.toFixed(3)),
        reason: `${shared} shared connection${shared === 1 ? '' : 's'}`,
      });
    }
  }
  return suggestions
    .filter((s) => s.sharedNeighbors >= 2)
    .sort((x, y) => y.sharedNeighbors - x.sharedNeighbors || x.a.localeCompare(y.a));
}

/** Simple-cycle detection up to maxLength via DFS over sorted adjacency. */
function findCycles(
  adjacency: Map<string, string[]>,
  maxLength: number,
): Array<{ nodeIds: string[]; score: number }> {
  const cycles: Map<string, { nodeIds: string[]; score: number }> = new Map();
  const ids = Array.from(adjacency.keys()).sort();
  for (const start of ids) {
    const stack: Array<Array<{ node: string; path: string[] }>> = [[{ node: start, path: [start] }]];
    while (stack.length) {
      const frontier = stack.pop()!;
      const { node, path } = frontier[0];
      for (const nb of adjacency.get(node) ?? []) {
        if (nb === start) {
          if (path.length >= 3 && path.length <= maxLength) {
            const key = [...path].sort().join('-');
            if (!cycles.has(key)) {
              cycles.set(key, { nodeIds: [...path], score: 1 / path.length });
            }
          }
          continue;
        }
        if (path.includes(nb)) continue;
        if (path.length >= maxLength) continue;
        if (nb < start) continue; // canonical orientation
        stack.push([{ node: nb, path: [...path, nb] }]);
      }
    }
  }
  return Array.from(cycles.values()).sort((a, b) => b.score - a.score);
}

/** Structural anomaly patterns for the Network view. */
export function detectSuspiciousPatterns(
  nodes: EngineNode[],
  edges: EngineEdge[],
): SuspiciousPatternResult[] {
  const { adjacency, neighbors, degree } = buildMaps(nodes, edges);
  const results: SuspiciousPatternResult[] = [];
  const ids = nodes.map((n) => n.id).sort();

  for (const cycle of findCycles(adjacency, 5)) {
    const parts = cycle.nodeIds.map((id) => nodes.find((n) => n.id === id)?.label ?? id);
    results.push({
      kind: 'circular_flow',
      description: `Circular flow observed: ${parts.join(' → ') || cycle.nodeIds.join(' → ')}`,
      nodeIds: cycle.nodeIds,
      score: Number(cycle.score.toFixed(2)),
    });
  }

  for (const id of ids) {
    const hub = degree.get(id) ?? 0;
    if (hub >= 5) {
      results.push({
        kind: 'hub_fanout',
        description: `High-connectivity hub "${nodes.find((n) => n.id === id)?.label ?? id}" with ${hub} links`,
        nodeIds: Array.from(neighbors.get(id) ?? []),
        score: hub / Math.max(1, ids.length),
      });
    }
  }

  for (const a of ids) {
    for (const b of ids) {
      if (a >= b) continue;
      if (neighbors.get(a)?.has(b)) continue;
      const na = neighbors.get(a) ?? new Set();
      const nb = neighbors.get(b) ?? new Set();
      let shared = 0;
      for (const x of na) if (nb.has(x)) shared += 1;
      if (shared < 2) continue;
      results.push({
        kind: 'triadic_closure',
        description: `Potential indirect link between "${nodes.find((n) => n.id === a)?.label ?? a}" and "${nodes.find((n) => n.id === b)?.label ?? b}" (${shared} shared connections)`,
        nodeIds: [a, b],
        score: shared / 8,
      });
    }
  }

  return results
    .filter((r) => r.score >= 0.1)
    .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind));
}

/** Degree map helpers for the Network view summary. */
export function computeDegrees(nodes: EngineNode[], edges: EngineEdge[]): Map<string, number> {
  return buildMaps(nodes, edges).degree;
}