'use client';

import { type EntityActivityItem, type ResolutionHistoryEntry } from '@trinetra-pulse/types';
import {
  Badge,
  EmptyState,
  Timeline,
  Tooltip,
  type TimelineItem,
} from '@trinetra-pulse/ui';
import {
  CheckCircle2,
  History,
  Merge,
  PlusCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';

// ============================================================
// ENTITY ACTIVITY + RESOLUTION HISTORY
// ============================================================

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  entity_created: <PlusCircle className="h-3 w-3" />,
  entity_updated: <RefreshCw className="h-3 w-3" />,
  entity_resolved: <CheckCircle2 className="h-3 w-3" />,
  entity_merged: <Merge className="h-3 w-3" />,
  relationship_verified: <CheckCircle2 className="h-3 w-3" />,
  relationship_rejected: <XCircle className="h-3 w-3" />,
};

function activityToTimeline(items: EntityActivityItem[]): TimelineItem[] {
  return items.map((a) => ({
    id: a.id,
    title: a.actionLabel,
    description: a.actor ? `${a.detail} · ${a.actor}` : a.detail,
    timestamp: formatDateTime(a.timestamp),
    icon: ACTIVITY_ICONS[a.action],
  }));
}

function historyToTimeline(entries: ResolutionHistoryEntry[]): TimelineItem[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.actionLabel,
    description: e.description,
    timestamp: formatDateTime(e.timestamp),
    icon:
      e.action === 'MERGED' ? <Merge className="h-3 w-3" /> :
      e.action === 'REJECTED' ? <XCircle className="h-3 w-3" /> :
      e.action === 'RESOLVED' ? <CheckCircle2 className="h-3 w-3" /> :
      <PlusCircle className="h-3 w-3" />,
  }));
}

interface EntityActivityProps {
  activity: EntityActivityItem[];
  resolutionHistory: ResolutionHistoryEntry[];
}

export function EntityActivity({ activity, resolutionHistory }: EntityActivityProps) {
  if (activity.length === 0 && resolutionHistory.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-8 w-8" />}
        title="No activity yet"
        description="Edits and resolution events for this entity will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-subheading text-foreground">Recent activity</h3>
          <Tooltip content="Actions performed on this entity by analysts and the pipeline">
            <Badge variant="secondary" size="sm">{activity.length}</Badge>
          </Tooltip>
        </div>
        {activity.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">No activity recorded.</p>
        ) : (
          <Timeline items={activityToTimeline(activity)} compact />
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-subheading text-foreground">Resolution history</h3>
          <Tooltip content="Explanable resolution decisions recorded against this entity">
            <Badge variant="secondary" size="sm">{resolutionHistory.length}</Badge>
          </Tooltip>
        </div>
        {resolutionHistory.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">No resolution history recorded.</p>
        ) : (
          <Timeline items={historyToTimeline(resolutionHistory)} compact />
        )}
      </div>
    </div>
  );
}