/**
 * Unit tests for lib/timeline.ts — the shared investigation-timeline
 * semantics (Phase 29).
 *
 * Verifies the ordering contract both the timeline tab and the finding
 * detail panel rely on:
 *  - rows sort ASCENDING by their real temporal field, undated rows LAST,
 *  - groupTimelineRows groups by day with the honest "Time unavailable"
 *    group trailing the dated stream,
 *  - buildUnifiedTimeline merges feed + activity + findings + evidence and
 *    never duplicates findings/evidence feed entries,
 *  - relevantTimelineForFinding only grounds rows against persisted
 *    references (evidence_ids / entity intersection).
 */

import {
  compareTimelineAsc,
  groupTimelineRows,
  buildUnifiedTimeline,
  evidenceTimelineRow,
  timestampSourceLabel,
  relevantTimelineForFinding,
  type TimelineRow,
} from '@/lib/timeline';
import type {
  InvestigationActivityEntry,
  InvestigationEvidence,
  InvestigationEvent,
  InvestigationFinding,
  InvestigationTimelineItem,
} from '@trinetra-pulse/types';

const eventRow = (over: Partial<TimelineRow> = {}): TimelineRow => ({
  id: 'e-1',
  category: 'event',
  timestamp: '2026-02-14T11:05:00Z',
  title: 'Transfer',
  description: null,
  refId: 'event-002',
  refType: 'event',
  actor: null,
  ...over,
});

describe('compareTimelineAsc', () => {
  it('sorts ascending by timestamp', () => {
    const rows = [
      eventRow({ id: 'later', timestamp: '2026-02-20T00:00:00Z' }),
      eventRow({ id: 'earlier', timestamp: '2026-02-01T00:00:00Z' }),
      eventRow({ id: 'middle', timestamp: '2026-02-10T00:00:00Z' }),
    ];
    expect(rows.sort(compareTimelineAsc).map((r) => r.id)).toEqual(['earlier', 'middle', 'later']);
  });

  it('places undated rows last, deterministically', () => {
    const rows = [
      eventRow({ id: 'undated-a', timestamp: null }),
      eventRow({ id: 'undated-b', timestamp: null }),
      eventRow({ id: 'dated', timestamp: '2026-02-14T11:05:00Z' }),
    ];
    const sorted = rows.sort(compareTimelineAsc);
    expect(sorted[0].id).toBe('dated');
    expect(sorted[1].id).toBe('undated-a');
    expect(sorted[2].id).toBe('undated-b');
  });

  it('breaks timestamp ties by category order, then title', () => {
    const rows = [
      eventRow({ id: 'sys', category: 'system', title: 'Created', timestamp: '2026-08-18T09:00:00Z' }),
      eventRow({ id: 'act', category: 'activity', title: 'Action', timestamp: '2026-08-18T09:00:00Z' }),
    ];
    const sorted = rows.sort(compareTimelineAsc);
    expect(sorted.map((r) => r.id)).toEqual(['act', 'sys']);
  });
});

describe('groupTimelineRows', () => {
  it('groups by day ascending and trails the undated group', () => {
    const rows = [
      eventRow({ id: 'd1', timestamp: '2026-02-19T18:40:00Z' }),
      eventRow({ id: 'u1', timestamp: null }),
      eventRow({ id: 'd0', timestamp: '2026-02-05T09:00:00Z' }),
    ];
    const groups = groupTimelineRows(rows);
    expect(groups.map((g) => g.date)).toEqual(['2026-02-05', '2026-02-19', null]);
    expect(groups[2].label).toBe('Time unavailable');
    expect(groups[0].entries.map((r) => r.id)).toEqual(['d0']);
  });
});

describe('timestampSourceLabel', () => {
  it('labels the REAL temporal source per category', () => {
    expect(timestampSourceLabel('event')).toBe('Event time');
    expect(timestampSourceLabel('evidence')).toBe('Evidence collected');
    expect(timestampSourceLabel('finding')).toBe('Finding created');
    expect(timestampSourceLabel('note')).toBe('Note created');
    expect(timestampSourceLabel('activity')).toBe('Action time');
    expect(timestampSourceLabel('system')).toBe('Record time');
  });
});

describe('evidenceTimelineRow', () => {
  it('builds a grounded evidence row from the collected_at field', () => {
    const evidence: InvestigationEvidence = {
      id: 'inev-006-1',
      evidence_id: 'ev-001',
      investigation_id: 'inv-006',
      title: 'FIR record',
      evidence_type: 'document',
      summary: 'Canonical scan.',
      linked_by: 'Inspector Mehta',
      linked_at: '2026-08-18T09:15:00Z',
      collected_at: '2026-08-12T14:18:00Z',
      metadata: {},
    };
    const row = evidenceTimelineRow(evidence);
    expect(row.category).toBe('evidence');
    expect(row.timestamp).toBe('2026-08-12T14:18:00Z');
    expect(row.refId).toBe('ev-001');
    expect(row.refType).toBe('evidence');
    expect(row.title).toBe('FIR record');
  });
});

describe('buildUnifiedTimeline', () => {
  const timeline: InvestigationTimelineItem[] = [
    {
      id: 'tl-evt-1', investigation_id: 'inv-006', timestamp: '2026-02-14T11:05:00Z',
      category: 'event', title: 'Transfer', description: null, ref_id: 'event-002', ref_type: 'event', actor: null,
    },
    {
      id: 'tl-fnd-1', investigation_id: 'inv-006', timestamp: '2026-02-16T10:00:00Z',
      category: 'finding', title: 'Finding (feed)', description: null, ref_id: 'inf-1', ref_type: 'finding', actor: null,
    },
    {
      id: 'tl-ev-1', investigation_id: 'inv-006', timestamp: '2026-02-17T10:00:00Z',
      category: 'evidence', title: 'Evidence (feed)', description: null, ref_id: 'ev-1', ref_type: 'evidence', actor: null,
    },
  ];
  const activity: InvestigationActivityEntry[] = [
    {
      id: 'ina-1', investigation_id: 'inv-006', type: 'created', title: 'Created', detail: 'opened',
      actor: 'Inspector Mehta', at: '2026-08-18T09:00:00Z',
    },
  ];
  const findings: InvestigationFinding[] = [
    {
      id: 'inf-1', investigation_id: 'inv-006', title: 'Finding (slice)', description: 'd',
      category: 'association', confidence: 'high', source: 'graph', source_type: 'analysis',
      created_by: 'Analyst Singh', created_at: '2026-02-16T10:00:00Z', updated_at: '2026-02-16T10:00:00Z',
      entity_ids: ['ent-person-001'], evidence_ids: ['evin-1'], tags: [],
    },
  ];
  const evidence: InvestigationEvidence[] = [
    {
      id: 'ev-1', evidence_id: 'ev-1', investigation_id: 'inv-006', title: 'Evidence (slice)',
      evidence_type: 'document', summary: 's', linked_by: 'Mehta', linked_at: '2026-08-18T09:00:00Z',
      collected_at: '2026-02-17T10:00:00Z', metadata: {},
    },
  ];

  it('merges feed, activity, findings and evidence into one stream', () => {
    const rows = buildUnifiedTimeline({
      investigationId: 'inv-006',
      timeline,
      activity,
      findings,
      evidence,
    });
    expect(rows).toHaveLength(4);
    // Finding/evidence feed entries are excluded (rendered from slices).
    expect(rows.some((r) => r.title === 'Finding (feed)')).toBe(false);
    expect(rows.some((r) => r.title === 'Evidence (feed)')).toBe(false);
    // The slice-sourced rows are present exactly once.
    expect(rows.some((r) => r.title === 'Finding (slice)')).toBe(true);
    expect(rows.some((r) => r.title === 'Evidence (slice)')).toBe(true);
  });
});

describe('relevantTimelineForFinding', () => {
  const eventFeed: InvestigationTimelineItem[] = [
    {
      id: 'tl-evt-1', investigation_id: 'inv-006', timestamp: '2026-02-14T11:05:00Z',
      category: 'event', title: 'Large transfer', description: null, ref_id: 'event-002', ref_type: 'event', actor: null,
    },
  ];
  const events: InvestigationEvent[] = [
    {
      id: 'event-002', investigation_id: 'inv-006', title: 'Large transfer executed',
      description: 'Transfer.', occurred_at: '2026-02-14T11:05:00Z', location: 'Pune',
      event_type: 'transaction', entity_ids: ['ent-txn-001', 'ent-account-001'],
      created_at: '2026-08-18T09:03:00Z',
    },
    {
      id: 'event-001', investigation_id: 'inv-006', title: 'Chennai meeting',
      description: 'Meeting.', occurred_at: '2026-02-19T18:40:00Z', location: 'Chennai',
      event_type: 'observation', entity_ids: ['ent-person-001'],
      created_at: '2026-08-18T09:03:00Z',
    },
  ];
  const evidence: InvestigationEvidence[] = [
    {
      id: 'evin-1', evidence_id: 'ev-004', investigation_id: 'inv-006', title: 'CDR records',
      evidence_type: 'communication', summary: 's', linked_by: 'Singh',
      linked_at: '2026-08-19T09:20:00Z', collected_at: '2026-08-19T09:20:00Z', metadata: {},
    },
  ];

  it('grounds evidence rows from the finding’s persisted evidence refs', () => {
    const finding: InvestigationFinding = {
      id: 'inf-1', investigation_id: 'inv-006', title: 'A', description: 'd',
      category: 'association', confidence: 'high', source: 'g', source_type: 'analysis',
      created_by: 'X', created_at: '2026-02-16T10:00:00Z', updated_at: '2026-02-16T10:00:00Z',
      entity_ids: ['ent-txn-001'], evidence_ids: ['evin-1'], tags: [],
    };
    const rows = relevantTimelineForFinding(finding, { timeline: eventFeed, events, evidence });
    expect(rows.some((r) => r.category === 'evidence' && r.refId === 'ev-004')).toBe(true);
    // Event feed resolves to event-002 which shares ent-txn-001 → grounded.
    expect(rows.some((r) => r.category === 'event' && r.refId === 'event-002')).toBe(true);
  });

  it('excludes event rows that share no entity with the finding', () => {
    const finding: InvestigationFinding = {
      id: 'inf-1', investigation_id: 'inv-006', title: 'A', description: 'd',
      category: 'association', confidence: 'high', source: 'g', source_type: 'analysis',
      created_by: 'X', created_at: '2026-02-16T10:00:00Z', updated_at: '2026-02-16T10:00:00Z',
      entity_ids: ['ent-person-003'], evidence_ids: [], tags: [],
    };
    const ungroundedFeed: InvestigationTimelineItem[] = [
      { ...eventFeed[0], ref_id: 'event-001' },
    ];
    const rows = relevantTimelineForFinding(finding, {
      timeline: ungroundedFeed,
      events,
      evidence,
    });
    expect(rows).toHaveLength(0);
  });

  it('returns evidence rows only when the events slice cannot ground entity ids', () => {
    const finding: InvestigationFinding = {
      id: 'inf-1', investigation_id: 'inv-006', title: 'A', description: 'd',
      category: 'association', confidence: 'high', source: 'g', source_type: 'analysis',
      created_by: 'X', created_at: '2026-02-16T10:00:00Z', updated_at: '2026-02-16T10:00:00Z',
      entity_ids: ['ent-txn-001'], evidence_ids: ['evin-1'], tags: [],
    };
    const rows = relevantTimelineForFinding(finding, { timeline: eventFeed, events: [], evidence });
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('evidence');
  });
});