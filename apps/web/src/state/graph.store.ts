import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  GraphCluster,
  GraphEdge,
  GraphFilters,
  GraphNode,
  GraphTimelineRange,
  NetworkPath,
  NetworkSearchResult,
  NetworkSummary,
} from '@trinetra-pulse/types';
import type { DepthMode } from '@/graph/selectors';
import type { GraphEngine, GraphEngineSelection } from '@/engine/graph-engine';
import { getNeighbors } from '@/services/network.service';
import type { GraphNeighborhood } from '@trinetra-pulse/types';
import { isMockData } from '@/lib/api/config';
import {
  getNetworkGraph,
  mapApiGraphToNetworkGraph,
  mapApiGraphToSummary,
  findNetworkPath,
} from '@/lib/api/investigations';

// ============================================================
// GRAPH STORE (Phase 7)
// ============================================================
// Owns the interactive graph workspace state for the active network:
// canonical nodes/edges/clusters, selection, depth, layout, filters,
// timeline, search, path exploration and viewport interaction mode.
// ============================================================

export type GraphLayoutMode = 'force' | 'hierarchical' | 'radial';
export type GraphInteractionMode = 'select' | 'pan' | 'expand';
export type GraphLoadingState = 'idle' | 'loading' | 'ready' | 'error';

interface GraphState {
  // --- Active network ---
  networkId: string | null;
  summary: NetworkSummary | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
  loadingState: GraphLoadingState;
  error: string | null;

  // --- View / selection ---
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  focusedNodeId: string | null;
  highlightedNodeIds: string[];
  expandedNodeIds: string[];
  depth: DepthMode;
  layout: GraphLayoutMode;
  interactionMode: GraphInteractionMode;

  // --- Filters / timeline / search ---
  filters: GraphFilters;
  timeline: GraphTimelineRange;
  searchQuery: string;
  searchResults: NetworkSearchResult[];
  searching: boolean;

  // --- Path exploration ---
  path: NetworkPath | null;
  pathLoading: boolean;

  // --- Debug / chrome ---
  minimapVisible: boolean;
  fullscreen: boolean;

  // --- Engine ---
  engine: GraphEngine | null;

  // --- Actions ---
  loadNetwork: (networkId: string) => Promise<void>;
  clearNetwork: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  focusNode: (nodeId: string) => void;
  highlightNodes: (nodeIds: string[]) => void;
  toggleExpand: (nodeId: string) => void;
  setDepth: (depth: number) => void;
  setDepthFull: () => void;
  setLayout: (layout: GraphLayoutMode) => void;
  setInteractionMode: (mode: GraphInteractionMode) => void;
  setFilters: (partial: Partial<GraphFilters>) => void;
  setTimeline: (range: Partial<GraphTimelineRange>) => void;
  toggleMinimap: () => void;
  setFullscreen: (value: boolean) => void;
  setEngine: (engine: GraphEngine | null) => void;
  performSearch: (query: string) => Promise<void>;
  applySearchResult: (resultId: string) => void;
  findPath: (fromNodeId: string, toNodeId: string) => Promise<void>;
  clearPath: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  centerOnNode: (nodeId: string) => void;
  expandNode: (nodeId: string) => Promise<void>;
  collapseNode: (nodeId: string) => void;
}

const defaultFilters: GraphFilters = {
  entityTypes: [],
  relationshipTypes: [],
  minConfidence: 0,
  statuses: [],
  sources: [],
  activity: 'all',
};

const noRange: GraphTimelineRange = { from: null, to: null };

export const useGraphStore = create<GraphState>()(
  devtools(
    (set, get) => ({
      networkId: null,
      summary: null,
      nodes: [],
      edges: [],
      clusters: [],
      loadingState: 'idle',
      error: null,

      selectedNodeId: null,
      selectedEdgeId: null,
      focusedNodeId: null,
      highlightedNodeIds: [],
      expandedNodeIds: [],
      depth: { kind: 'hop', centerId: '', depth: 1 },
      layout: 'force',
      interactionMode: 'select',

      filters: defaultFilters,
      timeline: noRange,
      searchQuery: '',
      searchResults: [],
      searching: false,

      path: null,
      pathLoading: false,

      minimapVisible: true,
      fullscreen: false,

      engine: null,

      loadNetwork: async (networkId) => {
        set({ loadingState: 'loading', error: null, networkId });

        if (isMockData()) {
          // --- Mock path: existing behavior ---
          try {
            const { getNetwork, getNetworkSummary, getClusters, getNodes, getEdges, getTimeline } =
              await import('@/services/network.service');
            const [graph, summary, clusters, nodes, edges, timeline] = await Promise.all([
              getNetwork(networkId),
              getNetworkSummary(networkId),
              getClusters(networkId),
              getNodes(networkId),
              getEdges(networkId),
              getTimeline(networkId),
            ]);
            const seedEntityId = graph.metadata.seedEntityId;
            const focusId =
              (seedEntityId && nodes.find((n) => n.entityId === seedEntityId)?.id) ??
              nodes[0]?.id ??
              '';
            // Discard a stale resolution: the investigator may have opened a
            // different network while this load was in flight.
            if (get().networkId !== networkId) return;
            set({
              summary,
              nodes,
              edges,
              clusters,
              timeline,
              selectedNodeId: null,
              selectedEdgeId: null,
              focusedNodeId: focusId,
              highlightedNodeIds: [],
              expandedNodeIds: [],
              depth: { kind: 'hop', centerId: focusId, depth: 1 },
              path: null,
              searchResults: [],
              loadingState: 'ready',
              error: null,
            });
          } catch (err) {
            if (get().networkId !== networkId) return;
            set({
              loadingState: 'error',
              error: err instanceof Error ? err.message : 'Failed to load network',
            });
          }
        } else {
          // --- Real API path (Phase 17.2) ---
          try {
            const apiGraph = await getNetworkGraph(networkId);
            const graph = mapApiGraphToNetworkGraph(apiGraph, networkId);
            const summary = mapApiGraphToSummary(graph);
            const focusId = graph.nodes[0]?.id ?? '';
            if (get().networkId !== networkId) return;
            set({
              summary,
              nodes: graph.nodes,
              edges: graph.edges,
              clusters: graph.clusters,
              timeline: { from: null, to: null },
              selectedNodeId: null,
              selectedEdgeId: null,
              focusedNodeId: focusId,
              highlightedNodeIds: [],
              expandedNodeIds: [],
              depth: { kind: 'hop', centerId: focusId, depth: 1 },
              path: null,
              searchResults: [],
              loadingState: 'ready',
              error: null,
            });
          } catch (err) {
            if (get().networkId !== networkId) return;
            set({
              loadingState: 'error',
              error: err instanceof Error ? err.message : 'Failed to load network',
            });
          }
        }
      },

      clearNetwork: () =>
        set({
          networkId: null,
          summary: null,
          nodes: [],
          edges: [],
          clusters: [],
          loadingState: 'idle',
          selectedNodeId: null,
          selectedEdgeId: null,
          path: null,
          engine: null,
        }),

      selectNode: (nodeId) =>
        set((s) => {
          if (s.selectedNodeId === nodeId) return s;
          return { selectedNodeId: nodeId, selectedEdgeId: null };
        }),
      selectEdge: (edgeId) =>
        set((s) => {
          if (s.selectedEdgeId === edgeId) return s;
          return { selectedEdgeId: edgeId, selectedNodeId: null };
        }),
      clearSelection: () => {
        get().engine?.clearSelection();
        return set({ selectedNodeId: null, selectedEdgeId: null });
      },
      focusNode: (nodeId) => set({ focusedNodeId: nodeId }),
      highlightNodes: (nodeIds) =>
        set({ highlightedNodeIds: Array.from(new Set(nodeIds)) }),

      toggleExpand: (nodeId) =>
        set((s) => {
          const expanded = s.expandedNodeIds.includes(nodeId)
            ? s.expandedNodeIds.filter((id) => id !== nodeId)
            : [...s.expandedNodeIds, nodeId];
          return { expandedNodeIds: expanded };
        }),

      setDepth: (depth) =>
        set((s) => {
          const currentCenter =
            s.depth.kind === 'hop' ? s.depth.centerId : s.focusedNodeId ?? '';
          return { depth: { kind: 'hop', centerId: currentCenter, depth } };
        }),
      setDepthFull: () => set({ depth: { kind: 'full' } }),

      setLayout: (layout) => set({ layout }),
      setInteractionMode: (interactionMode) => set({ interactionMode }),
      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),
      setTimeline: (partial) =>
        set((s) => ({ timeline: { ...s.timeline, ...partial } })),
      toggleMinimap: () => set((s) => ({ minimapVisible: !s.minimapVisible })),
      setFullscreen: (fullscreen) => set({ fullscreen }),
      setEngine: (engine) => set({ engine }),

      performSearch: async (query) => {
        if (!query.trim()) {
          set({ searchQuery: '', searchResults: [], searching: false });
          return;
        }
        set({ searchQuery: query, searching: true });
        try {
          if (!isMockData()) {
            const needle = query.trim().toLowerCase();
            const { nodes, edges } = get();
            const nodeResults: NetworkSearchResult[] = nodes
              .filter((node) => node.label.toLowerCase().includes(needle) || node.entityId.toLowerCase().includes(needle))
              .map((node) => ({
                id: node.id,
                kind: 'node',
                entityId: node.entityId,
                label: node.label,
                type: node.type,
                confidence: node.confidence,
                connections: node.connections,
                sourcesCount: node.sources.length,
                status: node.status,
              }));
            const edgeResults: NetworkSearchResult[] = edges
              .filter((edge) => edge.label.toLowerCase().includes(needle) || edge.type.toLowerCase().includes(needle))
              .map((edge) => ({
                id: edge.id,
                kind: 'edge',
                entityId: edge.relationshipId,
                label: edge.label,
                type: edge.type,
                confidence: edge.confidence,
                status: edge.status,
              }));
            set({ searchResults: [...nodeResults, ...edgeResults].slice(0, 50), searching: false });
            return;
          }
          const { searchNetwork } = await import('@/services/network.service');
          const results = await searchNetwork({ query, networkId: get().networkId ?? undefined });
          set({ searchResults: results, searching: false });
        } catch {
          set({ searchResults: [], searching: false });
        }
      },

      applySearchResult: (resultId) => {
        const { nodes, edges, searchResults } = get();
        const result = searchResults.find((r) => r.id === resultId);
        if (!result) return;
        if (result.kind === 'node') {
          const node = nodes.find((n) => n.id === result.id || n.entityId === result.id);
          if (node) {
            set({
              selectedNodeId: node.id,
              selectedEdgeId: null,
              focusedNodeId: node.id,
              depth: { kind: 'hop', centerId: node.id, depth: 1 },
            });
            get().engine?.viewport.centerOn(node.id);
          }
        } else {
          const edge = edges.find((e) => e.id === result.id);
          if (edge) {
            set({ selectedEdgeId: edge.id, selectedNodeId: null });
          }
        }
      },

      findPath: async (fromNodeId, toNodeId) => {
        if (!get().networkId) return;
        set({ pathLoading: true, path: null });
        try {
          let path: NetworkPath | null;
          if (isMockData()) {
            const { findPath: findPathSvc } = await import('@/services/network.service');
            path = await findPathSvc(get().networkId!, fromNodeId, toNodeId);
          } else {
            const result = await findNetworkPath(get().networkId!, fromNodeId, toNodeId);
            path = result
              ? {
                  startEntityId: result.startEntityId ?? result.start_entity_id ?? fromNodeId,
                  endEntityId: result.endEntityId ?? result.end_entity_id ?? toNodeId,
                  nodeIds: result.nodeIds ?? result.node_ids ?? [],
                  edgeIds: result.edgeIds ?? result.edge_ids ?? [],
                  length: result.length,
                  confidence: result.confidence ?? null,
                }
              : null;
          }
          set({ path, pathLoading: false });
        } catch {
          set({ pathLoading: false, path: null });
        }
      },
      clearPath: () => set({ path: null }),

      zoomIn: () => get().engine?.viewport.zoomIn(),
      zoomOut: () => get().engine?.viewport.zoomOut(),
      fitView: () => get().engine?.viewport.fitView(),
      centerOnNode: (nodeId) => get().engine?.viewport.centerOn(nodeId),

      expandNode: async (nodeId) => {
        if (!get().networkId) return;
        const focused = get().focusedNodeId;
        set({ depth: { kind: 'hop', centerId: nodeId, depth: 1 } });
        // Pull the neighbourhood (cached full graph, but seed focus).
        if (focused !== nodeId) get().focusNode(nodeId);
        if (isMockData()) {
          try {
            await getNeighbors(get().networkId!, nodeId, { depth: 1 });
          } catch {
            /* keep current view */
          }
        }
        set({
          focusedNodeId: nodeId,
          depth: { kind: 'hop', centerId: nodeId, depth: 1 },
          expandedNodeIds: Array.from(new Set([...get().expandedNodeIds, nodeId])),
        });
      },

      collapseNode: (nodeId) =>
        set((s) => ({
          expandedNodeIds: s.expandedNodeIds.filter((id) => id !== nodeId),
        })),
    }),
    { name: 'trinetra-graph' }
  )
);
