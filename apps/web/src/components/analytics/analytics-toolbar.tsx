'use client';

import React, { useMemo } from 'react';
import { Badge, Button } from '@trinetra-pulse/ui';
import { RotateCcw, Filter, BarChart3, Loader2, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { useAnalyticsStore, type AnalyticsOverlay } from '@/state/analytics.store';
import { useGraphStore } from '@/state/graph.store';
import type { AnalyticsStatus } from '@trinetra-pulse/types';
import { cn } from '@/lib/utils';

// ============================================================
// ANALYTICS TOOLBAR — computation status + filter control
// ============================================================

const STATUS_META: Record<AnalyticsStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  idle: { label: 'Idle', variant: 'secondary' },
  queued: { label: 'Queued', variant: 'info' },
  computing: { label: 'Computing', variant: 'info' },
  complete: { label: 'Complete', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  stale: { label: 'Out of date', variant: 'warning' },
};

const OVERLAY_LABEL: Partial<Record<AnalyticsOverlay, string>> = {
  degree: 'Connectedness overlay',
  betweenness: 'Bridge potential overlay',
  closeness: 'Reach overlay',
  pagerank: 'Influence overlay',
  influence: 'Network influence overlay',
  community: 'Group colors',
  component: 'Component colors',
  bridge: 'Bridge highlight',
};

export function AnalyticsToolbar({ networkName }: { networkName: string }) {
  const status = useAnalyticsStore((s) => s.status);
  const overlay = useAnalyticsStore((s) => s.overlay);
  const setOverlay = useAnalyticsStore((s) => s.setOverlay);
  const filters = useAnalyticsStore((s) => s.filters);
  const setFilter = useAnalyticsStore((s) => s.setFilter);
  const loadAnalytics = useAnalyticsStore((s) => s.loadAnalytics);

  const graphNodes = useGraphStore((s) => s.nodes);
  const graphEdges = useGraphStore((s) => s.edges);

  const entityTypes = useMemo(
    () => [...new Set(graphNodes.map((n) => n.type))].sort(),
    [graphNodes]
  );
  const relationshipTypes = useMemo(
    () => [...new Set(graphEdges.map((e) => e.type))].sort(),
    [graphEdges]
  );

  const hasActiveFilters =
    filters.entityTypes.length > 0 || filters.relationshipTypes.length > 0 || filters.sources.length > 0 || filters.minConfidence > 0;

  const meta = STATUS_META[status];

  const toggle = (key: 'entityTypes' | 'relationshipTypes', value: string) => {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilter({ ...filters, [key]: next });
  };

  const activeCount = filters.entityTypes.length + filters.relationshipTypes.length + filters.sources.length + (filters.minConfidence > 0 ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface/60 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="tp-data-label shrink-0">Analytics</span>
        <span className="truncate text-sm font-medium text-foreground">{networkName}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {overlay !== 'none' && (
          <Badge size="sm" variant="network">
            <BarChart3 className="mr-1 h-3 w-3" />
            {OVERLAY_LABEL[overlay]}
          </Badge>
        )}

        {hasActiveFilters && (
          <Badge size="sm" variant="warning">
            <Filter className="mr-1 h-3 w-3" />
            {activeCount} filter{activeCount > 1 ? 's' : ''}
          </Badge>
        )}

        <Badge size="sm" variant={meta.variant}>
          {status === 'computing' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : status === 'failed' ? <AlertTriangle className="mr-1 h-3 w-3" /> : status === 'complete' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : status === 'stale' ? <Clock3 className="mr-1 h-3 w-3" /> : null}
          {meta.label}
        </Badge>
      </div>

      <details className="group relative">
        <summary className={cn('tp-data-label cursor-pointer select-none', hasActiveFilters && 'text-foreground')}>
          Filters
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
          {entityTypes.length > 0 && (
            <div className="mb-3">
              <p className="tp-data-label mb-1.5">Entity types</p>
              <div className="flex flex-wrap gap-1">
                {entityTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggle('entityTypes', t)}
                    className={cn('rounded px-2 py-0.5 text-[11px] capitalize', filters.entityTypes.includes(t) ? 'bg-foreground text-background' : 'bg-surface text-foreground border border-border')}
                    aria-pressed={filters.entityTypes.includes(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          {relationshipTypes.length > 0 && (
            <div className="mb-3">
              <p className="tp-data-label mb-1.5">Relationship types</p>
              <div className="flex flex-wrap gap-1">
                {relationshipTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggle('relationshipTypes', t)}
                    className={cn('rounded px-2 py-0.5 text-[11px]', filters.relationshipTypes.includes(t) ? 'bg-foreground text-background' : 'bg-surface text-foreground border border-border')}
                    aria-pressed={filters.relationshipTypes.includes(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFilter({ ...filters, entityTypes: [], relationshipTypes: [], sources: [], minConfidence: 0 })}
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" variant="primary" onClick={() => void loadAnalytics(useAnalyticsStore.getState().networkId ?? '', filters)}>
              Recompute
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
