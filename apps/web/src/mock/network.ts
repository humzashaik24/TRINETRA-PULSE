import type { DashboardNetworkSummary, DashboardNetworkNode, DashboardNetworkCluster } from '@trinetra-pulse/types';
import { nexusNetwork } from './nexus-dataset';

// ============================================================
// MOCK — DASHBOARD NETWORK SUMMARY (Nexus-derived)
// ============================================================
// Built deterministically from the Operation Trinetra Nexus
// graph (35 entities / 60 relationships / 3 clusters). Node
// positions use a derived cluster-ring layout; every number is
// computed from the dataset, never hardcoded.
// ============================================================

const CLUSTER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];
const HUB_ENTITY_ID = 'ent-nexus-person-001';
const BRIDGE_ENTITY_ID = 'ent-nexus-person-005';

function layoutNodes(): DashboardNetworkNode[] {
  const clusterCenters: Array<[number, number]> = [
    [0.2, 0.5],
    [0.5, 0.5],
    [0.8, 0.5],
  ];
  const radius = 0.22;
  const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v));

  // Bucket nodes by cluster; nodes without a cluster get a fallback ring.
  const memberships = new Map<string, number>();
  nexusNetwork.clusters.forEach((cluster, ci) => {
    const { nodeIds } = cluster;
    if (Array.isArray(nodeIds)) {
      nodeIds.forEach((id) => memberships.set(id, ci));
    }
  });
  const unassigned = nexusNetwork.nodes.filter((n) => !memberships.has(n.id));
  unassigned.forEach((n, i) => memberships.set(n.id, i % clusterCenters.length));

  const buckets = new Map<number, string[]>();
  nexusNetwork.nodes.forEach((n) => {
    const ci = memberships.get(n.id) ?? 0;
    buckets.set(ci, [...(buckets.get(ci) ?? []), n.id]);
  });

  const placed = new Map<string, { x: number; y: number }>();
  buckets.forEach((nodeIds, ci) => {
    const [cx, cy] = clusterCenters[ci % clusterCenters.length];
    const count = nodeIds.length;
    nodeIds.forEach((id, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      if (id === `${nexusNetwork.id}-n-001`) {
        placed.set(id, { x: cx, y: cy });
      } else {
        placed.set(id, { x: clamp(cx + radius * Math.cos(angle)), y: clamp(cy + radius * Math.sin(angle)) });
      }
    });
  });

  return nexusNetwork.nodes.map((node) => {
    const pos = placed.get(node.id) ?? { x: 0.5, y: 0.5 };
    const isHub = node.entityId === HUB_ENTITY_ID;
    const isBridge = node.entityId === BRIDGE_ENTITY_ID;
    const baseSize = node.style?.size ?? 12;
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      x: pos.x,
      y: pos.y,
      size: isHub ? 18 : isBridge ? 15 : Math.round((baseSize / 23) * 12),
      connections: node.connections,
      highlighted: isHub || isBridge,
    };
  });
}

function countConnectedComponents(): number {
  const adjacency = new Map<string, string[]>();
  for (const node of nexusNetwork.nodes) adjacency.set(node.id, []);
  for (const edge of nexusNetwork.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }
  const visited = new Set<string>();
  let components = 0;
  for (const node of nexusNetwork.nodes) {
    if (visited.has(node.id)) continue;
    components += 1;
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length > 0) {
      const current = queue.pop() as string;
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  return components;
}

export const dashboardNetwork: DashboardNetworkSummary = {
  nodes: layoutNodes(),
  edges: nexusNetwork.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    weight: edge.weight,
  })),
  clusters: nexusNetwork.clusters.map(
    (cluster, ci): DashboardNetworkCluster => ({
      id: cluster.id,
      label: cluster.label,
      nodeIds: cluster.nodeIds,
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
    })
  ),
  density: (2 * nexusNetwork.edges.length) / (nexusNetwork.nodes.length * (nexusNetwork.nodes.length - 1)),
  communityCount: nexusNetwork.clusters.length,
  connectedComponents: countConnectedComponents(),
  averageDegree: (2 * nexusNetwork.edges.length) / nexusNetwork.nodes.length,
  highCentralityCount: nexusNetwork.nodes.filter((n) => n.connections >= 8).length,
};