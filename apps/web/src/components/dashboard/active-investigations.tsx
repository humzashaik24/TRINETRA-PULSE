'use client';

import Link from 'next/link';
import { FolderSearch, ArrowRight, ListChecks } from 'lucide-react';
import { badgeVariants } from '@trinetra-pulse/ui';
import { mockInvestigations } from '@/mock';
import { mockReviewByInvestigation } from '@/mock/investigation-operations';
import type { Investigation } from '@trinetra-pulse/types';

// ============================================================
// DASHBOARD — ACTIVE INVESTIGATIONS
// ============================================================
// Links to each open investigation and shows the outstanding review
// queue count (derived from the deterministic operations mock).
// Statuses are lifecycle; priority is workflow, never criminality.
// ============================================================

function statusVariant(status: Investigation['status']) {
  switch (status) {
    case 'active':
      return 'success';
    case 'under_review':
      return 'warning';
    case 'draft':
    case 'suspended':
      return 'info';
    default:
      return 'default';
  }
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under Review',
  suspended: 'Suspended',
  closed: 'Closed',
  archived: 'Archived',
};

export function ActiveInvestigations() {
  const open = mockInvestigations.filter((i) => i.status !== 'closed' && i.status !== 'archived');
  const reviewCount = (id: string) =>
    (mockReviewByInvestigation[id] ?? []).filter((r) => !r.resolved).length;

  if (open.length === 0) {
    return <p className="text-sm text-foreground-muted">No active investigations.</p>;
  }

  return (
    <ul className="divide-y divide-border" data-testid="active-investigations">
      {open.map((inv) => {
        const count = reviewCount(inv.id);
        return (
          <li key={inv.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/investigations/${inv.id}?tab=operations`}
                className="group flex items-center gap-3 min-w-0"
                data-testid="active-investigation-link"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-foreground-muted">
                  <FolderSearch className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground group-hover:text-brand">
                    {inv.title}
                  </span>
                  <span className="block truncate text-xs text-foreground-muted">
                    {inv.id.toUpperCase()} · {inv.lead_investigator}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className={badgeVariants({ variant: statusVariant(inv.status), size: 'sm' })}>
                  {STATUS_LABELS[inv.status]}
                </span>
                {count > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 ${badgeVariants({ variant: 'warning', size: 'sm' })}`}
                    data-testid="active-investigation-review-count"
                  >
                    <ListChecks className="h-3 w-3" />
                    {count}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveInvestigationsFooter() {
  return (
    <Link
      href="/investigations/new"
      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
      data-testid="new-investigation-shortcut"
    >
      New investigation <ArrowRight className="h-3 w-3" />
    </Link>
  );
}
