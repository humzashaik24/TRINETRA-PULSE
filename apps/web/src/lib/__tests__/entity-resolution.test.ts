import type { EntityCandidate } from '@trinetra-pulse/types';
import {
  bigramSimilarity,
  compareCandidates,
  editSimilarity,
  findPotentialMatches,
  nameSimilarity,
  tokenJaccard,
} from '../entity-resolution';

function candidate(over: Partial<EntityCandidate> & { id: string }): EntityCandidate {
  return {
    datasetId: 'ds-002',
    datasetName: 'CDR Extract',
    entityType: 'person',
    rawValue: over.rawValue ?? 'Rahul Kumar',
    normalizedValue: over.rawValue?.toLowerCase() ?? 'rahul kumar',
    displayValue: over.rawValue ?? 'Rahul Kumar',
    source: 'cdr_extract',
    sourceRecord: 'CDR-0042',
    confidence: 0.95,
    extractionMethod: 'STRUCTURED_MAPPING',
    attributes: {},
    status: 'PENDING',
    createdAt: '2026-08-24T10:15:00Z',
    ...over,
  };
}

describe('editSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(editSimilarity('rahul kumar', 'RAHUL KUMAR')).toBe(1);
  });

  it('is symmetric and bounded', () => {
    const s = editSimilarity('rahul', 'rahull');
    expect(s).toBeGreaterThan(0.7);
    expect(s).toBeLessThan(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(editSimilarity('', '')).toBe(1);
  });
});

describe('tokenJaccard', () => {
  it('returns 1 for identical token sets', () => {
    expect(tokenJaccard('Rahul Kumar', 'kumar rahul')).toBe(1);
  });

  it('returns 0 for disjoint sets', () => {
    expect(tokenJaccard('rahul kumar', 'priya sharma')).toBe(0);
  });
});

describe('bigramSimilarity', () => {
  it('is high for near-identical strings', () => {
    expect(bigramSimilarity('rahulkumar', 'rahul kumar')).toBeGreaterThan(0.8);
  });
});

describe('nameSimilarity', () => {
  it('uses the best-of composite', () => {
    expect(nameSimilarity('rahul kumar', 'Rahul Kumar')).toBeGreaterThan(0.9);
  });
});

describe('compareCandidates', () => {
  it('recommends MERGE for an exact person match', () => {
    const a = candidate({ id: 'cand-a', rawValue: 'Rahul Kumar', attributes: { phone: '+91 98765 43210', location: 'Pune' } });
    const b = candidate({ id: 'cand-b', rawValue: 'Rahul Kumar', attributes: { phone: '+91-98765-43210', location: 'Pune' } });
    const result = compareCandidates(a, b);
    expect(result.recommendation).toBe('MERGE');
    expect(result.state).toBe('PROBABLE');
    expect(result.similarity).toBeGreaterThan(0.9);
  });

  it('never auto-merges on weak overlap', () => {
    const a = candidate({ id: 'cand-c', rawValue: 'Rahul Kumar' });
    const b = candidate({ id: 'cand-d', rawValue: 'Priya Sharma' });
    const result = compareCandidates(a, b);
    expect(result.recommendation).toBe('KEEP_SEPARATE');
    expect(result.state).toBe('POSSIBLE');
  });

  it('reports conflicting signals for a same-phone/different-name match', () => {
    const a = candidate({
      id: 'cand-e',
      rawValue: 'Rahul Kumar',
      attributes: { phone: '+91 98765 43210', location: 'Pune' },
    });
    const b = candidate({
      id: 'cand-f',
      rawValue: 'Meera Reddy',
      attributes: { phone: '+91-98765-43210', location: 'Mumbai' },
    });
    const result = compareCandidates(a, b);
    expect(result.recommendation).toBe('KEEP_SEPARATE');
    expect(result.state).toBe('POSSIBLE');
    expect(result.signals.some((s) => s.id === 'shared_phone' && s.match)).toBe(true);
    expect(result.signals.some((s) => s.id === 'value_similarity' && s.match === false)).toBe(true);
  });

  it('treats different entity types as a mismatch', () => {
    const a = candidate({ id: 'cand-g', entityType: 'person', rawValue: 'Rahul Kumar' });
    const b = candidate({ id: 'cand-h', entityType: 'phone', rawValue: '+91 98765 43210' });
    const result = compareCandidates(a, b);
    expect(result.signals.some((s) => s.id === 'type_mismatch')).toBe(true);
  });
});

describe('findPotentialMatches', () => {
  it('returns the most similar candidates ranked first', () => {
    const base = candidate({ id: 'cand-1', rawValue: 'Rahul Kumar', attributes: { phone: '+91 98765 43210' } });
    const pool = [
      candidate({ id: 'cand-2', rawValue: 'R. Kumar', attributes: { phone: '+91 98765 43210' } }),
      candidate({ id: 'cand-3', rawValue: 'Priya Sharma' }),
    ];
    const matches = findPotentialMatches(base, pool);
    expect(matches.length).toBe(1);
    expect(matches[0].candidate.id).toBe('cand-2');
    expect(matches[0].comparison.similarity).toBeGreaterThan(0.3);
  });

  it('excludes the candidate itself', () => {
    const base = candidate({ id: 'cand-1', rawValue: 'Rahul Kumar' });
    const matches = findPotentialMatches(base, [base]);
    expect(matches).toHaveLength(0);
  });
});