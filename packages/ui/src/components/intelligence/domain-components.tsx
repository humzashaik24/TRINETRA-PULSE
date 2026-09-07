import * as React from 'react';
import { cn } from '../../lib/utils';

interface ConfidenceIndicatorProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showValue?: boolean;
  className?: string;
}

function ConfidenceIndicator({
  value, size = 'md', showLabel = false, showValue = true, className
}: ConfidenceIndicatorProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const percent = Math.round(clamped * 100);

  const level =
    clamped >= 0.8 ? 'high' :
    clamped >= 0.5 ? 'medium' :
    clamped >= 0.3 ? 'low' : 'very-low';

  const colorMap = {
    high: 'bg-success',
    medium: 'bg-warning',
    low: 'bg-anomaly',
    'very-low': 'bg-foreground-muted',
  };

  const textColorMap = {
    high: 'text-success',
    medium: 'text-warning',
    low: 'text-anomaly',
    'very-low': 'text-foreground-muted',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-surface-active',
          size === 'sm' && 'h-1 w-12',
          size === 'md' && 'h-1.5 w-16',
          size === 'lg' && 'h-2 w-20'
        )}
      >
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full tp-transition', colorMap[level])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showValue && (
        <span className={cn(
          'font-mono text-code font-medium',
          textColorMap[level],
          size === 'sm' && 'text-[10px]',
          size === 'md' && 'text-xs',
          size === 'lg' && 'text-sm'
        )}>
          {percent}%
        </span>
      )}
      {showLabel && (
        <span className="text-caption text-foreground-muted capitalize">{level}</span>
      )}
    </div>
  );
}

interface EvidenceBadgeProps {
  count: number;
  type?: 'document' | 'digital' | 'physical' | 'testimonial';
  size?: 'sm' | 'md';
  className?: string;
}

function EvidenceBadge({ count, type, size = 'md', className }: EvidenceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-evidence-subtle text-evidence font-medium',
        size === 'sm' && 'text-[10px] px-1.5 py-0.5 h-4',
        size === 'md' && 'text-xs px-2 py-0.5 h-5',
        className
      )}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      {count} {count === 1 ? 'item' : 'items'}
      {type && <span className="text-evidence/60 capitalize">({type})</span>}
    </span>
  );
}

interface RelationshipBadgeProps {
  type: string;
  confidence?: number;
  verified?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function RelationshipBadge({ type, confidence, verified, size = 'md', className }: RelationshipBadgeProps) {
  const label = type.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-surface font-medium capitalize',
        size === 'sm' && 'text-[10px] px-1.5 py-0.5 h-4',
        size === 'md' && 'text-xs px-2 py-0.5 h-5',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-network shrink-0" aria-hidden="true" />
      {label}
      {verified && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-success shrink-0">
          <path d="M9 12l2 2 4-4" />
        </svg>
      )}
    </span>
  );
}

interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'pending' | 'resolved' | 'archived';
  size?: 'sm' | 'md';
  className?: string;
}

function StatusIndicator({ status, size = 'md', className }: StatusIndicatorProps) {
  const config = {
    active: { label: 'Active', dot: 'bg-success' },
    inactive: { label: 'Inactive', dot: 'bg-foreground-muted' },
    pending: { label: 'Pending', dot: 'bg-warning' },
    resolved: { label: 'Resolved', dot: 'bg-info' },
    archived: { label: 'Archived', dot: 'bg-foreground-muted/50' },
  };

  const { label, dot } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('rounded-full', dot, size === 'sm' && 'h-1.5 w-1.5', size === 'md' && 'h-2 w-2')} aria-hidden="true" />
      <span className={cn(
        'font-medium capitalize',
        size === 'sm' && 'text-[10px]',
        size === 'md' && 'text-xs'
      )}>
        {label}
      </span>
    </span>
  );
}

interface RiskIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

function RiskIndicator({ score, size = 'md', showLabel = true, className }: RiskIndicatorProps) {
  const clamped = Math.max(0, Math.min(1, score));
  const percent = Math.round(clamped * 100);

  const level =
    clamped >= 0.8 ? 'critical' :
    clamped >= 0.6 ? 'high' :
    clamped >= 0.4 ? 'medium' :
    clamped >= 0.2 ? 'low' : 'minimal';

  const colorMap = {
    critical: 'text-danger bg-danger-subtle',
    high: 'text-anomaly bg-anomaly-subtle',
    medium: 'text-warning bg-warning-subtle',
    low: 'text-info bg-info-subtle',
    minimal: 'text-foreground-muted bg-surface-elevated',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded font-mono font-medium',
          colorMap[level],
          size === 'sm' && 'h-5 min-w-[20px] px-1 text-[10px]',
          size === 'md' && 'h-6 min-w-[24px] px-1.5 text-xs',
          size === 'lg' && 'h-7 min-w-[28px] px-2 text-sm'
        )}
      >
        {percent}
      </span>
      {showLabel && (
        <span className="text-caption text-foreground-muted capitalize">{level} risk</span>
      )}
    </div>
  );
}

interface SourceBadgeProps {
  source: string;
  method?: string;
  confidence?: number;
  size?: 'sm' | 'md';
  className?: string;
}

function SourceBadge({ source, method, confidence, size = 'md', className }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded bg-surface-elevated text-foreground-secondary',
        size === 'sm' && 'text-[10px] px-1.5 py-0.5',
        size === 'md' && 'text-xs px-2 py-0.5',
        className
      )}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground-muted shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {source}
      {method && <span className="text-foreground-muted">via {method}</span>}
    </span>
  );
}

interface IntelligenceFindingProps {
  title: string;
  description?: string;
  confidence: number;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  timestamp?: string;
  onNavigate?: () => void;
  className?: string;
}

function IntelligenceFinding({
  title, description, confidence, severity, source, timestamp, onNavigate, className
}: IntelligenceFindingProps) {
  const severityConfig = {
    info: { border: 'border-info/20', bg: 'bg-info-subtle', text: 'text-info', label: 'Info' },
    low: { border: 'border-border', bg: 'bg-surface-elevated', text: 'text-foreground-muted', label: 'Low' },
    medium: { border: 'border-warning/20', bg: 'bg-warning-subtle', text: 'text-warning', label: 'Medium' },
    high: { border: 'border-anomaly/20', bg: 'bg-anomaly-subtle', text: 'text-anomaly', label: 'High' },
    critical: { border: 'border-danger/20', bg: 'bg-danger-subtle', text: 'text-danger', label: 'Critical' },
  };

  const config = severityConfig[severity];

  return (
    <div
      className={cn(
        'rounded-lg border p-3 tp-transition',
        config.border,
        onNavigate && 'cursor-pointer hover:bg-surface-hover',
        className
      )}
      onClick={onNavigate}
      role={onNavigate ? 'button' : undefined}
      tabIndex={onNavigate ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', config.bg, config.text)}>
              {config.label}
            </span>
            <span className="text-sm font-medium text-foreground">{title}</span>
          </div>
          {description && (
            <p className="text-body-sm text-foreground-muted mt-1 line-clamp-2">{description}</p>
          )}
        </div>
        <span className="text-code text-foreground-muted shrink-0">{Math.round(confidence * 100)}%</span>
      </div>
      {(source || timestamp) && (
        <div className="flex items-center gap-2 mt-2 text-[10px] text-foreground-muted">
          {source && <span>{source}</span>}
          {source && timestamp && <span aria-hidden="true">·</span>}
          {timestamp && <span>{timestamp}</span>}
        </div>
      )}
    </div>
  );
}

interface NetworkStatProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

function NetworkStat({ label, value, change, icon, className }: NetworkStatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-foreground-muted">{icon}</span>}
        <span className="tp-data-label">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="tp-data-value text-lg">{value}</span>
        {change !== undefined && (
          <span className={cn(
            'text-[10px] font-medium',
            change > 0 && 'text-success',
            change < 0 && 'text-danger',
            change === 0 && 'text-foreground-muted'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
}

export {
  ConfidenceIndicator,
  EvidenceBadge,
  RelationshipBadge,
  StatusIndicator,
  RiskIndicator,
  SourceBadge,
  IntelligenceFinding,
  NetworkStat,
};
