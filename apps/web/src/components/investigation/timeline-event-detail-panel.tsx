'use client';

import Link from 'next/link';
import { X, CalendarClock, MapPin, ShieldAlert } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { formatDateTime, EVIDENCE_TYPE_LABELS } from '@/lib/format';
import { timestampSourceLabel, type TimelineRow } from '@/lib/timeline';
import {
  FINDING_CONFIDENCE_VARIANT,
  findingSeverityLabel,
  findingSeverityVariant,
} from '@/lib/findings-labels';

// ============================================================
// INVESTIGATION — TIMELINE DETAIL PANEL (Phase 29)
// ============================================================
// Expands a timeline row into the recorded object that backs it: the
// persisted event (time, location, related entities/relationships), the
// evidence slice (collection time, provenance) or the finding/note the row
// references. Every displayed value resolves against persisted workspace
// data — where a contract defines no link the panel states that honestly
// instead of inventing an association.
// ============================================================

export interface TimelineEventDetailPanelProps {
  row: TimelineRow;
  investigationId: string;
  onClose?: () => void;
}

const evidenceTypeLabel = (raw: string): string => {
  const key = raw.toUpperCase().replace(/[\s-]+/g, '_');
  return EVIDENCE_TYPE_LABELS[key as keyof typeof EVIDENCE_TYPE_LABELS] ?? raw;
};

export function TimelineEventDetailPanel({
  row,
  investigationId,
  onClose,
}: TimelineEventDetailPanelProps) {
  const data = useInvestigationStore((s) => s.data);
  const open = useShellStore((s) => s.selectContext);

  const timeSource = timestampSourceLabel(row.category);

  return (
    <section
      className="rounded-xl border border-border bg-surface-elevated/60 p-4"
      data-testid="timeline-event-detail-panel"
      aria-label={`Details for ${row.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" size="sm">
            {timeSource}
          </Badge>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close timeline details"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground"
            data-testid="timeline-event-detail-close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {row.category === 'event' ? (
        <EventDetail row={row} investigationId={investigationId} open={open} timeSource={timeSource} />
      ) : null}
      {row.category === 'evidence' ? (
        <EvidenceDetail row={row} investigationId={investigationId} timeSource={timeSource} />
      ) : null}
      {row.category === 'finding' ? <FindingDetail row={row} investigationId={investigationId} open={open} /> : null}
      {row.category === 'note' ? <NoteDetail row={row} investigationId={investigationId} /> : null}
      {row.category === 'activity' || row.category === 'system' ? (
        <BaseDetail row={row} investigationId={investigationId} />
      ) : null}
    </section>
  );
}

function DetailHeading({ title }: { title: string }) {
  return <h4 className="tp-data-label mb-1.5">{title}</h4>;
}

function TimeLine({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="text-xs text-foreground-secondary">
      {label}:{' '}
      <span className={value ? 'text-foreground' : 'text-foreground-muted'}>
        {value ? formatDateTime(value) : 'Time unavailable'}
      </span>
    </p>
  );
}

function Provenance({ text }: { text: string }) {
  return (
    <p
      className="mt-3 text-[11px] text-foreground-muted"
      data-testid="timeline-event-provenance"
    >
      {text}
    </p>
  );
}

function EventDetail({
  row,
  investigationId,
  open,
  timeSource,
}: {
  row: TimelineRow;
  investigationId: string;
  open: ReturnType<typeof useShellStore.getState>['selectContext'];
  timeSource: string;
}) {
  const data = useInvestigationStore((s) => s.data);
  const event = data.events.find((e) => e.id === row.refId);

  if (!event) {
    return (
      <div>
        <h3 className="mt-2 text-sm font-semibold text-foreground">{row.title}</h3>
        <TimeLine label={timeSource} value={row.timestamp} />
        {row.description ? (
          <p className="mt-1.5 text-xs text-foreground-secondary">{row.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-foreground-muted" data-testid="timeline-event-unresolved">
          Event record not available in this workspace.
        </p>
      </div>
    );
  }

  const relatedEntities = event.entity_ids
    .map((id) => data.entities.find((e) => e.entity_id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const relatedEntityIds = new Set(relatedEntities.map((e) => e.entity_id));
  const relatedRelationships = data.relationships.filter(
    (r) => relatedEntityIds.has(r.source_entity_id) || relatedEntityIds.has(r.target_entity_id)
  );

  return (
    <div data-testid={`timeline-event-detail-${stackFor(event.id)}`}>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" size="sm">
          {event.event_type.replace(/_/g, ' ')}
        </Badge>
        <span className="text-[11px] text-foreground-muted" data-testid={`timeline-event-id-${stackFor(event.id)}`}>
          {event.id}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{event.title}</h3>
      <div className="mt-1.5 space-y-1">
        <TimeLine label={timeSource} value={event.occurred_at} />
        {event.location ? (
          <p className="flex items-center gap-1 text-xs text-foreground-secondary">
            <MapPin className="h-3 w-3" />
            {event.location}
          </p>
        ) : (
          <p className="text-xs text-foreground-muted">
            <MapPin className="mr-1 inline h-3 w-3" />
            Location not recorded
          </p>
        )}
      </div>
      {event.description ? (
        <p className="mt-1.5 text-xs text-foreground-secondary">{event.description}</p>
      ) : null}
      {row.description && row.description !== event.description ? (
        <p className="mt-1 text-[11px] text-foreground-muted">{row.description}</p>
      ) : null}

      <div className="mt-4">
        <DetailHeading title="Related entities" />
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
                  data-testid={`timeline-event-entity-${e.entity_id}`}
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-foreground-muted"
            data-testid="timeline-event-entities-empty"
          >
            No linked entities
          </p>
        )}
      </div>

      {relatedRelationships.length > 0 ? (
        <div className="mt-4">
          <DetailHeading title="Related relationships" />
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
                  data-testid={`timeline-event-relationship-${r.relationship_id}`}
                >
                  {r.source_entity_name} → {r.target_entity_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <DetailHeading title="Related evidence" />
        <p
          className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-foreground-muted"
          data-testid="timeline-event-evidence-empty"
        >
          No linked evidence
        </p>
        <p className="mt-1 text-[11px] text-foreground-muted">
          The event record does not reference evidence directly; evidence
          linkage is derived from finding ↔ evidence references.
        </p>
      </div>

      <Provenance text={`Event time is the persisted event timestamp · recorded in investigation at ${formatDateTime(event.created_at)}`} />
    </div>
  );
}

function EvidenceDetail({
  row,
  investigationId,
  timeSource,
}: {
  row: TimelineRow;
  investigationId: string;
  timeSource: string;
}) {
  const data = useInvestigationStore((s) => s.data);
  const evidence = data.evidence.find((e) => e.evidence_id === row.refId || e.id === row.refId);

  if (!evidence) {
    return (
      <p className="mt-2 text-xs text-foreground-muted" data-testid="timeline-evidence-unresolved">
        Evidence record not available in this workspace.
      </p>
    );
  }

  return (
    <div data-testid={`timeline-evidence-detail-${stackFor(evidence.evidence_id || evidence.id)}`}>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" size="sm">
          {evidenceTypeLabel(evidence.evidence_type)}
        </Badge>
        <span className="text-[11px] text-foreground-muted">{evidence.evidence_id}</span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{evidence.title}</h3>
      <div className="mt-1.5 space-y-1">
        <TimeLine label={timeSource} value={evidence.collected_at} />
        <p className="text-xs text-foreground-muted">
          Linked by {evidence.linked_by} · {formatDateTime(evidence.linked_at)}
        </p>
      </div>
      {evidence.summary ? (
        <p className="mt-1.5 text-xs text-foreground-secondary">{evidence.summary}</p>
      ) : null}

      <div className="mt-4">
        <DetailHeading title="Related timeline events" />
        <p
          className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-foreground-muted"
          data-testid="timeline-evidence-events-empty"
        >
          No timeline event linked
        </p>
        <p className="mt-1 text-[11px] text-foreground-muted">
          Evidence records do not reference timeline events directly; the
          finding ↔ evidence references drive that linkage.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/investigations/${investigationId}?tab=evidence`}
          data-testid="timeline-evidence-tab-link"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
        >
          View in evidence tab
        </Link>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-foreground-muted">
          <ShieldAlert className="h-3.5 w-3.5" />
          Persisted collection record
        </span>
      </div>

      <Provenance text={`Collection time is the persisted collected_at · record created ${formatDateTime(evidence.collected_at ?? evidence.linked_at)}`} />
    </div>
  );
}

function FindingDetail({
  row,
  investigationId,
  open,
}: {
  row: TimelineRow;
  investigationId: string;
  open: ReturnType<typeof useShellStore.getState>['selectContext'];
}) {
  const data = useInvestigationStore((s) => s.data);
  const finding = data.findings.find((f) => f.id === row.refId);

  if (!finding) {
    return (
      <p className="mt-2 text-xs text-foreground-muted" data-testid="timeline-finding-unresolved">
        Finding record not available in this workspace.
      </p>
    );
  }

  const relatedEntities = finding.entity_ids
    .map((id) => data.entities.find((e) => e.entity_id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <div data-testid={`timeline-finding-detail-${finding.id}`}>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={findingSeverityVariant(finding.category)} size="sm">
          {findingSeverityLabel(finding.category)}
        </Badge>
        <Badge variant={FINDING_CONFIDENCE_VARIANT[finding.confidence]} size="sm">
          {finding.confidence} confidence
        </Badge>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{finding.title}</h3>
      <TimeLine label="Finding created" value={finding.created_at} />
      {finding.description ? (
        <p className="mt-1.5 text-xs text-foreground-secondary">{finding.description}</p>
      ) : null}

      {relatedEntities.length > 0 ? (
        <div className="mt-4">
          <DetailHeading title="Related entities" />
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
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Provenance text={`Finding recorded by ${finding.created_by} · ${formatDateTime(finding.created_at)}`} />
    </div>
  );
}

function NoteDetail({ row, investigationId }: { row: TimelineRow; investigationId: string }) {
  const data = useInvestigationStore((s) => s.data);
  const note = data.notes.find((n) => n.id === row.refId);

  if (!note) {
    return (
      <p className="mt-2 text-xs text-foreground-muted" data-testid="timeline-note-unresolved">
        Note record not available in this workspace.
      </p>
    );
  }

  return (
    <div data-testid={`timeline-note-detail-${note.id}`}>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{note.category ? `Note · ${note.category}` : 'Note'}</h3>
      <TimeLine label="Note created" value={note.created_at} />
      {note.body ? <p className="mt-1.5 text-xs text-foreground-secondary">{note.body}</p> : null}
      <Provenance text={`Written by ${note.author} · ${formatDateTime(note.created_at)}`} />
    </div>
  );
}

function BaseDetail({ row, investigationId }: { row: TimelineRow; investigationId: string }) {
  void investigationId;
  return (
    <div>
      <h3 className="mt-2 text-sm font-semibold text-foreground">{row.title}</h3>
      <TimeLine label="Action time" value={row.timestamp} />
      {row.description ? (
        <p className="mt-1.5 text-xs text-foreground-secondary">{row.description}</p>
      ) : null}
      {row.actor ? <p className="mt-1 text-[11px] text-foreground-muted">by {row.actor}</p> : null}
      {row.timestamp ? (
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-foreground-muted">
          <CalendarClock className="h-3.5 w-3.5" />
          Workspace action recorded at {formatDateTime(row.timestamp)}
        </div>
      ) : null}
    </div>
  );
}

function stackFor(id: string): string {
  return id.replace(/[/{}()]/g, '');
}