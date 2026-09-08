'use client';

import React, { useMemo, useState } from 'react';
import type { TemporalAnalyticsResult, TemporalNetworkSnapshot } from '@trinetra-pulse/types';
import { Badge } from '@trinetra-pulse/ui';
import { TimelineChart, type SeriesPoint } from './viz';
import { inspectEntity } from './analytics-graph-integration';
import { useAnalyticsStore } from '@/state/analytics.store';

// ============================================================
// TEMPORAL NETWORK VIEW — how the network evolved over time
// ============================================================

export function TemporalView({ temporal, unavailable = false }: { temporal: TemporalAnalyticsResult | null; unavailable?: boolean }) {
  const [periodIndex, setPeriodIndex] = useState<number | null>(null);
  const selectEntity = useAnalyticsStore((s) => s.selectEntity);

  const snapshots = useMemo(() => temporal?.snapshots ?? [], [temporal]);
  const selected = periodIndex !== null && snapshots[periodIndex] ? snapshots[periodIndex] : null;

  const series: SeriesPoint[] = useMemo(
    () =>
      snapshots.map((s) => ({
        label: s.label,
        values: {
          n: s.nodeCount,
          e: s.relationshipCount,
          c: s.communityCount,
        },
      })),
    [snapshots]
  );

  if (unavailable) {
    return <p className="py-6 text-center text-xs text-foreground-muted">Timeline analysis is unavailable from the API for this network.</p>;
  }
  if (!temporal || snapshots.length === 0) {
    return <p className="py-6 text-center text-xs text-foreground-muted">Insufficient temporal data to build snapshots.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground-muted">
        Snapshots of how the observed network changed over {snapshots.length} period(s).
      </p>

      <TimelineChart series={series} seriesLabels={['n', 'e', 'c']} />

      <div className="flex flex-wrap gap-1.5">
        {snapshots.map((s, i) => (
          <button
            key={s.period}
            onClick={() => setPeriodIndex(i === periodIndex ? null : i)}
            className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${i === periodIndex ? 'border-foreground/40 bg-surface text-foreground' : 'border-border text-foreground-muted hover:bg-surface'}`}
            aria-pressed={i === periodIndex}
          >
            {s.label}
          </button>
        ))}
      </div>

      {selected ? <SnapshotDetail snapshot={selected} onInspectEntity={(id, name) => { selectEntity(id); inspectEntity(id, name); }} /> : null}
    </div>
  );
}

function SnapshotDetail({
  snapshot,
  onInspectEntity,
}: {
  snapshot: TemporalNetworkSnapshot;
  onInspectEntity: (id: string, name?: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{snapshot.label}</span>
        <Badge size="sm" variant="secondary">{snapshot.nodeCount} entities</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
        <span>Observed ties: <span className="font-medium text-foreground">{snapshot.relationshipCount}</span></span>
        <span>New entities: <span className="font-medium text-foreground">{snapshot.newNodes}</span></span>
        <span>New ties: <span className="font-medium text-foreground">{snapshot.newRelationships}</span></span>
        <span>Communities: <span className="font-medium text-foreground">{snapshot.communityCount}</span></span>
      </div>
      {snapshot.topEntities.length > 0 && (
        <div className="mt-3">
          <p className="tp-data-label mb-1">Most connected this period</p>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.topEntities.map((e) => (
              <button
                key={e}
                onClick={() => onInspectEntity(e, e)}
                className="rounded bg-surface border border-border px-1.5 py-0.5 text-[11px] text-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
