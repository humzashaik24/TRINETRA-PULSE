/**
 * API-mode tests for the relationship branch of the Context Inspector
 * (Phase 17.8).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` a relationship context must resolve
 * through the typed /api/v2 relationship adapter (an investigation-scoped
 * detail read), never the mock relationship service — even when graph-supplied
 * hints are present (the optimistic shortcut is mock-mode only). API failures
 * surface as an explicit error state.
 */

import { resolveInspectorContext } from '@/services/inspector.service';
import type { InspectorRelationshipView } from '@/services/inspector.service';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/relationships', () => ({
  loadRelationshipDetail: jest.fn(),
}));

jest.mock('@/services/entity.service', () => ({
  fetchEntity: jest.fn(),
  fetchEntityIntelligenceSummary: jest.fn(),
  fetchRelationship: jest.fn(),
}));

import { loadRelationshipDetail } from '@/lib/api/relationships';
import * as entityService from '@/services/entity.service';

const mockedApi = jest.mocked(loadRelationshipDetail);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const RELATIONSHIP_ID = '33333333-3333-5333-8333-333333333333';

describe('inspector — relationship context in API mode (Phase 17.8)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves a relationship through the scoped /api/v2 adapter', async () => {
    mockedApi.mockResolvedValue({
      id: RELATIONSHIP_ID,
      sourceEntityId: '11111111-1111-5111-8111-111111111111',
      sourceEntityName: 'Rahul Kumar',
      sourceEntityType: 'person',
      targetEntityId: '22222222-2222-5222-8222-222222222222',
      targetEntityName: '+91 98765 43210',
      targetEntityType: 'phone',
      type: 'USES',
      confidence: 0.98,
      source: 'CDR Extract - Operation clean',
      timestamp: '2026-08-18T10:20:00',
      evidence: ['cdr_extract.csv #2241'],
      extractionMethod: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      metadata: {},
      createdAt: '2026-08-18T10:20:00',
    } as never);

    const res = await resolveInspectorContext({
      type: 'relationship',
      id: RELATIONSHIP_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedApi).toHaveBeenCalledWith(RELATIONSHIP_ID, INVESTIGATION_ID);
    // API mode must never route to the mock relationship service.
    expect(entityService.fetchRelationship).not.toHaveBeenCalled();

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorRelationshipView;
      expect(view.kind).toBe('relationship');
      expect(view.sourceEntityName).toBe('Rahul Kumar');
      expect(view.targetEntityName).toBe('+91 98765 43210');
      expect(view.confidence).toBe(0.98);
      expect(view.verificationStatus).toBe('CONFIRMED');
      expect(view.investigationId).toBe(INVESTIGATION_ID);
    }
  });

  it('still reads the authoritative persisted row when graph hints exist', async () => {
    mockedApi.mockResolvedValue({
      id: RELATIONSHIP_ID,
      sourceEntityId: '11111111-1111-5111-8111-111111111111',
      sourceEntityName: 'Rahul Kumar',
      sourceEntityType: 'person',
      targetEntityId: '22222222-2222-5222-8222-222222222222',
      targetEntityName: '+91 98765 43210',
      targetEntityType: 'phone',
      type: 'USES',
      confidence: 0.98,
      source: 'CDR Extract - Operation clean',
      timestamp: '2026-08-18T10:20:00',
      evidence: ['cdr_extract.csv #2241'],
      extractionMethod: 'MANUAL',
      verificationStatus: 'CONFIRMED',
      metadata: {},
      createdAt: '2026-08-18T10:20:00',
    } as never);

    const res = await resolveInspectorContext({
      type: 'relationship',
      id: RELATIONSHIP_ID,
      relationshipType: 'USES',
      sourceEntityId: '11111111-1111-5111-8111-111111111111',
      targetEntityId: '22222222-2222-5222-8222-222222222222',
      sourceEntityName: 'Rahul Kumar',
      targetEntityName: '+91 98765 43210',
      confidence: 0.98,
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedApi).toHaveBeenCalledTimes(1);
    expect(entityService.fetchRelationship).not.toHaveBeenCalled();
    expect(res.status).toBe('ready');
  });

  it('surfaces an API failure as an error state with no mock fallback', async () => {
    mockedApi.mockRejectedValue(new Error('not found'));

    const res = await resolveInspectorContext({
      type: 'relationship',
      id: RELATIONSHIP_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.message).toContain('not found');
      expect(res.view).not.toBeNull();
    }
    expect(entityService.fetchRelationship).not.toHaveBeenCalled();
  });
});