'use client';

import {
  EXTRACTION_METHOD_CONFIG,
  JOB_STATUS_CONFIG,
  RELATIONSHIP_STATUS_CONFIG,
  RESOLUTION_STATE_CONFIG,
} from '@/lib/entity-domain';
import { EXTRACTION_METHOD_LABELS } from '@/lib/format';
import { Badge, Tooltip } from '@trinetra-pulse/ui';
import type {
  ExtractionJobStatus,
  ExtractionMethod,
  RelationshipCandidateStatus,
  ResolutionState,
} from '@trinetra-pulse/types';
import { cn } from '@/lib/utils';

// ============================================================
// SHARED DOMAIN BADGES
// Accent color + always-visible text label (no color-only).
// ============================================================

interface ResolutionStateBadgeProps {
  state: ResolutionState;
  size?: 'sm' | 'md';
  className?: string;
}

export function ResolutionStateBadge({ state, size = 'md', className }: ResolutionStateBadgeProps) {
  const config = RESOLUTION_STATE_CONFIG[state];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} size={size} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}

interface MethodBadgeProps {
  method: ExtractionMethod;
  size?: 'sm' | 'md';
  className?: string;
}

export function MethodBadge({ method, size = 'sm', className }: MethodBadgeProps) {
  const config = EXTRACTION_METHOD_CONFIG[method];
  const Icon = config.icon;
  return (
    <Tooltip content={EXTRACTION_METHOD_LABELS[method]}>
      <Badge variant="secondary" size={size} className={cn('gap-1', className)}>
        <Icon className="h-3 w-3 shrink-0 text-foreground-muted" aria-hidden="true" />
        {config.label}
      </Badge>
    </Tooltip>
  );
}

interface JobStatusBadgeProps {
  status: ExtractionJobStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function JobStatusBadge({ status, size = 'sm', className }: JobStatusBadgeProps) {
  const config = JOB_STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge
      variant={config.variant}
      size={size}
      className={cn('gap-1', className)}
      {...(config.icon === JOB_STATUS_CONFIG.EXTRACTING.icon ? { dot: false } : {})}
    >
      <Icon
        className={cn('h-3 w-3 shrink-0', (status === 'EXTRACTING' || status === 'NORMALIZING' || status === 'RESOLVING') && 'animate-spin')}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  );
}

interface RelationshipStatusBadgeProps {
  status: RelationshipCandidateStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function RelationshipStatusBadge({ status, size = 'sm', className }: RelationshipStatusBadgeProps) {
  const config = RELATIONSHIP_STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}