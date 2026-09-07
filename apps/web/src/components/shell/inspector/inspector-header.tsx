'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InspectorContextType } from '@/state/shell.store';
import { IconButton, Tooltip, EntityTypeIcon } from '@trinetra-pulse/ui';
import type { EntityType } from '@trinetra-pulse/types';

// ============================================================
// PHASE 3.5 — INSPECTOR HEADER
// ============================================================

const CONTEXT_META: Record<
  InspectorContextType,
  { eyebrow: string; label: string }
> = {
  entity: { eyebrow: 'ENTITY', label: 'Entity context' },
  relationship: { eyebrow: 'RELATIONSHIP', label: 'Relationship context' },
  dataset: { eyebrow: 'DATASET', label: 'Dataset context' },
  finding: { eyebrow: 'FINDING', label: 'Finding context' },
  evidence: { eyebrow: 'EVIDENCE', label: 'Evidence context' },
  network: { eyebrow: 'NETWORK', label: 'Network context' },
  case: { eyebrow: 'CASE', label: 'Investigation context' },
  centrality: { eyebrow: 'CENTRALITY', label: 'Centrality context' },
  community: { eyebrow: 'GROUP', label: 'Connected group context' },
  component: { eyebrow: 'COMPONENT', label: 'Component context' },
  pattern: { eyebrow: 'PATTERN', label: 'Pattern context' },
  investigation: { eyebrow: 'INVESTIGATION', label: 'Investigation context' },
  note: { eyebrow: 'NOTE', label: 'Note context' },
  event: { eyebrow: 'EVENT', label: 'Event context' },
  analytics_snapshot: { eyebrow: 'ANALYTICS', label: 'Analytics snapshot context' },
};

export interface InspectorHeaderProps {
  contextType: InspectorContextType;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  className?: string;
}

export function InspectorHeader({
  contextType,
  title,
  onClose,
  onBack,
  className,
}: InspectorHeaderProps) {
  const meta = CONTEXT_META[contextType];

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 border-b border-border px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <p className="tp-data-label">{meta.eyebrow}</p>
          <p className="text-sm font-medium text-foreground truncate" title={title}>
            {title}
          </p>
        </div>
      </div>

      <Tooltip content="Close inspector">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close inspector"
          className="shrink-0 text-foreground-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export function InspectorTypeChip({
  contextType,
  entityType,
  size = 'sm',
}: {
  contextType: InspectorContextType;
  entityType?: EntityType;
  size?: 'sm' | 'md';
}) {
  if (contextType === 'entity' && entityType) {
    return (
      <EntityTypeIcon
        type={entityType}
        size={size}
        showLabel
        className="text-foreground-secondary"
      />
    );
  }
  return (
    <span className="text-caption font-medium text-foreground-muted uppercase tracking-wide">
      {CONTEXT_META[contextType].eyebrow}
    </span>
  );
}

export { CONTEXT_META };