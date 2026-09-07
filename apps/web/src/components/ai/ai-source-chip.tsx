'use client';

import { cn } from '@/lib/utils';
import type { AISourceReference } from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — AI SOURCE CHIP
// ============================================================
// Renders a single grounded source reference as a compact chip.
// Clicking it surfaces the source in the Context Inspector (the
// host wires the onClick — this component stays presentational).
// ============================================================

const TYPE_LABELS: Record<string, string> = {
  Entity: 'Entity',
  Relationship: 'Relationship',
  Evidence: 'Evidence',
  Document: 'Document',
  Event: 'Event',
  Finding: 'Finding',
  Network: 'Network',
  Analytics: 'Analytics',
  Timeline: 'Timeline',
  Investigation: 'Investigation',
  Note: 'Note',
};

const TYPE_STYLES: Record<string, string> = {
  Entity: 'border-entity/40 hover:border-entity/60 hover:text-entity',
  Relationship: 'border-network/40 hover:border-network/60 hover:text-network',
  Evidence: 'border-evidence/40 hover:border-evidence/60 hover:text-evidence',
  Finding: 'border-info/40 hover:border-info/60 hover:text-info',
  Network: 'border-ai/40 hover:border-ai/60 hover:text-ai',
  Analytics: 'border-anomaly/40 hover:border-anomaly/60 hover:text-anomaly',
  Timeline: 'border-warning/40 hover:border-warning/60 hover:text-warning',
  Event: 'border-warning/40 hover:border-warning/60 hover:text-warning',
  Document: 'border-border/60 hover:border-border-strong hover:text-foreground-secondary',
  Note: 'border-border/60 hover:border-border-strong hover:text-foreground',
  Investigation: 'border-border/60 hover:border-border-strong hover:text-foreground',
};

export function AIAtomMark({ type }: { type: string }) {
  return (
    <span
      className={cn(
        'ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
        'border text-[9px] font-semibold leading-none'
      )}
      aria-hidden="true"
    >
      {type.slice(0, 1)}
    </span>
  );
}

export function AISourceChip({
  source,
  onClick,
}: {
  source: AISourceReference;
  onClick?: (source: AISourceReference) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(source)}
      title={`${source.sourceType} · ${source.sourceId}`}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-2 py-0.5',
        'text-caption text-foreground-secondary transition-colors',
        TYPE_STYLES[source.sourceType] ?? 'border-border/60 hover:border-border-strong'
      )}
    >
      <span className="w-8 shrink-0 truncate text-left text-caption uppercase tracking-wide text-foreground-muted">
        {TYPE_LABELS[source.sourceType] ?? source.sourceType}
      </span>
      <span className="truncate font-medium">{source.label}</span>
    </button>
  );
}

export function AISourceChipList({
  sources,
  onSourceClick,
  className,
}: {
  sources: AISourceReference[];
  onSourceClick?: (source: AISourceReference) => void;
  className?: string;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {sources.map((s) => (
        <AISourceChip key={s.id} source={s} onClick={onSourceClick} />
      ))}
    </div>
  );
}
