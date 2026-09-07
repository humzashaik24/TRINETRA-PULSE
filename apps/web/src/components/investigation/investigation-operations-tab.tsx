'use client';

import React from 'react';
import { useEffect } from 'react';
import {
  Gauge,
  ShieldCheck,
  ListChecks,
  GitBranch,
  Link2,
  Activity as ActivityIcon,
  Sparkles,
} from 'lucide-react';
import { useInvestigationOperationsStore } from '@/state/investigation-operations.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { Badge, LoadingState } from '@trinetra-pulse/ui';
import { InvestigationPipelinePanel } from './operations/investigation-pipeline-panel';
import { InvestigationReadinessPanel } from './operations/investigation-readiness-panel';
import { InvestigationHealthPanel } from './operations/investigation-health-panel';
import { InvestigationReviewQueuePanel } from './operations/investigation-review-queue-panel';
import { InvestigationCrossReferencesPanel } from './operations/investigation-cross-references-panel';
import { InvestigationProvenancePanel } from './operations/investigation-provenance-panel';
import { InvestigationOpsActivityPanel } from './operations/investigation-ops-activity-panel';

// ============================================================
// INVESTIGATION — OPERATIONS TAB (Phase 11)
// ============================================================
// CASE LIFECYCLE & INTELLIGENCE OPERATIONS surface for the open
// investigation: pipeline progress, readiness, health, the review
// queue, cross-references and provenance chains, plus the operator
// activity log. Readable state comes from the operations store.
// ============================================================

function SectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Gauge;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-foreground-muted" />
      <h3 className="tp-data-label">{title}</h3>
      {hint && <span className="text-xs text-foreground-muted">· {hint}</span>}
    </div>
  );
}

export function InvestigationOperationsTab() {
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const loadOperations = useInvestigationOperationsStore((s) => s.loadOperations);
  const clear = useInvestigationOperationsStore((s) => s.clear);
  const loading = useInvestigationOperationsStore((s) => s.loading);
  const error = useInvestigationOperationsStore((s) => s.error);
  const pipeline = useInvestigationOperationsStore((s) => s.pipeline);
  const readiness = useInvestigationOperationsStore((s) => s.readiness);
  const health = useInvestigationOperationsStore((s) => s.health);

  useEffect(() => {
    if (!investigationId) return;
    void loadOperations(investigationId);
    return () => clear();
  }, [investigationId, loadOperations, clear]);

  if (!investigationId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-foreground-muted">
        Open an investigation to view its operational overview.
      </div>
    );
  }

  if (loading && !pipeline) {
    return <LoadingState message="Loading investigation operations…" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground-muted">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="investigation-operations-tab">
      {/* Quick status strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">
          <Gauge className="mr-1 h-3 w-3" />
          Pipeline {pipeline?.completedStages.length ?? 0}/{pipeline?.stages.length ?? 0}
        </Badge>
        {readiness?.overall && (
          <Badge variant="info">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Readiness {String(readiness.overall).replace('_', ' ')}
          </Badge>
        )}
        {health && health.openReviewCount > 0 && (
          <Badge variant="warning">
            <ListChecks className="mr-1 h-3 w-3" />
            {health.openReviewCount} review items
          </Badge>
        )}
        {pipeline?.nextRecommendedAction && (
          <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <Sparkles className="h-3.5 w-3.5" />
            Next: {pipeline.nextRecommendedAction}
          </span>
        )}
      </div>

      <section>
        <SectionHeader icon={Gauge} title="Investigation pipeline" hint="Lifecycle stage by stage" />
        <InvestigationPipelinePanel pipeline={pipeline} />
      </section>

      <section>
        <SectionHeader icon={ShieldCheck} title="Readiness" hint="Operational coverage" />
        <InvestigationReadinessPanel readiness={readiness} />
      </section>

      <section>
        <SectionHeader icon={Gauge} title="Health" hint="Neutral coverage assessment" />
        <InvestigationHealthPanel health={health} />
      </section>

      <section>
        <SectionHeader icon={ListChecks} title="Review queue" hint="Items awaiting investigator decision" />
        <InvestigationReviewQueuePanel />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader icon={Link2} title="Cross references" hint="Entity ↔ relationship ↔ evidence ↔ finding" />
          <InvestigationCrossReferencesPanel />
        </section>
        <section>
          <SectionHeader icon={GitBranch} title="Provenance chains" hint="Source to finding" />
          <InvestigationProvenancePanel />
        </section>
      </div>

      <section>
        <SectionHeader icon={ActivityIcon} title="Activity" hint="Operator actions" />
        <InvestigationOpsActivityPanel />
      </section>
    </div>
  );
}
