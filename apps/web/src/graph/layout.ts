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
  mode: 'force' | 'hierarchical' | 'radial',
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerId?: string | null
): NodePositionMap {
  if (mode === 'hierarchical') return hierarchicalLayout(nodes, edges, width, height);
  if (mode === 'radial') return radialLayout(nodes, edges, width, height, centerId);
  return computeForceLayout(nodes, edges, width, height);
}
