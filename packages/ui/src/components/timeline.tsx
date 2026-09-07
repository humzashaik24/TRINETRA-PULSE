import * as React from 'react';
import { cn } from '../lib/utils';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  icon?: React.ReactNode;
  color?: string;
  active?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
  compact?: boolean;
}

function Timeline({ items, className, compact }: TimelineProps) {
  return (
    <div className={cn('relative', className)} role="list">
      {items.map((item, idx) => (
        <div
          key={item.id}
          role="listitem"
          className={cn(
            'relative flex gap-3',
            idx < items.length -1 && 'pb-4'
          )}
        >
          {/* Line */}
          {idx < items.length - 1 && (
            <div
              className="absolute left-[11px] top-6 bottom-0 w-px bg-border"
              aria-hidden="true"
            />
          )}

          {/* Dot */}
          <div
            className={cn(
              'relative z-10 flex shrink-0 items-center justify-center',
              compact ? 'h-5 w-5' : 'h-6 w-6',
              'rounded-full border-2 border-border bg-surface'
            )}
            aria-hidden="true"
          >
            {item.icon ? (
              <span className="text-foreground-muted">{item.icon}</span>
            ) : (
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  item.active ? 'bg-brand' : 'bg-foreground-muted/30'
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'font-medium text-foreground',
                compact ? 'text-body-sm' : 'text-sm'
              )}>
                {item.title}
              </span>
              {item.timestamp && (
                <span className="text-caption text-foreground-muted whitespace-nowrap">
                  {item.timestamp}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-body-sm text-foreground-muted mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Timeline };
export type { TimelineItem };
