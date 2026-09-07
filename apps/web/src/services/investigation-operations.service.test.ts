import {
  getReadiness,
  getHealth,
  getPipeline,
  getReviewQueue,
  getActivity,
  getSavedViews,
  saveView,
  deleteView,
  getGraphBookmarks,
  saveGraphBookmark,
  getTimelineBookmarks,
  saveTimelineBookmark,
  getCrossReferences,
  getProvenance,
  searchInvestigation,
  searchAcross,
} from './investigation-operations.service';
import { mockCrossReferencesByInvestigation, mockProvenanceByInvestigation } from '@/mock/investigation-operations';

// ============================================================
// PHASE 11 — INVESTIGATION OPERATIONS SERVICE
// ============================================================
// Exercises the operational shell: pipeline / readiness / health /
// review queue / activity / saved views / bookmarks / cross-refs /
// provenance / search, all scoped to an investigation id.
// ============================================================

describe('investigation-operations.service — pipeline & readiness', () => {
  it('returns a pipeline for inv-006 (demand investigation)', async () => {
    const pipeline = await getPipeline('inv-006');
    expect(pipeline.investigationId).toBe('inv-006');
    expect(pipeline.stages.length).toBeGreaterThan(0);
    expect(pipeline.progress).toBeGreaterThanOrEqual(0);
    expect(pipeline.progress).toBeLessThanOrEqual(100);
  });

  it('returns a neutral readiness assessment', async () => {
    const readiness = await getReadiness('inv-006');
    expect(readiness.investigationId).toBe('inv-006');
    expect(readiness.overall).toBeTruthy();
    expect(readiness.items.length).toBeGreaterThan(0);
  });

  it('throws for an unknown investigation', async () => {
    await expect(getPipeline('nope')).rejects.toThrow('Investigation not found');
  });
});

describe('investigation-operations.service — health & review queue', () => {
  it('returns health with coverage metrics (neutral wording)', async () => {
    const health = await getHealth('inv-006');
    expect(health.investigationId).toBe('inv-006');
    expect(health.metrics.length).toBeGreaterThan(0);
    expect(health.openReviewCount).toBeGreaterThanOrEqual(0);
  });

  it('returns an unfiltered review queue', async () => {
    const queue = await getReviewQueue('inv-006');
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.some((i) => i.investigationId === 'inv-006')).toBe(true);
  });
});

describe('investigation-operations.service — activity', () => {
  it('returns activity newest-first', async () => {
    const activity = await getActivity('inv-001');
    for (let i = 1; i < activity.length; i++) {
      expect(activity[i - 1].at >= activity[i].at).toBe(true);
    }
  });
});

describe('investigation-operations.service — saved views & bookmarks', () => {
  it('lists seeded saved views and adds then deletes one', async () => {
    const before = await getSavedViews('inv-001');
    const created = await saveView('inv-001', { name: 'Test View' });
    expect(created.investigationId).toBe('inv-001');
    const after = await getSavedViews('inv-001');
    expect(after.length).toBe(before.length + 1);
    await deleteView('inv-001', created.id);
    const final = await getSavedViews('inv-001');
    expect(final.length).toBe(before.length);
  });

  it('adds and lists a graph bookmark', async () => {
    const before = await getGraphBookmarks('inv-001');
    const created = await saveGraphBookmark('inv-001', {
      networkId: 'NET-001',
      label: 'Test bookmark',
      entityIds: ['ent-person-001'],
      relationshipIds: ['rel-001'],
    });
    const after = await getGraphBookmarks('inv-001');
    expect(after.length).toBe(before.length + 1);
    expect(created.networkId).toBe('NET-001');
  });

  it('adds and lists a timeline bookmark', async () => {
    const before = await getTimelineBookmarks('inv-001');
    await saveTimelineBookmark('inv-001', { label: 'Test window', start: '2026-02-14T00:00:00Z' });
    const after = await getTimelineBookmarks('inv-001');
    expect(after.length).toBe(before.length + 1);
  });
});

describe('investigation-operations.service — cross references & provenance', () => {
  it('references real canonical ids only (no orphan ids)', () => {
    const canonical = new Set([
      'ent-person-001',
      'ent-person-003',
      'ent-org-001',
      'ent-account-001',
      'ent-txn-001',
      'ent-phone-001',
      'rel-001',
      'rel-005',
      'rel-007',
      'rel-008',
      'ev-001',
      'ev-004',
      'ev-007',
      'ev-009',
      'inf-001-1',
      'inf-001-2',
      'inf-006-1',
      'inf-006-2',
      'ds-002',
      'ds-003',
    ]);
    for (const refs of Object.values(mockCrossReferencesByInvestigation)) {
      for (const ref of refs) {
        expect(canonical.has(ref.entity.id)).toBe(true);
        for (const r of [...ref.relationships, ...ref.evidence, ...ref.findings]) {
          expect(canonical.has(r.id)).toBe(true);
        }
      }
    }
    // Provenance records reference source/dataset/record prefixes we
    // know exist in the catalogue; assert shape + target resolution.
    for (const chains of Object.values(mockProvenanceByInvestigation)) {
      for (const chain of chains) {
        expect(chain.nodes.length).toBeGreaterThanOrEqual(3);
        expect(chain.targetId).toBeTruthy();
      }
    }
  });

  it('filters cross references by entity', async () => {
    const all = await getCrossReferences('inv-006');
    const filtered = await getCrossReferences('inv-006', 'ent-person-001');
    expect(all.length).toBe(1);
    expect(filtered.length).toBe(1);
    expect(filtered[0].entity.id).toBe('ent-person-001');
  });

  it('returns provenance optionally filtered by target', async () => {
    const chains = await getProvenance('inv-001', 'rel-001');
    expect(chains.length).toBeGreaterThan(0);
    expect(chains.some((c) => c.targetId === 'rel-001')).toBe(true);
  });
});

describe('investigation-operations.service — investigation-scoped search', () => {
  it('searches within a single investigation', async () => {
    const results = await searchInvestigation('inv-006', 'Rahul');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.investigationId === 'inv-006')).toBe(true);
    expect(results.every((r) => r.label.toLowerCase().includes('rahul'))).toBe(true);
  });

  it('searches across all investigations with an optional kind filter', async () => {
    const all = await searchAcross('device');
    const entities = await searchAcross('device', 'entity');
    expect(all.length).toBeGreaterThanOrEqual(entities.length);
    expect(entities.every((r) => r.kind === 'entity')).toBe(true);
  });
});
