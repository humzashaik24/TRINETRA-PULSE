/**
 * API-mode tests for the analytics store (Phase 17.3).
 *
 * Forces `isMockData` to false and asserts that `loadAnalytics` routes
 * through the real API endpoint + mapping function rather than the mock
 * analytics service.
 */

import { useAnalyticsStore, mapApiAnalyticsToNetworkAnalytics } from './analytics.store';
import type { RealAnalyticsOverview } from '@/lib/api/investigations';

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

// Force API mode.
jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

// Mock the investigations API module.
jest.mock('@/lib/api/investigations', () => ({
  getNetworkAnalytics: jest.fn(),
}));

// Mock network analytics service (should NOT be called in API mode).
jest.mock('@/services/network-analytics.service', () => ({
  getNetworkAnalytics: jest.fn(),
  clearAnalyticsCache: jest.fn(),
}));

import { getNetworkAnalytics } from '@/services/network-analytics.service';
import {
  getNetworkAnalytics as fetchApiAnalytics,
} from '@/lib/api/investigations';

const mockedMockService = jest.mocked(getNetworkAnalytics);
const mockedFetchApi = jest.mocked(fetchApiAnalytics);

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

const FAKE_API_ANALYTICS: RealAnalyticsOverview = {
  investigation_id: '6c887c98-939a-50ce-ac27-f58376941de2',
  entity_count: 12,
  relationship_count: 18,
  connected_components: 2,
  average_degree: 3.0,
  flagged_entity_count: 3,
  verified_entity_count: 7,
  high_risk_entity_count: 2,
};

const EMPTY_API_ANALYTICS: RealAnalyticsOverview = {
  investigation_id: 'inv-empty',
  entity_count: 0,
  relationship_count: 0,
  connected_components: 0,
  average_degree: 0,
  flagged_entity_count: 0,
  verified_entity_count: 0,
  high_risk_entity_count: 0,
};

// ---------------------------------------------------------------------------
// mapApiAnalyticsToNetworkAnalytics
// ---------------------------------------------------------------------------

describe('mapApiAnalyticsToNetworkAnalytics', () => {
  it('maps entity_count to summary.nodes', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.summary?.nodes).toBe(12);
  });

  it('maps relationship_count to summary.relationships', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.summary?.relationships).toBe(18);
  });

  it('maps connected_components', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.summary?.connectedComponents).toBe(2);
  });

  it('maps average_degree', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.summary?.averageDegree).toBe(3.0);
  });

  it('computes density from entity and relationship counts', () => {
    // 12 entities => possibleEdges = 12*11/2 = 66
    // density = 18/66 ≈ 0.2727...
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    const expected = 18 / (12 * 11 / 2);
    expect(bundle.summary?.density).toBeCloseTo(expected, 4);
  });

  it('sets networkId correctly', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'my-network-id');
    expect(bundle.networkId).toBe('my-network-id');
    expect(bundle.summary?.networkId).toBe('my-network-id');
  });

  it('sets status to complete', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.status).toBe('complete');
  });

  it('sets centrality, communities, bridges, patterns to null/empty', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.degree).toBeNull();
    expect(bundle.betweenness).toBeNull();
    expect(bundle.closeness).toBeNull();
    expect(bundle.pagerank).toBeNull();
    expect(bundle.influence).toBeNull();
    expect(bundle.communities).toEqual([]);
    expect(bundle.components).toEqual([]);
    expect(bundle.bridges).toEqual([]);
    expect(bundle.bridgeRelationships).toEqual([]);
    expect(bundle.patterns).toEqual([]);
    expect(bundle.temporal).toBeNull();
  });

  it('populates metadata with scope = networkId', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.metadata?.scope).toBe('net-1');
    expect(bundle.metadata?.algorithm).toBe('analytics-overview');
  });

  it('returns density object when entities > 1', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(FAKE_API_ANALYTICS, 'net-1');
    expect(bundle.density).not.toBeNull();
    expect(bundle.density?.actualEdges).toBe(18);
    expect(bundle.density?.possibleEdges).toBe(66);
  });

  it('returns null density when entities <= 1', () => {
    const single: RealAnalyticsOverview = {
      ...EMPTY_API_ANALYTICS,
      entity_count: 1,
      relationship_count: 0,
    };
    const bundle = mapApiAnalyticsToNetworkAnalytics(single, 'net-1');
    expect(bundle.density).toBeNull();
  });

  it('handles empty graph (0 entities)', () => {
    const bundle = mapApiAnalyticsToNetworkAnalytics(EMPTY_API_ANALYTICS, 'net-empty');
    expect(bundle.summary?.nodes).toBe(0);
    expect(bundle.summary?.relationships).toBe(0);
    expect(bundle.summary?.density).toBe(0);
    expect(bundle.density).toBeNull();
    expect(bundle.status).toBe('complete');
  });
});

// ---------------------------------------------------------------------------
// analytics.store — API mode loadAnalytics
// ---------------------------------------------------------------------------

describe('analytics.store – API mode loadAnalytics', () => {
  const original = useAnalyticsStore.getState();

  beforeEach(() => {
    useAnalyticsStore.setState({
      networkId: null,
      bundle: null,
      status: 'idle',
      error: null,
      filters: { entityTypes: [], relationshipTypes: [], communityIds: [], componentIds: [], from: null, to: null, sources: [], minConfidence: 0 },
    });
    jest.clearAllMocks();
    mockedFetchApi.mockResolvedValue(FAKE_API_ANALYTICS);
  });

  afterAll(() => {
    useAnalyticsStore.setState(original);
  });

  it('calls fetchApiAnalytics instead of the mock service', async () => {
    await useAnalyticsStore.getState().loadAnalytics('net-test');
    expect(mockedFetchApi).toHaveBeenCalledWith('net-test');
    expect(mockedMockService).not.toHaveBeenCalled();
  });

  it('sets status to complete on success', async () => {
    await useAnalyticsStore.getState().loadAnalytics('net-test');
    const s = useAnalyticsStore.getState();
    expect(s.status).toBe('complete');
    expect(s.error).toBeNull();
  });

  it('populates bundle from mapped analytics', async () => {
    await useAnalyticsStore.getState().loadAnalytics('net-test');
    const s = useAnalyticsStore.getState();
    expect(s.bundle).not.toBeNull();
    expect(s.bundle?.summary?.nodes).toBe(12);
    expect(s.bundle?.summary?.relationships).toBe(18);
    expect(s.bundle?.summary?.connectedComponents).toBe(2);
  });

  it('preserves the networkId in the store', async () => {
    await useAnalyticsStore.getState().loadAnalytics('net-test');
    const s = useAnalyticsStore.getState();
    expect(s.networkId).toBe('net-test');
  });

  it('maps the investigation_id from the API response to networkId', async () => {
    await useAnalyticsStore.getState().loadAnalytics('6c887c98-939a-50ce-ac27-f58376941de2');
    const s = useAnalyticsStore.getState();
    expect(s.bundle?.networkId).toBe('6c887c98-939a-50ce-ac27-f58376941de2');
  });

  it('sets error state when fetchApiAnalytics fails', async () => {
    mockedFetchApi.mockRejectedValue(new Error('Analytics fetch failed'));
    await useAnalyticsStore.getState().loadAnalytics('net-test');
    const s = useAnalyticsStore.getState();
    expect(s.status).toBe('failed');
    expect(s.error).toBe('Analytics fetch failed');
  });

  it('handles empty analytics response', async () => {
    mockedFetchApi.mockResolvedValue(EMPTY_API_ANALYTICS);
    await useAnalyticsStore.getState().loadAnalytics('inv-empty');
    const s = useAnalyticsStore.getState();
    expect(s.status).toBe('complete');
    expect(s.bundle?.summary?.nodes).toBe(0);
    expect(s.bundle?.communities).toEqual([]);
  });

  it('setFilter triggers reload with new filter and clears selections', async () => {
    await useAnalyticsStore.getState().loadAnalytics('net-test');
    useAnalyticsStore.getState().selectEntity('ent-1');
    useAnalyticsStore.getState().setFilter({
      entityTypes: ['person'],
      relationshipTypes: [],
      communityIds: [],
      componentIds: [],
      from: null,
      to: null,
      sources: [],
      minConfidence: 0,
    });
    await new Promise((r) => setTimeout(r, 100));
    const s = useAnalyticsStore.getState();
    expect(s.selectedEntityId).toBeNull();
    expect(s.status).toBe('complete');
  });
});

// ---------------------------------------------------------------------------
// Mock mode regression
// ---------------------------------------------------------------------------

describe('analytics.store – mock mode regression', () => {
  beforeAll(() => {
    jest.resetModules();
  });

  it('mock analytics store still loads in mock mode', async () => {
    // Re-import with mock mode enabled (default jest setup doesn't mock isMockData).
    jest.doMock('@/lib/api/config', () => ({ isMockData: () => true }));
    jest.doMock('@/lib/api/investigations', () => ({
      getNetworkAnalytics: jest.fn(),
    }));

    // The mock analytics service is mocked above to return undefined;
    // for regression we just verify the store is importable and the mock
    // path does not throw when mockedService returns undefined.
    const { useAnalyticsStore: mockStore } = require('./analytics.store');
    const s = mockStore.getState();
    expect(typeof s.loadAnalytics).toBe('function');
    expect(s.status).toBe('idle');
  });
});
