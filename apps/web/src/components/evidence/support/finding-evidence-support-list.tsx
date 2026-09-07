'use client';

import React from 'react';
import { Target, Sparkles } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { useEvidenceStore } from '@/state/evidence.store';
import { COVERAGE_LEVEL_LABELS, EVIDENCE_TYPE_LABELS, formatPercent } from '@/lib/format';
import { SUPPORT_LEVEL_VARIANT, EVIDENCE_TYPE_VARIANT } from '@/components/evidence/evidence-domain';

// ============================================================
// FINDING EVIDENCE SUPPORT (Phase 12)
// ============================================================
// Which findings are grounded in which evidence, with relevance
// and provenance. "unsupported" = no linked evidence currently.

const DEMO_FINDING_LABELS: Record<string, string> = {
  'inf-006-1': 'Coordinate cluster around the primary device',
  'inf-006-2': 'Concentrated usage around the primary device',
};

export function FindingEvidenceSupportList({
  onSelectEvidence,
}: {
  onSelectEvidence?: (id: string) => void;
}) {
  const findingSupport = useEvidenceStore((s) => s.findingSupport);
  const selectItem = useEvidenceStore((s) => s.selectItem);
  const handleSelect = onSelectEvidence ?? selectItem;

  if (findingSupport.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground-muted">
        No finding evidence support data available.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="finding-evidence-support">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Finding evidence support</h3>
        <p className="text-xs text-foreground-muted">
          Evidence grounding for each analytical finding, with per-item relevance scores and provenance.
        </p>
      </div>

      {findingSupport.map((f) => {
        const variant = SUPPORT_LEVEL_VARIANT[f.supportLevel];
        return (
          <div key={f.findingId} className="rounded-lg border border-border bg-surface p-3" data-testid={`finding-support-${f.findingId}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="h-4 w-4 shrink-0 text-evidence" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {DEMO_FINDING_LABELS[f.findingId] ?? f.findingId}
                  </p>
                  <p className="font-mono text-[11px] text-foreground-muted">{f.findingId}</p>
                </div>
              </div>
              <Badge size="sm" variant={variant}>
                {COVERAGE_LEVEL_LABELS[f.supportLevel]}
              </Badge>
            </div>

            <div className="mt-2.5 space-y-1.5">
              {f.evidenceItems.map((item) => (
                <button
                  key={item.evidenceId}
                  onClick={() => handleSelect(item.evidenceId)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated/40 px-2.5 py-2 text-left hover:border-evidence/50 tp-transition"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge size="sm" variant={EVIDENCE_TYPE_VARIANT[item.evidenceType]}>
                        {EVIDENCE_TYPE_LABELS[item.evidenceType]}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[10px] text-foreground-muted">
                        <Sparkles className="h-2.5 w-2.5 text-evidence" />
                        relevance {formatPercent(item.relevance)}
                      </span>
                    </div>
                  </div>
                  <Arrow />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Arrow() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-foreground-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
