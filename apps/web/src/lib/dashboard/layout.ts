/**
 * Generic cluster-ring network layout for the dashboard preview.
 *
 * Unlike ``@/mock/network.ts`` (which is deliberately Nexus-specific and must
 * stay byte-identical), this module lays out any node/edge set: connected
 * components (union-find) become clusters, each component is arranged on a
 * star-ring around the component's highest-degree "hub". All derived numbers
 * (density, degree, centrality thresholds) are computed from the input —
 * never hardcoded.
 */

import type {
  DashboardNetworkCluster,
  DashboardNetworkEdge,
  DashboardNetworkNode,
  DashboardNetworkSummary,
  EntityType,
} from '@trinetra-pulse/types';

export interface NetworkLayoutNode {
  id: string;
  label: string;
  type: EntityType | string;
  size: number;
  connections?: number;
}

export interface NetworkLayoutEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

const CLUSTER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4'];

const CLUSTER_CENTERS: Array<[number, number]> = [
  [0.2, 0.5],
  [0.5, 0.45],
  [0.8, 0.5],
];

const clamp = (value: number) => Math.min(0.97, Math.max(0.03, value));

/** Connected components (labels starting at 0) via union-find. */
export function connectedComponents(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): Map<string, number> {
  const parent = new Map<string, string>();
  for (const id of nodeIds) parent.set(id, id);
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    while (parent.get(id) !== root) {
      const next = parent.get(id) as string;
      parent.set(id, root);
      id = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const edge of edges) union(edge.source, edge.target);

  const roots = new Map<string, number>();
  const membership = new Map<string, number>();
  for (const id of nodeIds) {
    const root = find(id);
    if (!roots.has(root)) roots.set(root, roots.size);
    membership.set(id, roots.get(root) as number);
  }
  return membership;
}

/**
 * Build a positioned dashboard network summary from real workspace data.
 *
 * Placement: each connected component is placed around one of the shared
 * cluster centers; the component's highest-degree node sits at the center and
 * the remaining nodes orbit it on a ring (radius scales gently with size).
 */
export function buildNetworkSummary(input: {
  nodes: NetworkLayoutNode[];
  edges: NetworkLayoutEdge[];
}): DashboardNetworkSummary {
  const nodeIds = input.nodes.map((n) => n.id);
  const membership = connectedComponents(nodeIds, input.edges);

  const degree = new Map<string, number>();
  for (const id of nodeIds) degree.set(id, 0);
  for (const edge of input.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  const buckets = new Map<number, string[]>();
  for (const id of nodeIds) {
    const ci = membership.get(id) ?? 0;
    buckets.set(ci, [...(buckets.get(ci) ?? []), id]);
  }

  const placed = new Map<string, { x: number; y: number }>();
  buckets.forEach((memberIds, ci) => {
    const cx = CLUSTER_CENTERS[ci % CLUSTER_CENTERS.length][0];
    const cy = CLUSTER_CENTERS[ci % CLUSTER_CENTERS.length][1];
    let hub: { id: string; degree: number } = { id: '', degree: -1 };
    for (const id of memberIds) {
      const d = degree.get(id) ?? 0;
      if (d > hub.degree) hub = { id, degree: d };
    }
    const ring = memberIds.filter((id) => id !== hub.id);
    const count = Math.max(1, ring.length);
    const radius = Math.min(0.24, 0.16 + count * 0.012);
    placed.set(hub.id, { x: cx, y: cy });
    ring.forEach((id, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      placed.set(id, {
        x: clamp(cx + radius * Math.cos(angle)),
        y: clamp(cy + radius * Math.sin(angle)),
      });
    });
  });

  const nodes: DashboardNetworkNode[] = input.nodes.map((node) => {
    const d = degree.get(node.id) ?? 0;
    const pos = placed.get(node.id) ?? { x: 0.5, y: 0.5 };
    const baseSize = node.size || 12;
    return {
      id: node.id,
      label: node.label,
      type: node.type as EntityType,
      x: pos.x,
      y: pos.y,
      size: d >= 8 ? 18 : Math.round((baseSize / 23) * 12),
      connections: node.connections ?? d,
      highlighted: d >= 8,
    };
  });

  const componentCount = new Set(membership.values()).size;
  const clusterById = new Map<number, DashboardNetworkCluster>();
  for (const id of nodeIds) {
    const ci = membership.get(id) ?? 0;
    if (!clusterById.has(ci)) {
      clusterById.set(ci, {
        id: `cluster-${ci + 1}`,
        label: componentCount > 1 ? `Community ${ci + 1}` : 'Primary cluster',
        nodeIds: [],
        color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      });
    }
    (clusterById.get(ci) as DashboardNetworkCluster).nodeIds.push(id);
  }

  const edges: DashboardNetworkEdge[] = input.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: edge.weight,
  }));

  const n = nodeIds.length;
  const e = input.edges.length;
  const highCentralityCount = input.nodes.filter((node) => (degree.get(node.id) ?? 0) >= 8).length;

  return {
    nodes,
    edges,
    clusters: Array.from(clusterById.values()),
    density: n > 1 ? (2 * e) / (n * (n - 1)) : 0,
    communityCount: componentCount,
    connectedComponents: componentCount,
    averageDegree: n > 0 ? (2 * e) / n : 0,
    highCentralityCount,
  };
}