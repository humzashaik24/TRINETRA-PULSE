'use client';

import { type EntityEvent } from '@trinetra-pulse/types';
import { ConfidenceIndicator, EmptyState, SourceBadge } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { CalendarClock, Landmark, PhoneCall, Presentation, Send, Truck } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

// ============================================================
// ENTITY EVENTS
// ============================================================

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  meeting: Presentation,
  transaction: Send,
  communication: PhoneCall,
  movement: Truck,
  case_event: Landmark,
  compliance: Landmark,
};

const EVENT_TONES: Record<string, string> = {
  meeting: 'text-brand bg-brand-subtle',
  transaction: 'text-success bg-success-subtle',
  communication: 'text-info bg-info-subtle',
  movement: 'text-warning bg-warning-subtle',
  case_event: 'text-danger bg-danger-subtle',
  compliance: 'text-network bg-network-subtle',
};

export function EntityEvents({ events }: { events: EntityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-8 w-8" />}
        title="No events recorded"
        description="Timeline events for this entity will appear here after analysis."
      />
    );
  }

  return (
    <Stagger staggerInterval={0.05}>
      <div className="space-y-2">
        {events.map((ev) => {
          const Icon = EVENT_ICONS[ev.eventType] ?? CalendarClock;
          const tone = EVENT_TONES[ev.eventType] ?? 'text-foreground-muted bg-surface-elevated';
          return (
            <motion.div
              key={ev.id}
              variants={staggerChildVariants}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{ev.title}</span>
                  <ConfidenceIndicator value={ev.confidence} size="sm" showValue />
                </div>
                {ev.description && (
                  <p className="text-body-sm text-foreground-muted mt-0.5">{ev.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <SourceBadge source={ev.source} size="sm" />
                  <span className="text-caption text-foreground-muted">{formatDateTime(ev.timestamp)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Stagger>
  );
}