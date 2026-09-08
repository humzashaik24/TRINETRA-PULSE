import { getInvestigationPatterns, mapPatternDetectionToStructuralPattern } from './patterns';
import { apiFetch } from './client';

jest.mock('./client', () => ({
  apiFetch: jest.fn(),
}));

const mockedApiFetch = jest.mocked(apiFetch);

describe('patterns API adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the investigation-scoped patterns endpoint', async () => {
    mockedApiFetch.mockResolvedValue({ investigation_id: 'inv-1', patterns: [] });

    await getInvestigationPatterns('inv-1');

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/api/v2',
      '/investigations/inv-1/patterns',
    );
  });

  it('maps persisted source IDs and analytical severity without changing confidence', () => {
    const mapped = mapPatternDetectionToStructuralPattern({
      id: 'pat-1',
      investigation_id: 'inv-1',
      pattern_type: 'CIRCULAR_FUND_FLOW',
      severity: 'HIGH',
      confidence: 0.82,
      title: 'Potential circular fund flow',
      description: 'Observed path.',
      entity_ids: ['e-1', 'e-2'],
      relationship_ids: ['r-1'],
      evidence_ids: ['ev-1'],
      event_ids: [],
      metadata: {},
      detected_at: '2026-09-05T00:00:00Z',
    });

    expect(mapped.id).toBe('pat-1');
    expect(mapped.confidence).toBe(0.82);
    expect(mapped.severity).toBe('high');
    expect(mapped.affectedEntities).toEqual(['e-1', 'e-2']);
    expect(mapped.evidenceReferences).toEqual(['ev-1']);
  });
});
