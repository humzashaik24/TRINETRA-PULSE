'use client';

import { ENTITY_TYPE_LABELS } from '@/lib/format';
import { nodeColorFor } from '@/graph/transform';
import type { GraphNode } from '@trinetra-pulse/types';

// ============================================================
// GRAPH NODE LIST
// ============================================================
// Flat, scrollable list of visible entities. Selecting a row
// selects/inspects the matching node. Neutral summary only.
// ============================================================

export interface GraphNodeListProps {
  nodes: GraphNode[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
}

export function GraphNodeList({ nodes, selectedId, onSelect }: GraphNodeListProps) {
  return (
    <ul className="divide-y divide-border" data-testid="graph-node-list">
      {nodes.map((n) => {
        const active = n.id === selectedId;
        return (
          <li key={n.id}>
            <button
              onClick={() => onSelect(n.id)}
              aria-pressed={active}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                active ? 'bg-surface-hover' : 'hover:bg-surface-hover/60'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: nodeColorFor(n.type) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{n.label}</span>
                <span className="block text-[10px] uppercase tracking-wide text-foreground-muted">
                  {ENTITY_TYPE_LABELS[n.type]} · {n.connections} connections
                </span>
              </span>
              {n.sources.length > 0 && (
                <span className="shrink-0 rounded bg-surface-elevated px-1 py-0.5 text-[9px] text-foreground-muted">
                  {n.sources.length} src
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
