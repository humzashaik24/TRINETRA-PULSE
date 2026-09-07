'use client';

import { useEffect, useState } from 'react';
import { type EntityResolution } from '@trinetra-pulse/types';
import {
  Badge,
  Button,
  ConfidenceIndicator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  EmptyState,
  EntityTypeIcon,
  ErrorState,
  Input,
  LoadingState,
} from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  GitMerge,
  ListTree,
  Scale,
  X,
  Minus,
  ChevronRight,
} from 'lucide-react';
import {
  confirmResolution,
  fetchResolutions,
  mergeEntities,
  rejectResolution,
} from '@/services/entity.service';
import { EXTRACTION_METHOD_LABELS, formatDateTime } from '@/lib/format';
import { ResolutionStateBadge } from './badges';

// ============================================================
// RESOLUTION REVIEW
// ============================================================

const RECOMMENDATION_CONFIG: Record<
  EntityResolution['recommendation'],
  { variant: 'success' | 'info' | 'warning' | 'danger'; label: string; desc: string }
> = {
  MERGE: { variant: 'success', label: 'Recommended merge', desc: 'System believes these references describe the same real-world entity.' },
  REVIEW: { variant: 'warning', label: 'Needs review', desc: 'System is uncertain — analyst judgement required.' },
  KEEP_SEPARATE: { variant: 'danger', label: 'Keep separate', desc: 'System believes these references are distinct entities.' },
};

const isProfile = (id: string) => id.startsWith('ent-');

function TextAreaLocal(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted tp-transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background hover:border-border-strong"
      {...props}
    />
  );
}

function MatchIndicator({ match }: { match: boolean | null }) {
  if (match === true)
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-subtle text-success" aria-label="Supports match">
        <Check className="h-3 w-3" />
      </span>
    );
  if (match === false)
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-danger-subtle text-danger" aria-label="Conflicts with match">
        <X className="h-3 w-3" />
      </span>
    );
  return (
    <span className="flex h-4 w-4 items-center justify-center text-foreground-muted/50" aria-label="Inconclusive">
      <Minus className="h-3 w-3" />
    </span>
  );
}

interface ResolutionReviewDialogProps {
  resolution: EntityResolution;
  reviewer: string;
  onChange: () => void;
  onClose: () => void;
}

function ResolutionReviewDialog({ resolution, reviewer, onChange, onClose }: ResolutionReviewDialogProps) {
  const [busy, setBusy] = useState<'confirm' | 'reject' | 'merge' | null>(null);
  const [reason, setReason] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeReason, setMergeReason] = useState('');

  const rec = RECOMMENDATION_CONFIG[resolution.recommendation];
  const canMerge =
    isProfile(resolution.entityAId) &&
    isProfile(resolution.entityBId) &&
    resolution.state !== 'REJECTED';

  const handleConfirm = async () => {
    setBusy('confirm');
    try {
      await confirmResolution(resolution.id, reviewer, reason || rec.desc);
      onChange();
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setBusy('reject');
    try {
      await rejectResolution(resolution.id, reviewer, reason || 'Analyst determined these are separate entities.');
      onChange();
      onClose();
    } finally {
      setBusy(null);
    }
  };

  const handleMerge = async () => {
    setBusy('merge');
    try {
      await mergeEntities({
        targetId: resolution.entityAId,
        sourceId: resolution.entityBId,
        reason: mergeReason || reason || 'Analyst confirmed merge.',
        reviewer,
      });
      setMergeOpen(false);
      onChange();
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onClose={onClose} className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogTitle>Resolution review</DialogTitle>
        <DialogDescription>
          Explainable comparison — every signal below is shown to justify the recommendation.
        </DialogDescription>

        {/* A vs B header */}
        <div className="mt-4 rounded-lg border border-border bg-surface-elevated p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <EntityTypeIcon type={resolution.entityAType} size="md" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{resolution.entityAName}</div>
                <div className="truncate text-caption text-foreground-muted font-mono">{resolution.entityADisplayValue}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-center gap-2 text-foreground-muted" aria-hidden="true">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <div className="min-w-0 text-right">
                <div className="truncate text-sm font-medium text-foreground">{resolution.entityBName}</div>
                <div className="truncate text-caption text-foreground-muted font-mono">{resolution.entityBDisplayValue}</div>
              </div>
              <EntityTypeIcon type={resolution.entityBType} size="md" />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-3">
            <Badge variant={rec.variant} size="sm">{rec.label}</Badge>
            <ResolutionStateBadge state={resolution.state} size="sm" />
            <div>
              <span className="tp-data-label mr-2">Similarity</span>
              <span className="font-mono text-xs text-foreground">{Math.round(resolution.similarity * 100)}%</span>
            </div>
            <ConfidenceIndicator value={resolution.confidence} size="sm" showValue />
            {resolution.reviewedBy && resolution.reviewedAt && (
              <span className="text-caption text-foreground-muted">
                reviewed by {resolution.reviewedBy} · {formatDateTime(resolution.reviewedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Reasons */}
        <div className="mt-4">
          <h4 className="text-subheading text-foreground mb-1">Summary</h4>
          <p className="text-body-sm text-foreground-secondary">{resolution.summaryReason}</p>
        </div>

        {/* Signals */}
        <div className="mt-4">
          <h4 className="text-subheading text-foreground mb-2">Signals ({resolution.signals.length})</h4>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-elevated">
                  <th className="px-3 py-2 text-left text-overline text-foreground-muted uppercase">Signal</th>
                  <th className="hidden px-3 py-2 text-left text-overline text-foreground-muted uppercase sm:table-cell">Value A</th>
                  <th className="hidden px-3 py-2 text-left text-overline text-foreground-muted uppercase sm:table-cell">Value B</th>
                  <th className="px-3 py-2 text-right text-overline text-foreground-muted uppercase">Match</th>
                  <th className="px-3 py-2 text-right text-overline text-foreground-muted uppercase">Weight</th>
                </tr>
              </thead>
              <tbody>
                {resolution.signals.map((sig) => (
                  <tr key={sig.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2">
                      <span className="text-sm text-foreground">{sig.displayLabel}</span>
                      <div className="text-[10px] text-foreground-muted">{sig.source}</div>
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <span className="font-mono text-xs text-foreground-muted">{sig.rawValueA ?? '—'}</span>
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <span className="font-mono text-xs text-foreground-muted">{sig.rawValueB ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <MatchIndicator match={sig.match} />
                        <span className="text-xs text-foreground-secondary">{sig.value}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-foreground-muted">
                      {sig.weight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence */}
        {resolution.evidence.length > 0 && (
          <div className="mt-4">
            <h4 className="text-subheading text-foreground mb-2">Evidence references</h4>
            <div className="flex flex-wrap gap-1.5">
              {resolution.evidence.map((ref) => (
                <span key={ref} className="rounded bg-surface-elevated px-2 py-1 font-mono text-[10px] text-foreground-muted">
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviewer note */}
        <div className="mt-4">
          <label htmlFor="review-reason" className="tp-data-label block mb-1.5">
            Reviewer note (optional)
          </label>
          <TextAreaLocal
            id="review-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document your rationale for this decision…"
            rows={3}
          />
        </div>

        <DialogFooter className="flex-wrap">
          <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
            Back
          </Button>
          <Button
            variant="danger-ghost"
            onClick={handleReject}
            loading={busy === 'reject'}
            disabled={busy !== null || resolution.state === 'REJECTED'}
          >
            <X className="h-3.5 w-3.5" />
            Keep separate
          </Button>
          {canMerge && (
            <Button
              variant="secondary"
              onClick={() => setMergeOpen(true)}
              disabled={busy !== null || resolution.state === 'REJECTED'}
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merge profiles
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            loading={busy === 'confirm'}
            disabled={busy !== null || resolution.state === 'REJECTED'}
          >
            <Check className="h-3.5 w-3.5" />
            Confirm resolution
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent onClose={() => setMergeOpen(false)}>
          <DialogTitle>Merge entities</DialogTitle>
          <DialogDescription>
            Merging {resolution.entityBName} into {resolution.entityAName}. Sources, evidence, relationships and
            activity are folded into the target profile. This action is recorded in the audit trail.
          </DialogDescription>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <EntityTypeIcon type={resolution.entityBType} size="sm" />
              <span className="truncate">{resolution.entityBName}</span>
              <span className="text-foreground-muted" aria-hidden="true"><ArrowRight className="h-3.5 w-3.5" /></span>
              <EntityTypeIcon type={resolution.entityAType} size="sm" />
              <span className="truncate">{resolution.entityAName}</span>
            </div>
            <Input
              value={mergeReason}
              onChange={(e) => setMergeReason(e.target.value)}
              placeholder="Merge rationale"
              aria-label="Merge rationale"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMergeOpen(false)} disabled={busy !== null}>
              Cancel
            </Button>
            <Button onClick={handleMerge} loading={busy === 'merge'} disabled={!mergeReason.trim()}>
              <GitMerge className="h-3.5 w-3.5" />
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

interface ResolutionRowProps {
  resolution: EntityResolution;
  onReview: (resolution: EntityResolution) => void;
}

function ResolutionRow({ resolution, onReview }: ResolutionRowProps) {
  const rec = RECOMMENDATION_CONFIG[resolution.recommendation];

  return (
    <motion.div
      variants={staggerChildVariants}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 min-w-0 items-center gap-3">
        <EntityTypeIcon type={resolution.entityAType} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{resolution.entityAName}</span>
            <span className="text-foreground-muted shrink-0" aria-hidden="true"><ArrowRight className="h-3 w-3" /></span>
            <span className="truncate text-sm font-medium text-foreground">{resolution.entityBName}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-foreground-muted">{resolution.id}</span>
            <span className="text-caption text-foreground-muted">updated {formatDateTime(resolution.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Scale className="h-3 w-3 text-foreground-muted" aria-hidden="true" />
          <span className="font-mono text-xs text-foreground">{Math.round(resolution.similarity * 100)}%</span>
        </div>
        <Badge variant={rec.variant} size="sm">{rec.label}</Badge>
        <ResolutionStateBadge state={resolution.state} size="sm" />
        <Button variant="secondary" size="sm" onClick={() => onReview(resolution)}>
          Review
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export function ResolutionReview() {
  const [resolutions, setResolutions] = useState<EntityResolution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [active, setActive] = useState<EntityResolution | null>(null);

  const load = async () => {
    try {
      setError(null);
      setResolutions(await fetchResolutions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resolutions');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (running) return <LoadingState message="Loading resolutions…" />;
  if (error) return <ErrorState title="Could not load resolutions" message={error} retry={load} />;

  return (
    <div className="space-y-4">
      <p className="text-caption text-foreground-muted">
        {resolutions?.length ?? 0} resolutions · pairwise comparisons across the pipeline
      </p>

      {!resolutions || resolutions.length === 0 ? (
        <EmptyState
          icon={<ListTree className="h-8 w-8" />}
          title="No resolutions yet"
          description="Resolution candidates will appear here when the pipeline detects potential matches."
        />
      ) : (
        <Stagger staggerInterval={0.04}>
          <div className="space-y-2">
            {resolutions.map((resolution) => (
              <ResolutionRow key={resolution.id} resolution={resolution} onReview={setActive} />
            ))}
          </div>
        </Stagger>
      )}

      {active && (
        <ResolutionReviewDialog
          resolution={active}
          reviewer="analyst-kd"
          onChange={load}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}