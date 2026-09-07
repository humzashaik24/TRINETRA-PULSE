'use client';

import React from 'react';
import {
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Network as NetworkIcon,
  Waypoints,
  GitBranch,
  Sparkles,
  BarChart3,
  Check,
  X,
} from 'lucide-react';
import { Badge, EntityTypeIcon } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { formatCount, formatPercent, formatDateTime, ENTITY_TYPE_LABELS } from '@/lib/format';
import type {
  InspectorEntityView,
  InspectorRelationshipView,
  InspectorDatasetView,
  InspectorFindingView,
  InspectorEvidenceView,
  InspectorNetworkView,
  InspectorCaseView,
  InspectorCentralityView,
  InspectorCommunityView,
  InspectorComponentView,
  InspectorPatternView,
  InspectorInvestigationView,
  InspectorNoteView,
  InspectorEventView,
  InspectorAnalyticsSnapshotView,
} from '@/services/inspector.service';
import type { RelationshipIntelligence } from '@trinetra-pulse/types';
import { getIntelligenceStatusLabel } from '@/services/relationship-intelligence.service';

// ============================================================
// PHASE 3.5 — CONTEXT INSPECTOR VIEWS
// ============================================================

export interface ViewActions {
  /** Navigate to the full workspace page for this context. */
  onOpen?: () => void;
  /** Open another context (e.g. entity involved in a finding). */
  onInspectEntity?: (entity: { id: string; name: string; type: string }) => void;
  /** Open a linked finding context (evidence → finding journey). */
  onInspectFinding?: (finding: { id: string; title: string }) => void;
  /** Open this entity inside its network, focused (entity → network journey). */
  onOpenNetwork?: (entity: { id: string; investigationId?: string }) => void;
  /** Confirm the relationship's multi-source correlation (Phase 21). */
  onConfirmRelationship?: (relationshipId: string) => void;
  /** Reject / discard the relationship's correlation (Phase 21). */
  onRejectRelationship?: (relationshipId: string) => void;
  /** Whether the current user may confirm/reject (defaults to true). */
  canReview?: boolean;
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '' || value === 0 && label !== 'Connections') {
    return null;
  }
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-foreground-muted shrink-0">{label}</span>
      <span className={cn('text-xs font-medium text-foreground text-right min-w-0 truncate', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h4 className="tp-data-label mb-1.5">{title}</h4>
      {children}
    </section>
  );
}

function OpenButton({ onClick, label, icon }: { onClick?: () => void; label: string; icon?: React.ReactNode }) {
  if (!onClick) return null;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md bg-foreground/90 text-background px-3 h-8 text-xs font-medium tp-transition hover:bg-foreground"
    >
      {label}
      {icon ?? <ArrowUpRight className="h-3.5 w-3.5" />}
    </button>
  );
}

function StatusBadge({ status, variant }: { status: string; variant?: 'success' | 'info' | 'warning' | 'danger' | 'default' }) {
  return (
    <Badge variant={variant ?? 'info'} size="sm">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// ------------------------------------------------------------
// ENTITY
// ------------------------------------------------------------

export function EntityContextView({ view, actions }: { view: InspectorEntityView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <EntityTypeIcon type={view.entityType} size="md" />
        <StatusBadge
          status={view.resolutionState}
          variant={
            view.resolutionState === 'CONFIRMED'
              ? 'success'
              : view.resolutionState === 'REJECTED'
                ? 'danger'
                : view.resolutionState === 'NEEDS_REVIEW'
                  ? 'warning'
                  : 'info'
          }
        />
        {view.verified ? (
          <Badge size="sm" variant="success">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        ) : null}
        {view.flagged ? (
          <Badge size="sm" variant="danger">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        ) : null}
      </div>

      <Section title="Metrics">
        <InfoRow label="Connections" value={formatCount(view.connections)} />
        <InfoRow label="Evidence" value={formatCount(view.evidence)} />
        <InfoRow label="Sources" value={formatCount(view.sources)} />
        <InfoRow label="Events" value={formatCount(view.events)} />
      </Section>

      {view.aliases.length > 0 && (
        <Section title="Known aliases">
          <div className="flex flex-wrap gap-1.5">
            {view.aliases.map((a) => (
              <span key={a} className="text-xs rounded-md bg-surface-elevated border border-border px-2 py-0.5 text-foreground-muted">
                {a}
              </span>
            ))}
          </div>
        </Section>
      )}

      {view.description && (
        <Section title="Profile summary">
          <p className="text-xs leading-relaxed text-foreground-secondary">{view.description}</p>
        </Section>
      )}

      <div className="mt-5 pt-3 border-t border-border flex flex-wrap gap-2">
        {actions.onOpenNetwork ? (
          <OpenButton
            onClick={() =>
              actions.onOpenNetwork!({ id: view.id, investigationId: view.investigationId })
            }
            label="View in Network"
          />
        ) : null}
        <OpenButton onClick={actions.onOpen} label="Open in Analytics" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// PHASE 9 — INVESTIGATION
// ------------------------------------------------------------

export function InvestigationContextView({ view, actions }: { view: InspectorInvestigationView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge
          status={view.status}
          variant={
            view.status === 'active'
              ? 'success'
              : view.status === 'under_review'
                ? 'warning'
                : view.status === 'closed' || view.status === 'archived'
                  ? 'default'
                  : 'info'
          }
        />
        <span className="text-xs text-foreground-muted capitalize">{view.priority} priority</span>
      </div>

      {view.description && (
        <Section title="Summary">
          <p className="text-xs text-foreground-secondary leading-relaxed">{view.description}</p>
        </Section>
      )}

      <Section title="Workspace metrics">
        <InfoRow label="Entities" value={formatCount(view.entityCount)} />
        <InfoRow label="Relationships" value={formatCount(view.relationshipCount)} />
        <InfoRow label="Evidence" value={formatCount(view.evidenceCount)} />
      </Section>

      <Section title="Team">
        <InfoRow label="Lead" value={view.leadInvestigator} />
        {view.assigned.length > 0 && (
          <InfoRow label="Assigned" value={view.assigned.join(', ')} />
        )}
      </Section>

      {view.updatedAt && (
        <Section title="Timeline">
          <InfoRow label="Updated" value={formatDateTime(view.updatedAt)} />
        </Section>
      )}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Investigation Workspace" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// PHASE 9 — NOTE
// ------------------------------------------------------------

export function NoteContextView({ view, actions }: { view: InspectorNoteView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant="default">
          Note
        </Badge>
        <span className="text-xs text-foreground-muted truncate">by {view.author}</span>
      </div>

      {view.category && (
        <Section title="Category">
          <p className="text-xs text-foreground-secondary">{view.category}</p>
        </Section>
      )}

      <Section title="Body">
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground-secondary">
          {view.body || 'No content'}
        </p>
      </Section>

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Investigation" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// PHASE 9 — EVENT
// ------------------------------------------------------------

export function EventContextView({ view, actions }: { view: InspectorEventView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={view.eventType} variant="info" />
      </div>

      <Section title="Occurred">
        <InfoRow label="Time" value={view.occurredAt ? formatDateTime(view.occurredAt) : '—'} />
      </Section>

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Investigation" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// PHASE 9 — ANALYTICS SNAPSHOT
// ------------------------------------------------------------

export function AnalyticsSnapshotContextView({ view, actions }: { view: InspectorAnalyticsSnapshotView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant="network">
          <BarChart3 className="mr-1 h-3 w-3" />
          Analytics snapshot
        </Badge>
      </div>

      <Section title="Snapshot">
        <p className="text-sm font-medium text-foreground">{view.label}</p>
      </Section>

      <Section title="Structure at capture">
        <InfoRow label="Entities" value={formatCount(view.nodes)} />
        <InfoRow label="Relationships" value={formatCount(view.relationships)} />
        <InfoRow label="Components" value={formatCount(view.connectedComponents)} />
        <InfoRow label="Groups" value={formatCount(view.communityCount)} />
        {view.topConnectedEntity && (
          <InfoRow label="Top connected" value={view.topConnectedEntity} />
        )}
      </Section>

      {view.capturedAt && (
        <Section title="Captured">
          <InfoRow label="At" value={formatDateTime(view.capturedAt)} />
        </Section>
      )}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Investigation" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// RELATIONSHIP
// ------------------------------------------------------------

export function RelationshipContextView({ view, actions }: { view: InspectorRelationshipView; actions: ViewActions }) {
  const intel = view.intelligence;
  const canReview = actions.canReview ?? true;
  const inFlight = false;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] text-foreground-muted uppercase tracking-wide">
        <StatusBadge status={view.verificationStatus} variant={view.verificationStatus === 'CONFIRMED' ? 'success' : view.verificationStatus === 'REJECTED' ? 'danger' : 'warning'} />
        <span>confidence {formatPercent(view.confidence)}</span>
      </div>

      <Section title="Endpoint">
        <div className="rounded-lg border border-border bg-surface-elevated/40 p-3">
          <div className="flex items-center gap-2">
            <EntityTypeIcon type={view.sourceEntityType} size="sm" />
            <span className="text-sm font-medium text-foreground truncate">{view.sourceEntityName}</span>
          </div>
          <div className="my-2 ml-2.5 h-4 w-px bg-border" aria-hidden="true" />
          <div className="rounded bg-surface-elevated border border-border px-2 py-1 text-xs font-semibold text-foreground w-fit">
            {view.type.replace(/_/g, ' ')}
          </div>
          <div className="my-2 ml-2.5 h-4 w-px bg-border" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <EntityTypeIcon type={view.targetEntityType} size="sm" />
            <span className="text-sm font-medium text-foreground truncate">{view.targetEntityName}</span>
          </div>
        </div>
      </Section>

      <Section title="Source">
        <p className="text-xs text-foreground-secondary">{view.source}</p>
      </Section>

      {intel ? (
        <RelationshipIntelligencePanel intel={intel} canReview={canReview} inFlight={inFlight} actions={actions} view={view} />
      ) : view.evidence.length > 0 ? (
        <Section title={`Supporting evidence (${view.evidence.length})`}>
          <ul className="space-y-1.5">
            {view.evidence.map((e, i) => (
              <li key={i} className="text-xs text-foreground-secondary leading-relaxed">
                {e}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Network Workspace" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// PHASE 21 — RELATIONSHIP INTELLIGENCE PANEL
// ------------------------------------------------------------

function RelationshipIntelligencePanel({
  intel,
  canReview,
  inFlight,
  actions,
  view,
}: {
  intel: RelationshipIntelligence;
  canReview: boolean;
  inFlight: boolean;
  actions: ViewActions;
  view: InspectorRelationshipView;
}) {
  const statusVariant =
    intel.status === 'REVIEWED'
      ? 'success'
      : intel.status === 'DISCARDED'
        ? 'danger'
        : intel.sourceCount >= 2
          ? 'info'
          : 'warning';

  const correlated = intel.sourceCount >= 2;

  return (
    <>
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <h4 className="tp-data-label">Relationship intelligence</h4>
          <Badge size="sm" variant={statusVariant}>
            {getIntelligenceStatusLabel(intel.status)}
          </Badge>
        </div>
      </div>

      <Section title="Correlation">
        <InfoRow label="Confidence" value={formatPercent(intel.confidence)} />
        <InfoRow label="Label" value={intel.confidenceLabel} />
        <InfoRow label="Independent sources" value={formatCount(intel.sourceCount)} />
        <InfoRow label="Observations" value={formatCount(intel.observationCount)} />
        <InfoRow label="Evidence records" value={formatCount(intel.evidenceCount)} />
        <InfoRow label="First observed" value={intel.firstObservedAt ? formatDateTime(intel.firstObservedAt) : '—'} />
        <InfoRow label="Last observed" value={intel.lastObservedAt ? formatDateTime(intel.lastObservedAt) : '—'} />
        {intel.correlationKey && (
          <InfoRow label="Correlation key" value={intel.correlationKey} mono />
        )}
      </Section>

      {correlated && (
        <p className="text-xs leading-relaxed text-foreground-muted">
          Supported by {formatCount(intel.sourceCount)} independent sources. Correlation indicates corroboration of the
          observed relationship — it does not establish criminality or culpability.
        </p>
      )}

      {intel.sourceCount < 2 && (
        <p className="text-xs leading-relaxed text-foreground-muted">
          This relationship is currently supported by a single source. Correlation across independent sources is not
          yet established.
        </p>
      )}

      <Section title={`Source observations (${intel.observations.length})`}>
        {intel.observations.length === 0 ? (
          <p className="text-xs text-foreground-muted">No individual source observations recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {intel.observations.map((o) => (
              <li key={o.id} className="text-xs text-foreground-secondary leading-relaxed">
                <span className="font-medium text-foreground">{o.sourceLabel}</span>
                {o.reference ? <span className="text-foreground-muted"> · {o.reference}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Evidence support">
        {intel.evidenceSupport?.supported && intel.evidenceSupport.evidenceIds.length > 0 ? (
          <>
            <InfoRow label="Linked records" value={formatCount(intel.evidenceSupport.evidenceIds.length)} />
            <InfoRow label="Direct" value={formatCount(intel.evidenceSupport.directCount)} />
            {view.evidenceLinks && view.evidenceLinks.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {view.evidenceLinks.map((e) => (
                  <li key={e.evidenceId} className="text-xs text-foreground-secondary leading-relaxed">
                    {e.title}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-xs text-foreground-muted">No linked evidence</p>
        )}
      </Section>

      {intel.conflictFlags.length > 0 && (
        <Section title={`Conflicts (${intel.conflictFlags.length})`}>
          <ul className="space-y-1.5">
            {intel.conflictFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-secondary leading-relaxed">
                <ShieldAlert className="mt-0.5 h-3 w-3 text-amber-500 shrink-0" />
                <span>{flag.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {canReview && intel.status === 'NEEDS_REVIEW' && (
        <div className="mt-4 pt-3 border-t border-border flex gap-2">
          <button
            onClick={() => actions.onConfirmRelationship?.(view.id)}
            disabled={inFlight}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-foreground/90 text-background px-3 h-8 text-xs font-medium tp-transition hover:bg-foreground disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Confirm
          </button>
          <button
            onClick={() => actions.onRejectRelationship?.(view.id)}
            disabled={inFlight}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 h-8 text-xs font-medium text-foreground tp-transition hover:bg-surface-hover disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Discard
          </button>
        </div>
      )}

      {intel.status !== 'NEEDS_REVIEW' && (
        <p className="mt-3 text-[11px] text-foreground-muted">
          This correlation has been {intel.status === 'REVIEWED' ? 'reviewed' : 'discarded'} by an analyst.
        </p>
      )}
    </>
  );
}

// ------------------------------------------------------------
// DATASET
// ------------------------------------------------------------

export function DatasetContextView({ view, actions }: { view: InspectorDatasetView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusBadge
          status={view.status}
          variant={view.status === 'ready' ? 'success' : view.status === 'failed' ? 'danger' : view.status === 'processing' ? 'info' : 'default'}
        />
        <span className="text-xs text-foreground-muted capitalize">{view.category}</span>
      </div>

      <Section title="Details">
        <InfoRow label="Format" value={view.format.toUpperCase()} mono />
        <InfoRow label="Records" value={formatCount(view.recordCount)} />
        <InfoRow label="File size" value={formatFileSize(view.fileSize)} />
        <InfoRow label="Quality" value={formatPercent(view.qualityScore)} />
      </Section>

      <Section title="Quality checks">
        <InfoRow label="Warnings" value={formatCount(view.warnings)} />
        <InfoRow label="Errors" value={formatCount(view.errors)} />
      </Section>

      {view.description && (
        <Section title="Description">
          <p className="text-xs text-foreground-secondary leading-relaxed">{view.description}</p>
        </Section>
      )}

      <Section title="Timeline">
        <InfoRow label="Created" value={formatDateTime(view.createdAt)} />
        <InfoRow label="Updated" value={formatDateTime(view.updatedAt)} />
      </Section>

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Analytics" />
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// ------------------------------------------------------------
// FINDING
// ------------------------------------------------------------

export function FindingContextView({ view, actions }: { view: InspectorFindingView; actions: ViewActions }) {
  const entityAction = actions.onInspectEntity;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <StatusBadge
          status={view.severity}
          variant={view.severity === 'critical' || view.severity === 'high' ? 'danger' : view.severity === 'medium' ? 'warning' : view.severity === 'low' ? 'info' : 'default'}
        />
        <span className="text-xs text-foreground-muted">confidence {formatPercent(view.confidence)}</span>
      </div>

      {view.description && (
        <Section title="Summary">
          <p className="text-xs text-foreground-secondary leading-relaxed">{view.description}</p>
        </Section>
      )}

      {view.entities.length > 0 && (
        <Section title={`Entities involved (${view.entities.length})`}>
          <div className="space-y-1.5">
            {view.entities.map((e) => (
              <button
                key={e.id}
                onClick={entityAction ? () => entityAction(e) : undefined}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-left tp-transition',
                  entityAction ? 'hover:bg-surface-hover cursor-pointer' : 'cursor-default'
                )}
              >
                <EntityTypeIcon type={e.type as Parameters<typeof EntityTypeIcon>[0]['type']} size="xs" />
                <span className="flex-1 text-xs font-medium text-foreground truncate">{e.name}</span>
                {entityAction && <ArrowUpRight className="h-3 w-3 text-foreground-muted shrink-0" />}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Source">
        <InfoRow label="Engine" value={view.source} />
        <InfoRow label="Detected" value={formatRelativeLocal(view.timestamp)} />
      </Section>

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Patterns Workspace" />
      </div>
    </div>
  );
}

function formatRelativeLocal(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatDateTime(iso);
}

// ------------------------------------------------------------
// EVIDENCE
// ------------------------------------------------------------

export function EvidenceContextView({ view, actions }: { view: InspectorEvidenceView; actions: ViewActions }) {
  const entityAction = actions.onInspectEntity;
  const findingAction = actions.onInspectFinding;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-muted">confidence {formatPercent(view.confidence)}</span>
        {view.status && <StatusBadge status={view.status} />}
        {view.evidenceType && (
          <span className="text-[11px] uppercase text-foreground-muted">{view.evidenceType.replace(/_/g, ' ')}</span>
        )}
      </div>

      {view.summary && (
        <Section title="Summary">
          <p className="text-xs text-foreground-secondary leading-relaxed">{view.summary}</p>
        </Section>
      )}

      <Section title="Extraction">
        <InfoRow label="Method" value={view.extractionMethod.replace(/_/g, ' ')} />
        <InfoRow label="Source" value={view.sourceName} />
        {view.datasetName && <InfoRow label="Dataset" value={view.datasetName} />}
        {view.observedAt ? <InfoRow label="Observed" value={formatRelativeLocal(view.observedAt)} /> : null}
        <InfoRow label="Extracted" value={formatRelativeLocal(view.timestamp)} />
      </Section>

      {view.investigationId && (
        <Section title="Investigation">
          <p className="text-xs font-mono text-foreground-muted">{view.investigationId.toUpperCase()}</p>
        </Section>
      )}

      {view.linkedEntities && view.linkedEntities.length > 0 && (
        <Section title={`Related entities (${view.linkedEntities.length})`}>
          <div className="space-y-1.5">
            {view.linkedEntities.map((e) => (
              <button
                key={e.id}
                onClick={entityAction ? () => entityAction(e) : undefined}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-left tp-transition',
                  entityAction ? 'hover:bg-surface-hover cursor-pointer' : 'cursor-default'
                )}
              >
                <EntityTypeIcon type={e.type as Parameters<typeof EntityTypeIcon>[0]['type']} size="xs" />
                <span className="flex-1 text-xs font-medium text-foreground truncate">{e.name}</span>
                {entityAction && <ArrowUpRight className="h-3 w-3 text-foreground-muted shrink-0" />}
              </button>
            ))}
          </div>
        </Section>
      )}

      {view.linkedFindings && view.linkedFindings.length > 0 && (
        <Section title={`Linked findings (${view.linkedFindings.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {view.linkedFindings.map((f) => (
              <button
                key={f.id}
                onClick={findingAction ? () => findingAction(f) : undefined}
                className={cn(
                  'rounded bg-surface border border-border px-2 py-1 text-[11px] text-foreground tp-transition',
                  findingAction ? 'hover:bg-surface-hover cursor-pointer' : 'cursor-default'
                )}
                title={f.title}
              >
                {f.title}
              </button>
            ))}
          </div>
        </Section>
      )}

      {view.isDemoData && (
        <p className="mt-3 text-[11px] text-foreground-muted">Demo dataset — illustrative content for the SIH demonstration.</p>
      )}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Evidence Workspace" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// NETWORK
// ------------------------------------------------------------

export function NetworkContextView({ view, actions }: { view: InspectorNetworkView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant="default">
          Node
        </Badge>
        {view.nodeType && (
          <span className="text-xs text-foreground-muted capitalize">{ENTITY_TYPE_LABELS[view.nodeType as keyof typeof ENTITY_TYPE_LABELS] ?? view.nodeType}</span>
        )}
      </div>

      {view.nodeLabel && (
        <Section title="Node">
          <p className="text-sm font-medium text-foreground">{view.nodeLabel}</p>
        </Section>
      )}
      {typeof view.connections === 'number' && (
        <Section title="Connectivity">
          <InfoRow label="Connections" value={formatCount(view.connections)} />
        </Section>
      )}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Network Workspace" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// CASE
// ------------------------------------------------------------

export function CaseContextView({ view, actions }: { view: InspectorCaseView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <Section title="Investigation">
        <InfoRow label="Case ID" value={view.id} mono />
      </Section>
      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Investigation Workspace" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ANALYTICS — CENTRALITY
// ------------------------------------------------------------

export function CentralityContextView({ view, actions }: { view: InspectorCentralityView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant="network">
          <NetworkIcon className="mr-1 h-3 w-3" />
          {view.metric} centrality
        </Badge>
      </div>

      <Section title="Entity">
        <p className="text-sm font-medium text-foreground">{view.entityName}</p>
        <p className="text-xs font-mono text-foreground-muted">{view.entityId}</p>
      </Section>

      <Section title="Structural importance">
        <InfoRow label="Rank" value={`#${view.rank}`} mono />
        <InfoRow label="Score" value={formatCount(Math.round(view.score * 1000) / 1000)} mono />
        <InfoRow label="Normalized" value={formatPercent(view.normalizedScore)} />
      </Section>

      <p className="mt-3 text-xs leading-relaxed text-foreground-muted">{view.definition}</p>

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Analytics" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ANALYTICS — COMMUNITY / CONNECTED GROUP
// ------------------------------------------------------------

export function CommunityContextView({ view, actions }: { view: InspectorCommunityView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant="network">
          <Waypoints className="mr-1 h-3 w-3" />
          Connected group
        </Badge>
      </div>

      <Section title="Group">
        <p className="text-sm font-medium text-foreground">{view.label}</p>
      </Section>

      <Section title="Structure">
        <InfoRow label="Entities" value={formatCount(view.size)} />
        <InfoRow label="Internal ties" value={formatCount(view.internalEdgeCount)} />
        <InfoRow label="Density" value={formatPercent(view.density)} />
        <InfoRow label="Cohesion" value={formatPercent(view.cohesion)} />
      </Section>

      {view.representativeEntities.length > 0 && (
        <Section title="Representative entities">
          <div className="flex flex-wrap gap-1.5">
            {view.representativeEntities.map((e) => (
              <span key={e} className="rounded bg-surface border border-border px-1.5 py-0.5 text-[11px] text-foreground">
                {e}
              </span>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Analytics" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ANALYTICS — COMPONENT / CONNECTED COMPONENT
// ------------------------------------------------------------

export function ComponentContextView({ view, actions }: { view: InspectorComponentView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant="network">
          <GitBranch className="mr-1 h-3 w-3" />
          Connected component
        </Badge>
      </div>

      <Section title="Component">
        <InfoRow label="Label" value={view.label} />
      </Section>

      <Section title="Structure">
        <InfoRow label="Entities" value={formatCount(view.nodeCount)} />
        <InfoRow label="Relationships" value={formatCount(view.edgeCount)} />
        <InfoRow label="Density" value={formatPercent(view.density)} />
        {view.representativeNode && (
          <InfoRow label="Representative" value={view.representativeNode} />
        )}
      </Section>

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Analytics" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ANALYTICS — STRUCTURAL PATTERN
// ------------------------------------------------------------

export function PatternContextView({ view, actions }: { view: InspectorPatternView; actions: ViewActions }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge size="sm" variant={view.severity === 'high' ? 'danger' : view.severity === 'medium' ? 'warning' : 'info'}>
          <Sparkles className="mr-1 h-3 w-3" />
          Structural pattern
        </Badge>
      </div>

      <Section title="Pattern">
        <p className="text-sm font-medium text-foreground">{view.title}</p>
        <p className="text-xs font-mono text-foreground-muted">{view.patternType}</p>
      </Section>

      <Section title="Signal">
        <InfoRow label="Significance" value={view.severity} />
        <InfoRow label="Confidence" value={formatPercent(view.confidence)} />
      </Section>

      {view.description && (
        <p className="mt-3 text-xs leading-relaxed text-foreground-muted">{view.description}</p>
      )}

      {view.entities.length > 0 && (
        <Section title="Entities involved">
          <div className="flex flex-wrap gap-1.5">
            {view.entities.map((e) => (
              <span key={e} className="rounded bg-surface border border-border px-1.5 py-0.5 text-[11px] text-foreground">
                {e}
              </span>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-5 pt-3 border-t border-border">
        <OpenButton onClick={actions.onOpen} label="Open in Analytics" />
      </div>
    </div>
  );
}