import type {
  GraphNode,
  GraphEdge,
  TemporalNetworkSnapshot,
  TemporalSnapshotMetric,
  TemporalAnalyticsResult,
} from '@trinetra-pulse/types';
import { buildAdjacency, computeDegree, computeBetweenness, computeCloseness, computePageRank } from './centrality';
import { computeCommunities } from './community';

// ============================================================
// TEMPORAL NETWORK SNAPSHOTS
// ============================================================
// Builds period-by-period snapshots from node/edge timestamps so
// analysts can see how the network's structure and connectivity
// evolved over time. Deterministic period bucketing; cumulative
// bookkeeping is kept local to the builder and dropped from output.
// ============================================================

export interface TemporalOptions {
  periods?: number;
}

export function buildTemporalSnapshots(
  nodes: GraphNode[],
  edges: GraphEdge[],
  _options: TemporalOptions = {}
): TemporalAnalyticsResult | null {
  const now = Date.now();
  const nodeTimes = new Map<string, number>();
  for (const n of nodes) {
    if (n.activityAt) {
      const t = Date.parse(n.activityAt);
      if (!Number.isNaN(t)) nodeTimes.set(n.id, t);
    }
  }
  const edgeTimes = new Map<string, number>();
  for (const e of edges) {
    if (e.timestamp) {
      const t = Date.parse(e.timestamp);
      if (!Number.isNaN(t)) edgeTimes.set(e.id, t);
    }
  }

  if (nodeTimes.size === 0 && edgeTimes.size === 0) return null;

  const allTimes = [...nodeTimes.values(), ...edgeTimes.values()].filter((t) => t > 0);
  if (allTimes.length === 0) return null;

  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const periods = Math.max(1, Math.min(8, _options.periods ?? 5));
  const span = Math.max(1, maxTime - minTime);
  const per = span / periods;

  let cumulativeNodes = new Set<string>();
  let cumulativeEdges = new Set<string>();
  let prevMetrics: Record<string, TemporalSnapshotMetric> = {};
  const snapshots: TemporalNetworkSnapshot[] = [];

  const nodeById = new Map<string, GraphNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  for (let p = 0; p < periods; p++) {
    const startT = minTime + p * per;
    const endT = p === periods - 1 ? maxTime + 1 : minTime + (p + 1) * per;
    const fromStr = new Date(startT).toISOString();
    const toStr = new Date(endT - 1).toISOString();

    const activeNodeIds = new Set<string>();
    for (const [id, t] of nodeTimes) {
      if (t >= startT && t < endT) activeNodeIds.add(id);
    }
    for (const [id, t] of edgeTimes) {
      if (t >= startT && t < endT) {
        const e = edges.find((x) => x.id === id);
        if (e) {
          if (nodeById.has(e.source)) activeNodeIds.add(e.source);
          if (nodeById.has(e.target)) activeNodeIds.add(e.target);
        }
      }
    }

    const activeNodes = nodes.filter((n) => activeNodeIds.has(n.id));
    const activeEdges = edges.filter((e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target));

    const prevActiveEdgeIds = snapshots.length ? new Set(snapshots[snapshots.length - 1].activeEdgeIds) : new Set<string>();
    const newNodes = [...activeNodeIds].filter((id) => !cumulativeNodes.has(id)).length;
    const newRelationships = activeEdges.filter((e) => !cumulativeEdges.has(e.id)).length;
    const inactiveRelationships = snapshots.length
      ? [...prevActiveEdgeIds].filter((id) => !activeEdges.some((e) => e.id === id)).length
      : 0;

    for (const id of activeNodeIds) cumulativeNodes.add(id);
    for (const e of activeEdges) cumulativeEdges.add(e.id);

    const comms = activeNodes.length > 0 ? computeCommunities(activeNodes, activeEdges) : [];
    const metrics = computePeriodMetrics(activeNodes, activeEdges);

    const centralityChange: Record<string, Partial<TemporalSnapshotMetric>> = {};
    for (const [id, m] of Object.entries(metrics)) {
      const prev = prevMetrics[id];
      if (prev) {
        centralityChange[id] = {
          degree: round3(m.degree - prev.degree),
          betweenness: round3(m.betweenness - prev.betweenness),
          closeness: round3(m.closeness - prev.closeness),
          pagerank: round3(m.pagerank - prev.pagerank),
        };
      }
    }
    prevMetrics = metrics;

    const topEntities = Object.entries(metrics)
      .sort((a, b) => b[1].degree + b[1].betweenness - (a[1].degree + a[1].betweenness))
      .slice(0, 5)
      .map(([entityId]) => entityId);

    const nodeCount = activeNodes.length;
    snapshots.push({
      period: `${fromStr}|${toStr}`,
      label: periodLabel(fromStr, toStr, p, periods),
      nodeCount,
      relationshipCount: activeEdges.length,
      newNodes,
      newRelationships,
      inactiveRelationships,
      communityCount: comms.length,
      averageDegree: round3(nodeCount ? (activeEdges.length * 2) / nodeCount : 0),
      density: round3(nodeCount > 1 ? activeEdges.length / ((nodeCount * (nodeCount - 1)) / 2) : 0),
      metrics,
      centralityChange,
      topEntities,
      activeEdgeIds: activeEdges.map((e) => e.id),
    });
  }

  return { snapshots, periodLabels: snapshots.map((s) => s.label) };
}

function computePeriodMetrics(nodes: GraphNode[], edges: GraphEdge[]): Record<string, TemporalSnapshotMetric> {
  const meta = { algorithm: 'temporal', version: '1.0.0', computedAt: '', scope: '', relationshipTypes: [], timeRange: { from: null, to: null } };
  const degree = computeDegree(nodes, edges, meta);
  const betweenness = computeBetweenness(nodes, edges, meta);
  const closeness = computeCloseness(nodes, edges, meta);
  const pagerank = computePageRank(nodes, edges, meta);

  const byEntity = (set: { results: { entityId: string; score: number }[] }) => {
    const m = new Map<string, number>();
    for (const r of set.results) m.set(r.entityId, r.score);
    const vals = [...m.values()];
    const max = vals.length ? Math.max(...vals) : 1;
    const out = new Map<string, number>();
    for (const [k, v] of m) out.set(k, max > 0 ? v / max : 0);
    return out;
  };

  const d = byEntity(degree);
  const b = byEntity(betweenness);
  const c = byEntity(closeness);
  const p = byEntity(pagerank);
  const ids = new Set(nodes.map((n) => n.entityId || n.id));

  const result: Record<string, TemporalSnapshotMetric> = {};
  for (const id of ids) {
    result[id] = {
      degree: round3(d.get(id) ?? 0),
      betweenness: round3(b.get(id) ?? 0),
      closeness: round3(c.get(id) ?? 0),
      pagerank: round3(p.get(id) ?? 0),
    };
  }
  return result;
}

function periodLabel(fromStr: string, toStr: string, p: number, total: number): string {
  if (total <= 1) return fromStr.slice(0, 7);
  const start = fromStr.slice(0, 10);
  const end = toStr.slice(0, 10);
  if (start === end) return start;
  return `${start} → ${end}`;
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
