import {
  retrieveEvidenceContext,
  buildEvidenceContextBundle,
  generateEvidenceSourceReferences,
} from './evidence-retrieval';

// ============================================================
// PHASE 12 — EVIDENCE RETRIEVAL TESTS (Grounded AI)
// ============================================================

const INV = 'inv-006';

describe('retrieveEvidenceContext', () => {
  it('returns sources grounded in the investigation', async () => {
    const result = await retrieveEvidenceContext({ query: '', investigationId: INV, scope: {} });
    expect(result.evidenceSources.length).toBeGreaterThan(0);
    for (const src of result.evidenceSources) {
      expect(src.sourceId).toBeTruthy();
      expect(src.references.length).toBeGreaterThan(0);
    }
  });

  it('flags truncation when the result exceeds the budget', async () => {
    const result = await retrieveEvidenceContext({ query: '', investigationId: INV, scope: {} });
    expect(result.truncated).toBe(true);
    expect(result.note).toMatch(/truncated/i);
  });

  it('does not fabricate sources on error — returns empty safely', async () => {
    const result = await retrieveEvidenceContext({
      query: '',
      investigationId: 'inv-404',
      scope: {},
    });
    expect(result.evidenceSources).toHaveLength(0);
    expect(result.truncated).toBe(false);
  });

  it('filters sources by type-relevant query', async () => {
    const result = await retrieveEvidenceContext({ query: 'FIR', investigationId: INV, scope: {} });
    expect(result.evidenceSources.length).toBeGreaterThan(0);
  });

  it('attaches references with provenance payloads', async () => {
    const result = await retrieveEvidenceContext({ query: 'FIR', investigationId: INV, scope: {} });
    const src = result.evidenceSources[0];
    const ref = src.references[0];
    expect(ref.sourceType).toBe('Evidence');
    expect(ref.payload?.isDemoData).toBe(true);
  });
});

describe('buildEvidenceContextBundle', () => {
  it('returns a context bundle with evidence sources', async () => {
    const bundle = await buildEvidenceContextBundle({
      query: '',
      investigationId: INV,
      scope: {},
    });
    expect(Array.isArray(bundle.evidence)).toBe(true);
    expect(bundle.evidence!.length).toBeGreaterThan(0);
    const first = bundle.evidence![0];
    expect(first.id).toBeTruthy();
    expect(first.evidenceType).toBeTruthy();
  });

  it('returns empty evidence array on scope with no matches', async () => {
    const bundle = await buildEvidenceContextBundle({
      query: '',
      investigationId: 'inv-404',
      scope: {},
    });
    expect(bundle.evidence).toHaveLength(0);
  });
});

describe('generateEvidenceSourceReferences', () => {
  it('generates references for known evidence ids', async () => {
    const refs = await generateEvidenceSourceReferences({
      evidenceIds: ['ev-intel-001'],
      query: 'FIR',
    });
    expect(refs).toHaveLength(1);
    expect(refs[0].sourceId).toBe('ev-intel-001');
    expect(refs[0].payload?.evidenceType).toBe('FIR');
  });

  it('skips unknown evidence ids gracefully', async () => {
    const refs = await generateEvidenceSourceReferences({
      evidenceIds: ['ev-intel-999'],
      query: 'test',
    });
    expect(refs).toHaveLength(0);
  });
});
