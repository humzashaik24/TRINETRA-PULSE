'use client';

import { motion } from 'framer-motion';
import {
  Plus, Pencil, FileText, UserCheck, GitBranch, Radar, XCircle, UserPlus, Clock,
} from 'lucide-react';
import { EmptyState } from '@trinetra-pulse/ui';
import { staggerChildVariants } from '@trinetra-pulse/ui';
import type { InvestigationActivity, ActivityAction } from '@trinetra-pulse/types';
import { investigationActivity } from '@/mock';

const ACTION_ICON: Record<ActivityAction, React.ReactNode> = {
  created: <Plus className="h-3 w-3" />,
  updated: <Pencil className="h-3 w-3" />,
  evidence_added: <FileText className="h-3 w-3" />,
  entity_reviewed: <UserCheck className="h-3 w-3" />,
  network_expanded: <GitBranch className="h-3 w-3" />,
  pattern_detected: <Radar className="h-3 w-3" />,
  closed: <XCircle className="h-3 w-3" />,
  assigned: <UserPlus className="h-3 w-3" />,
};

const ACTION_COLORS: Record<ActivityAction, string> = {
  created: 'bg-success/10 text-success',
  updated: 'bg-info/10 text-info',
  evidence_added: 'bg-evidence/10 text-evidence',
  entity_reviewed: 'bg-network/10 text-network',
  network_expanded: 'bg-network/10 text-network',
  pattern_detected: 'bg-anomaly/10 text-anomaly',
  closed: 'bg-foreground-muted/10 text-foreground-muted',
  assigned: 'bg-brand-subtle text-brand',
};

function ActivityItem({ activity, isLast }: { activity: InvestigationActivity; isLast: boolean }) {
  return (
    <motion.div
      variants={staggerChildVariants}
      className="group relative flex gap-3"
      role="listitem"
    >
      <div className="flex flex-col items-center shrink-0">
        <span className={`flex items-center justify-center h-6 w-6 rounded-full ${ACTION_COLORS[activity.action]}`}>
          {ACTION_ICON[activity.action]}
        </span>
        {!isLast && (
          <div className="w-px flex-1 bg-border/50 mt-1" aria-hidden="true" />
        )}
      </div>

      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-foreground-muted/70 uppercase tracking-wider font-medium">
            {activity.actionLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground mt-0.5 group-hover:text-brand tp-transition truncate">
          {activity.title}
        </p>
        <p className="text-[11px] text-foreground-muted mt-0.5 line-clamp-1">
          {activity.subtitle}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="inline-flex items-center rounded bg-surface-elevated px-1.5 py-0.5 text-[9px] font-mono text-foreground-muted">
            {activity.reference.label}
          </span>
          {activity.user && (
            <span className="text-[10px] text-foreground-muted/70">{activity.user}</span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-foreground-muted/60 ml-auto">
            <Clock className="h-2.5 w-2.5" aria-hidden="true" />
            {activity.timeAgo}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function InvestigationActivityFeed() {
  if (investigationActivity.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-8 w-8" />}
        title="No recent activity"
        description="Investigation activity will appear here as cases are updated, evidence is added, and patterns are detected."
      />
    );
  }

  return (
    <div className="space-y-0" role="list" aria-label="Investigation activity timeline">
      {investigationActivity.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          isLast={index === investigationActivity.length - 1}
        />
      ))}
    </div>
  );
}
