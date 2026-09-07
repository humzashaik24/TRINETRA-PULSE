import type { GraphNode, GraphEdge, AnalyticsFilter } from '@trinetra-pulse/types';

// ============================================================
// ANALYTICS FILTERING
// ============================================================
// Applies an AnalyticsFilter to a node/edge set so analytics can
// be scoped to entity types, relationship types, communities,
// components, sources, confidence and a time range. Deterministic.
// ============================================================

export interface FilteredGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function applyAnalyticsFilter(
  nodes: GraphNode[],
  edges: GraphEdge[],
  filter: AnalyticsFilter
): FilteredGraph {
  const hasAny = (arr: string[]) => arr.length > 0;

  let nodeIds = new Set(nodes.map((n) => n.id));
  const drop = (id: string) => nodeIds.delete(id);

  if (hasAny(filter.entityTypes)) {
    for (const n of nodes) {
      if (!filter.entityTypes.includes(n.type)) drop(n.id);
    }
  }
  if (hasAny(filter.sources)) {
    for (const n of nodes) {
      const hits = filter.sources.some((s) => n.sources.includes(s));
      if (!hits && hasAny(filter.sources)) drop(n.id);
    }
  }

  // Filter by time range on activityAt.
  if (filter.from || filter.to) {
    for (const n of nodes) {
      if (!n.activityAt) {
        drop(n.id);
        continue;
      }
      const t = Date.parse(n.activityAt);
      if (filter.from && t < Date.parse(filter.from)) drop(n.id);
      if (filter.to && t > Date.parse(filter.to)) drop(n.id);
    }
  }

  // Community / component scoping is applied by the engine after
  // detection (membership is only known post-detection).

  const filteredNodes = nodes.filter((n) => nodeIds.has(n.id));
  const nodeSet = new Set(filteredNodes.map((n) => n.id));
  const edgesBetween = edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target));

  let finalEdges = edgesBetween;
  if (hasAny(filter.relationshipTypes)) {
    finalEdges = finalEdges.filter((e) => filter.relationshipTypes.includes(e.type));
  }
  if (filter.minConfidence > 0) {
    finalEdges = finalEdges.filter((e) => e.confidence >= filter.minConfidence);
  }
  if (filter.from || filter.to) {
    finalEdges = finalEdges.filter((e) => {
      if (!e.timestamp) return true;
      const t = Date.parse(e.timestamp);
      if (filter.from && t < Date.parse(filter.from)) return false;
      if (filter.to && t > Date.parse(filter.to)) return false;
      return true;
    });
  }

  return { nodes: filteredNodes, edges: finalEdges };
}

export function analyticsFiltersEqual(a: AnalyticsFilter, b: AnalyticsFilter): boolean {
  return (
    a.entityTypes.join(',') === b.entityTypes.join(',') &&
    a.relationshipTypes.join(',') === b.relationshipTypes.join(',') &&
    a.communityIds.join(',') === b.communityIds.join(',') &&
    a.componentIds.join(',') === b.componentIds.join(',') &&
    a.sources.join(',') === b.sources.join(',') &&
    a.from === b.from &&
    a.to === b.to &&
    a.minConfidence === b.minConfidence
  );
}

export function analyticsFilterKey(filter: AnalyticsFilter): string {
  return JSON.stringify({
    entityTypes: [...filter.entityTypes].sort(),
    relationshipTypes: [...filter.relationshipTypes].sort(),
    communityIds: [...filter.communityIds].sort(),
    componentIds: [...filter.componentIds].sort(),
    sources: [...filter.sources].sort(),
    from: filter.from,
    to: filter.to,
    minConfidence: filter.minConfidence,
  });
}
