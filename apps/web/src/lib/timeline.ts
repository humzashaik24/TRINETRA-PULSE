/**
 * Shared investigation-timeline semantics (Phase 29).
 *
 * The unified timeline tab and the finding detail panel must agree on HOW a
 * timeline is ordered, grouped and grounded. This module centralises that
 * logic so both surfaces render the same honest, deterministic stream:
 *
 *  - EVERY row carries a REAL temporal field from the persisted record
 *    (event time, evidence collected_at, finding/note created_at, action
 *    time). A row without a recorded time is `timestamp: null` and renders
 *    as an honest "Time unavailable" — never a fabricated date.
 *  - Rows stream ASCENDING by that real field; untimed rows group last
 *    under "Time unavailable" (stably — we do not pretend an unknown time
 *    belongs somewhere in the dated stream).
 *  - A row's "time source" is labelled by its category so the reader can
 *    tell event time from evidence collection time from analysis recording
 *    time.
 *  - Cross-object linkage is only ever derived from persisted references
 *    (evidence_ids, entity_ids intersection). When a contract provides no
 *    link, callers show an honest empty state rather than inventing one.
 */

import type {
  InvestigationActivityEntry,
  InvestigationEvent,
  InvestigationEvidence,
  InvestigationFinding,
  InvestigationTimelineItem,
} from '@trinetra-pulse/types';
import { formatDate } from '@/lib/format';

export type TimelineCategory = 'event' | 'evidence' | 'finding' | 'note' | 'activity' | 'system';

export interface TimelineRow {
  id: string;
  category: TimelineCategory;
  /** Real temporal field of the underlying record; null means undated. */
  timestamp: string | null;
  title: string;
  description: string | null;
  refId: string | null;
  refType: string | null;
  actor: string | null;
}

export const TIMELINE_CATEGORY_ORDER: TimelineCategory[] = [
  'event',
  'evidence',
  'finding',
  'note',
  'activity',
  'system',
];

/** Human label for the REAL temporal source of each entry kind. */
export function timestampSourceLabel(category: TimelineCategory): string {
  switch (category) {
    case 'event':
      return 'Event time';
    case 'evidence':
      return 'Evidence collected';
    case 'finding':
      return 'Finding created';
    case 'note':
      return 'Note created';
    case 'activity':
      return 'Action time';
    case 'system':
      return 'Record time';
  }
}

/** Deterministic ascending comparison; undated (null) rows sort LAST. */
export function compareTimelineAsc(a: TimelineRow, b: TimelineRow): number {
  const aRank = a.timestamp === null ? 1 : 0;
  const bRank = b.timestamp === null ? 1 : 0;
  if (aRank !== bRank) return aRank - bRank;
  if (a.timestamp !== b.timestamp) {
    if (a.timestamp === null) return 0;
    if (b.timestamp === null) return 1;
    const cmp = a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
    if (cmp !== 0) return cmp;
  }
  const cat = TIMELINE_CATEGORY_ORDER.indexOf(a.category) - TIMELINE_CATEGORY_ORDER.indexOf(b.category);
  if (cat !== 0) return cat;
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface TimelineGroup {
  /** YYYY-MM-DD for dated groups, null for the "Time unavailable" group. */
  date: string | null;
  label: string;
  entries: TimelineRow[];
}

/** Group rows by day (ascending). Undated rows form the final group. */
export function groupTimelineRows(rows: TimelineRow[]): TimelineGroup[] {
  const sorted = [...rows].sort(compareTimelineAsc);
  const groups: TimelineGroup[] = [];
  for (const row of sorted) {
    const date = row.timestamp ? row.timestamp.slice(0, 10) : null;
    const label = row.timestamp ? formatDate(row.timestamp) : 'Time unavailable';
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.entries.push(row);
    } else {
      groups.push({ date, label, entries: [row] });
    }
  }
  // The undated group must always land AFTER the dated stream.
  return [...groups.filter((g) => g.date !== null), ...groups.filter((g) => g.date === null)];
}

/** A grounded "Evidence collected" timeline row from the workspace slice. */
export function evidenceTimelineRow(evidence: InvestigationEvidence): TimelineRow {
  return {
    id: `tl-ev-${evidence.evidence_id || evidence.id}`,
    category: 'evidence',
    timestamp: evidence.collected_at,
    title: evidence.title,
    description: evidence.summary ?? null,
    refId: evidence.evidence_id || evidence.id,
    refType: 'evidence',
    actor: evidence.linked_by,
  };
}

export interface UnifiedTimelineSlices {
  investigationId: string;
  timeline: InvestigationTimelineItem[];
  activity: InvestigationActivityEntry[];
  findings: InvestigationFinding[];
  evidence: InvestigationEvidence[];
}

/**
 * Merge the investigation feed, action log, findings and evidence slice into
 * ONE deterministic stream. Findings and evidence feed entries are excluded —
 * they are rendered from their dedicated slices exactly once.
 */
export function buildUnifiedTimeline(slices: UnifiedTimelineSlices): TimelineRow[] {
  const rows: TimelineRow[] = [
    ...slices.timeline
      .filter((t) => t.category !== 'finding' && t.category !== 'evidence')
      .map((t): TimelineRow => ({
        id: t.id,
        category: t.category as TimelineCategory,
        timestamp: t.timestamp,
        title: t.title,
        description: t.description,
        refId: t.ref_id,
        refType: t.ref_type,
        actor: t.actor,
      })),
    ...slices.activity.map((a): TimelineRow => ({
      id: a.id,
      category: 'activity',
      timestamp: a.at,
      title: a.title,
      description: a.detail,
      refId: null,
      refType: null,
      actor: a.actor,
    })),
    ...slices.findings.map((f): TimelineRow => ({
      id: f.id,
      category: 'finding',
      timestamp: f.created_at,
      title: f.title,
      description: f.description,
      refId: f.id,
      refType: 'finding',
      actor: f.created_by,
    })),
    ...slices.evidence.map((e) => evidenceTimelineRow(e)),
  ];
  return rows;
}

export interface FindingTimelineSlices {
  timeline: InvestigationTimelineItem[];
  events: InvestigationEvent[];
  evidence: InvestigationEvidence[];
}

/**
 * Grounded timeline rows for a finding:
 *  - evidence rows from the finding's persisted evidence refs, and
 *  - event rows whose canonical event (by id) shares an entity with the
 *    finding — ONLY when the events slice actually carries entity ids.
 * Rows that cannot be grounded against persisted references are omitted so
 * the panel never invents association.
 */
export function relevantTimelineForFinding(
  finding: InvestigationFinding,
  slices: FindingTimelineSlices,
): TimelineRow[] {
  const rows: TimelineRow[] = [];

  for (const ref of finding.evidence_ids) {
    const ev = slices.evidence.find((e) => e.id === ref || e.evidence_id === ref);
    if (ev) rows.push(evidenceTimelineRow(ev));
  }

  if (slices.events.length > 0) {
    const findingEntities = new Set(finding.entity_ids);
    for (const t of slices.timeline) {
      if (t.category !== 'event' || !t.ref_id) continue;
      const event = slices.events.find((e) => e.id === t.ref_id);
      if (!event) continue;
      const sharesEntity = (event.entity_ids ?? []).some((id) => findingEntities.has(id));
      if (!sharesEntity) continue;
      rows.push({
        id: t.id,
        category: 'event',
        timestamp: t.timestamp,
        title: t.title,
        description: t.description,
        refId: t.ref_id,
        refType: 'event',
        actor: t.actor,
      });
    }
  }

  return rows.sort(compareTimelineAsc);
}