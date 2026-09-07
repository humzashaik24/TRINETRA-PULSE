'use client';

import Link from 'next/link';
import { Check, CircleDashed, Loader2, TriangleAlert, X, ArrowRight } from 'lucide-react';
import type { InvestigationPipeline, InvestigationPipelineStage, PipelineStageStatus } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — PIPELINE PANEL
// ============================================================
// Renders the lifecycle pipeline as a list of stages with status,
// counts and a progress summary. Stages are neutral: data → findings.
// Failed / needs-review stages are surfaced, never "guilt" language.
// ============================================================

function statusMeta(status: PipelineStageStatus) {
  switch (status) {
    case 'COMPLETED':
      return { Icon: Check, className: 'text-success', label: 'Completed' };
    case 'RUNNING':
      return { Icon: Loader2, className: 'text-info animate-spin', label: 'Running' };
    case 'NEEDS_REVIEW':
      return { Icon: TriangleAlert, className: 'text-warning', label: 'Needs review' };
    case 'FAILED':
      return { Icon: X, className: 'text-danger', label: 'Failed' };
    default:
      return { Icon: CircleDashed, className: 'text-foreground-muted', label: 'Not started' };
  }
}

function StageRow({ stage, index }: { stage: InvestigationPipelineStage; index: number }) {
  const { Icon, className, label } = statusMeta(stage.status);
  return (
    <li className="flex items-center gap-3 py-2.5" data-testid={`pipeline-stage-${stage.stage}`}>
      <span className="w-5 text-right text-xs tabular-nums text-foreground-muted">{index + 1}</span>
      <span className={`rounded-full p-1.5 ${className}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{stage.label}</span>
          {(stage.warningCount > 0 || stage.errorCount > 0) && (
            <span className="text-xs text-foreground-muted">
              {stage.warningCount > 0 && `${stage.warningCount} warnings`}
              {stage.warningCount > 0 && stage.errorCount > 0 && ' · '}
              {stage.errorCount > 0 && `${stage.errorCount} errors`}
            </span>
          )}
        </div>
        <p className="text-xs text-foreground-muted">{stage.description}</p>
      </div>
      {stage.count !== null && (
        <span className="text-xs tabular-nums text-foreground-secondary">{stage.count}</span>
      )}
      <Link
        href={stage.targetWorkspace}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand hover:bg-brand-subtle"
        title={`Open ${stage.label} workspace`}
      >
        Open <ArrowRight className="h-3 w-3" />
      </Link>
      <span className="sr-only">{label}</span>
    </li>
  );
}

export function InvestigationPipelinePanel({
  pipeline,
}: {
  pipeline: InvestigationPipeline | null;
}) {
  if (!pipeline) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No pipeline available for this investigation yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface" data-testid="investigation-pipeline">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-foreground-secondary">
            Current stage: <span className="font-medium text-foreground">{pipeline.currentStage}</span>
          </div>
          <div className="text-sm tabular-nums text-foreground">{pipeline.progress}%</div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${pipeline.progress}%` }}
            role="progressbar"
            aria-valuenow={pipeline.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {pipeline.needReview.length > 0 && (
        <div className="border-b border-border bg-warning-subtle px-4 py-2 text-xs text-warning">
          Stages need review: {pipeline.needReview.join(', ')}
        </div>
      )}

      <ul className="divide-y divide-border px-4 py-1">
        {pipeline.stages.map((stage, i) => (
          <StageRow key={stage.stage} stage={stage} index={i} />
        ))}
      </ul>
    </div>
  );
}
