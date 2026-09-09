'use client';

import Link from 'next/link';
import { X, Sparkles, Network as NetworkIcon, CalendarClock, ShieldAlert } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import type { InvestigationFinding } from '@trinetra-pulse/types';
import { useShellStore } from '@/state/shell.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { formatDateTime } from '@/lib/format';
import {
  FINDING_CONFIDENCE_VARIANT,
  findingSeverityLabel,
  findingSeverityVariant,
  findingSourceVariant,
} from '@/lib/findings-labels';

// ============================================================
// INVESTIGATION — FINDING DETAIL PANEL (Phase 28)
// ============================================================
// Expands a persisted analytical finding into its evidence
// intelligence context: the supporting evidence referenced by the
// finding, the entities and grounded relationships it touches,
// any timeline references and its recorded provenance. Every
// object opens in the context inspector while the investigation
// context is preserved; the panel only surfaces records that
// actually resolve against linked workspace objects — it never
// invents associations, never fabricates supporting evidence.
// ============================================================

export interface FindingDetailPanelProps {
  finding: InvestigationFinding;
  investigationId: string;
  onClose?: () => void;
}

export function FindingDetailPanel({ finding, investigationId, onClose }: FindingDetailPanelProps) {
  const data = useInvestigationStore((s) => s.data);
  const open = useShellStore((s) => s.selectContext);

  const relatedEvidence = finding.evidence_ids
    .map((ref) => data.evidence.find((e) => e.id === ref || e.evidence_id === ref))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const relatedEntities = finding.entity_ids
    .map((ref) => data.entities.find((e) => e.entity_id === ref || e.id === ref))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const relatedEntityIds = new Set(
    relatedEntities.map((e) => e.entity_id).filter((id): id is string => Boolean(id))
  );

  const relatedRelationships = data.relationships.filter(
    (r) => relatedEntityIds.has(r.source_entity_id) || relatedEntityIds.has(r.target_entity_id)
  );

  const timelineRefs = data.timeline.filter((t) => t.ref_id === finding.id);

  const unresolvedEvidence = finding.evidence_ids.length - relatedEvidence.length;
  const unresolvedEntities = finding.entity_ids.length - relatedEntities.length;

  return (
    <section
      className="rounded-xl border border-border bg-surface p-4"
      data-testid="finding-detail-panel"
      aria-label={`Details for ${finding.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={findingSeverityVariant(finding.category)} size="sm">
              {findingSeverityLabel(finding.category)}
            </Badge>
            <Badge variant={FINDING_CONFIDENCE_VARIANT[finding.confidence]} size="sm" data-testid="finding-detail-confidence">
              {finding.confidence} confidence
            </Badge>
            <Badge variant={findingSourceVariant(finding.source_type)} size="sm">
              {finding.source_type === 'manual' ? 'Investigator recorded' : finding.source_type === 'system' ? 'System generated' : 'Analytical'}
            </Badge>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-foreground">{finding.title}</h3>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close finding details"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
            data-testid="finding-detail-close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-foreground-secondary">{finding.description}</p>

      {finding.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {finding.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-foreground-muted">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        <h4 className="tp-data-label mb-2">Supporting evidence</h4>
        {relatedEvidence.length > 0 ? (
          <ul className="space-y-1">
            {relatedEvidence.map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() =>
                    open({
                      type: 'evidence',
                      id: ev.evidence_id,
                      title: ev.title,
                      investigationId,
                    })
                  }
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-hover"
                  data-testid={`detail-finding-evidence-${ev.evidence_id}`}
                >
                  {ev.title}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-foreground-muted" data-testid="finding-evidence-empty">
            No supporting evidence linked.
          </p>
        )}
        {unresolvedEvidence > 0 ? (
          <p className="mt-1.5 text-[11px] text-foreground-muted">
            {unresolvedEvidence} evidence reference{unresolvedEvidence === 1 ? '' : 's'} not linked
            into this workspace.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <h4 className="tp-data-label mb-1.5">Related entities</h4>
        {relatedEntities.length > 0 ? (
          <ul className="space-y-1">
            {relatedEntities.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() =>
                    open({
                      type: 'entity',
                      id: e.entity_id,
                      name: e.name,
                      entityType: e.entity_type,
                      investigationId,
                    })
                  }
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-hover"
                  data-testid={`detail-finding-entity-${e.entity_id}`}
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-foreground-muted">No entities linked into this workspace.</p>
        )}
        {unresolvedEntities > 0 ? (
          <p className="mt-1.5 text-[11px] text-foreground-muted">
            {unresolvedEntities} entity reference{unresolvedEntities === 1 ? '' : 's'} not linked
            into this workspace.
          </p>
        ) : null}
      </div>

      {relatedRelationships.length > 0 ? (
        <div className="mt-4">
          <h4 className="tp-data-label mb-1.5">Related relationships</h4>
          <ul className="space-y-1">
            {relatedRelationships.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() =>
                    open({
                      type: 'relationship',
                      id: r.relationship_id,
                      sourceEntityId: r.source_entity_id,
                      targetEntityId: r.target_entity_id,
                      sourceEntityName: r.source_entity_name,
                      targetEntityName: r.target_entity_name,
                      relationshipType: r.type,
                      confidence: r.confidence,
                      investigationId,
                    })
                  }
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-hover"
                  data-testid={`detail-finding-relationship-${r.relationship_id}`}
                >
                  {r.source_entity_name} → {r.target_entity_name}
                  <span className="ml-2 text-[10px] text-foreground-muted">
                    ({r.type.replace(/_/g, ' ').toLowerCase()})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {timelineRefs.length > 0 ? (
        <div className="mt-4">
          <h4 className="tp-data-label mb-2">Timeline context</h4>
          <ul className="space-y-1">
            {timelineRefs.map((t) => (
              <li key={t.id} className="text-xs text-foreground-secondary">
                <span className="font-medium text-foreground">{t.title}</span> ·{' '}
                {formatDateTime(t.timestamp)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 border-t border-border pt-3">
        <h4 className="tp-data-label mb-1.5">Provenance</h4>
        <p className="text-xs text-foreground-muted">
          Recorded by {finding.created_by} on {formatDateTime(finding.created_at)}
          {finding.updated_at !== finding.created_at
            ? ` · updated ${formatDateTime(finding.updated_at)}`
            : ''}
          {finding.source ? ` · source ${finding.source}` : ''}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {relatedEvidence.length > 0 || finding.evidence_ids.length > 0 ? (
          <Link
            href={`/investigations/${investigationId}?tab=evidence`}
            data-testid="detail-finding-evidence-tab"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" />
            View evidence
          </Link>
        ) : null}
        {relatedRelationships.length > 0 ? (
          <Link
            href={`/investigations/${investigationId}?tab=network`}
            data-testid="detail-finding-network"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            <NetworkIcon className="h-3.5 w-3.5" />
            View in network
          </Link>
        ) : null}
        <Link
          href={`/investigations/${investigationId}?tab=timeline`}
          data-testid="detail-finding-timeline"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
        >
          <CalendarClock className="h-3.5 w-3.5" />
          View timeline
        </Link>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-foreground-muted">
          <ShieldAlert className="h-3.5 w-3.5" />
          Analytical finding supports review — not proof or a judgement
        </span>
      </div>
    </section>
  );
}