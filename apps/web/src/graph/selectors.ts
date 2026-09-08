import type {
  GraphEdge,
  GraphFilters,
  GraphNode,
  GraphTimelineRange,
} from '@trinetra-pulse/types';

// ============================================================
// GRAPH SELECTORS (pure)
// ============================================================
// Decides which nodes/edges are visible given the current
// filters, depth, expansion set and timeline. Kept free of React
// and the graph library so it is trivially unit-testable.
// ============================================================

export type DepthMode =
  | { kind: 'full' }
  | { kind: 'hop'; centerId: string; depth: number };

function matchesFilters(node: GraphNode, filters: GraphFilters): boolean {
  if (filters.entityTypes.length > 0 && !filters.entityTypes.includes(node.type)) {
    return false;
  }
  if (filters.minConfidence > 0 && node.confidence < filters.minConfidence) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(node.status)) {
    return false;
  }
  if (filters.sources.length > 0 && !node.sources.some((s) => filters.sources.includes(s))) {
    return false;
  }
  if (filters.activity !== 'all' && node.activityAt) {
    const ageDays = (Date.now() - new Date(node.activityAt).getTime()) / 86_400_000;
    if (filters.activity === 'active' && ageDays > 30) return false;
    if (filters.activity === 'recent' && ageDays > 90) return false;
    if (filters.activity === 'inactive' && ageDays < 180) return false;
  }
  return true;
}

function matchesEdgeType(edge: GraphEdge, relationshipTypes: string[]): boolean {
  if (relationshipTypes.length === 0) return true;
  return relationshipTypes.includes(edge.type);
}

export interface SelectorInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  filters: GraphFilters;
  depth: DepthMode;
  timeline: GraphTimelineRange;
  expanded: Set<string>;
}

export interface SelectionResult {
  visibleNodes: GraphNode[];
  visibleEdges: GraphEdge[];
}

function expandedRange(nodes: GraphNode[], edges: GraphEdge[], seed: Set<string>): Set<string> {
  const included = new Set<string>(seed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      const src = included.has(edge.source);
      const tgt = included.has(edge.target);
      if (src && !tgt) {
        included.add(edge.target);
        changed = true;
      } else if (tgt && !src) {
        included.add(edge.source);
        changed = true;
      }
    }
  }
  return included;
}

export function selectVisible(
  input: SelectorInput,
  overrideFilters?: GraphFilters
): SelectionResult {
  const filters = overrideFilters ?? input.filters;

  const nodeById = new Map(input.nodes.map((n) => [n.id, n]));

  // Determine which node ids are structurally visible given depth + expansion.
  let structurallyIncluded: Set<string>;
  if (input.depth.kind === 'full') {
    structurallyIncluded = new Set(input.nodes.map((n) => n.id));
  } else {
    const { centerId, depth } = input.depth;
    const adj = new Map<string, string[]>();
    for (const n of input.nodes) adj.set(n.id, []);
    for (const e of input.edges) {
      adj.get(e.source)?.push(e.target);
      adj.get(e.target)?.push(e.source);
    }
    const frontier = [centerId];
    const seen = new Set<string>([centerId]);
    for (let hop = 0; hop < depth; hop++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const neighbor of adj.get(id) ?? []) {
          if (!seen.has(neighbor)) {
            seen.add(neighbor);
            next.push(neighbor);
          }
        }
      }
      frontier.splice(0, frontier.length, ...next);
    }
    structurallyIncluded = seen;
  }

  // Expanded (user-clicked) nodes additionally pull in their neighbours.
  const expandedClosure = expandedRange(input.nodes, input.edges, new Set(input.expanded));
  for (const id of expandedClosure) structurallyIncluded.add(id);

  // Apply timeline bounds to edges first, then derive nodes from them.
  const inTimeline = (ts: string | undefined) => {
    if (!ts) return true;
    if (input.timeline.from && ts < input.timeline.from) return false;
    if (input.timeline.to && ts > input.timeline.to) return false;
    return true;
  };

  const nodeIdsInEdges = new Set<string>();
  const visibleEdges: GraphEdge[] = [];
  for (const edge of input.edges) {
    if (!structurallyIncluded.has(edge.source)) continue;
    if (!structurallyIncluded.has(edge.target)) continue;
    if (!inTimeline(edge.timestamp)) continue;
    if (!matchesEdgeType(edge, filters.relationshipTypes)) continue;
    // Only keep an edge when both endpoints survive the node filters.
    const srcNode = nodeById.get(edge.source);
    const tgtNode = nodeById.get(edge.target);
    if (srcNode && !matchesFilters(srcNode, filters)) continue;
    if (tgtNode && !matchesFilters(tgtNode, filters)) continue;
    visibleEdges.push(edge);
    nodeIdsInEdges.add(edge.source);
    nodeIdsInEdges.add(edge.target);
  }

  const visibleNodes = input.nodes.filter((n) => {
    if (!structurallyIncluded.has(n.id)) return false;
    if (!matchesFilters(n, filters)) return false;
    // Keep nodes connected by at least one visible edge, or isolated seeds.
    return nodeIdsInEdges.has(n.id) || input.expanded.has(n.id) || input.depth.kind === 'full';
  });

  return { visibleNodes, visibleEdges };
}

export interface SelectionVisuals {
  focusedNodeIds: Set<string>;
  focusedEdgeIds: Set<string>;
}

/** Given a selected node/edge, compute focused + dimmed sets. */
export function selectionVisuals(
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  edges: GraphEdge[],
  visibleEdgeIds: Set<string>
): SelectionVisuals {
  const focusedNodeIds = new Set<string>();
  const focusedEdgeIds = new Set<string>();

  if (selectedNodeId) {
    focusedNodeIds.add(selectedNodeId);
    for (const edge of edges) {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        focusedEdgeIds.add(edge.id);
        focusedNodeIds.add(edge.source);
        focusedNodeIds.add(edge.target);
      }
    }
  } else if (selectedEdgeId) {
    const edge = edges.find((e) => e.id === selectedEdgeId);
    focusedEdgeIds.add(selectedEdgeId);
    if (edge) {
      focusedNodeIds.add(edge.source);
      focusedNodeIds.add(edge.target);
    }
  }

  return { focusedNodeIds, focusedEdgeIds };
}
