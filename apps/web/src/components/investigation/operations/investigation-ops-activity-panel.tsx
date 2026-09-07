'use client';

import { Activity as ActivityIcon } from 'lucide-react';
import { useInvestigationOperationsStore } from '@/state/investigation-operations.store';
import type { InvestigationActivityLog } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — ACTIVITY PANEL
// ============================================================
// Operator activity log for the open investigation. Neutral action
// labels with actor + timestamp.
// ============================================================

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function InvestigationOpsActivityPanel() {
  const activity = useInvestigationOperationsStore((s) => s.activity);

  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-testid="investigation-ops-activity">
      {activity.map((entry: InvestigationActivityLog) => (
        <li key={entry.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <ActivityIcon className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{entry.label}</span>
              <span className="text-[11px] text-foreground-muted">{timeAgo(entry.at)}</span>
            </div>
            {entry.detail && <p className="mt-0.5 text-xs text-foreground-secondary">{entry.detail}</p>}
          </div>
          <span className="shrink-0 text-[11px] text-foreground-muted">{entry.actor}</span>
        </li>
      ))}
    </ul>
  );
}
