'use client';

import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { EvidenceType, EvidenceStatus } from '@trinetra-pulse/types';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_STATUS_LABELS } from '@/lib/format';
import { EVIDENCE_STATUS_VARIANT } from './evidence-domain';
import { cn } from '@/lib/utils';

// ============================================================
// EVIDENCE SEARCH BAR
// ============================================================

interface EvidenceSearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedTypes: EvidenceType[];
  onToggleType: (t: EvidenceType) => void;
  selectedStatuses: EvidenceStatus[];
  onToggleStatus: (s: EvidenceStatus) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onClear: () => void;
}

const ALL_EVIDENCE_TYPES: EvidenceType[] = [
  'DOCUMENT', 'FIR', 'REPORT', 'COMMUNICATION', 'TRANSACTION',
  'VEHICLE', 'LOCATION', 'IMAGE', 'VIDEO', 'AUDIO', 'RECORD', 'OTHER',
];

const ALL_STATUSES: EvidenceStatus[] = [
  'AVAILABLE', 'PROCESSING', 'REQUIRES_REVIEW', 'VERIFIED', 'UNVERIFIED', 'ARCHIVED',
];

export function EvidenceSearchBar({
  query,
  onQueryChange,
  selectedTypes,
  onToggleType,
  selectedStatuses,
  onToggleStatus,
  showFilters,
  onToggleFilters,
  onClear,
}: EvidenceSearchBarProps) {
  const hasActive = query !== '' || selectedTypes.length > 0 || selectedStatuses.length > 0;

  return (
    <div className="space-y-2" data-testid="evidence-search-bar">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search evidence by title, source, or description…"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-sm text-foreground placeholder:text-foreground-muted tp-transition focus:border-border-focus focus:outline-none"
            data-testid="evidence-search-input"
            aria-label="Search evidence"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-foreground-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onToggleFilters}
          className={cn(
            'h-9 w-9 shrink-0 rounded-lg border tp-transition',
            showFilters
              ? 'border-border-strong bg-surface-active text-foreground'
              : 'border-border text-foreground-muted hover:text-foreground'
          )}
          aria-label="Toggle filters"
          aria-pressed={showFilters}
          data-testid="evidence-filter-toggle"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>

        {hasActive && (
          <button
            onClick={onClear}
            className="h-9 shrink-0 rounded-lg border border-border px-2.5 text-xs text-foreground-muted hover:text-foreground tp-transition"
            data-testid="evidence-clear-filters"
          >
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-elevated/40 p-3 animate-fade-in" data-testid="evidence-filters">
          <div>
            <p className="tp-data-label mb-1.5">Evidence type</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EVIDENCE_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  label={EVIDENCE_TYPE_LABELS[t]}
                  active={selectedTypes.includes(t)}
                  onClick={() => onToggleType(t)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="tp-data-label mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((s) => (
                <FilterChip
                  key={s}
                  label={EVIDENCE_STATUS_LABELS[s]}
                  active={selectedStatuses.includes(s)}
                  onClick={() => onToggleStatus(s)}
                  dotClass={
                    selectedStatuses.includes(s)
                      ? badgeDotClass(EVIDENCE_STATUS_VARIANT[s])
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  dotClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dotClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium tp-transition',
        active
          ? 'bg-surface-active text-foreground border border-border-strong'
          : 'bg-transparent text-foreground-muted border border-border hover:text-foreground-secondary'
      )}
    >
      {dotClass && <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />}
      {label}
    </button>
  );
}

function badgeDotClass(variant: string): string {
  switch (variant) {
    case 'success': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'danger': return 'bg-danger';
    case 'info': return 'bg-info';
    default: return 'bg-foreground-muted';
  }
}

