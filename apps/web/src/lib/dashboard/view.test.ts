/**
 * Phase B — dashboard derive tests.
 *
 * The API-mode dashboard view is derived purely from the real workspace; these
 * tests pin the derive functions so derivations stay deterministic and honest
 * (no invented review counts, no fabricated temporal fields).
 */

import {
  deriveActiveInvestigations,
  deriveActivity,
  deriveActivitySeries,
  deriveImportantEntities,
  deriveMetrics,
  deriveNetwork,
  derivePatterns,
  deriveRecentFindings,
  deriveView,
  openStatus,
  relativeAgo,
} from '@/lib/dashboard/view';
import type { MappedWorkspace } from '@/lib/api/adapter';
import type { Investigation } from '@trinetra-pulse/types';

const DAY_MS = 86_400_000;
const iso = (offsetMs: number) => new Date(ANCHOR + offsetMs).toISOString();

// Fixed anchor (UTC midnight) so relative time / day bucketing is
// deterministic — whole-day offsets land on exact day buckets.
const ANCHOR = Date.UTC(2026, 1, 1, 0, 0, 0);

function workspaceFixture(): MappedWorkspace {
  return {
    investigation: {
      id: 'inv-real-1',
      title: 'Operation Real',
      description: 'A real investigation workspace.',
      status: 'active',
      priority: 'high',
      lead_investigator: 'Inspector Test',
      assigned: ['Inspector Test'],
      tags: ['real'],
      case_id: null,
      entity_count: 3,
      evidence_count: 2,
      relationship_count: 2,
      finding_count: 2,
      event_count: 2,
      created_at: iso(-30 * DAY_MS),
      updated_at: iso(-1 * DAY_MS),
      last_activity_at: iso(-1 * DAY_MS),
    },
    entities: [
      { id: 'e1', investigation_id: 'inv-real-1', entity_id: 'ent-1', name: 'Alpha', entity_type: 'person', association_confidence: 0.85, role: 'suspect', linked_by: 'Inspector Test', linked_at: iso(-2 * DAY_MS), metadata: {} },
      { id: 'e2', investigation_id: 'inv-real-1', entity_id: 'ent-2', name: 'Beta', entity_type: 'organization', association_confidence: 0.6, role: 'associate', linked_by: 'Inspector Test', linked_at: iso(-30 * DAY_MS), metadata: {} },
      { id: 'e3', investigation_id: 'inv-real-1', entity_id: 'ent-3', name: 'Gamma', entity_type: 'account', association_confidence: 0.5, role: 'associate', linked_by: 'Inspector Test', linked_at: iso(-5 * DAY_MS), metadata: {} },
    ],
    relationships: [
      { id: 'r1', investigation_id: 'inv-real-1', relationship_id: 'rel-1', source_entity_id: 'ent-1', target_entity_id: 'ent-2', source_entity_name: 'Alpha', target_entity_name: 'Beta', type: 'SENT_TRANSACTION', confidence: 0.9, linked_by: 'Inspector Test', linked_at: iso(-1 * DAY_MS) },
      { id: 'r2', investigation_id: 'inv-real-1', relationship_id: 'rel-2', source_entity_id: 'ent-1', target_entity_id: 'ent-3', source_entity_name: 'Alpha', target_entity_name: 'Gamma', type: 'PART_OF', confidence: 0.7, linked_by: 'Inspector Test', linked_at: iso(-2 * DAY_MS) },
    ],
    evidence: [
      { id: 'ev-1', investigation_id: 'inv-real-1', evidence_id: 'ev-1', title: 'Ledger sheet', evidence_type: 'document', summary: 'Ledger excerpt', linked_by: 'Inspector Test', linked_at: iso(-1 * DAY_MS), collected_at: iso(-1 * DAY_MS), metadata: {} },
      { id: 'ev-2', investigation_id: 'inv-real-1', evidence_id: 'ev-2', title: 'Call log', evidence_type: 'communication', summary: 'CDR', linked_by: 'Inspector Test', linked_at: iso(-3 * DAY_MS), collected_at: null, metadata: {} },
    ],
    findings: [
      { id: 'fnd-1', investigation_id: 'inv-real-1', title: 'Unexplained fund flow', description: 'Funds moved across accounts.', category: 'high', confidence: 'high', source: 'analytics', source_type: 'analysis', created_by: 'system', created_at: iso(-2 * DAY_MS), updated_at: iso(-2 * DAY_MS), entity_ids: ['ent-1', 'ent-3'], evidence_ids: ['ev-1'], tags: ['money', 'transfer'] },
      { id: 'fnd-2', investigation_id: 'inv-real-1', title: 'Cluster bridge', description: 'Alpha bridges two communities.', category: 'medium', confidence: 'medium', source: 'analytics', source_type: 'analysis', created_by: 'system', created_at: iso(-6 * DAY_MS), updated_at: iso(-6 * DAY_MS), entity_ids: ['ent-1', 'ent-2'], evidence_ids: [], tags: ['cluster', 'network'] },
    ],
    notes: [],
    events: [
      { id: 'evt-1', investigation_id: 'inv-real-1', title: 'Flagged transaction', description: null, occurred_at: iso(-3600_000), location: null, event_type: 'transaction', entity_ids: ['ent-1'], created_at: iso(-3600_000) },
      { id: 'evt-2', investigation_id: 'inv-real-1', title: 'Observed movement', description: null, occurred_at: iso(-3 * DAY_MS), location: 'Pune', event_type: 'movement', entity_ids: [], created_at: iso(-3 * DAY_MS) },
    ],
    timeline: [],
    activity: [
      { id: 'act-1', investigation_id: 'inv-real-1', type: 'created', title: 'Investigation created', detail: 'Case opened', actor: 'Inspector Test', at: iso(-30 * DAY_MS) },
      { id: 'act-2', investigation_id: 'inv-real-1', type: 'evidence_linked', title: 'Evidence added to investigation', detail: 'Ledger sheet linked', actor: 'Inspector Test', at: iso(-1 * DAY_MS) },
      { id: 'act-3', investigation_id: 'inv-real-1', type: 'network_linked', title: 'Network linked to investigation', detail: 'Graph attached', actor: 'Inspector Test', at: iso(-12 * 3600_000) },
      { id: 'act-4', investigation_id: 'inv-real-1', type: 'finding_created', title: 'Unexplained fund flow', detail: 'Anomaly detected', actor: 'system', at: iso(-2 * DAY_MS) },
    ],
    members: [],
    networks: [{ id: 'n1', investigation_id: 'inv-real-1', network_id: 'NET-REAL', name: 'Operation Real Graph', linked_by: 'Inspector Test', linked_at: iso(-1 * DAY_MS) }],
    analyticsSnapshots: [],
  };
}

function investigationFixture(id: string, status: Investigation['status'] = 'active'): Investigation {
  return {
    id,
    title: `Case ${id}`,
    description: null,
    status,
    priority: 'normal',
    lead_investigator: 'Inspector Test',
    assigned: [],
    tags: [],
    case_id: null,
    entity_count: 0,
    evidence_count: 0,
    relationship_count: 0,
    created_at: iso(-10 * DAY_MS),
    updated_at: iso(-1 * DAY_MS),
    last_activity_at: iso(-1 * DAY_MS),
  };
}

describe('relativeAgo', () => {
  it('formats bounded durations', () => {
    expect(relativeAgo(ANCHOR, iso(-30_000))).toBe('just now');
    expect(relativeAgo(ANCHOR, iso(-5 * 60_000))).toBe('5 minutes ago');
    expect(relativeAgo(ANCHOR, iso(-60 * 60_000))).toBe('1 hour ago');
    expect(relativeAgo(ANCHOR, iso(-25 * 3600_000))).toBe('1 day ago');
    expect(relativeAgo(ANCHOR, iso(-3 * DAY_MS))).toBe('3 days ago');
    expect(relativeAgo(ANCHOR, iso(-90 * DAY_MS))).toBe('3 months ago');
  });

  it('clamps future timestamps to just now', () => {
    expect(relativeAgo(ANCHOR, iso(60_000))).toBe('just now');
  });
});

describe('openStatus', () => {
  it('only closed and archived are not open', () => {
    for (const s of ['draft', 'active', 'under_review', 'suspended'] as const) {
      expect(openStatus(s)).toBe(true);
    }
    expect(openStatus('closed')).toBe(false);
    expect(openStatus('archived')).toBe(false);
  });
});

describe('deriveActiveInvestigations', () => {
  it('reports open investigations with a zero review count in API mode', () => {
    // API-mode honesty: no fabricated review queue.
    const list = [
      investigationFixture('inv-1', 'active'),
      investigationFixture('inv-2', 'under_review'),
      investigationFixture('inv-3', 'closed'),
      investigationFixture('inv-4', 'archived'),
    ];
    const open = deriveActiveInvestigations(list);
    expect(open.map((i) => i.id)).toEqual(['inv-1', 'inv-2']);
    for (const item of open) {
      expect(item.lead_investigator).toBe('Inspector Test');
      expect(item.reviewCount).toBe(0);
    }
  });
});

describe('deriveMetrics', () => {
  it('counts real workspace slices and the passed cluster count', () => {
    const ws = workspaceFixture();
    const list = [investigationFixture('inv-1', 'active'), investigationFixture('inv-2', 'closed')];
    const m = deriveMetrics(ws, list, 2);
    expect(m.entities.value).toBe(3);
    expect(m.relationships.value).toBe(2);
    expect(m.events.value).toBe(2);
    expect(m.findings.value).toBe(2);
    expect(m.evidenceItems.value).toBe(2);
    expect(m.clusters.value).toBe(2);
    expect(m.activeInvestigations.value).toBe(1);
    expect(m.suspiciousPatterns.value).toBe(2);
  });
});

describe('deriveNetwork', () => {
  it('lays out real nodes/edges and derives cluster stats', () => {
    const ws = workspaceFixture();
    const net = deriveNetwork(ws);
    expect(net.nodes).toHaveLength(3);
    expect(net.edges).toHaveLength(2);
    expect(net.communityCount).toBe(1);
    expect(net.connectedComponents).toBe(1);
    expect(net.averageDegree).toBeCloseTo(4 / 3);
    for (const node of net.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0.03);
      expect(node.x).toBeLessThanOrEqual(0.97);
      expect(node.y).toBeGreaterThanOrEqual(0.03);
      expect(node.y).toBeLessThanOrEqual(0.97);
    }
  });
});

describe('deriveRecentFindings', () => {
  it('sorts by created_at descending and resolves entity names', () => {
    const ws = workspaceFixture();
    const findings = deriveRecentFindings(ws, ANCHOR);
    expect(findings.map((f) => f.id)).toEqual(['fnd-1', 'fnd-2']);
    expect(findings[0].entities.map((e) => e.name)).toEqual(['Alpha', 'Gamma']);
    expect(findings[0].confidence).toBe(0.9);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].type).toBe('relationship'); // tags money/transfer
    expect(findings[1].type).toBe('network'); // tags cluster/network
  });
});

describe('deriveImportantEntities', () => {
  it('ranks by degree, keeps only connected entities, derives centrality', () => {
    const ws = workspaceFixture();
    const list = deriveImportantEntities(ws, ANCHOR);
    expect(list.map((e) => e.id)).toEqual(['ent-1', 'ent-2', 'ent-3']);
    expect(list[0].connections).toBe(2);
    expect(list[0].centrality).toBe(1);
    expect(list[0].centralityLabel).toBe('Very High');
    expect(list[0].activityStatus).toBe('active');
    expect(list[1].activityStatus).toBe('inactive');
    expect(list[2].activityStatus).toBe('recent');
  });
});

describe('derivePatterns', () => {
  it('presents findings as new suspicious patterns', () => {
    const ws = workspaceFixture();
    const patterns = derivePatterns(ws, ANCHOR);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].status).toBe('new');
    expect(patterns[0].type).toBe('transaction_anomaly'); // money transfer tags
    expect(patterns[0].typeLabel).toBe('Transaction Anomaly');
    expect(patterns[0].entityCount).toBe(2);
    expect(patterns[0].metrics.Confidence).toBe('90%');
  });
});

describe('deriveActivity', () => {
  it('maps activity records to the feed contract', () => {
    const ws = workspaceFixture();
    const feed = deriveActivity(ws, ANCHOR);
    const byType = new Map(feed.map((a) => [a.reference.type, a]));
    expect(byType.get('case')?.action).toBe('created');
    expect(byType.get('evidence')?.action).toBe('evidence_added');
    expect(byType.get('network')?.action).toBe('network_expanded');
    expect(byType.get('pattern')?.action).toBe('pattern_detected');
    expect(feed.every((a) => a.timeAgo !== '')).toBe(true);
  });

  it('falls back to the timeline when activity is empty', () => {
    const ws = workspaceFixture();
    ws.activity = [];
    ws.timeline = [
      { id: 'tl-1', investigation_id: 'inv-real-1', timestamp: iso(-3600_000), category: 'activity', title: 'Manual update', description: null, ref_id: null, ref_type: null, actor: 'Inspector Test' },
    ];
    const feed = deriveActivity(ws, ANCHOR);
    expect(feed).toHaveLength(1);
    expect(feed[0].action).toBe('updated');
    expect(feed[0].user).toBe('Inspector Test');
  });

  it('truncates over-long titles without mutating', () => {
    const ws = workspaceFixture();
    ws.activity = [
      { id: 'act-long', investigation_id: 'inv-real-1', type: 'note_created', title: 'A very long note title that exceeds the display truncation limit', detail: 'note', actor: 'Inspector Test', at: iso(-60_000) },
    ];
    const feed = deriveActivity(ws, ANCHOR);
    expect(feed[0].reference.label.length).toBeLessThanOrEqual(25);
    expect(feed[0].reference.label.endsWith('…')).toBe(true);
  });
});

describe('deriveActivitySeries', () => {
  it('buckets events, relationships and patterns into the trailing 7 days', () => {
    const ws = workspaceFixture();
    const series = deriveActivitySeries(ws, ANCHOR);
    expect(series.data).toHaveLength(7);
    // Whole-series sums are timezone-independent.
    expect(series.totalEvents).toBe(2);
    expect(series.totalRelationships).toBe(2);
    expect(series.data.reduce((s, d) => s + d.events, 0)).toBe(2);
    expect(series.data.reduce((s, d) => s + d.relationships, 0)).toBe(2);
    expect(series.data.reduce((s, d) => s + d.patterns, 0)).toBe(2);
    // The most recent event sits in today's bucket (index 6), which is
    // timezone-exact; older entries distribute across the remaining buckets.
    expect(series.data[6].events).toBe(1);
    for (const point of series.data) {
      expect(point.events).toBeGreaterThanOrEqual(0);
      expect(point.relationships).toBeGreaterThanOrEqual(0);
      expect(point.patterns).toBeGreaterThanOrEqual(0);
      expect(point.label.length).toBeGreaterThan(0);
    }
  });
});

describe('deriveView', () => {
  it('assembles a grounded, non-demo view', () => {
    const ws = workspaceFixture();
    const list = [investigationFixture('inv-1', 'active'), investigationFixture('inv-2', 'closed')];
    const view = deriveView(ws, { allInvestigations: list, anchorMs: ANCHOR });
    expect(view.meta.investigationId).toBe('inv-real-1');
    expect(view.meta.networkId).toBe('NET-REAL');
    expect(view.meta.investigationTitle).toBe('Operation Real');
    expect(view.meta.isDemo).toBe(false);
    expect(view.recentFindings).toHaveLength(2);
    expect(view.patterns).toHaveLength(2);
    expect(view.activeInvestigations).toHaveLength(1);
    expect(view.activitySeries.period).toBe('Past 7 days');
  });
});