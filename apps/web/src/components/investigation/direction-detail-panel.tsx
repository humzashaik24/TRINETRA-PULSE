'use client';

import Link from 'next/link';
import { X, Network as NetworkIcon, CalendarClock, ShieldAlert } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import type { InvestigationDirection } from '@trinetra-pulse/types';
import { useShellStore } from '@/state/shell.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { SupportingFactList } from '@/components/investigation/supporting-fact-list';
import {
  DIRECTION_PRIORITY_LABELS,
  DIRECTION_PRIORITY_VARIANT,
  DIRECTION_TYPE_LABELS,
  networkAnchorForDirection,
  timelineAnchorForDirection,
} from '@/lib/directions-labels';
import { formatPercent } from '@/lib/format';

// ============================================================
// INVESTIGATION — DIRECTION DETAIL PANEL (Phase 27)
// ============================================================
// Expands a computed lead into its full analytical context:
// rationale, grounding supporting facts and the related objects
// already linked into the workspace. Objects open in the context
// panel while the investigation context is preserved. The panel
// only surfaces relationships/evidence/findings that actually
// resolve against linked workspace records — it never invents
// associations.
// ============================================================

export interface DirectionDetailPanelProps {
  direction: InvestigationDirection;
  investigationId: string;
  onClose?: () => void;
}

export function DirectionDetailPanel({ direction, investigationId, onClose }: DirectionDetailPanelProps) {
  const data = useInvestigationStore((s) => s.data);
  const open = useShellStore((s) => s.selectContext);

  const relatedEntityIds = direction.related_entity_ids;
  const relatedRelationshipIds = direction.related_relationship_ids;
  const relatedEvidenceIds = direction.related_evidence_ids;

  const relatedEntities = relatedEntityIds
    .map((entityId) => data.entities.find((e) => e.entity_id === entityId))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const relatedRelationships = relatedRelationshipIds
    .map((relationshipId) => data.relationships.find((r) => r.relationship_id === relationshipId))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const relatedEvidence = relatedEvidenceIds
    .map((evidenceId) => data.evidence.find((e) => e.evidence_id === evidenceId))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  // Findings that touch the same entities or evidence this direction points
  // at — surfaced from linked records only, never auto-created.
  const relatedFindings = data.findings.filter((f) => {
    const sharesEntity = relatedEntityIds.some((id) => f.entity_ids.includes(id));
    const sharesEvidence = relatedEvidenceIds.some((id) => f.evidence_ids.includes(id));
    return sharesEntity || sharesEvidence;
  });

  const showNetwork = networkAnchorForDirection(direction.direction_type);
  const showTimeline = timelineAnchorForDirection(direction.direction_type);

  return (
    <section
      className="rounded-xl border border-border bg-surface p-4"
      data-testid="direction-detail-panel"
      aria-label={`Details for ${direction.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={DIRECTION_PRIORITY_VARIANT[direction.priority]} size="sm">
              {DIRECTION_PRIORITY_LABELS[direction.priority]} priority
            </Badge>
            <Badge variant="default" size="sm">
              {DIRECTION_TYPE_LABELS[direction.direction_type]}
            </Badge>
            <Badge variant="info" size="sm" data-testid="direction-detail-confidence">
              {formatPercent(direction.confidence)} confidence
            </Badge>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-foreground">{direction.title}</h3>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close direction details"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
            data-testid="direction-detail-close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-foreground-secondary">{direction.summary}</p>

      <div className="mt-3 rounded-lg border border-border bg-surface p-3">
        <p className="text-xs font-medium text-foreground">Why this lead</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">{direction.rationale}</p>
      </div>

      <div className="mt-4">
        <h4 className="tp-data-label mb-2">Supporting facts</h4>
        <SupportingFactList facts={direction.supporting_facts} investigationId={investigationId} />
      </div>

      {relatedEntities.length > 0 || relatedRelationships.length > 0 || relatedEvidence.length > 0 || relatedFindings.length > 0 ? (
        <div className="mt-4">
          <h4 className="tp-data-label mb-2">Related workspace objects</h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {relatedEntities.length > 0 ? (
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">Entities</p>
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
                        data-testid={`detail-entity-${e.entity_id}`}
                      >
                        {e.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {relatedRelationships.length > 0 ? (
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">Relationships</p>
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
                        data-testid={`detail-relationship-${r.relationship_id}`}
                      >
                        {r.source_entity_name} → {r.target_entity_name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {relatedEvidence.length > 0 ? (
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">Evidence</p>
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
                        data-testid={`detail-evidence-${ev.evidence_id}`}
                      >
                        {ev.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {relatedFindings.length > 0 ? (
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-foreground-muted">Related findings</p>
                <ul className="space-y-1">
                  {relatedFindings.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() =>
                          open({
                            type: 'finding',
                            id: f.id,
                            title: f.title,
                            investigationId,
                          })
                        }
                        className="w-full rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-hover"
                        data-testid={`detail-finding-${f.id}`}
                      >
                        {f.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showNetwork || showTimeline ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {showNetwork ? (
            <Link
              href={`/investigations/${investigationId}?tab=network`}
              data-testid="detail-network"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
            >
              <NetworkIcon className="h-3.5 w-3.5" />
              View in network
            </Link>
          ) : null}
          {showTimeline ? (
            <Link
              href={`/investigations/${investigationId}?tab=timeline`}
              data-testid="detail-timeline"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              View timeline
            </Link>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-foreground-muted">
            <ShieldAlert className="h-3.5 w-3.5" />
            Analytical lead only — not a judgement
          </span>
        </div>
      ) : null}
    </section>
  );
}