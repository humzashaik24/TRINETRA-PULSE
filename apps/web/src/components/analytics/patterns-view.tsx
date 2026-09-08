'use client';

import React from 'react';
import type { StructuralPattern } from '@trinetra-pulse/types';
import { Badge } from '@trinetra-pulse/ui';
import { Sparkles } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { useAnalyticsStore } from '@/state/analytics.store';
import { inspectEntity, inspectPattern } from './analytics-graph-integration';
import { useShellStore } from '@/state/shell.store';

// ============================================================
// STRUCTURAL PATTERN VIEW
// ============================================================
// severity = analytical significance here, NEVER probability of
// guilt. Confidence = confidence the pattern was detected.
// ============================================================

function severityVariant(severity: StructuralPattern['severity']) {
  return severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'info';
}

export function PatternView({ patterns, unavailable = false }: { patterns: StructuralPattern[]; unavailable?: boolean }) {
  const selectedPatternId = useAnalyticsStore((s) => s.selectedPatternId);
  const selectPattern = useAnalyticsStore((s) => s.selectPattern);
  const selectContext = useShellStore((s) => s.selectContext);

  return (
    <div className="space-y-3">
      <p className="text-xs text-foreground-muted">
        Reproducible structural signals detected from temporal and connectivity analysis. Significance ratings are analytical, not criminal.
      </p>
      {unavailable ? (
        <p className="py-6 text-center text-xs text-foreground-muted">Pattern analysis is unavailable from the API for this network.</p>
      ) : patterns.length === 0 ? (
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
                    inspectPattern(p.id, p.title, p.type, p.affectedEntities);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selected ? 'border-foreground/40 bg-surface' : 'border-border bg-surface/40 hover:bg-surface'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-foreground-muted" />
                      <span className="text-sm font-medium text-foreground">{p.title}</span>
                    </div>
                    {p.evidenceReferences.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.evidenceReferences.slice(0, 4).map((evidenceId) => (
                          <span
                            key={evidenceId}
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectContext({
                                type: 'evidence',
                                id: evidenceId,
                                investigationId: useAnalyticsStore.getState().networkId ?? undefined,
                              });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                selectContext({
                                  type: 'evidence',
                                  id: evidenceId,
                                  investigationId: useAnalyticsStore.getState().networkId ?? undefined,
                                });
                              }
                            }}
                            className="cursor-pointer rounded border border-border px-1.5 py-0.5 text-[10px] text-foreground-muted hover:text-foreground"
                          >
                            Evidence {evidenceId.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                    <Badge size="sm" variant={severityVariant(p.severity)}>{p.severity}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground-muted">{p.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[10px] text-foreground-muted">Confidence {formatPercent(p.confidence)}</span>
                    {p.period.from && (
                      <span className="text-[10px] text-foreground-muted">{p.period.from} → {p.period.to || 'now'}</span>
                    )}
                    {p.affectedEntities.length > 0 && (
                      <span className="flex max-w-[60%] flex-wrap items-center gap-1 text-[10px] text-foreground-muted">
                        Entities:
                        {p.affectedEntities.slice(0, 5).map((entityId) => (
                          <button
                            key={entityId}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              inspectEntity(entityId);
                            }}
                            className="rounded border border-border px-1 py-0.5 hover:text-foreground"
                          >
                            {entityId.slice(0, 8)}
                          </button>
                        ))}
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
