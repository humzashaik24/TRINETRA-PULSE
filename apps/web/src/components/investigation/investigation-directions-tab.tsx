'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Compass, ShieldAlert } from 'lucide-react';
import { Badge, ErrorState, LoadingState } from '@trinetra-pulse/ui';
import type {
  InvestigationDirection,
  InvestigationDirectionPriority,
  InvestigationDirectionType,
} from '@trinetra-pulse/types';
import { useInvestigationStore } from '@/state/investigation.store';
import { useDirectionsStore } from '@/state/directions.store';
import { formatPercent } from '@/lib/format';

// ============================================================
// INVESTIGATION — DIRECTIONS TAB (Phase 26)
// ============================================================
// Grounded next-step leads computed on request from persisted
// investigation records. Directions are analytical leads, not
// judgements: they never establish guilt or criminal intent,
// never invent evidence or relationships, and never modify the
// investigation.
// ============================================================

const TYPE_LABELS: Record<InvestigationDirectionType, string> = {
  high_connectivity_entity: 'High connectivity entity',
  bridge_entity: 'Bridge entity',
  unresolved_connection: 'Unresolved connection',
  suspicious_pattern: 'Suspicious pattern',
  evidence_gap: 'Evidence gap',
  relationship_verification: 'Relationship verification',
  entity_resolution: 'Entity resolution',
  timeline_gap: 'Timeline gap',
  follow_up_evidence: 'Follow-up evidence',
};

const PRIORITY_VARIANT: Record<
  InvestigationDirectionPriority,
  'danger' | 'warning' | 'info' | 'default'
> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export function InvestigationDirectionsTab() {
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const data = useDirectionsStore((s) => s.data);
  const loading = useDirectionsStore((s) => s.loading);
  const error = useDirectionsStore((s) => s.error);
  const load = useDirectionsStore((s) => s.load);
  const clear = useDirectionsStore((s) => s.clear);

  useEffect(() => {
    if (!investigationId) return;
    clear();
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

  return (
    <div className="space-y-4" data-testid="investigation-directions-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {directions.length} direction{directions.length === 1 ? '' : 's'} computed from recorded
          data
        </p>
        <Badge variant="info" size="sm" data-testid="directions-computed-at">
          computed {computed_at.slice(0, 10)}
        </Badge>
      </div>

      {directions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
          No analytical leads yet — nothing in the recorded data warrants a next step.
        </p>
      ) : (
        <div className="space-y-3">
          {directions.map((direction) => (
            <DirectionCard
              key={direction.id}
              direction={direction}
              investigationId={investigationId ?? ''}
            />
          ))}
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
}: {
  direction: InvestigationDirection;
  investigationId: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4" data-testid="direction-row">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
          <div>
            <p className="font-medium text-foreground">{direction.title}</p>
            <p className="mt-0.5 text-xs text-foreground-secondary">{direction.summary}</p>
            <p className="mt-1 text-xs italic text-foreground-muted">{direction.rationale}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={PRIORITY_VARIANT[direction.priority]} size="sm" data-testid="direction-priority">
            {direction.priority}
          </Badge>
          <span className="text-xs font-medium text-foreground" data-testid="direction-confidence">
            {formatPercent(direction.confidence)} confidence
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-foreground-muted">
        <Badge variant="default" size="sm">
          {TYPE_LABELS[direction.direction_type]}
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
      </div>
    </div>
  );
}