import {
  fetchApiCandidates,
  mapApiCandidate,
  mapApiResolution,
  reviewApiCandidate,
  decideApiResolution,
} from './entity-intelligence';
import { apiFetch } from './client';

jest.mock('./client', () => ({ apiFetch: jest.fn() }));

const mockedFetch = jest.mocked(apiFetch);

describe('entity intelligence API adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps server candidate provenance and method without client matching', () => {
    const candidate = mapApiCandidate({
      id: 'cand-1',
      entity_type: 'person',
      raw_value: 'R. Kumar',
      display_value: 'R. Kumar',
      source: 'bank_transactions',
      source_record: 'TX-1187',
      dataset_id: null,
      dataset_name: null,
      confidence: 0.88,
      extraction_method: 'document_parse',
      status: 'PENDING',
      resolution_state: null,
      resolved_entity_id: null,
      attributes: { city: 'Pune' },
      created_at: '2026-08-24T10:15:00Z',
    });

    expect(candidate).toMatchObject({
      id: 'cand-1',
      source: 'bank_transactions',
      sourceRecord: 'TX-1187',
      extractionMethod: 'DOCUMENT_PARSE',
      confidence: 0.88,
      datasetId: undefined,
    });
  });

  it('keeps API reasons as reasons and does not synthesize matching signals', () => {
    const resolution = mapApiResolution({
      id: 'res-1',
      entity_a_id: 'a',
      entity_a_display: 'Rahul Kumar',
      entity_a_type: 'person',
      entity_b_id: 'b',
      entity_b_display: 'R. Kumar',
      entity_b_type: 'person',
      type: 'person_match',
      state: 'NEEDS_REVIEW',
      decision: 'REVIEW',
      confidence: 0.85,
      reasons: ['Same phone attribute', 'Both located in Pune'],
      method: 'probabilistic',
      created_at: '2026-08-24T10:15:00Z',
      updated_at: '2026-08-24T10:15:00Z',
    });

    expect(resolution.reasons).toEqual(['Same phone attribute', 'Both located in Pune']);
    expect(resolution.signals).toEqual([]);
    expect(resolution.similarity).toBeUndefined();
    expect(resolution.evidenceRefs).toEqual([]);
  });

  it('uses v2 entity-intelligence routes and forwards reviewer decisions', async () => {
    mockedFetch.mockResolvedValueOnce([] as never);
    await fetchApiCandidates({ status: 'PENDING', search: 'Rahul Kumar' });
    expect(mockedFetch).toHaveBeenCalledWith(
      '/api/v2',
      '/entity-intelligence/candidates?status=PENDING&search=Rahul+Kumar',
    );

    mockedFetch.mockResolvedValueOnce({
      id: 'cand-1',
      entity_type: 'person',
      raw_value: 'Rahul Kumar',
      display_value: 'Rahul Kumar',
      source: 'cdr',
      source_record: 'CDR-1',
      confidence: 0.9,
      extraction_method: 'database_import',
      status: 'ACCEPTED',
      attributes: {},
      created_at: '2026-08-24T10:15:00Z',
    } as never);
    await reviewApiCandidate('cand-1', 'accept', 'user-1');
    expect(mockedFetch).toHaveBeenLastCalledWith(
      '/api/v2',
      '/entity-intelligence/candidates/cand-1/review',
      { method: 'POST', body: { decision: 'accept', reviewer: 'user-1' } },
    );

    mockedFetch.mockResolvedValueOnce({} as never);
    await decideApiResolution('res-1', 'confirm', 'user-1', 'Reviewed source record');
    expect(mockedFetch).toHaveBeenLastCalledWith(
      '/api/v2',
      '/entity-intelligence/resolutions/res-1/confirm',
      { method: 'POST', body: { reviewer: 'user-1', reason: 'Reviewed source record' } },
    );
  });
});
