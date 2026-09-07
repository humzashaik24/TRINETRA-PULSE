'use client';

import type { NetworkStatistics } from '@trinetra-pulse/types';

// ============================================================
// GRAPH STATS (PRESENTATIONAL)
// ============================================================
// Compact descriptive statistics overlay (bottom-right). These are
// structural counts only — nodes, relationships, clusters, visible
// and selected — labelled neutrally. Never presented as risk.
// ============================================================

export interface GraphStatsProps {
  stats: NetworkStatistics;
  clusterCount: number;
  selectedCount: number;
}

export function GraphStats({ stats, clusterCount, selectedCount }: GraphStatsProps) {
  const visibleNodes = stats.visibleNodes ?? stats.nodes;
  const visibleRelationships = stats.visibleEdges ?? stats.relationships;
  const visibleTotal = visibleNodes + visibleRelationships;

  return (
    <div
      className="absolute bottom-4 right-4 z-10 flex items-center gap-4 rounded-lg border border-border bg-surface/90 px-3 py-1.5 text-[10px] text-foreground-muted backdrop-blur-sm"
      data-testid="graph-stats"
    >
      <Stat label="Nodes" value={visibleNodes} />
      <Divider />
      <Stat label="Relationships" value={visibleRelationships} />
      <Divider />
      <Stat label="Clusters" value={clusterCount} />
      <Divider />
      <Stat label="Visible" value={visibleTotal} />
      {selectedCount > 0 && (
        <>
          <Divider />
          <Stat label="Selected" value={selectedCount} highlight />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className={`text-sm font-semibold tabular-nums ${highlight ? 'text-brand' : 'text-foreground'}`}>
        {value}
      </span>
      <span className="uppercase tracking-wide">{label}</span>
    </span>
  );
}

function Divider() {
  return <span className="h-3 w-px bg-border" aria-hidden="true" />;
}
