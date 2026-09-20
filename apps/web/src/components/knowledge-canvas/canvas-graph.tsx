'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useRef } from 'react';
import { useCanvasStore } from './canvas-store';
import { KIND_TO_TOKEN, type CanvasNode } from './canvas-types';
import { CanvasNodeComponent } from './nodes/canvas-node';
import { KnowledgeEdge } from './edges/canvas-edge';

// ============================================================
// KNOWLEDGE CANVAS — GRAPH VIEWPORT
// ============================================================
// The infinite visual canvas built on React Flow (the same rendering
// library already used by the product; a separate instance from the
// Networks feature). Owns node/edge rendering, selection, pan/zoom,
// minimap and file drop affordances. All data flows from the canvas
// store, which is seeded from Trinetra investigation objects.
// ============================================================

const nodeTypes = { canvas: CanvasNodeComponent };
const edgeTypes = { knowledge: KnowledgeEdge };

function nodeColor(node: Node): string {
  const kind = (node.data as { kind: string })?.kind;
  const entityType = (node.data as { entityType?: string })?.entityType;
  const token = kind === 'entity' && entityType ? KIND_TO_TOKEN[entityType] : KIND_TO_TOKEN[kind];
  return `hsl(var(--color-${token ?? 'graph-node-default'}))`;
}

export function GraphCanvas() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge);
  const setImportOpen = useCanvasStore((s) => s.setImportOpen);
  const minimap = useCanvasStore((s) => s.minimap);
  const showLabels = useCanvasStore((s) => s.showLabels);
  const fitRequest = useCanvasStore((s) => s.fitRequest);

  const { fitView } = useReactFlow();
  const didFit = useRef(false);

  useEffect(() => {
    if (fitRequest > 0) {
      void fitView({ padding: 0.15, minZoom: 0.55, duration: 300 });
    }
  }, [fitRequest, fitView]);

  useEffect(() => {
    if (nodes.length > 0 && !didFit.current) {
      didFit.current = true;
      const id = window.setTimeout(() => {
        void fitView({ padding: 0.15, minZoom: 0.55, duration: 200 });
      }, 60);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [nodes.length, fitView]);

  const onConnect = (connection: Connection) => {
    addEdge(connection);
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (event: React.DragEvent) => {
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      event.preventDefault();
      useCanvasStore.getState().setImportOpen(true);
    }
  };

  return (
    <div className="absolute inset-0" data-testid="canvas-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onNodeDragStop={(_, node) => {
          useCanvasStore.getState().updateNodePosition(node.id, node.position);
        }}
        onNodesChange={(changes) => {
          for (const change of changes) {
            if (change.type === 'position' && change.position && change.id) {
              useCanvasStore.getState().updateNodePosition(change.id, change.position);
            }
          }
        }}
        onPaneClick={() => selectNode(null)}
        onEdgeClick={(_, edge) => setEditingEdge(edge.id)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView={false}
        minZoom={0.35}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'knowledge' }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
        {minimap && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={nodeColor}
            className="!bg-surface-elevated/90 !border-border rounded-xl shadow-xl border overflow-hidden !bottom-4 !right-4"
            maskColor="rgba(15, 23, 42, 0.75)"
          />
        )}
        <Controls position="bottom-left" showInteractive={false} className="!bottom-12 !left-3 !bg-surface-elevated !border-border !shadow-md" />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border-subtle bg-surface/80 px-2.5 py-1 font-mono text-caption text-foreground-muted backdrop-blur">
          {nodes.length} nodes · {edges.length} connections
          {showLabels ? '' : ' · labels hidden'}
        </div>
      </ReactFlow>
    </div>
  );
}