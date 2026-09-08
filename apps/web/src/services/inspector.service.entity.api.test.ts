/**
 * API-mode tests for the entity branch of the Context Inspector (Phase 17.7).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` the entity context must resolve
 * through the typed /api/v2 entity adapter (an investigation-scoped detail
 * read), never the mock entity service, and must surface API failures as an
 * explicit error state — no silent mock fallback.
 */

import { resolveInspectorContext } from '@/services/inspector.service';
import type { InspectorEntityView } from '@/services/inspector.service';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/entities', () => ({
  loadEntityDetail: jest.fn(),
}));

jest.mock('@/services/entity.service', () => ({
  fetchEntity: jest.fn(),
  fetchEntityIntelligenceSummary: jest.fn(),
  fetchRelationship: jest.fn(),
}));

import { loadEntityDetail } from '@/lib/api/entities';
import * as entityService from '@/services/entity.service';

const mockedApi = jest.mocked(loadEntityDetail);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const ENTITY_ID = '11111111-1111-5111-8111-111111111111';

describe('inspector — entity context in API mode (Phase 17.7)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves an entity through the scoped /api/v2 adapter', async () => {
    mockedApi.mockResolvedValue({
      entity: {
        id: ENTITY_ID,
        name: 'Rahul Kumar',
        canonicalName: 'rahul kumar',
        displayName: 'Rahul Kumar',
        entityType: 'person',
        description: 'Individual connected to FIR-2026-001.',
        resolutionState: 'CONFIRMED',
        confidence: 0.95,
        sourcesCount: 0,
        connectionsCount: 0,
        eventsCount: 0,
        evidenceCount: 0,
        activityCount: 0,
        isVerified: true,
        isFlagged: true,
        aliases: [],
        attributes: {},
        createdAt: '2026-08-18T09:00:00.000000',
        updatedAt: '2026-08-18T09:00:00.000000',
      },
    } as never);

    const res = await resolveInspectorContext({
      type: 'entity',
      id: ENTITY_ID,
      name: 'Rahul Kumar',
      entityType: 'person',
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedApi).toHaveBeenCalledWith(ENTITY_ID, INVESTIGATION_ID);
    // API mode must never route to the mock entity service.
    expect(entityService.fetchEntity).not.toHaveBeenCalled();
    expect(entityService.fetchEntityIntelligenceSummary).not.toHaveBeenCalled();

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorEntityView;
      expect(view.kind).toBe('entity');
      expect(view.name).toBe('Rahul Kumar');
      expect(view.entityType).toBe('person');
      expect(view.resolutionState).toBe('CONFIRMED');
      expect(view.confidence).toBe(0.95);
      expect(view.verified).toBe(true);
      expect(view.flagged).toBe(true);
      expect(view.investigationId).toBe(INVESTIGATION_ID);
    }
  });

  it('surfaces an API failure as an error state with no mock fallback', async () => {
    mockedApi.mockRejectedValue(new Error('not found'));

    const res = await resolveInspectorContext({
      type: 'entity',
      id: ENTITY_ID,
      name: 'Rahul Kumar',
      investigationId: INVESTIGATION_ID,
    });

    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.message).toContain('not found');
      expect(res.view).not.toBeNull();
    }
    expect(entityService.fetchEntity).not.toHaveBeenCalled();
    expect(entityService.fetchEntityIntelligenceSummary).not.toHaveBeenCalled();
  });
});