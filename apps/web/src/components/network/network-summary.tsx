'use client';

import { useGraphStore } from '@/state/graph.store';
import { Badge } from '@trinetra-pulse/ui';

// ============================================================
// NETWORK SUMMARY
// ============================================================
// Compact header strip for the active network: name, build status
// and structural counts. Descriptive only — these are counts of
// entities/relationships, presented neutrally without any risk or
// severity judgement.
// ============================================================

export function NetworkSummary() {
  const summary = useGraphStore((s) => s.summary);
  if (!summary) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2"
      data-testid="network-summary"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{summary.name}</p>
        <p className="truncate text-[10px] text-foreground-muted">
          {summary.description}
        </p>
      </div>

      <Badge variant={summary.status === 'ready' ? 'success' : summary.status === 'building' ? 'info' : 'danger'}>
        {summary.status === 'ready' ? 'Ready' : summary.status === 'building' ? 'Building' : 'Error'}
      </Badge>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-foreground-muted">
        <span>
          <b className="text-foreground">{summary.nodeCount}</b> nodes
        </span>
        <span>
          <b className="text-foreground">{summary.relationshipCount}</b> relationships
        </span>
        <span>
          <b className="text-foreground">{summary.clusterCount}</b> clusters
        </span>
        <span>
          <b className="text-foreground">{summary.connectedComponents}</b> components
        </span>
        {summary.sources.length > 0 && (
          <span>
            <b className="text-foreground">{summary.sources.length}</b> sources
          </span>
        )}
        {summary.dateRange.start && summary.dateRange.end && (
          <span className="tabular-nums">
            {summary.dateRange.start.slice(0, 10)} — {summary.dateRange.end.slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}
