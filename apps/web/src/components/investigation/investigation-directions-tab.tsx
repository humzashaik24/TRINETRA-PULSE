'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { Badge, ErrorState, LoadingState } from '@trinetra-pulse/ui';
import type {
  InvestigationDirection,
  InvestigationDirectionPriority,
  InvestigationDirectionType,
} from '@trinetra-pulse/types';
import { useInvestigationStore } from '@/state/investigation.store';
import { useDirectionsStore } from '@/state/directions.store';
import { DirectionDetailPanel } from '@/components/investigation/direction-detail-panel';
import { formatPercent } from '@/lib/format';
import {
  DIRECTION_PRIORITY_LABELS,
  DIRECTION_PRIORITY_VARIANT,
  DIRECTION_TYPE_LABELS,
  comparePriority,
} from '@/lib/directions-labels';

// ============================================================
// INVESTIGATION — DIRECTIONS TAB (Phase 26 / Phase 27)
// ============================================================
// Grounded next-step leads computed on request from persisted
// investigation records. Directions are analytical leads, not
// judgements: they never establish guilt or criminal intent,
// never invent evidence or relationships, and never modify the
// investigation. Phase 27 adds local filtering plus an expandable
// detail panel that connects each lead to its supporting facts
// and linked workspace objects.
// ============================================================

const PRIORITY_OPTIONS: Array<InvestigationDirectionPriority | 'all'> = [
  'all',
  'critical',
  'high',
  'medium',
  'low',
];

const TYPE_OPTIONS: Array<InvestigationDirectionType | 'all'> = [
  'all',
  'high_connectivity_entity',
  'bridge_entity',
  'unresolved_connection',
  'suspicious_pattern',
  'evidence_gap',
  'relationship_verification',
  'entity_resolution',
  'timeline_gap',
  'follow_up_evidence',
];

export function InvestigationDirectionsTab() {
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const data = useDirectionsStore((s) => s.data);
  const loading = useDirectionsStore((s) => s.loading);
  const error = useDirectionsStore((s) => s.error);
  const load = useDirectionsStore((s) => s.load);
  const clear = useDirectionsStore((s) => s.clear);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'all' | InvestigationDirectionPriority>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | InvestigationDirectionType>('all');

  useEffect(() => {
    if (!investigationId) return;
    clear();
    setSelectedId(null);
    void load(investigationId);
    return () => clear();
  }, [investigationId, clear, load]);

  if (error) {
    return (
      <div data-testid="investigation-directions-tab">
        <ErrorState
          title="Could not compute directions"
          message={error}
          retry={() => investigationId && void load(investigationId)}
        />
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-4" data-testid="investigation-directions-tab">
        <LoadingState message="Computing directions…" />
      </div>
    );
  }

  const { directions, computed_at } = data;

  const visible = directions
    .filter((d) => (priorityFilter === 'all' ? true : d.priority === priorityFilter))
    .filter((d) => (typeFilter === 'all' ? true : d.direction_type === typeFilter))
    .slice()
    .sort((a, b) => comparePriority(a.priority, b.priority) || b.confidence - a.confidence);

  const criticalCount = directions.filter((d) => d.priority === 'critical').length;
  const highCount = directions.filter((d) => d.priority === 'high').length;

  return (
    <div className="space-y-4" data-testid="investigation-directions-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground-muted">
          {directions.length} direction{directions.length === 1 ? '' : 's'} computed from recorded
          data
        </p>
        <Badge variant="info" size="sm" data-testid="directions-computed-at">
          computed {computed_at.slice(0, 10)}
        </Badge>
      </div>

      {directions.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-foreground-muted">Priority</span>
            <select
              aria-label="Filter directions by priority"
              data-testid="direction-filter-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | InvestigationDirectionPriority)}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All priorities' : DIRECTION_PRIORITY_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-foreground-muted">Type</span>
            <select
              aria-label="Filter directions by type"
              data-testid="direction-filter-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | InvestigationDirectionType)}
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All types' : DIRECTION_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <p className="ml-auto text-[11px] text-foreground-muted">
            {criticalCount} critical · {highCount} high priority
          </p>
        </div>
      ) : null}

      {directions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
          No analytical leads yet — nothing in the recorded data warrants a next step.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-foreground-muted">
          No directions match the selected filters.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((direction) => {
            const expanded = selectedId === direction.id;
            return (
              <div key={direction.id} className="space-y-3">
                <DirectionCard
                  direction={direction}
                  investigationId={investigationId ?? ''}
                  expanded={expanded}
                  onToggle={() => setSelectedId(expanded ? null : direction.id)}
                />
                {expanded ? (
                  <DirectionDetailPanel
                    direction={direction}
                    investigationId={investigationId ?? ''}
                    onClose={() => setSelectedId(null)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-foreground-muted">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Directions are analytical leads derived from existing investigation data. They do not
          establish guilt or criminal intent.
        </p>
      </div>
    </div>
  );
}

function DirectionCard({
  direction,
  investigationId,
  expanded,
  onToggle,
}: {
  direction: InvestigationDirection;
  investigationId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4" data-testid="direction-row">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 items-start gap-2.5 text-left">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
          <span>
            <span className="block font-medium text-foreground">{direction.title}</span>
            <span className="mt-0.5 block text-xs text-foreground-secondary">{direction.summary}</span>
            <span className="mt-1 block text-xs italic text-foreground-muted">{direction.rationale}</span>
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={DIRECTION_PRIORITY_VARIANT[direction.priority]} size="sm" data-testid="direction-priority">
            {direction.priority}
          </Badge>
          <span className="text-xs font-medium text-foreground" data-testid="direction-confidence">
            {formatPercent(direction.confidence)} confidence
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
        <Badge variant="default" size="sm">
          {DIRECTION_TYPE_LABELS[direction.direction_type]}
        </Badge>
        {direction.supporting_facts.map((fact, index) => (
          <span key={`${fact.fact_type}-${index}`} className="inline-flex items-center gap-1">
            <span className="rounded bg-surface-hover px-1.5 py-0.5 font-mono">{fact.fact_type}</span>
            {typeof fact.value === 'number' || typeof fact.value === 'string' ? (
              <span>{fact.value}</span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {direction.related_entity_ids.map((entityId) => (
          <Link
            key={`e-${entityId}`}
            href={`/entities/${entityId}`}
            data-testid={`direction-entity-${entityId}`}
            className="rounded-md border border-border px-2 py-1 text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            Entity
          </Link>
        ))}
        {direction.related_relationship_ids.length > 0 ? (
          <Link
            href={`/investigations/${investigationId}?tab=network`}
            data-testid="direction-relationships"
            className="rounded-md border border-border px-2 py-1 text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            {direction.related_relationship_ids.length} relationship(s)
          </Link>
        ) : null}
        {direction.related_evidence_ids.length > 0 ? (
          <Link
            href={`/investigations/${investigationId}?tab=evidence`}
            data-testid="direction-evidence"
            className="rounded-md border border-border px-2 py-1 text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            {direction.related_evidence_ids.length} evidence reference(s)
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          data-testid={`direction-expand-${direction.id}`}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Close details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}