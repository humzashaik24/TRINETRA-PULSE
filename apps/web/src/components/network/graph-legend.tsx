'use client';

import { useGraphStore } from '@/state/graph.store';
import { ENTITY_TYPE_LABELS } from '@/lib/format';
import { nodeColorFor } from '@/graph/transform';
import type { EntityType } from '@trinetra-pulse/types';

// ============================================================
// GRAPH LEGEND
// ============================================================
// Maps entity types to their visual colour and lists the neutral
// symbols used for observed/inferred relationships. Legend only —
// no status or risk semantics.
// ============================================================

const LEGEND_TYPES: EntityType[] = [
  'person',
  'vehicle',
  'phone',
  'location',
  'organization',
  'event',
  'account',
  'transaction',
  'document',
  'evidence',
  'case',
];

export function GraphLegend() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const present = new Set(nodes.map((n) => n.type));
  const hasDirected = edges.some((e) => e.direction === 'directed');
  const hasUndirected = edges.length > 0 && !hasDirected;

  return (
    <div
      className="pointer-events-auto rounded-lg border border-border bg-surface/90 p-3 backdrop-blur-sm"
      data-testid="graph-legend"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
        Legend
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {LEGEND_TYPES.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-foreground-secondary">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: nodeColorFor(t) }}
              aria-hidden="true"
            />
            <span className={present.has(t) ? 'text-foreground' : ''}>
              {ENTITY_TYPE_LABELS[t]}
            </span>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-border" />

      <div className="space-y-1 text-xs text-foreground-secondary">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-foreground-muted" aria-hidden="true" />
          <span>Observed relationship</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 rounded border-t border-dashed border-foreground-muted"
            aria-hidden="true"
          />
          <span>Inferred relationship</span>
        </div>
        {hasDirected && (
          <div className="flex items-center gap-1.5">
            <span className="text-foreground-muted" aria-hidden="true">➜</span>
            <span>Directed</span>
          </div>
        )}
        {hasUndirected && (
          <div className="flex items-center gap-1.5">
            <span className="text-foreground-muted" aria-hidden="true">—</span>
            <span>Undirected</span>
          </div>
        )}
      </div>
    </div>
  );
}
