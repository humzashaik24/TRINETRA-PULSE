import type { GraphEdge, GraphNode } from '@trinetra-pulse/types';
import { forceCenter, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';

// ============================================================
// GRAPH LAYOUT (pure)
// ============================================================
// Assigns x/y coordinates to nodes for 'force', 'hierarchical' and
// 'radial' layout modes. Force-mode uses d3-force (simulation);
// hierarchical and radial are deterministic.
// ============================================================

export interface LayoutInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export type NodePositionMap = Map<string, { x: number; y: number }>;

function adjacency(edges: GraphEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    if (!map.has(e.source)) map.set(e.source, []);
    if (!map.has(e.target)) map.set(e.target, []);
    map.get(e.source)!.push(e.target);
    map.get(e.target)!.push(e.source);
  }
  return map;
}

/** Deterministic pseudo-random fallback (stable across runs). */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function radialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerId?: string | null
): NodePositionMap {
  const center = Math.max(width, height) / 2 - 40;
  const result: NodePositionMap = new Map();
  const adj = adjacency(edges);
  const degrees = new Map<string, number>();
  for (const [id, list] of adj) degrees.set(id, list.length);

  const cx = width / 2;
  const cy = height / 2;
  const root: GraphNode | null = centerId
    ? (nodes.find((n) => n.id === centerId) ?? null)
    : nodes.length
      ? nodes.reduce((a, b) =>
          (degrees.get(a.id) ?? 0) > (degrees.get(b.id) ?? 0) ? a : b
        )
      : null;
  const rootId = root?.id;

  // BFS level assignment from root.
  const level = new Map<string, number>();
  if (rootId) {
    const queue = [rootId];
    level.set(rootId, 0);
    while (queue.length) {
      const cur = queue.shift() as string;
      for (const next of adj.get(cur) ?? []) {
        if (!level.has(next)) {
          level.set(next, (level.get(cur) ?? 0) + 1);
          queue.push(next);
        }
      }
    }
  } else {
    for (const n of nodes) level.set(n.id, 0);
  }

  const maxDepth = Math.max(1, ...Array.from(level.values()));
  const rnd = seededRandom(42);
  const angleByLevel = new Map<number, number>();
  for (let d = 0; d <= maxDepth; d++) {
    angleByLevel.set(d, rnd() * Math.PI * 2);
  }

  for (const node of nodes) {
    const lv = level.get(node.id) ?? 0;
    const radius = lv === 0 ? 0 : (center * lv) / maxDepth;
    const angle = (angleByLevel.get(lv) ?? 0) + rnd() * Math.PI;
    result.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return result;
}

export function hierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): NodePositionMap {
  const adj = adjacency(edges);
  const degrees = new Map<string, number>();
  for (const [id, list] of adj) degrees.set(id, list.length);
  const root = nodes.length
    ? nodes.reduce((a, b) => (degrees.get(a.id) ?? 0) > (degrees.get(b.id) ?? 0) ? a : b)
    : null;
  const rootId = root?.id;

  const level = new Map<string, number>();
  if (rootId) {
    const queue = [rootId];
    level.set(rootId, 0);
    while (queue.length) {
      const cur = queue.shift() as string;
      for (const next of adj.get(cur) ?? []) {
        if (!level.has(next)) {
          level.set(next, (level.get(cur) ?? 0) + 1);
          queue.push(next);
        }
      }
    }
  } else {
    for (const n of nodes) level.set(n.id, 0);
  }

  const maxDepth = Math.max(1, ...Array.from(level.values()));
  const result: NodePositionMap = new Map();
  const colByLevel = new Map<number, number>();
  const colIndex = new Map<string, number>();

  for (const node of nodes) {
    const lv = level.get(node.id) ?? 0;
    const idx = colByLevel.get(lv) ?? 0;
    colByLevel.set(lv, idx + 1);
    colIndex.set(node.id, idx);
  }

  for (const node of nodes) {
    const lv = level.get(node.id) ?? 0;
    const depth = maxDepth === 0 ? 1 : maxDepth;
    const x = 80 + ((width - 160) * lv) / depth;
    const idx = colIndex.get(node.id) ?? 0;
    const count = colByLevel.get(lv) ?? 1;
    const y = count <= 1 ? height / 2 : 60 + ((height - 120) * idx) / (count - 1);
    result.set(node.id, { x, y });
  }
  return result;
}

export function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  seedPositions?: NodePositionMap
): NodePositionMap {
  const rnd = seededRandom(7);
  const positions: NodePositionMap = seedPositions ?? new Map();

  // Work with a local node shape that satisfies d3-force's datum contract.
  type SimNode = GraphNode & { x: number; y: number; vx: number; vy: number; fx: number | null; fy: number | null };
  const simNodes = nodes.map((n) => ({
    ...n,
    x: seedPositions?.get(n.id)?.x ?? rnd() * width,
    y: seedPositions?.get(n.id)?.y ?? rnd() * height,
    vx: 0,
    vy: 0,
    fx: null as number | null,
    fy: null as number | null,
  }));
  // d3-force forceLink mutates edge.source/target in place (node id -> node
  // object reference). Clone the edges so the canonical store graph is never
  // corrupted — otherwise selectors, adjacency and React Flow break.
  const simEdges: Array<{ source: SimNode | string; target: SimNode | string }> = edges.map(
    (e) => ({ source: e.source as SimNode | string, target: e.target as SimNode | string })
  );

  const simulation = forceSimulation<SimNode>(simNodes)
    .force(
      'link',
      forceLink<SimNode, { source: SimNode | string; target: SimNode | string }>(simEdges)
        .id((d) => d.id)
        .distance(70)
        .strength(1)
    )
    .force('charge', forceManyBody<SimNode>().strength(-180))
    .force('center', forceCenter<SimNode>(width / 2, height / 2))
    .force('x', forceX<SimNode>(width / 2).strength(0.03))
    .force('y', forceY<SimNode>(height / 2).strength(0.03))
    .stop();

  simulation.alpha(1).restart();
  for (let tick = 0; tick < 220; tick++) simulation.tick();
  simulation.stop();

  for (const n of simNodes) {
    positions.set(n.id, { x: n.x, y: n.y });
  }
  return positions;
}

export function layoutNodes(
  mode: 'clustered' | 'force' | 'hierarchical' | 'radial',
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerId?: string | null
): NodePositionMap {
  if (mode === 'hierarchical') return hierarchicalLayout(nodes, edges, width, height);
  if (mode === 'radial') return radialLayout(nodes, edges, width, height, centerId);
  if (mode === 'clustered') return clusteredLayout(nodes, edges, width, height, centerId);
  return computeForceLayout(nodes, edges, width, height);
}

// ------------------------------------------------------------
// Phase C.5 — deterministic cluster-aware layout
// ------------------------------------------------------------
// Detects communities from topology alone, then positions each
// community as a distinct visual group with its hub centred, and
// places bridge entities between the clusters they connect. Fully
// deterministic (no randomness), so a canonical graph renders in
// the same shape on every machine and every run.
// ------------------------------------------------------------

export interface DetectedCommunity {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface CommunityDetection {
  clusterOf: Map<string, string>;
  clusters: DetectedCommunity[];
}

function undirectedAdjacency(edges: GraphEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    if (!map.has(e.source)) map.set(e.source, []);
    if (!map.has(e.target)) map.set(e.target, []);
    map.get(e.source)!.push(e.target);
    map.get(e.target)!.push(e.source);
  }
  return map;
}

/**
 * Deterministic label-propagation community detection.
 * Iterates in sorted-node order so the outcome is stable; neighbour
 * votes are weighted by the neighbour's degree, with label ties broken
 * lexicographically. Nothing is mutated.
 */
export function detectCommunities(
  nodes: GraphNode[],
  edges: GraphEdge[]
): CommunityDetection {
  const adjacency = undirectedAdjacency(edges);
  const degrees = new Map<string, number>();
  for (const [id, list] of adjacency) degrees.set(id, list.length);
  for (const n of nodes) {
    if (!degrees.has(n.id)) degrees.set(n.id, 0);
    adjacency.set(n.id, [...(adjacency.get(n.id) ?? [])].sort());
  }

  const label = new Map<string, string>();
  for (const n of nodes) label.set(n.id, n.id);
  const ids = nodes.map((n) => n.id).sort();

  const bubble = (): boolean => {
    let changed = false;
    for (const id of ids) {
      const neighbours = adjacency.get(id) ?? [];
      const counts = new Map<string, number>();
      for (const other of neighbours) {
        const l = label.get(other);
        if (!l) continue;
        counts.set(l, (counts.get(l) ?? 0) + (degrees.get(other) ?? 1));
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

  const clusters: DetectedCommunity[] = Array.from(groups.entries())
    .map(([id, nodeIds]) => ({
      id,
      label: nodes.find((n) => n.id === id)?.label ?? id,
      nodeIds: nodeIds.sort(),
    }))
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length || a.id.localeCompare(b.id));

  return { clusterOf: label, clusters };
}

/** Ring placement around local origin. Deterministic, no randomness. */
function localRingPositions(
  memberIds: string[],
  center: { x: number; y: number },
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const perRing = 6;
  memberIds.forEach((id, j) => {
    const ring = Math.floor(j / perRing);
    const slot = j % perRing;
    const radius = (ring + 1) * 150;
    const phase = (ring % 2) * (Math.PI / perRing);
    const angle = (slot / perRing) * Math.PI * 2 + phase;
    positions.set(id, {
      x: Math.round(center.x + radius * Math.cos(angle)),
      y: Math.round(center.y + radius * Math.sin(angle)),
    });
  });
  return positions;
}

/**
 * Deterministic cluster-aware layout. Communities are detected from the
 * graph topology; each cluster's hub (highest degree, ties by id) sits at
 * the cluster centre and its members fan out on rings; bridge entities
 * (incident to nodes of two or more clusters) are placed between the
 * clusters they connect. Does NOT mutate the graph data contract.
 */
export function clusteredLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  _centerId?: string | null
): NodePositionMap {
  const result: NodePositionMap = new Map();
  if (nodes.length === 0) return result;

  const { clusterOf, clusters } = detectCommunities(nodes, edges);
  const adjacency = undirectedAdjacency(edges);
  const degrees = new Map<string, number>();
  for (const [id, list] of adjacency) degrees.set(id, list.length);
  for (const n of nodes) {
    if (!degrees.has(n.id)) degrees.set(n.id, 0);
  }

  const cx = width / 2;
  const cy = height / 2;
  const k = clusters.length;
  const span = Math.max(220, Math.min(width, height) * 0.34);
  const clusterCenter = new Map<string, { x: number; y: number }>();
  clusters.forEach((cluster, index) => {
    const angle = k === 1 ? -Math.PI / 2 : (index / k) * Math.PI * 2;
    clusterCenter.set(cluster.id, {
      x: Math.round(cx + span * Math.cos(angle)),
      y: Math.round(cy + span * Math.sin(angle)),
    });
  });

  // Bridge entities: nodes whose edges are dominated by cross-cluster links
  // (e.g. a dedicated connector between two communities). An in-cluster
  // member that merely touches the connector keeps its place inside the
  // cluster; a member with at least half of its links crossing the boundary
  // is the visual bridge. This is derived purely from topology.
  const crossCount = new Map<string, number>();
  for (const n of nodes) crossCount.set(n.id, 0);
  for (const e of edges) {
    const cs = clusterOf.get(e.source);
    const ct = clusterOf.get(e.target);
    if (cs && ct && cs !== ct) {
      crossCount.set(e.source, (crossCount.get(e.source) ?? 0) + 1);
      crossCount.set(e.target, (crossCount.get(e.target) ?? 0) + 1);
    }
  }
  const bridgeSet = new Set<string>();
  const bridges: string[] = [];
  for (const node of nodes) {
    const cross = crossCount.get(node.id) ?? 0;
    const total = (adjacency.get(node.id) ?? []).length;
    const ratio = total > 0 ? cross / total : 0;
    if (cross >= 1 && ratio >= 0.5) {
      bridgeSet.add(node.id);
      bridges.push(node.id);
    }
  }
  bridges.sort();

  // Intra-cluster degree: only count edges whose endpoints share the same
  // community. This ranks the true in-cluster hub (ties broken by id) and
  // stops cross-cluster bridge edges from disguising a peripheral node as
  // the cluster centre.
  const intraDegree = new Map<string, number>();
  for (const n of nodes) intraDegree.set(n.id, 0);
  for (const e of edges) {
    const cs = clusterOf.get(e.source);
    const ct = clusterOf.get(e.target);
    if (cs && ct && cs === ct) {
      intraDegree.set(e.source, (intraDegree.get(e.source) ?? 0) + 1);
      intraDegree.set(e.target, (intraDegree.get(e.target) ?? 0) + 1);
    }
  }

  // Place members inside their cluster.
  for (const cluster of clusters) {
    const center = clusterCenter.get(cluster.id) ?? { x: cx, y: cy };
    const members = [...cluster.nodeIds]
      .filter((id) => !bridgeSet.has(id))
      .sort((a, b) => {
        const degDiff = (intraDegree.get(b) ?? 0) - (intraDegree.get(a) ?? 0);
        return degDiff || a.localeCompare(b);
      });
    if (members.length > 0) result.set(members[0], center);
    for (const [id, position] of localRingPositions(members.slice(1), center)) {
      result.set(id, position);
    }
  }

  // Place bridges between the relevant cluster centres.
  const placed = new Map(bridges.map((id, index) => [id, index]));
  bridges.forEach((id) => {
    const connected = new Set<string>();
    for (const other of adjacency.get(id) ?? []) {
      const c = clusterOf.get(other);
      if (c) connected.add(c);
    }
    const centres = Array.from(connected)
      .map((c) => clusterCenter.get(c))
      .filter((p): p is { x: number; y: number } => Boolean(p));
    if (centres.length < 2) {
      // Bridge with a single resolved side: keep it just inside that side.
      const anchor = centres[0] ?? { x: cx, y: cy };
      const index = placed.get(id) ?? 0;
      result.set(id, {
        x: Math.round(anchor.x + (index % 2 === 0 ? 80 : -80)),
        y: Math.round(anchor.y + 60),
      });
      return;
    }
    const mx = centres.reduce((sum, p) => sum + p.x, 0) / centres.length;
    const my = centres.reduce((sum, p) => sum + p.y, 0) / centres.length;
    const index = placed.get(id) ?? 0;
    const push = 0.82;
    const perpendicular = (index % 2 === 0 ? 1 : -1) * (Math.floor(index / 2) * 46);
    result.set(id, {
      x: Math.round(cx + (mx - cx) * push),
      y: Math.round(cy + (my - cy) * push + perpendicular),
    });
  });

  // Any node not yet placed (e.g. singletons excluded from bridge handling).
  for (const n of nodes) {
    if (!result.has(n.id)) result.set(n.id, { x: cx, y: cy });
  }

  return result;
}
