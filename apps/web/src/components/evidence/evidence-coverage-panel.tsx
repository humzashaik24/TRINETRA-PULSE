'use client';

import React from 'react';
import { CircleCheck, CircleAlert, CircleHelp, ArrowRight } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import type { EvidenceCoverage } from '@trinetra-pulse/types';
import { COVERAGE_LEVEL_LABELS, formatDateTime } from '@/lib/format';
import { SUPPORT_LEVEL_VARIANT } from './evidence-domain';

// ============================================================
// EVIDENCE COVERAGE MODEL
// ============================================================
// "unsupported" = no linked evidence currently available, NEVER
// "false". Coverage is a workflow view, not a judgement.

type TitleLookup = ReadonlyMap<string, { title: string }>;

interface EvidenceCoveragePanelProps {
  coverage: EvidenceCoverage[];
  evidenceById: TitleLookup;
  onSelectEvidence?: (id: string) => void;
}

function levelIcon(level: EvidenceCoverage['level']) {
  switch (level) {
    case 'SUPPORTED': return CircleCheck;
    case 'PARTIALLY_SUPPORTED': return CircleAlert;
    case 'UNSUPPORTED': return CircleHelp;
  }
}

export function EvidenceCoveragePanel({
  coverage,
  evidenceById,
  onSelectEvidence,
}: EvidenceCoveragePanelProps) {
  if (coverage.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground-muted">
        No coverage assessment available yet.
      </div>
    );
  }

  const supported = coverage.filter((c) => c.level === 'SUPPORTED').length;
  const partial = coverage.filter((c) => c.level === 'PARTIALLY_SUPPORTED').length;
  const unsupported = coverage.filter((c) => c.level === 'UNSUPPORTED').length;

  return (
    <div className="space-y-3" data-testid="evidence-coverage-panel">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <CoverageStat
          icon={CircleCheck}
          iconClass="text-success"
          label="Supported"
          value={supported}
        />
        <CoverageStat
          icon={CircleAlert}
          iconClass="text-warning"
          label="Partially supported"
          value={partial}
        />
        <CoverageStat
          icon={CircleHelp}
          iconClass="text-danger"
          label="Unsupported"
          value={unsupported}
        />
      </div>

      {/* Items */}
      {coverage.map((c) => {
        const Icon = levelIcon(c.level);
        const variant = SUPPORT_LEVEL_VARIANT[c.level];
        return (
          <div
            key={`${c.targetType}-${c.targetId}`}
            className="rounded-lg border border-border bg-surface p-3"
            data-testid={`coverage-${c.targetType}-${c.targetId}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={cn('h-4 w-4 shrink-0', c.level === 'SUPPORTED' ? 'text-success' : c.level === 'PARTIALLY_SUPPORTED' ? 'text-warning' : 'text-danger')} />
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">{c.targetId}</p>
                  <p className="text-[10px] uppercase tracking-wide text-foreground-muted">{c.targetType}</p>
                </div>
              </div>
              <Badge size="sm" variant={variant}>
                {COVERAGE_LEVEL_LABELS[c.level]}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-foreground-muted">
              <span>{c.breakdown.direct} direct</span>
              <span>{c.breakdown.contextual} contextual</span>
              <span>{c.breakdown.total} total</span>
            </div>

            {c.gap && (
              <p className="mt-2 rounded-md bg-warning-subtle/50 px-2 py-1.5 text-[11px] leading-relaxed text-warning">
                {c.gap}
              </p>
            )}

            {c.evidenceIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.evidenceIds.slice(0, 5).map((id) => {
                  const item = evidenceById.get(id);
                  return (
                    <button
                      key={id}
                      onClick={() => onSelectEvidence?.(id)}
                      className="inline-flex items-center gap-1 rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] text-foreground-secondary hover:border-evidence/50 hover:text-evidence tp-transition"
                    >
                      {item?.title ?? id}
                      <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  );
                })}
                {c.evidenceIds.length > 5 && (
                  <span className="text-[10px] text-foreground-muted">+{c.evidenceIds.length - 5} more</span>
                )}
              </div>
            )}

            <p className="mt-2 text-[10px] text-foreground-muted">
              Assessed {formatDateTime(c.assessedAt)} · {c.assessedBy}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CoverageStat({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated/40 p-3 text-center">
      <Icon className={cn('mx-auto h-4 w-4', iconClass)} />
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-foreground-muted">{label}</p>
    </div>
  );
}
