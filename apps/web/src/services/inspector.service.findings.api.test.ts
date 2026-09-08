/**
 * API-mode tests for the finding branch of the Context Inspector
 * (Phase 17.9).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` a finding context must resolve through
 * the typed /api/v2 finding adapter (an investigation-scoped detail read with
 * entity-name resolution), never any mock finding source — even though the
 * mock finding universe shares the canonical demo ids. API failures surface as
 * an explicit error state.
 */

import { resolveInspectorContext } from '@/services/inspector.service';
import type { InspectorFindingView } from '@/services/inspector.service';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/findings', () => ({
  loadFindingDetail: jest.fn(),
}));

jest.mock('@/services/entity.service', () => ({
  fetchEntity: jest.fn(),
  fetchEntityIntelligenceSummary: jest.fn(),
  fetchRelationship: jest.fn(),
}));

import { loadFindingDetail } from '@/lib/api/findings';
import * as entityService from '@/services/entity.service';

const mockedApi = jest.mocked(loadFindingDetail);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const FINDING_ID = '11111111-1111-5111-8111-111111111111';

describe('inspector — finding context in API mode (Phase 17.9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves a finding through the scoped /api/v2 adapter', async () => {
    mockedApi.mockResolvedValue({
      kind: 'finding',
      id: FINDING_ID,
      title: 'Coordinate cluster around the primary device',
      description: 'Multiple source records associate the primary device.',
      type: 'medium',
      confidence: 0.6,
      severity: 'medium',
      source: 'Relational analysis',
      timestamp: '2026-08-18T09:30:00Z',
      entities: [
        { id: '22222222-2222-5222-8222-222222222222', name: 'Rahul Kumar', type: 'person' },
      ],
      investigationId: INVESTIGATION_ID,
      evidenceIds: ['ev-004'],
    } as never);

    const res = await resolveInspectorContext({
      type: 'finding',
      id: FINDING_ID,
      title: 'finding title hint',
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedApi).toHaveBeenCalledWith(FINDING_ID, INVESTIGATION_ID);
    // API mode must never route to the mock finding universe or entity service.
    expect(entityService.fetchEntity).not.toHaveBeenCalled();

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorFindingView;
      expect(view.kind).toBe('finding');
      expect(view.title).toBe('Coordinate cluster around the primary device');
      expect(view.confidence).toBe(0.6);
      expect(view.severity).toBe('medium');
      expect(view.entities[0].name).toBe('Rahul Kumar');
      expect(view.investigationId).toBe(INVESTIGATION_ID);
      expect(view.evidenceIds).toEqual(['ev-004']);
    }
  });

  it('surfaces an API failure as an error state with no mock fallback', async () => {
    mockedApi.mockRejectedValue(new Error('Findings not found'));

    const res = await resolveInspectorContext({
      type: 'finding',
      id: FINDING_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.message).toContain('Findings not found');
      expect(res.view).not.toBeNull();
    }
    expect(entityService.fetchEntity).not.toHaveBeenCalled();
  });
});