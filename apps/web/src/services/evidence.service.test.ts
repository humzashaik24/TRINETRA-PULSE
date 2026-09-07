import {
  listEvidence,
  getEvidence,
  getEvidenceForEntity,
  getEvidenceForRelationship,
  getEvidenceForFinding,
  getEvidenceForEvent,
  getEvidenceProvenance,
  getEvidenceCoverage,
  getInvestigationEvidenceCoverage,
  getRelationshipEvidenceSupport,
  getAllRelationshipEvidenceSupport,
  getFindingEvidenceSupport,
  getAllFindingEvidenceSupport,
  getEventEvidenceSupport,
  getEntityEvidenceSummary,
  getEvidenceCollections,
  searchEvidence,
  retrieveEvidence,
} from './evidence.service';

// ============================================================
// EVIDENCE SERVICE TESTS (Phase 12)
// ============================================================
// The service reads from a mutable store seeded from mock data.
// Most reads are deterministic; we restore nothing because these
// tests do not mutate. run in jest.
// ============================================================

const INV = 'inv-006';

describe('evidence.service — listEvidence', () => {
  it('scopes results to an investigation', async () => {
    const result = await listEvidence({ investigationId: INV });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.investigationId).toBe(INV);
    }
  });

  it('returns all seeded demo evidence items for inv-006', async () => {
    const result = await listEvidence({ investigationId: INV, pageSize: 100 });
    expect(result.total).toBe(32);
    expect(result.items).toHaveLength(32);
    expect(result.totalPages).toBe(1);
  });

  it('filters by type', async () => {
    const result = await listEvidence({ investigationId: INV, evidenceTypes: ['FIR'], pageSize: 100 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.evidenceType).toBe('FIR');
    expect(result.facets.evidenceTypes.FIR).toBe(result.total);
  });

  it('filters by status', async () => {
    const result = await listEvidence({ investigationId: INV, statuses: ['VERIFIED'], pageSize: 100 });
    for (const item of result.items) expect(item.status).toBe('VERIFIED');
  });

  it('filters by entityIds', async () => {
    const result = await listEvidence({ investigationId: INV, entityIds: ['ent-person-001'], pageSize: 100 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.entityIds).toContain('ent-person-001');
    }
  });

  it('filters by findingIds', async () => {
    const result = await listEvidence({ investigationId: INV, findingIds: ['inf-006-1'], pageSize: 100 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.findingIds).toContain('inf-006-1');
  });

  it('filters by eventIds', async () => {
    const result = await listEvidence({ investigationId: INV, eventIds: ['event-002'], pageSize: 100 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.eventIds).toContain('event-002');
  });

  it('sorts by observedAt descending by default', async () => {
    const result = await listEvidence({ investigationId: INV, sortBy: 'observedAt', sortOrder: 'desc', pageSize: 100 });
    const times = result.items.map((i) => new Date(i.observedAt).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it('paginates results', async () => {
    const result = await listEvidence({ investigationId: INV, page: 1, pageSize: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.totalPages).toBe(Math.ceil(result.total / 5));
    expect(result.page).toBe(1);
  });

  it('fails closed when investigation scoping is applied', async () => {
    const result = await listEvidence({ investigationId: 'inv-999' });
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('evidence.service — single item + provenance', () => {
  it('gets a known item', async () => {
    const item = await getEvidence('ev-intel-001');
    expect(item.id).toBe('ev-intel-001');
    expect(item.evidenceType).toBe('FIR');
    expect(item.isDemoData).toBe(true);
  });

  it('throws for unknown item', async () => {
    await expect(getEvidence('ev-intel-999')).rejects.toThrow('Evidence not found');
  });

  it('returns provenance for an item', async () => {
    const prov = await getEvidenceProvenance('ev-intel-001');
    expect(prov.source).toBeTruthy();
    expect(prov.observedAt).toBeTruthy();
  });
});

describe('evidence.service — link lookups', () => {
  it('returns evidence for an entity, newest first', async () => {
    const items = await getEvidenceForEntity('ent-person-001');
    expect(items.length).toBeGreaterThan(0);
    const times = items.map((i) => new Date(i.observedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('returns evidence for a relationship', async () => {
    const items = await getEvidenceForRelationship('rel-001');
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns evidence for a finding', async () => {
    const items = await getEvidenceForFinding('inf-006-1');
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns evidence for an event', async () => {
    const items = await getEvidenceForEvent('event-002');
    expect(items.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown relationship', async () => {
    const items = await getEvidenceForRelationship('rel-999');
    expect(items).toHaveLength(0);
  });
});

describe('evidence.service — coverage + support', () => {
  it('returns coverage for a known target', async () => {
    const coverage = await getEvidenceCoverage('inf-006-1');
    expect(coverage?.targetId).toBe('inf-006-1');
  });

  it('returns investigation coverage', async () => {
    const coverage = await getInvestigationEvidenceCoverage(INV);
    expect(coverage.length).toBeGreaterThan(0);
  });

  it('returns relationship support for a link', async () => {
    const support = await getRelationshipEvidenceSupport('rel-001');
    expect(support?.relationshipId).toBe('rel-001');
    expect(support?.evidenceIds.length).toBeGreaterThan(0);
  });

  it('returns all relationship support for an investigation', async () => {
    const support = await getAllRelationshipEvidenceSupport(INV);
    expect(support.length).toBeGreaterThan(0);
  });

  it('returns finding support', async () => {
    const support = await getFindingEvidenceSupport('inf-006-1');
    expect(support?.findingId).toBe('inf-006-1');
    expect(support?.evidenceItems.length).toBeGreaterThan(0);
    for (const item of support!.evidenceItems) expect(item.relevance).toBeGreaterThan(0);
  });

  it('returns all finding support for an investigation', async () => {
    const support = await getAllFindingEvidenceSupport(INV);
    expect(support.length).toBeGreaterThan(0);
  });

  it('returns event support for an event', async () => {
    const support = await getEventEvidenceSupport('event-002');
    expect(support?.eventId).toBe('event-002');
  });

  it('returns an entity evidence summary', async () => {
    const summary = await getEntityEvidenceSummary('ent-person-001');
    expect(summary?.entityId).toBe('ent-person-001');
    expect(summary?.evidenceCount).toBeGreaterThan(0);
  });

  it('returns collections scoped to the investigation', async () => {
    const collections = await getEvidenceCollections(INV);
    for (const c of collections) expect(c.investigationId).toBe(INV);
  });
});

describe('evidence.service — search alias', () => {
  it('aliases listEvidence', async () => {
    const result = await searchEvidence({ investigationId: INV, query: 'FIR' });
    expect(result.total).toBeGreaterThan(0);
  });
});

describe('evidence.service — retrieveEvidence', () => {
  it('retrieves evidence grounded in the investigation', async () => {
    const result = await retrieveEvidence({
      query: '',
      investigationId: INV,
      scope: {},
    });
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.truncated).toBe(true);
    for (const e of result.evidence) expect(e.investigationId).toBe(INV);
  });

  it('respects the budget', async () => {
    const result = await retrieveEvidence({
      query: '',
      investigationId: INV,
      scope: {},
      budget: { maxEvidenceItems: 3 },
    });
    expect(result.evidence).toHaveLength(3);
    expect(result.truncated).toBe(true);
    expect(result.retrievalBudget.maxEvidenceItems).toBe(3);
  });

  it('does not truncate when results fit the budget', async () => {
    const result = await retrieveEvidence({
      query: 'FIR',
      investigationId: INV,
      scope: {},
      budget: { maxEvidenceItems: 20 },
    });
    const firCount = result.evidence.filter((e) => e.evidenceType === 'FIR').length;
    expect(firCount).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
  });

  it('filters by scope entity', async () => {
    const result = await retrieveEvidence({
      query: '',
      investigationId: INV,
      scope: { entityIds: ['ent-person-001'] },
    });
    for (const e of result.evidence) expect(e.entityIds).toContain('ent-person-001');
  });

  it('returns no evidence for an unknown investigation', async () => {
    const result = await retrieveEvidence({
      query: '',
      investigationId: 'inv-404',
      scope: {},
    });
    expect(result.evidence).toHaveLength(0);
    expect(result.truncated).toBe(false);
  });
});
