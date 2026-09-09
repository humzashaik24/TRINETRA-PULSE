'use client';

import { useState } from 'react';
import {
  CalendarDays,
  Activity as ActivityIcon,
  FileSearch,
  StickyNote,
  GitBranch,
  Magnet,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { useInvestigationStore } from '@/state/investigation.store';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  buildUnifiedTimeline,
  groupTimelineRows,
  timestampSourceLabel,
  type TimelineCategory,
  type TimelineRow,
} from '@/lib/timeline';
import { TimelineEventDetailPanel } from '@/components/investigation/timeline-event-detail-panel';

// ============================================================
// INVESTIGATION — TIMELINE TAB (Phase 29 unified timeline)
// ============================================================
// A single, chronological investigation stream that merges events,
// evidence, findings, notes and investigation actions into one
// timeline. Semantics are centralised in lib/timeline.ts:
//
//  • Rows stream ASCENDING by each record's REAL temporal field
//    (event time / evidence collected / created / action time).
//  • A row without a recorded time renders as an honest
//    "Time unavailable" in its own trailing group — never a
//    fabricated date.
//  • The time-source label tells the reader WHICH field timed it.
//  • Expanding a row opens the TimelineEventDetailPanel, resolving
//    the canonical event/evidence/finding/note from persisted data.
// ============================================================

const CATEGORY_META: Record<
  TimelineCategory,
  { label: string; icon: typeof CalendarDays; chip: string; dot: string }
> = {
  event: {
    label: 'EVENT',
    icon: CalendarDays,
    chip: 'text-network bg-network-subtle',
    dot: 'bg-network',
  },
  evidence: {
    label: 'EVIDENCE',
    icon: FileSearch,
    chip: 'text-brand bg-brand/10',
    dot: 'bg-brand',
  },
  finding: {
    label: 'FINDING',
    icon: Magnet,
    chip: 'text-foreground bg-surface-elevated',
    dot: 'bg-foreground',
  },
  note: {
    label: 'NOTE',
    icon: StickyNote,
    chip: 'text-foreground bg-surface-elevated',
    dot: 'bg-foreground-muted',
  },
  activity: {
    label: 'ACTION',
    icon: ActivityIcon,
    chip: 'text-foreground-muted bg-surface-elevated',
    dot: 'bg-foreground-muted',
  },
  system: {
    label: 'SYSTEM',
    icon: GitBranch,
    chip: 'text-foreground-muted bg-surface-elevated',
    dot: 'bg-foreground-muted',
  },
};

const CATEGORY_ORDER: TimelineCategory[] = [
  'event',
  'evidence',
  'finding',
  'note',
  'activity',
  'system',
];

export function InvestigationTimelineTab() {
  const data = useInvestigationStore((s) => s.data);
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const loading = useInvestigationStore((s) => s.loading);
  const error = useInvestigationStore((s) => s.error);
  const loadInvestigation = useInvestigationStore((s) => s.loadInvestigation);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = buildUnifiedTimeline({
    investigationId: investigationId ?? '',
    timeline: data.timeline,
    activity: data.activity,
    findings: data.findings,
    evidence: data.evidence,
  });
  const groups = groupTimelineRows(rows);

  if (loading) {
    return (
      <div
        className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-secondary"
        data-testid="timeline-loading"
      >
        <Clock className="mx-auto mb-2 h-5 w-5 animate-pulse text-foreground-muted" />
        Loading timeline…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-secondary"
        data-testid="timeline-error"
      >
        <p className="text-foreground">Unable to load timeline.</p>
        <button
          type="button"
          onClick={() => {
            if (investigationId) void loadInvestigation(investigationId);
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
          data-testid="timeline-retry"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p
        className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted"
        data-testid="timeline-empty"
      >
        No timeline events for this investigation.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="investigation-timeline-tab">
      {/* Category legend */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2"
        data-testid="timeline-legend"
      >
        {CATEGORY_ORDER.map((kind) => {
          const meta = CATEGORY_META[kind];
          return (
            <span key={kind} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', meta.chip)}>
                {meta.label}
              </span>
            </span>
          );
        })}
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.date ?? '__undated'}>
            <div className="mb-2 flex items-center gap-2">
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wide',
                  group.date === null ? 'text-foreground-muted' : 'text-foreground-secondary'
                )}
                data-testid={group.date === null ? 'timeline-group-undated' : 'timeline-group-date'}
              >
                {group.label}
              </p>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              {group.entries.map((item) => {
                const meta = CATEGORY_META[item.category] ?? CATEGORY_META.system;
                const Icon = meta.icon;
                const isExpanded = Boolean(expanded[item.id]);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-xl border border-border bg-surface p-4',
                      isExpanded && 'border-primary/30 bg-surface-elevated/40'
                    )}
                    data-testid="timeline-item"
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          item.category === 'event' && 'bg-network-subtle text-network',
                          item.category === 'evidence' && 'bg-brand/10 text-brand',
                          item.category === 'finding' && 'bg-surface-elevated text-foreground',
                          item.category === 'note' && 'bg-surface-elevated text-foreground',
                          (item.category === 'activity' || item.category === 'system') &&
                            'bg-surface-elevated text-foreground-muted'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', meta.chip)}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-foreground-muted">
                            {timestampSourceLabel(item.category)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                            <Clock className="h-3 w-3" />
                            {item.timestamp ? formatDateTime(item.timestamp) : 'Time unavailable'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                            }
                            className="inline-flex items-start gap-1 rounded-md text-left font-medium text-foreground hover:text-brand"
                            data-testid={`timeline-expand-${item.id}`}
                            aria-expanded={isExpanded}
                          >
                            <ChevronRight
                              className={cn('mt-0.5 h-4 w-4 shrink-0 text-foreground-muted', isExpanded && 'rotate-90')}
                            />
                            {item.title}
                          </button>
                        </div>
                        {item.description ? (
                          <p className="mt-0.5 pl-5 text-xs text-foreground-secondary">
                            {item.description}
                          </p>
                        ) : null}
                        {item.actor ? (
                          <p className="mt-0.5 pl-5 text-[11px] text-foreground-muted">
                            by {item.actor}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-3">
                        <TimelineEventDetailPanel
                          row={item}
                          investigationId={investigationId ?? ''}
                          onClose={() =>
                            setExpanded((prev) => ({ ...prev, [item.id]: false }))
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}