/**
 * API-mode tests for the entity intelligence store (Phase 17.7).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` the store must route entity reads
 * through the typed /api/v2 entity adapter (`@/lib/api/entities`), never the
 * mock entity service, and must NOT silently fall back to mock rows on API
 * failure — the error state is surfaced instead. Selections resolve as
 * investigation-scoped detail reads.
 */

import { useEntityStore } from '@/state/entity.store';
import type { EntityIntelligence } from '@trinetra-pulse/types';

// Force API mode for the whole module under test.
jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/entities', () => ({
  loadEntityList: jest.fn(),
  loadEntityDetail: jest.fn(),
}));

jest.mock('@/services/entity.service', () => ({}));

import { loadEntityDetail, loadEntityList } from '@/lib/api/entities';

const mockedApi = jest.mocked({ loadEntityList, loadEntityDetail });

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const ENTITY_ID = '11111111-1111-5111-8111-111111111111';

const entity = (over: Partial<EntityIntelligence> = {}): EntityIntelligence => ({
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
  ...over,
});

const listResult = (items: EntityIntelligence[]) => ({
  response: {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
  all: items,
});

const defaultState = () => ({
  investigationId: null,
  items: [],
  all: [],
  loading: false,
  error: null,
  selectedEntity: null,
  selectedEntityId: null,
  searchQuery: '',
  entityType: 'all' as const,
  resolutionState: 'all' as const,
  sortBy: 'updated' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('entity store — API mode (Phase 17.7)', () => {
  beforeEach(() => {
    useEntityStore.setState(defaultState() as never, false);
    jest.clearAllMocks();
    mockedApi.loadEntityList.mockResolvedValue(listResult([entity()]) as never);
    mockedApi.loadEntityDetail.mockResolvedValue({
      entity: entity(),
    } as never);
  });

  it('loads entities through the typed /api/v2 entity adapter in API mode', async () => {
    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEntityStore.getState().fetchEntities();

    expect(mockedApi.loadEntityList).toHaveBeenCalledWith(
      INVESTIGATION_ID,
      expect.objectContaining({ page: 1, pageSize: 20 }),
    );
    expect(useEntityStore.getState().items).toHaveLength(1);
    expect(useEntityStore.getState().all).toHaveLength(1);
    expect(useEntityStore.getState().total).toBe(1);
    expect(useEntityStore.getState().loading).toBe(false);
    expect(useEntityStore.getState().error).toBeNull();
  });

  it('resolves selection as an investigation-scoped detail read', async () => {
    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEntityStore.getState().fetchEntities();

    useEntityStore.getState().selectEntity(ENTITY_ID);
    await flush();
    await flush();

    expect(mockedApi.loadEntityDetail).toHaveBeenCalledWith(
      ENTITY_ID,
      INVESTIGATION_ID,
    );
    expect(useEntityStore.getState().selectedEntity?.id).toBe(ENTITY_ID);
    expect(useEntityStore.getState().loading).toBe(false);
  });

  it('surfaces API failures as the error state without mock fallback', async () => {
    mockedApi.loadEntityList.mockRejectedValue(new Error('fetch failed') as never);

    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEntityStore.getState().fetchEntities();

    expect(useEntityStore.getState().loading).toBe(false);
    expect(useEntityStore.getState().error).toContain('fetch failed');
    expect(useEntityStore.getState().items).toEqual([]);
    expect(useEntityStore.getState().all).toEqual([]);
  });

  it('surfaces selection failures as the error state without mock fallback', async () => {
    mockedApi.loadEntityDetail.mockRejectedValue(new Error('not found') as never);

    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEntityStore.getState().fetchEntities();

    useEntityStore.getState().selectEntity(ENTITY_ID);
    await flush();
    await flush();

    expect(useEntityStore.getState().loading).toBe(false);
    expect(useEntityStore.getState().error).toContain('not found');
    expect(useEntityStore.getState().selectedEntity).toBeNull();
    expect(useEntityStore.getState().selectedEntityId).toBe(ENTITY_ID);
  });

  it('handles an empty investigation-scoped set', async () => {
    mockedApi.loadEntityList.mockResolvedValue(
      listResult([]) as never,
    );

    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEntityStore.getState().fetchEntities();

    expect(useEntityStore.getState().items).toEqual([]);
    expect(useEntityStore.getState().all).toEqual([]);
    expect(useEntityStore.getState().total).toBe(0);
    expect(useEntityStore.getState().error).toBeNull();
  });

  it('clears state and reloads through the API on investigation switch', async () => {
    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    await useEntityStore.getState().fetchEntities();
    useEntityStore.getState().selectEntity(ENTITY_ID);
    await flush();
    await flush();
    expect(useEntityStore.getState().selectedEntity).not.toBeNull();

    mockedApi.loadEntityList.mockClear();
    useEntityStore.getState().setInvestigationId('another-inv');
    await useEntityStore.getState().fetchEntities();

    expect(useEntityStore.getState().investigationId).toBe('another-inv');
    expect(mockedApi.loadEntityList).toHaveBeenCalledWith(
      'another-inv',
      expect.anything(),
    );
    expect(useEntityStore.getState().selectedEntity).toBeNull();
    expect(useEntityStore.getState().selectedEntityId).toBeNull();
  });

  it('clear resets to the initial empty state', () => {
    useEntityStore.getState().setInvestigationId(INVESTIGATION_ID);
    useEntityStore.getState().clear();
    expect(useEntityStore.getState().investigationId).toBeNull();
    expect(useEntityStore.getState().items).toEqual([]);
    expect(useEntityStore.getState().all).toEqual([]);
    expect(useEntityStore.getState().selectedEntity).toBeNull();
  });
});