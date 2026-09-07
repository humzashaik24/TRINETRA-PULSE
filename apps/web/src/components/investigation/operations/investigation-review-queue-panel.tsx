'use client';

import { ListChecks, CircleDot } from 'lucide-react';
import { useInvestigationOperationsStore } from '@/state/investigation-operations.store';
import type { ReviewItem, ReviewPriority } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — REVIEW QUEUE PANEL
// ============================================================
// Neutral queue of items awaiting an investigator decision. The
// investigator decides what action to take; nothing is auto-judged.
// ============================================================

const KIND_LABELS: Record<string, string> = {
  data_validation: 'Data validation',
  unresolved_entity: 'Unresolved entity',
  low_confidence_extraction: 'Low-confidence extraction',
  relationship_review: 'Relationship review',
  evidence_missing_metadata: 'Evidence metadata',
  finding_missing_support: 'Finding support',
  normalization_issue: 'Normalization',
  duplicate_record: 'Duplicate record',
};

function priorityVariant(p: ReviewPriority) {
  switch (p) {
    case 'HIGH':
      return 'bg-danger-subtle text-danger';
    case 'MEDIUM':
      return 'bg-warning-subtle text-warning';
    default:
      return 'bg-info-subtle text-info';
  }
}

export function InvestigationReviewQueuePanel() {
  const reviewQueue = useInvestigationOperationsStore((s) => s.reviewQueue);
  const unfiltered = reviewQueue.filter((i) => !i.resolved);

  if (unfiltered.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No items awaiting a decision.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface" data-testid="investigation-review-queue">
      <ul className="divide-y divide-border">
        {unfiltered.map((item) => (
          <li key={item.id} className="flex gap-3 p-4">
            <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityVariant(item.priority)}`}>
                  {item.priority}
                </span>
                <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] text-foreground-muted">
                  {KIND_LABELS[item.kind] ?? item.kind}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground-secondary">{item.description}</p>
              <p className="mt-1 flex items-center gap-3 text-[11px] text-foreground-muted">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                {item.refId && (
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="h-3 w-3" /> {item.refType}: {item.refId}
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
