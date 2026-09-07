'use client';

import { useMemo } from 'react';
import { useGraphStore } from '@/state/graph.store';
import { selectVisible } from '@/graph/selectors';
import { GraphNodeList } from './graph-node-list';
import { GraphRelationshipList } from './graph-relationship-list';

// ============================================================
// NETWORK LIST VIEW
// ============================================================
// Alternate, list-based view of the visible graph. Applies the
// same filters/depth/timeline/expansion as the graph view and lets
// the user inspect entities and relationships as rows. Selecting a
// row inspects the node/edge exactly like the graph view.
// ============================================================

export function NetworkListView() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const filters = useGraphStore((s) => s.filters);
  const depth = useGraphStore((s) => s.depth);
  const timeline = useGraphStore((s) => s.timeline);
  const expanded = useGraphStore((s) => s.expandedNodeIds);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const selectEdge = useGraphStore((s) => s.selectEdge);

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

  const nodeLabelById = useMemo(
    () => new Map(visibleNodes.map((n) => [n.id, n.label])),
    [visibleNodes]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="network-list-view">
      <div className="flex items-center gap-4 border-b border-border bg-surface/40 px-4 py-1.5 text-[10px] uppercase tracking-wide text-foreground-muted">
        <span>Entities · {visibleNodes.length}</span>
        <span>Relationships · {visibleEdges.length}</span>
      </div>
      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto bg-surface" aria-label="Entities">
          <GraphNodeList
            nodes={visibleNodes}
            selectedId={selectedNodeId}
            onSelect={(id) => selectNode(id)}
          />
        </section>
        <section className="min-h-0 overflow-y-auto bg-surface" aria-label="Relationships">
          <GraphRelationshipList
            edges={visibleEdges}
            nodeLabelById={nodeLabelById}
            selectedId={selectedEdgeId}
            onSelect={(id) => selectEdge(id)}
          />
        </section>
      </div>
    </div>
  );
}
