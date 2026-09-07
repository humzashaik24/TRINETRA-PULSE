'use client';

import React from 'react';
import type { StructuralPattern } from '@trinetra-pulse/types';
import { Badge } from '@trinetra-pulse/ui';
import { Sparkles } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { useAnalyticsStore } from '@/state/analytics.store';
import { inspectPattern } from './analytics-graph-integration';

// ============================================================
// STRUCTURAL PATTERN VIEW
// ============================================================
// severity = analytical significance here, NEVER probability of
// guilt. Confidence = confidence the pattern was detected.
// ============================================================

function severityVariant(severity: StructuralPattern['severity']) {
  return severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'info';
}

export function PatternView({ patterns }: { patterns: StructuralPattern[] }) {
  const selectedPatternId = useAnalyticsStore((s) => s.selectedPatternId);
  const selectPattern = useAnalyticsStore((s) => s.selectPattern);

  return (
    <div className="space-y-3">
      <p className="text-xs text-foreground-muted">
        Reproducible structural signals detected from temporal and connectivity analysis. Significance ratings are analytical, not criminal.
      </p>
      {patterns.length === 0 ? (
        <p className="py-6 text-center text-xs text-foreground-muted">No patterns detected.</p>
      ) : (
        <ul className="space-y-2">
          {patterns.map((p) => {
            const selected = selectedPatternId === p.id;
            return (
              <li key={p.id}>
                <button
                  onClick={() => {
                    selectPattern(p.id);
                    inspectPattern(p.id, p.title);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selected ? 'border-foreground/40 bg-surface' : 'border-border bg-surface/40 hover:bg-surface'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-foreground-muted" />
                      <span className="text-sm font-medium text-foreground">{p.title}</span>
                    </div>
                    <Badge size="sm" variant={severityVariant(p.severity)}>{p.severity}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground-muted">{p.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[10px] text-foreground-muted">Confidence {formatPercent(p.confidence)}</span>
                    {p.period.from && (
                      <span className="text-[10px] text-foreground-muted">{p.period.from} → {p.period.to || 'now'}</span>
                    )}
                    {p.affectedEntities.length > 0 && (
                      <span className="max-w-[60%] truncate text-[10px] text-foreground-muted">
                        Entities: {p.affectedEntities.join(', ')}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
