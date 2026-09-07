// ============================================================
// GRAPH ENGINE ABSTRACTION
// ============================================================
// Library-agnostic contract a concrete engine (React Flow / D3 /
// cytoscape) must satisfy. The workspace consumes only this
// interface, so swapping renderers never touches app logic.
// ============================================================

import type { RenderEdge, RenderNode } from '@/graph/transform';

export interface GraphEngineViewport {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: (options?: { padding?: number; maxZoom?: number }) => void;
  centerOn: (nodeId: string) => void;
  getBoundingBox: () => { x: number; y: number; width: number; height: number } | null;
}

export type GraphEngineSelection = {
  type: 'node';
  nodeId: string;
} | { type: 'edge'; edgeId: string };

export interface GraphEngine {
  /** Unique instance handle (used by the store). */
  id: string;
  /** Apply the full visible render set. */
  setNodes: (nodes: RenderNode[]) => void;
  setEdges: (edges: RenderEdge[]) => void;
  /** Update only node positions (e.g. after a re-layout). */
  setNodePositions: (positions: Map<string, { x: number; y: number }>) => void;
  /** Clear current selection in the viewport. */
  clearSelection: () => void;
  viewport: GraphEngineViewport;
  /** Subscribe to selection changes from the renderer. */
  onSelectionChange: (cb: (sel: GraphEngineSelection | null) => void) => () => void;
  /** Current visible node ids (for hit-testing / stats). */
  getVisibleNodeIds: () => string[];
  getVisibleEdgeIds: () => string[];
  /** Dispose the engine. */
  destroy: () => void;
}

export type GraphEngineFactory = (
  container: HTMLElement | null,
  onChange: () => void
) => GraphEngine;

/**
 * Register a factory (lazily initialised from the renderer module).
 * Keeps app logic decoupled from any concrete graph library.
 */
const factories = new Map<string, GraphEngineFactory>();

export function registerGraphEngine(name: string, factory: GraphEngineFactory): void {
  factories.set(name, factory);
}

export function createGraphEngine(
  name: string,
  container: HTMLElement | null,
  onChange: () => void
): GraphEngine | null {
  const factory = factories.get(name);
  if (!factory) return null;
  return factory(container, onChange);
}
