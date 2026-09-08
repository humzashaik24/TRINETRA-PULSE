import { useMemo } from 'react';
import { useGraphStore } from '@/state/graph.store';
import { useAnalyticsStore } from '@/state/analytics.store';
import { computeNodeOverlays } from '@/analytics/graph-overlay';
import { selectVisible, selectionVisuals, type DepthMode } from '@/graph/selectors';
import { layoutNodes, type NodePositionMap } from '@/graph/layout';
import {
  transformEdges,
  transformNodes,
  type RenderEdge,
  type RenderNode,
} from '@/graph/transform';
import { computeStatistics } from '@/services/network.service';
import type { GraphNode, GraphEdge, NetworkGraph, NetworkStatistics } from '@trinetra-pulse/types';

// ============================================================
// USE NETWORK RENDER
// ============================================================
// Derives the render-ready node/edge set for the graph engine from
// the graph store: applies filters + depth + timeline + expansion,
// computes layout positions and selection (focus/dim) visuals.
// Pure derivation — no rendering side effects.
// ============================================================

export interface NetworkRender {
  renderNodes: RenderNode[];
  renderEdges: RenderEdge[];
  positions: NodePositionMap;
  statistics: NetworkStatistics;
  focusedNodeIds: Set<string>;
  focusedEdgeIds: Set<string>;
  centerId: string;
  depth: DepthMode;
}

export function useNetworkRender(width: number, height: number): NetworkRender {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const filters = useGraphStore((s) => s.filters);
  const depth = useGraphStore((s) => s.depth);
  const timeline = useGraphStore((s) => s.timeline);
  const expanded = useGraphStore((s) => s.expandedNodeIds);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId);
  const layout = useGraphStore((s) => s.layout);
  const networkId = useGraphStore((s) => s.networkId);
  const path = useGraphStore((s) => s.path);
  const highlightedNodeIds = useGraphStore((s) => s.highlightedNodeIds);

  const analyticsOverlay = useAnalyticsStore((s) => s.overlay);
  const analyticsBundle = useAnalyticsStore((s) => s.bundle);

  const overlayMap = useMemo(
    () => computeNodeOverlays(analyticsBundle, analyticsOverlay),
    [analyticsBundle, analyticsOverlay]
  );

  const { visibleNodes, visibleEdges } = useMemo(
    () =>
      selectVisible({
        nodes,
        edges,
        filters,
        depth,
        timeline,
        expanded: new Set(expanded),
      }),
    [nodes, edges, filters, depth, timeline, expanded]
  );

  const centerId = depth.kind === 'hop' ? depth.centerId : (visibleNodes[0]?.id ?? '');

  const positions = useMemo(
    () =>
      layoutNodes(
        layout,
        visibleNodes,
        visibleEdges,
        Math.max(width, 240),
        Math.max(height, 240),
        centerId
      ),
    [layout, visibleNodes, visibleEdges, width, height, centerId]
  );

  const visibleEdgeIdSet = useMemo(() => new Set(visibleEdges.map((e) => e.id)), [visibleEdges]);

  const focused = useMemo(
    () => selectionVisuals(selectedNodeId, selectedEdgeId, edges, visibleEdgeIdSet),
    [selectedNodeId, selectedEdgeId, edges, visibleEdgeIdSet]
  );

  const pathNodeIds = useMemo(() => (path ? new Set(path.nodeIds) : new Set<string>()), [path]);
  const pathEdgeIds = useMemo(() => (path ? new Set(path.edgeIds) : new Set<string>()), [path]);

  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;
  const highlighted = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);

  const renderNodes = useMemo<RenderNode[]>(() => {
    const base = transformNodes(visibleNodes);
    return base.map((n) => {
      const ov = overlayMap.get(n.entityId);
      return {
        ...n,
        x: positions.get(n.id)?.x ?? n.x,
        y: positions.get(n.id)?.y ?? n.y,
        focused: focused.focusedNodeIds.has(n.id) || pathNodeIds.has(n.id) || highlighted.has(n.id) || highlighted.has(n.entityId),
        dimmed:
          hasSelection &&
          !focused.focusedNodeIds.has(n.id) &&
          !focused.focusedEdgeIds.has(edges.find((e) => e.source === n.id || e.target === n.id)?.id ?? '') &&
          !pathNodeIds.has(n.id) &&
          !highlighted.has(n.id) &&
          !highlighted.has(n.entityId),
        analyticsSizeScale: ov?.sizeScale,
        analyticsTint: ov?.tint,
        analyticsAccent: ov?.accent,
        analyticsDim: ov?.dim,
      };
    });
  }, [visibleNodes, positions, focused, hasSelection, pathNodeIds, edges, overlayMap, highlighted]);

  const renderEdges = useMemo<RenderEdge[]>(() => {
    const base = transformEdges(visibleEdges);
    return base.map((e) => ({
      ...e,
      focused: focused.focusedEdgeIds.has(e.id) || pathEdgeIds.has(e.id),
      dimmed:
        hasSelection &&
        !focused.focusedEdgeIds.has(e.id) &&
        !pathEdgeIds.has(e.id),
    }));
  }, [visibleEdges, focused, hasSelection, pathEdgeIds]);

  const statistics = useMemo<NetworkStatistics>(() => {
    const graph: NetworkGraph = {
      id: networkId ?? '',
      name: '',
      description: '',
      nodes: visibleNodes as GraphNode[],
      edges: visibleEdges as GraphEdge[],
      clusters: [],
      metadata: {
        seedEntityId: null,
        caseId: null,
        sources: [],
        connectedComponents: 0,
        nodeCount: visibleNodes.length,
        relationshipCount: visibleEdges.length,
      },
      createdAt: '',
      updatedAt: '',
    };
    const stats = computeStatistics(graph);
    return {
      ...stats,
      clusters: stats.clusters,
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      selectedNodes: selectedNodeId ? 1 : 0,
      selectedEdges: selectedEdgeId ? 1 : 0,
    };
  }, [visibleNodes, visibleEdges, networkId, selectedNodeId, selectedEdgeId]);

  return {
    renderNodes,
    renderEdges,
    positions,
    statistics,
    focusedNodeIds: focused.focusedNodeIds,
    focusedEdgeIds: focused.focusedEdgeIds,
    centerId,
    depth,
  };
}
