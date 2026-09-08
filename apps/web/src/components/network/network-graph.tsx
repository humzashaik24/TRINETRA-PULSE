'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGraphStore } from '@/state/graph.store';
import { createGraphEngine, type GraphEngine } from '@/engine/graph-engine';
import { registerReactFlowEngine } from '@/engine/react-flow-engine';
import type { GraphEngineSelection } from '@/engine/graph-engine';
import { useNetworkRender } from './use-network-render';
import { GraphControls } from './graph-controls';
import { GraphStats } from './graph-stats';
import {
  graphEdgeToContext,
  graphNodeToContext,
} from './graph-inspector';
import { useShellStore } from '@/state/shell.store';
import { useInvestigationStore } from '@/state/investigation.store';
import type { GraphNode, GraphEdge } from '@trinetra-pulse/types';

// ============================================================
// NETWORK GRAPH — PRIMARY WORKSPACE
// ============================================================
// Hosts the concrete graph engine inside a measured container,
// pushes the derived render set into the engine, and translates
// engine selection events into store selection + inspector opens.
// The hero of the network workspace.
// ============================================================

registerReactFlowEngine();

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, size] as const;
}

export function NetworkGraph() {
  const [containerRef, size] = useContainerSize<HTMLDivElement>();
  const engineRef = useRef<GraphEngine | null>(null);

  const setEngine = useGraphStore((s) => s.setEngine);
  const selectNode = useGraphStore((s) => s.selectNode);
  const selectEdge = useGraphStore((s) => s.selectEdge);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const focusNode = useGraphStore((s) => s.focusNode);
  const expandNode = useGraphStore((s) => s.expandNode);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const clusterCount = useGraphStore((s) => s.clusters.length);
  const selectContext = useShellStore((s) => s.selectContext);
  const investigationId = useInvestigationStore((s) => s.investigationId);

  const render = useNetworkRender(size.width, size.height);

  // Create + register the engine once.
  useEffect(() => {
    const container = containerRef.current;
    const engine = createGraphEngine('react-flow', container, () => {});
    if (!engine) return;
    engineRef.current = engine;
    setEngine(engine);

    const unsubscribe = engine.onSelectionChange((sel: GraphEngineSelection | null) => {
      if (!sel) {
        clearSelection();
        return;
      }
      if (sel.type === 'node') {
        selectNode(sel.nodeId);
        focusNode(sel.nodeId);
      } else if (sel.type === 'edge') {
        selectEdge(sel.edgeId);
      }
    });

    return () => {
      unsubscribe?.();
      engine.destroy();
      engineRef.current = null;
      setEngine(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push the derived render set into the engine.
  useEffect(() => {
    engineRef.current?.setNodes(render.renderNodes);
    engineRef.current?.setEdges(render.renderEdges);
  }, [render.renderNodes, render.renderEdges]);

  // Open the inspector whenever node/edge selection changes and is non-null.
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId);
  const selectedCount = (selectedNodeId ? 1 : 0) + (selectedEdgeId ? 1 : 0);
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find((n) => n.id === selectedNodeId);
      if (node)       selectContext(graphNodeToContext(node, investigationId ?? undefined));
    } else if (selectedEdgeId) {
      const edge = edges.find((e) => e.id === selectedEdgeId);
      if (edge) {
        const labels = new Map(
          nodes.map((n) => [n.id, { name: n.label, type: n.type }])
        );
        selectContext(graphEdgeToContext(edge, labels, investigationId ?? undefined));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedEdgeId]);

  // Expose expand-on-double-click to the canvas layer.
  const onExpand = useCallback((id: string) => void expandNode(id), [expandNode]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = window.__trinetra_graph__;
    window.__trinetra_graph__ = { expandNode: onExpand };
    return () => {
      window.__trinetra_graph__ = prev;
    };
  }, [onExpand]);

  if (typeof window === 'undefined') return null;

  return (
    <div className="relative h-full w-full" data-testid="network-graph">
      <div ref={containerRef} className="absolute inset-0" />
      <GraphControls />
      <GraphStats stats={render.statistics} clusterCount={clusterCount} selectedCount={selectedCount} />
    </div>
  );
}
