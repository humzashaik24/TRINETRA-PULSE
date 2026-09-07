import type {
  Edge,
  EdgeProps,
  Node,
  NodeProps,
} from '@xyflow/react';
import type { RenderEdge, RenderNode } from '@/graph/transform';

// ============================================================
// REACT FLOW — CONCRETE ENGINE TYPES
// ============================================================
// Contracts used by the React Flow renderer (react-flow-engine)
// and its child components. Kept separate so the engine module
// itself stays free of heavy render-related typing that other
// modules don't need.
// ============================================================

export type GraphFlowNode = Node<RenderNode, 'graphNode'>;
export type GraphFlowEdge = Edge<RenderEdge, 'graphEdge'>;

export type GraphNodeProps = NodeProps<GraphFlowNode>;
export type GraphEdgeProps = EdgeProps<GraphFlowEdge>;
