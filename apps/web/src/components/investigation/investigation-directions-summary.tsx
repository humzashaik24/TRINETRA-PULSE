'use client';

import { useEffect } from 'react';
import { Compass, ShieldAlert } from 'lucide-react';
import { Badge, Button } from '@trinetra-pulse/ui';
import { useDirectionsStore } from '@/state/directions.store';
import {
  DIRECTION_PRIORITY_LABELS,
  DIRECTION_PRIORITY_VARIANT,
  DIRECTION_TYPE_LABELS,
  comparePriority,
} from '@/lib/directions-labels';
import { formatPercent } from '@/lib/format';

// ============================================================
// INVESTIGATION — DIRECTIONS SUMMARY (Phase 27)
// ============================================================
// Overview key-figures for the investigation's available leads:
// total directions plus critical/high-priority counts, with the
// top leads surfaced. Directions are computed on request from
// recorded data only — the summary never invents leads and never
// ascribes judgement.
// ============================================================

export interface InvestigationDirectionsSummaryProps {
  investigationId: string;
  onOpenTab?: (tab: string) => void;
}

export function InvestigationDirectionsSummary({ investigationId, onOpenTab }: InvestigationDirectionsSummaryProps) {
  const data = useDirectionsStore((s) => s.data);
  const loading = useDirectionsStore((s) => s.loading);
  const error = useDirectionsStore((s) => s.error);
  const load = useDirectionsStore((s) => s.load);

  useEffect(() => {
    const current = useDirectionsStore.getState().investigationId;
    if (current !== investigationId) {
      void load(investigationId);
    }
  }, [investigationId, load]);

  const openDirections = () => onOpenTab?.('directions');

  const directions = data?.directions ?? [];
  const criticalCount = directions.filter((d) => d.priority === 'critical').length;
  const highCount = directions.filter((d) => d.priority === 'high').length;

  const topLeads = directions
    .slice()
    .sort((a, b) => comparePriority(a.priority, b.priority) || b.confidence - a.confidence)
    .filter((d) => d.priority === 'high' || d.priority === 'critical')
    .slice(0, 3);

  return (
    <section className="rounded-xl border border-border bg-surface p-4" data-testid="overview-directions">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="tp-data-label flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-foreground-muted" />
            Available directions
          </h3>
          {loading && !data ? (
            <p className="mt-1 text-xs text-foreground-muted" data-testid="overview-directions-loading">
              Computing directions…
            </p>
          ) : null}
          {!loading && error ? (
            <p className="mt-1 text-xs text-danger" data-testid="overview-directions-error">
              Could not compute directions.
            </p>
          ) : null}
          {data ? (
            <p className="mt-1 text-xs text-foreground-muted">
              {directions.length} analytical lead{directions.length === 1 ? '' : 's'} ·{' '}
              <span data-testid="overview-directions-critical">{criticalCount} critical</span> ·{' '}
              <span data-testid="overview-directions-high">{highCount} high</span>
            </p>
          ) : null}
        </div>
        {data && directions.length > 0 ? (
          <Button variant="secondary" size="sm" onClick={openDirections} data-testid="overview-action-directions">
            View all directions
          </Button>
        ) : null}
      </div>

      {data && directions.length > 0 ? (
        topLeads.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {topLeads.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={openDirections}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover"
                  data-testid={`overview-direction-${d.id}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-foreground">{d.title}</span>
                    <span className="block truncate text-[11px] text-foreground-muted">
                      {DIRECTION_TYPE_LABELS[d.direction_type]} · {formatPercent(d.confidence)} confidence
                    </span>
                  </span>
                  <Badge variant={DIRECTION_PRIORITY_VARIANT[d.priority]} size="sm">
                    {DIRECTION_PRIORITY_LABELS[d.priority]}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        ) : null
      ) : null}

      {!loading && !error && data && directions.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-foreground-muted">
          No analytical leads yet — nothing in the recorded data warrants a next step.
        </p>
      ) : null}

      {!loading && error ? (
        <Button variant="ghost" size="sm" onClick={() => void load(investigationId)} className="mt-2">
          Try again
        </Button>
      ) : null}

      <div className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-foreground-muted">
        <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
        <p>Directions are analytical leads derived from existing investigation data. They do not establish guilt or criminal intent.</p>
      </div>
    </section>
  );
}