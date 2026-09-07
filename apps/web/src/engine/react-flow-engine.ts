import {
  registerGraphEngine,
  type GraphEngine,
  type GraphEngineFactory,
  type GraphEngineSelection,
  type GraphEngineViewport,
} from './graph-engine';
import type { RenderEdge, RenderNode } from '@/graph/transform';

// ============================================================
// REACT FLOW — CONCRETE GRAPH ENGINE
// ============================================================
// Implements the library-agnostic GraphEngine contract on top of
// @xyflow/react. The renderer is mounted imperatively into the
// supplied container by the factory; all imperative viewport
// operations are delegated to an API surface that a mounted
// ReactFlow viewport registers with the engine instance.
//
// Application logic only ever depends on GraphEngine (engine.ts);
// this module is the interchangeable, library-specific binding.
// ============================================================

/** Imperative surface the mounted React Flow viewport provides. */
export interface ReactFlowVideoApi {
  setNodes: (nodes: RenderNode[]) => void;
  setEdges: (edges: RenderEdge[]) => void;
  setNodePositions: (positions: Map<string, { x: number; y: number }>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: (opts?: { padding?: number; maxZoom?: number }) => void;
  centerOn: (nodeId: string) => void;
  clearSelection: () => void;
  getVisibleNodeIds: () => string[];
  getVisibleEdgeIds: () => string[];
}

class ReactFlowEngine implements GraphEngine {
  readonly id = `react-flow-${Math.random().toString(36).slice(2, 9)}`;

  private nodes: RenderNode[] = [];
  private edges: RenderEdge[] = [];
  private selectionCb: ((sel: GraphEngineSelection | null) => void) | null = null;
  private subscribers = new Set<() => void>();
  private api: ReactFlowVideoApi | null = null;

  // --- data updates (before viewport mounts) ---
  setNodes(nodes: RenderNode[]) {
    this.nodes = nodes;
    this.api?.setNodes(nodes);
    this.emit();
  }

  setEdges(edges: RenderEdge[]) {
    this.edges = edges;
    this.api?.setEdges(edges);
    this.emit();
  }

  setNodePositions(positions: Map<string, { x: number; y: number }>) {
    this.api?.setNodePositions(positions);
  }

  clearSelection() {
    this.api?.clearSelection();
  }

  viewport: GraphEngineViewport = {
    zoomIn: () => this.api?.zoomIn(),
    zoomOut: () => this.api?.zoomOut(),
    fitView: (opts) => this.api?.fitView(opts),
    centerOn: (nodeId) => this.api?.centerOn(nodeId),
    getBoundingBox: () => this.boundingBox,
  };

  onSelectionChange(cb: (sel: GraphEngineSelection | null) => void): () => void {
    this.selectionCb = cb;
    return () => {
      if (this.selectionCb === cb) this.selectionCb = null;
    };
  }

  getVisibleNodeIds() {
    return this.api?.getVisibleNodeIds() ?? [];
  }

  getVisibleEdgeIds() {
    return this.api?.getVisibleEdgeIds() ?? [];
  }

  destroy() {
    this.subscribers.clear();
    this.selectionCb = null;
    this.api = null;
  }

  // --- internal API (used by the viewport) ---
  private boundingBox: { x: number; y: number; width: number; height: number } | null = null;

  setBoundingBox(bb: { x: number; y: number; width: number; height: number } | null) {
    this.boundingBox = bb;
  }

  setApi(api: ReactFlowVideoApi | null) {
    this.api = api;
    if (api) {
      api.setNodes(this.nodes);
      api.setEdges(this.edges);
    }
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  emit() {
    for (const cb of this.subscribers) cb();
  }

  emitSelection(sel: GraphEngineSelection | null) {
    this.selectionCb?.(sel);
  }
}

export type ReactFlowEngineInstance = ReactFlowEngine;

// The factory mounts the React viewport into the container.
export const reactFlowFactory: GraphEngineFactory = (
  container: HTMLElement | null,
  onChange: () => void
) => {
  const engine = new ReactFlowEngine();
  engine.subscribe(onChange);

  if (container) {
    // Lazy-load the mount helper to avoid a hard dependency in
    // environments where React Flow isn't available (tests, SSR).
    void import('./mount-react-flow').then(({ mountReactFlow }) => {
      mountReactFlow(container, engine);
    });
  }
  return engine;
};

let registered = false;
export function registerReactFlowEngine(): void {
  if (registered) return;
  registerGraphEngine('react-flow', reactFlowFactory);
  registered = true;
}
