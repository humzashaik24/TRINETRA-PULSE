'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { InvestigationHealth, HealthMetric } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — HEALTH PANEL
// ============================================================
// Neutral coverage assessment of the open investigation. "Health"
// here means how much of each surface is covered / resolved, using
// the coverage wording in the types — never reliability of people.
// ============================================================

function healthTone(value: number) {
  if (value >= 80) return 'text-success';
  if (value >= 50) return 'text-info';
  return 'text-warning';
}

function MetricRow({ metric }: { metric: HealthMetric }) {
  const tone = healthTone(metric.value);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-48 shrink-0 text-sm text-foreground">{metric.label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-elevated">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${metric.value}%` }} />
      </div>
      <span className={`w-10 text-right text-sm tabular-nums font-medium ${tone}`}>{metric.value}%</span>
      {metric.hasIssues ? (
        <TrendingDown className="h-4 w-4 text-warning" aria-label="Has issues" />
      ) : (
        <TrendingUp className="h-4 w-4 text-success" aria-label="On track" />
      )}
    </div>
  );
}

export function InvestigationHealthPanel({
  health,
}: {
  health: InvestigationHealth | null;
}) {
  if (!health) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No health assessment yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface" data-testid="investigation-health">
      <div className="flex items-center justify-between border-b border-border p-4">
        <span className="text-sm text-foreground-secondary">
          Computed {new Date(health.computedAt).toLocaleString()}
        </span>
        <span className="text-sm text-foreground">{health.openReviewCount} open review items</span>
      </div>
      <div className="divide-y divide-border px-4 py-1">
        {health.metrics.map((metric) => (
          <MetricRow key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  );
}
