'use client';

import { Activity as ActivityIcon } from 'lucide-react';
import { useInvestigationStore } from '@/state/investigation.store';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// ============================================================
// INVESTIGATION — ACTIVITY LOG TAB
// ============================================================
// Chronological audit trail of actions taken within the
// investigation (links, findings, notes, status changes).
// ============================================================

const TYPE_DOT: Record<string, string> = {
  created: 'bg-brand',
  updated: 'bg-foreground-muted',
  status_changed: 'bg-warning',
  entity_linked: 'bg-info',
  entity_removed: 'bg-danger',
  relationship_linked: 'bg-info',
  relationship_removed: 'bg-danger',
  evidence_linked: 'bg-info',
  evidence_removed: 'bg-danger',
  finding_created: 'bg-success',
  finding_updated: 'bg-success',
  note_created: 'bg-info',
  note_updated: 'bg-info',
  note_deleted: 'bg-danger',
  network_linked: 'bg-info',
  analytics_captured: 'bg-brand',
  document_added: 'bg-foreground-muted',
};

export function InvestigationActivityTab() {
  const activity = useInvestigationStore((s) => s.data.activity);
  const sorted = [...activity].sort((a, b) => (a.at < b.at ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="investigation-activity-tab">
      {sorted.map((entry) => (
        <div key={entry.id} className="flex gap-3" data-testid="activity-entry">
          <div className="flex flex-col items-center">
            <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', TYPE_DOT[entry.type] ?? 'bg-foreground-muted')} />
            <span className="w-px flex-1 bg-border" />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{entry.title}</p>
              <p className="shrink-0 text-[11px] text-foreground-muted">{formatDateTime(entry.at)}</p>
            </div>
            {entry.detail && <p className="text-xs text-foreground-secondary">{entry.detail}</p>}
            {entry.actor && <p className="mt-0.5 text-[11px] text-foreground-muted">by {entry.actor}</p>}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 text-xs text-foreground-muted">
        <ActivityIcon className="h-3.5 w-3.5" />
        Entries reflect actions recorded in this investigation.
      </div>
    </div>
  );
}
