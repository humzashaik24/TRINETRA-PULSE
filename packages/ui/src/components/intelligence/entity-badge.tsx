import * as React from 'react';
import { cn } from '../../lib/utils';

type EntityTypeValue =
  | 'person' | 'phone' | 'vehicle' | 'location'
  | 'organization' | 'account' | 'transaction' | 'event'
  | 'case' | 'document' | 'evidence';

const ENTITY_TYPE_CONFIG: Record<EntityTypeValue, { label: string; icon: string; colorClass: string }> = {
  person: { label: 'Person', icon: '👤', colorClass: 'bg-entity-person' },
  phone: { label: 'Phone', icon: '📱', colorClass: 'bg-entity-phone' },
  vehicle: { label: 'Vehicle', icon: '🚗', colorClass: 'bg-entity-vehicle' },
  location: { label: 'Location', icon: '📍', colorClass: 'bg-entity-location' },
  organization: { label: 'Organization', icon: '🏢', colorClass: 'bg-entity-organization' },
  account: { label: 'Account', icon: '💳', colorClass: 'bg-entity-account' },
  transaction: { label: 'Transaction', icon: '💰', colorClass: 'bg-entity-transaction' },
  event: { label: 'Event', icon: '📅', colorClass: 'bg-entity-event' },
  case: { label: 'Case', icon: '📁', colorClass: 'bg-entity-case' },
  document: { label: 'Document', icon: '📄', colorClass: 'bg-entity-document' },
  evidence: { label: 'Evidence', icon: '📎', colorClass: 'bg-entity-evidence' },
};

interface EntityTypeIconProps {
  type: EntityTypeValue;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

function EntityTypeIcon({ type, size = 'sm', showLabel = false, className }: EntityTypeIconProps) {
  const config = ENTITY_TYPE_CONFIG[type];

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded',
          config.colorClass,
          size === 'xs' && 'h-4 w-4 text-[8px]',
          size === 'sm' && 'h-5 w-5 text-[10px]',
          size === 'md' && 'h-6 w-6 text-xs'
        )}
        aria-hidden="true"
      >
        <span className="filter grayscale brightness-200">{config.icon}</span>
      </span>
      {showLabel && (
        <span className={cn(
          'text-foreground-secondary',
          size === 'xs' && 'text-[10px]',
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm'
        )}>
          {config.label}
        </span>
      )}
    </span>
  );
}

interface EntityBadgeProps {
  name: string;
  type: EntityTypeValue;
  riskScore?: number;
  isVerified?: boolean;
  isFlagged?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

function EntityBadge({
  name, type, riskScore, isVerified, isFlagged, size = 'md', onClick, className
}: EntityBadgeProps) {
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 font-medium tp-transition',
        size === 'sm' && 'text-xs h-5',
        size === 'md' && 'text-sm h-6',
        onClick && 'cursor-pointer hover:bg-surface-hover active:bg-surface-active',
        isFlagged && 'border-danger/30 bg-danger-subtle',
        className
      )}
      {...(onClick ? { role: 'button' } : {})}
    >
      <EntityTypeIcon type={type} size="xs" />
      <span className="text-foreground truncate max-w-[120px]">{name}</span>
      {isVerified && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-success shrink-0" aria-label="Verified">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {riskScore !== undefined && riskScore > 0.7 && (
        <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" aria-label="High risk" />
      )}
    </Tag>
  );
}

export { EntityBadge, EntityTypeIcon, ENTITY_TYPE_CONFIG };
export type { EntityTypeValue };
