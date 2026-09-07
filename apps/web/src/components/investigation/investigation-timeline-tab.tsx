'use client';

import {
  CalendarDays,
  Activity as ActivityIcon,
  FileSearch,
  StickyNote,
  GitBranch,
  Magnet,
  GitFork,
} from 'lucide-react';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// ============================================================
// INVESTIGATION — TIMELINE TAB (Phase 13 unified view)
// ============================================================
// A single, chronological investigation stream that merges events,
// evidence, findings, notes and investigation actions into one
// timeline. Every entry carries a category badge with a distinct
// color; entries backed by a canonical object open in the Context
// Inspector, so the timeline is a navigation surface, not a report.
//
// Categories:
//   EVENT        — canonical events (observation / transaction …)
//   EVIDENCE     — evidence linked into the investigation
//   FINDING      — analytical findings (never proof)
//   NOTE         — investigator notes
//   ACTION       — investigation workspace actions (activity log)
//   SYSTEM       — system milestones (created, updated)
// ============================================================

type TimelineCategory =
  | 'event'
  | 'evidence'
  | 'finding'
  | 'note'
  | 'activity'
  | 'system'
  | 'relationship';

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
  relationship: {
    label: 'RELATIONSHIP',
    icon: GitFork,
    chip: 'text-evidence bg-evidence-subtle',
    dot: 'bg-evidence',
  },
};

const CATEGORY_ORDER: TimelineCategory[] = [
  'event',
  'evidence',
  'relationship',
  'finding',
  'note',
  'activity',
  'system',
];

interface UnifiedEntry {
  id: string;
  category: TimelineCategory;
  timestamp: string;
  title: string;
  description?: string | null;
  refId: string | null;
  refType: string | null;
  actor: string | null;
}

export function InvestigationTimelineTab() {
  const timeline = useInvestigationStore((s) => s.data.timeline);
  const activity = useInvestigationStore((s) => s.data.activity);
  const findings = useInvestigationStore((s) => s.data.findings);
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const selectContext = useShellStore((s) => s.selectContext);

  // Merge the investigation action log and the findings into a single
  // chronological stream (dates fall back to linkedAt/createdAt).
  const entries: UnifiedEntry[] = [
    ...timeline.map((t) => ({
      id: t.id,
      category: t.category as TimelineCategory,
      timestamp: t.timestamp,
      title: t.title,
      description: t.description,
      refId: t.ref_id,
      refType: t.ref_type,
      actor: t.actor,
    })),
    ...activity.map((a) => ({
      id: a.id,
      category: 'activity' as TimelineCategory,
      timestamp: a.at,
      title: a.title,
      description: a.detail,
      refId: null,
      refType: null,
      actor: a.actor,
    })),
    ...findings.map((f) => ({
      id: f.id,
      category: 'finding' as TimelineCategory,
      timestamp: f.created_at,
      title: f.title,
      description: f.description,
      refId: f.id,
      refType: 'finding',
      actor: f.created_by,
    })),
  ];

  const sorted = [...entries].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
        No timeline entries yet.
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

      <div className="space-y-3">
        {sorted.map((item) => {
          const meta = CATEGORY_META[item.category] ?? CATEGORY_META.system;
          const Icon = meta.icon;
          const canInspect =
            item.refId &&
            (item.refType === 'event' ||
              item.refType === 'evidence' ||
              item.refType === 'note' ||
              item.refType === 'finding' ||
              item.refType === 'relationship');
          return (
            <div
              key={item.id}
              className="flex gap-3 rounded-xl border border-border bg-surface p-4"
              data-testid="timeline-item"
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  item.category === 'event' && 'bg-network-subtle text-network',
                  (item.category === 'evidence') && 'bg-brand/10 text-brand',
                  item.category === 'relationship' && 'bg-evidence-subtle text-evidence',
                  (item.category === 'finding') && 'bg-surface-elevated text-foreground',
                  item.category === 'note' && 'bg-surface-elevated text-foreground',
                  (item.category === 'activity' || item.category === 'system') && 'bg-surface-elevated text-foreground-muted'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-foreground-muted">{formatDateTime(item.timestamp)}</p>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', meta.chip)}>
                    {meta.label}
                  </span>
                </div>
                {canInspect ? (
                  <button
                    onClick={() => selectContext(contextForEntry(item, investigationId ?? undefined))}
                    className="mt-0.5 text-left font-medium text-foreground hover:text-brand"
                  >
                    {item.title}
                  </button>
                ) : (
                  <p className="mt-0.5 font-medium text-foreground">{item.title}</p>
                )}
                {item.description && (
                  <p className="mt-0.5 text-xs text-foreground-secondary">{item.description}</p>
                )}
                {item.actor && <p className="mt-0.5 text-[11px] text-foreground-muted">by {item.actor}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function contextForEntry(
  item: UnifiedEntry,
  investigationId?: string
): import('@/state/shell.store').InspectorContext {
  switch (item.refType) {
    case 'event':
      return { type: 'event', id: item.refId!, title: item.title, investigationId };
    case 'note':
      return { type: 'note', id: item.refId!, investigationId, author: item.actor ?? undefined, body: item.description ?? undefined };
    case 'finding':
      return { type: 'finding', id: item.refId!, title: item.title, investigationId };
    case 'evidence':
      return { type: 'evidence', id: item.refId!, title: item.title, investigationId };
    case 'relationship':
      return { type: 'relationship', id: item.refId!, investigationId };
    default:
      return { type: 'evidence', id: item.refId!, title: item.title, investigationId };
  }
}