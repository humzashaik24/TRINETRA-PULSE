'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
  Label,
  Panel,
} from '@trinetra-pulse/ui';
import type { EntityResolutionCandidate, MatchFeature } from '@trinetra-pulse/types';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';

// ============================================================
// ENTITY RESOLUTION SECTION
// Phase 20 — deterministic, explainable identity-correlation
// candidates for a single entity. Neutral language only: a
// linkage score expresses "records plausibly refer to the same
// observed entity", never criminality or guilt.
// ============================================================

interface EntityResolutionSectionProps {
  entityId: string;
  candidates: EntityResolutionCandidate[];
  onConfirm: (entityId: string, reason: string) => Promise<void>;
  onReject: (entityId: string, reason: string) => Promise<void>;
  onEvaluate: () => Promise<void>;
  compact?: boolean;
}

const STATE_STYLES: Record<EntityResolutionCandidate['verification_state'], { label: string; variant: string }> = {
  auto_resolved: { label: 'Auto-resolved', variant: 'success' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  probable: { label: 'Probable', variant: 'info' },
  needs_review: { label: 'Needs review', variant: 'warning' },
  possible: { label: 'Possible', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const CONFIDENCE_STYLES: Record<EntityResolutionCandidate['confidence'], string> = {
  HIGH: 'text-green-600',
  MEDIUM: 'text-amber-600',
  LOW: 'text-foreground-muted',
};

export function EntityResolutionSection({
  entityId,
  candidates,
  onConfirm,
  onReject,
  onEvaluate,
  compact = false,
}: EntityResolutionSectionProps) {
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const [pending, setPending] = useState<{ candidate: EntityResolutionCandidate; action: 'confirm' | 'reject' } | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);

  const outgoing = useMemo(
    () => candidates.filter((c) => c.entity_id_1 === entityId || c.entity_id_2 === entityId),
    [candidates, entityId]
  );

  const runEvaluate = useCallback(async () => {
    setEvalRunning(true);
    try {
      await onEvaluate();
    } finally {
      setEvalRunning(false);
    }
  }, [onEvaluate]);

  const submit = useCallback(async () => {
    if (!pending) return;
    setActing(true);
    try {
      if (pending.action === 'confirm') await onConfirm(entityId, reason);
      else await onReject(entityId, reason);
      setPending(null);
      setReason('');
    } finally {
      setActing(false);
    }
  }, [pending, entityId, reason, onConfirm, onReject]);

  return (
    <Panel className={cn(compact && 'space-y-4 p-0')}>
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold">Identity link candidates</h3>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Deterministic engine (entity-resolution-v1). Linkage score = confidence records refer to the same observed
            entity — not a probability of wrongdoing.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={runEvaluate} disabled={evalRunning}>
          {evalRunning ? 'Running…' : 'Run evaluation'}
        </Button>
      </div>

      {outgoing.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-foreground-muted">
          No identity-link candidates for this entity.
        </div>
      ) : (
        <div className="space-y-3 p-5">
          {outgoing.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              entityId={entityId}
              onConfirm={() => setPending({ candidate: c, action: 'confirm' })}
              onReject={() => setPending({ candidate: c, action: 'reject' })}
              pending={pending?.candidate.id === c.id}
            />
          ))}
        </div>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogTitle>
            {pending?.action === 'confirm' ? 'Confirm identity link' : 'Reject identity link'}
          </DialogTitle>
          <DialogDescription>
            {pending?.action === 'confirm'
              ? `Confirm that ${otherName(pending.candidate, entityId)} is the same observed entity as this one.`
              : `Reject the proposed identity link between this entity and ${otherName(pending?.candidate, entityId)}.`}
          </DialogDescription>
          <div className="space-y-2">
            <Label htmlFor="resolution-reason">Reason (required for audit)</Label>
            <Input
              id="resolution-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe your basis…"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={pending?.action === 'confirm' ? 'primary' : 'danger'}
              onClick={submit}
              disabled={!reason.trim() || acting}
            >
              {acting ? 'Applying…' : pending?.action === 'confirm' ? 'Confirm link' : 'Reject link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function CandidateRow({
  candidate: c,
  entityId,
  onConfirm,
  onReject,
  pending,
}: {
  candidate: EntityResolutionCandidate;
  entityId: string;
  onConfirm: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const state = STATE_STYLES[c.verification_state];
  const terminal = c.verification_state === 'confirmed' || c.verification_state === 'rejected';
  const other = otherName(c, entityId);

  return (
    <div className={cn('rounded-lg border border-border bg-surface-elevated/40 p-4', pending && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{other}</span>
            <Badge variant={state.variant as never}>{state.label}</Badge>
            <Badge variant="secondary">{c.resolution_method === 'auto' ? 'Automated' : 'Analyst'}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
            <span>
              Linkage{' '}
              <span className={cn('font-medium tabular-nums', CONFIDENCE_STYLES[c.confidence])}>{formatPercent(c.linkage_score)}</span>
            </span>
            <span aria-hidden>·</span>
            <span className="uppercase">{c.confidence} confidence</span>
            <span aria-hidden>·</span>
            <span>v{shortVersion(c.resolution_version)}</span>
          </div>
        </div>

        {!terminal && (
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={onConfirm}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={onReject}>
              Reject
            </Button>
          </div>
        )}
      </div>

      {c.contradictions.length > 0 && (
        <div className="mt-3 rounded-md bg-red-50/60 p-3 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-700 dark:text-red-300">Contradictions</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-red-700/90 dark:text-red-200/80">
            {c.contradictions.map((contra, i) => (
              <li key={i}>
                {contra.label ?? contra.field}: {String(contra.values?.[0] ?? 'unknown')} ≠ {String(contra.values?.[1] ?? 'unknown')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FeatureList label="Supporting features" features={c.matched_features} />
        <SourceList candidate={c} />
      </div>

      {c.verified_by && (
        <p className="mt-3 text-xs text-foreground-muted">
          {c.verification_state === 'rejected'
            ? `Rejected by ${c.verified_by}${c.rejection_reason ? ` — ${c.rejection_reason}` : ''}.`
            : `Confirmed by ${c.verified_by}.`}
        </p>
      )}
    </div>
  );
}

function FeatureList({ label, features }: { label: string; features: MatchFeature[] }) {
  if (features.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {features
          .filter((f) => f.matched)
          .map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
              <span className="capitalize">{f.label}</span>
              <span className="text-foreground-muted">({formatPercent(f.weight)} weight)</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function SourceList({ candidate }: { candidate: EntityResolutionCandidate }) {
  const sourceDatasets = Array.from(
    new Set(candidate.source_refs.map((s) => s.source_dataset).filter(Boolean))
  );
  if (sourceDatasets.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted">Source datasets</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {sourceDatasets.map((ds) => (
          <li key={ds}>
            <Badge variant="secondary" size="sm">
              {ds}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function otherName(candidate: EntityResolutionCandidate | undefined | null, entityId: string): string {
  if (!candidate) return '';
  return candidate.entity_id_1 === entityId
    ? (candidate.entity_2_name ?? candidate.entity_id_2)
    : (candidate.entity_1_name ?? candidate.entity_id_1);
}

function shortVersion(v: string): string {
  if (v.startsWith('entity-resolution-')) return v.replace('entity-resolution-', '');
  return v;
}
