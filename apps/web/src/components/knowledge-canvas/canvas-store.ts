import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Connection } from '@xyflow/react';
import type { RelationshipKind } from '@trinetra-pulse/types';
import {
  type CanvasAuditEntry,
  type CanvasChatMessage,
  type CanvasEdge,
  type CanvasEdgeData,
  type CanvasNode,
  type CanvasNodeData,
  type CanvasTab,
} from './canvas-types';
import { canvasEdgeId, nextAuditId, nowIso } from './canvas-utils';

// ============================================================
// KNOWLEDGE CANVAS — WORKSPACE STORE
// ============================================================
// Owns the visual layer of the Canvas: nodes, edges, selection, active
// tab, floating panels, conversation, settings and the canvas-local audit
// journal. Canonical Trinetra objects are never stored here — nodes
// reference them via ``refId`` and the workspace seeds from the
// investigation store on load.
// ============================================================

export interface CanvasState {
  investigationId: string | null;
  networkId: string | null;
  dataSource: 'demo' | 'persisted' | null;
  loading: boolean;


  searchTerm: string;
  setSearchTerm: (term: string) => void;
  error: string | null;
  loaded: boolean;

  addEntityOpen: boolean;
  setAddEntityOpen: (open: boolean) => void;
  addEvidenceOpen: boolean;
  setAddEvidenceOpen: (open: boolean) => void;
  addNoteOpen: boolean;
  setAddNoteOpen: (open: boolean) => void;

  focusedNodeId: string | null;
  rightDrawerTab: 'inspector' | 'ai';

  userPositions: Record<string, { x: number; y: number }>;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  editingEdgeId: string | null;

  tab: CanvasTab;
  aiOpen: boolean;
  importOpen: boolean;
  settingsOpen: boolean;

  minimap: boolean;
  showLabels: boolean;
  animateNodes: boolean;

  messages: CanvasChatMessage[];
  audit: CanvasAuditEntry[];

  /** Bump to ask the graph viewport to refit (may be 0). */
  fitRequest: number;

  updateNodePosition: (id: string, position: { x: number; y: number }) => void;

  seedFromInvestigation: (input: {
    investigationId: string;
    networkId: string | null;
    dataSource: 'demo' | 'persisted';
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  }) => void;
  setLoading: (v: boolean) => void;
  setError: (message: string | null) => void;
  setLoaded: (v: boolean) => void;
  setInvestigation: (id: string | null, networkId: string | null) => void;

  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, patch: Partial<CanvasNodeData>) => void;
  removeNodes: (ids: string[]) => void;
  selectNode: (id: string | null) => void;
  focusNode: (nodeId: string | null) => void;
  setRightDrawerTab: (tab: 'inspector' | 'ai') => void;

  addEdge: (connection: Connection, data?: Partial<CanvasEdgeData>) => CanvasEdge | null;
  updateEdge: (id: string, patch: Partial<CanvasEdgeData>) => void;
  removeEdge: (id: string) => void;
  setEditingEdge: (id: string | null) => void;

  setTab: (tab: CanvasTab) => void;
  setAiOpen: (v: boolean) => void;
  setImportOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;

  setMinimap: (v: boolean) => void;
  setShowLabels: (v: boolean) => void;
  setAnimateNodes: (v: boolean) => void;
  requestFit: () => void;

  pushMessage: (message: CanvasChatMessage) => void;
  clearMessages: () => void;

  appendAudit: (input: { action: string; detail: string; actor?: string }) => void;
  clearAudit: () => void;

  /** Stable id for brand-new local canvas objects. */
  nextLocalId: () => string;
}












const EMPTY = {
  investigationId: null,
  networkId: null,
  dataSource: null,
  loading: false,
  searchTerm: '',
  addEntityOpen: false,
  addEvidenceOpen: false,
  addNoteOpen: false,
  focusedNodeId: null,
  rightDrawerTab: 'inspector' as const,
  userPositions: {} as Record<string, { x: number; y: number }>,
  error: null,
  loaded: false,
  nodes: [] as CanvasNode[],
  edges: [] as CanvasEdge[],
  selectedNodeId: null,
  editingEdgeId: null,
  tab: 'graph' as CanvasTab,
  aiOpen: true,
  importOpen: false,
  settingsOpen: false,
  minimap: true,
  showLabels: true,
  animateNodes: true,
  messages: [] as CanvasChatMessage[],
  audit: [] as CanvasAuditEntry[],
  fitRequest: 0,
};

function defaultRelationshipFor(
  connection: Connection,
): { label: string; relationship: RelationshipKind | null } {
  // Keep the label generic until the investigator edits it through the
  // edge editor. connection.sourceHandle not used — edges stay       simple.
  return { label: 'related to', relationship: null };
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      ...EMPTY,

      seedFromInvestigation: ({ investigationId, networkId, dataSource, nodes, edges }) => {
        const userPositions = get().userPositions;
        const preservedNodes = nodes.map((node) => {
          const customPos = userPositions[node.id];
          return customPos ? { ...node, position: customPos } : node;
        });
        set({
          investigationId,
          networkId,
          dataSource,
          nodes: preservedNodes,
          edges,
          selectedNodeId: null,
          editingEdgeId: null,
          focusedNodeId: null,
          loaded: true,
          loading: false,
          error: null,
        });
      },

      updateNodePosition: (id, position) => {
        const userPositions = { ...get().userPositions, [id]: position };
        const nodes = get().nodes.map((n) => (n.id === id ? { ...n, position } : n));
        set({ userPositions, nodes });
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setLoaded: (loaded) => set({ loaded }),
      setInvestigation: (investigationId, networkId) => set({ investigationId, networkId }),
      setSearchTerm: (term) => set({ searchTerm: term }),
      setAddEntityOpen: (open) => set({ addEntityOpen: open }),
      setAddEvidenceOpen: (open) => set({ addEvidenceOpen: open }),
      setAddNoteOpen: (open) => set({ addNoteOpen: open }),
      setRightDrawerTab: (rightDrawerTab) => set({ rightDrawerTab }),

      addNode: (node) => {
        const exists = get().nodes.some((n) => n.id === node.id);
        if (exists) return;
        set({ nodes: [...get().nodes, node] });
        get().appendAudit({ action: 'node_created', detail: node.data.label });
      },

      updateNode: (id, patch) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        }),

      removeNodes: (ids) => {
        const removed = get().nodes.filter((n) => ids.includes(n.id));
        set({
          nodes: get().nodes.filter((n) => !ids.includes(n.id)),
          edges: get().edges.filter(
            (e) => !ids.includes(e.source) && !ids.includes(e.target),
          ),
          selectedNodeId: ids.includes(get().selectedNodeId ?? '')
            ? null
            : get().selectedNodeId,
          focusedNodeId: ids.includes(get().focusedNodeId ?? '')
            ? null
            : get().focusedNodeId,
        });
        for (const node of removed) {
          get().appendAudit({ action: 'node_deleted', detail: node.data.label });
        }
      },

      selectNode: (id) =>
        set({
          selectedNodeId: id,
          editingEdgeId: null,
          rightDrawerTab: id ? 'inspector' : get().rightDrawerTab,
          nodes: get().nodes.map((n) => ({
            ...n,
            data: { ...n.data, selected: n.id === id },
          })),
        }),

      focusNode: (nodeId) => {
        if (!nodeId) {
          set({
            focusedNodeId: null,
            nodes: get().nodes.map((n) => ({
              ...n,
              data: { ...n.data, focusedCenter: false, dimmed: false },
            })),
          });
          get().requestFit();
          return;
        }
        const targetNode = get().nodes.find((n) => n.id === nodeId || n.data.refId === nodeId);
        if (!targetNode) return;
        const targetId = targetNode.id;
        const connectedEdges = get().edges.filter((e) => e.source === targetId || e.target === targetId);
        const neighborIds = new Set<string>();
        neighborIds.add(targetId);
        for (const e of connectedEdges) {
          neighborIds.add(e.source);
          neighborIds.add(e.target);
        }
        set({
          focusedNodeId: targetId,
          selectedNodeId: targetId,
          rightDrawerTab: 'inspector',
          nodes: get().nodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              selected: n.id === targetId,
              focusedCenter: n.id === targetId,
              dimmed: !neighborIds.has(n.id),
            },
          })),
        });
        get().requestFit();
        get().appendAudit({ action: 'focus_node', detail: targetNode.data.label });
      },

      addEdge: (connection, data) => {
        if (!connection.source || !connection.target) return null;
        if (connection.source === connection.target) return null;
        const base = defaultRelationshipFor(connection);
        const label = data?.label ?? base.label;
        const relationship = data?.relationship ?? base.relationship;
        const edge: CanvasEdge = {
          id: canvasEdgeId(connection.source, connection.target, relationship),
          source: connection.source,
          target: connection.target,
          type: 'knowledge',
          label,
          data: {
            relationship,
            label,
            confidence: data?.confidence ?? null,
            origin: data?.origin ?? 'user',
            refId: data?.refId ?? null,
          },
        };
        if (get().edges.some((e) => e.id === edge.id)) return null;
        set({ edges: [...get().edges, edge] });
        get().appendAudit({
          action: 'edge_created',
          detail: `${connection.source} -> ${connection.target}`,
        });
        return edge;
      },

      updateEdge: (id, patch) =>
        set({
          edges: get().edges.map((e) =>
            e.id === id
              ? ({
                  ...e,
                  label: patch.label ?? e.data?.label ?? 'related to',
                  data: { ...(e.data as CanvasEdgeData), ...patch },
                } as CanvasEdge)
              : e,
          ),
        }),

      removeEdge: (id) => {
        set({ edges: get().edges.filter((e) => e.id !== id), editingEdgeId: get().editingEdgeId === id ? null : get().editingEdgeId });
        get().appendAudit({ action: 'edge_deleted', detail: id });
      },

      setEditingEdge: (editingEdgeId) => set({ editingEdgeId }),

      setTab: (tab) => set({ tab }),
      setAiOpen: (aiOpen) => set({ aiOpen }),
      setImportOpen: (importOpen) => set({ importOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      setMinimap: (minimap) => set({ minimap }),
      setShowLabels: (showLabels) => set({ showLabels }),
      setAnimateNodes: (animateNodes) => set({ animateNodes }),
      requestFit: () => set({ fitRequest: get().fitRequest + 1 }),

      pushMessage: (message) => set({ messages: [...get().messages, message] }),
      clearMessages: () => set({ messages: [] }),

      appendAudit: (input) => {
        const entry: CanvasAuditEntry = {
          id: nextAuditId(),
          at: nowIso(),
          action: input.action,
          detail: input.detail,
          actor: input.actor ?? 'Investigator',
        };
        set({ audit: [...get().audit.slice(-499), entry] });
      },

      clearAudit: () => set({ audit: [] }),

      nextLocalId: () => {
        localCounter += 1;
        return `local-${localCounter}`;
      },
    }),
    { name: 'trinetra-knowledge-canvas' },
  ),
);

let localCounter = 0;

/** Reset the store (used on investigation switch / in tests). */
export function resetCanvasStore(): void {
  useCanvasStore.setState({ ...EMPTY });
}
