import * as React from 'react';
import { cn } from '../../lib/utils';

interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

function ChartCard({ title, subtitle, action, children, className, ...props }: ChartCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-4', className)} {...props}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-subheading text-foreground">{title}</h3>
          {subtitle && <p className="text-caption text-foreground-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
  className?: string;
}

function StatCard({ label, value, change, trend, icon, className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="tp-data-label">{label}</span>
        {icon && <span className="text-foreground-muted">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-display-sm font-bold text-foreground">{value}</span>
        {change !== undefined && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-danger',
            trend === 'flat' && 'text-foreground-muted'
          )}>
            {trend === 'up' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5m-5 5l5-5 5 5" />
              </svg>
            )}
            {trend === 'down' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14m5-5l-5 5-5-5" />
              </svg>
            )}
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
}

interface MiniBarProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

function MiniBar({ data, color = 'hsl(var(--color-brand))', height = 32, className }: MiniBarProps) {
  const max = Math.max(...data, 1);

  return (
    <div className={cn('flex items-end gap-px', className)} style={{ height }} aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm tp-transition"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.3 + (v / max) * 0.7,
          }}
        />
      ))}
    </div>
  );
}

interface DotIndicatorProps {
  count: number;
  active?: number;
  size?: 'sm' | 'md';
  className?: string;
}

function DotIndicator({ count, active = 0, size = 'sm', className }: DotIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`Page ${active + 1} of ${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-full tp-transition',
            size === 'sm' && 'h-1 w-1',
            size === 'md' && 'h-1.5 w-1.5',
            i === active ? 'bg-brand' : 'bg-foreground-muted/30'
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export { ChartCard, StatCard, MiniBar, DotIndicator };
