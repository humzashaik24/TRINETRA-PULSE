'use client';

import { ShieldCheck, CircleDashed, CircleDot, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { InvestigationReadiness, ReadinessItem, ReadinessLevel } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — READINESS PANEL
// ============================================================
// Readiness is operational coverage (has the investigation reached
// the point where each surface can be worked) — never a judgement of
// the persons involved. Levels are neutral.
// ============================================================

function levelMeta(level: ReadinessLevel) {
  switch (level) {
    case 'ready':
      return { Icon: CheckCircle2, className: 'text-success', tint: 'bg-success-subtle text-success' };
    case 'in_progress':
      return { Icon: CircleDot, className: 'text-info', tint: 'bg-info-subtle text-info' };
    case 'needs_attention':
      return { Icon: AlertTriangle, className: 'text-warning', tint: 'bg-warning-subtle text-warning' };
    default:
      return { Icon: CircleDashed, className: 'text-foreground-muted', tint: 'bg-surface-elevated text-foreground-muted' };
  }
}

function ReadinessItemRow({ item }: { item: ReadinessItem }) {
  const { Icon, className } = levelMeta(item.level);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={className}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="w-32 shrink-0 text-sm text-foreground">{item.label}</span>
      <span className="text-xs capitalize text-foreground-muted">{item.level.replace('_', ' ')}</span>
      {item.warningCount > 0 && (
        <span className="ml-auto text-xs text-warning">{item.warningCount} warning{item.warningCount === 1 ? '' : 's'}</span>
      )}
    </div>
  );
}

export function InvestigationReadinessPanel({
  readiness,
}: {
  readiness: InvestigationReadiness | null;
}) {
  if (!readiness) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No readiness data yet.
      </div>
    );
  }

  const { Icon } = levelMeta(readiness.overall);
  const overallClassName = readiness.overall === 'needs_attention' ? 'text-warning' : 'text-foreground';

  return (
    <div className="rounded-xl border border-border bg-surface" data-testid="investigation-readiness">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-foreground-muted" />
          <span className="text-sm text-foreground-secondary">Overall</span>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium ${overallClassName}`}>
          <Icon className="h-4 w-4" />
          <span className="capitalize">{readiness.overall.replace('_', ' ')}</span>
        </div>
        {readiness.nextRecommendedAction && (
          <span className="w-full text-xs text-foreground-muted">
            Next recommended: {readiness.nextRecommendedAction}
          </span>
        )}
      </div>
      <div className="divide-y divide-border px-4 py-1">
        {readiness.items.map((item) => (
          <ReadinessItemRow key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}
