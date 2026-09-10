'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnSelectionChange,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  type EdgeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import type { ReactFlowEngineInstance } from './react-flow-engine';
import type { RenderEdge, RenderNode } from '@/graph/transform';
import type { GraphEngineSelection } from './graph-engine';
import { GraphNode } from '@/components/network/graph/graph-node';
import { GraphEdge, defaultEdgeMarker } from '@/components/network/graph/graph-edge';
import { GraphZoomContext } from '@/components/network/graph/graph-zoom-context';
import '@xyflow/react/dist/style.css';

// ============================================================
// REACT FLOW VIEWPORT
// ============================================================
// Renders the graph into the engine's container. Bridges the
// imperative GraphEngine contract to React Flow state, provides
// viewport helpers and reports selection back to the engine.
// ============================================================

type FlowNode = Node<RenderNode, 'graphNode'>;
type FlowEdge = Edge<RenderEdge, 'graphEdge'>;

const nodeTypes: NodeTypes = { graphNode: GraphNode };
const edgeTypes: EdgeTypes = { graphEdge: GraphEdge };

function toFlowNode(node: RenderNode): FlowNode {
  return {
    id: node.id,
    type: 'graphNode',
    position: { x: node.x, y: node.y },
    data: node,
    selected: node.focused,
  };
}

function toFlowEdge(edge: RenderEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'graphEdge',
    data: edge,
    markerEnd: edge.directed ? defaultEdgeMarker(true) : undefined,
  };
}

interface ViewportProps {
  engine: ReactFlowEngineInstance;
}

function ReactFlowCanvasBody({ engine }: ViewportProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const reactFlow = useReactFlow();
  const [zoom, setZoom] = useState(1);

  // Register with the engine as its live API surface.
  useEffect(() => {
    engine.setApi({
      setNodes: (renderNodes) => setNodes(renderNodes.map(toFlowNode)),
      setEdges: (renderEdges) => setEdges(renderEdges.map(toFlowEdge)),
      setNodePositions: (positions) => {
        setNodes((prev) =>
          prev.map((n) => {
            const p = positions.get(n.id);
            return p ? { ...n, position: { x: p.x, y: p.y } } : n;
          })
        );
      },
      zoomIn: () => reactFlow.zoomIn(),
      zoomOut: () => reactFlow.zoomOut(),
      fitView: (opts) =>
        reactFlow.fitView({ padding: opts?.padding ?? 0.2, maxZoom: opts?.maxZoom ?? 1.5 }),
      centerOn: (nodeId) => {
        const node = reactFlow.getNode(nodeId);
        if (node) {
          reactFlow.setCenter(node.position.x, node.position.y, { zoom: 1, duration: 300 });
        }
      },
      clearSelection: () => {
        setNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
        setEdges((prev) => prev.map((e) => ({ ...e, selected: false })));
      },
      getVisibleNodeIds: () => reactFlow.getNodes().map((n) => n.id),
      getVisibleEdgeIds: () => reactFlow.getEdges().map((e) => e.id),
    });

    return () => {
      engine.setApi(null);
    };
  }, [engine, setNodes, setEdges, reactFlow]);

  useOnSelectionChange({
    onChange: useCallback(
      ({ nodes: selNodes, edges: selEdges }) => {
        const node = selNodes[0];
        const edge = selEdges[0];
        if (node) {
          engine.emitSelection({ type: 'node', nodeId: node.id });
        } else if (edge) {
          engine.emitSelection({ type: 'edge', edgeId: edge.id });
        } else {
          engine.emitSelection(null);
        }
      },
      [engine]
    ),
  });

  // Fit the view whenever a new node set arrives (initial network load,
  // depth/expansion changes, or a different network). Without this the
  // initial mount fits an empty canvas; nodes pushed afterwards by the
  // engine are never framed by React Flow's one-shot fitView.
  const currentIdsRef = useRef('');
  useEffect(() => {
    if (nodes.length === 0) return;
    const ids = nodes
      .map((n) => n.id)
      .sort()
      .join('|');
    if (ids === currentIdsRef.current) return;
    currentIdsRef.current = ids;
    const raf = requestAnimationFrame(() => {
      reactFlow.fitView({ padding: 0.2, maxZoom: 1.2, duration: 200 });
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes, reactFlow]);

  const onNodeDoubleClick: NodeMouseHandler<FlowNode> = useCallback(
    (_, node) => {
      if (typeof window !== 'undefined' && window.__trinetra_graph__?.expandNode) {
        window.__trinetra_graph__.expandNode(node.id);
      }
    },
    []
  );

  return (
    <GraphZoomContext.Provider value={zoom}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
        onEdgesChange={onEdgesChange as (changes: EdgeChange[]) => void}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={2.5}
        selectionOnDrag
        panOnDrag
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--color-border))" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(n) => ((n.data as unknown as RenderNode)?.color as string) ?? '#666'}
          maskColor="hsl(var(--color-surface) / 0.6)"
        />
      </ReactFlow>
    </GraphZoomContext.Provider>
  );
}

export function ReactFlowViewport({ engine }: ViewportProps) {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full" data-testid="graph-viewport">
        <ReactFlowCanvasBody engine={engine} />
      </div>
    </ReactFlowProvider>
  );
}

declare global {
  interface Window {
    __trinetra_graph__?: { expandNode?: (id: string) => void };
  }
}

export { toFlowNode, toFlowEdge };
export type { GraphEngineSelection };
