import { useAnalyticsStore } from './analytics.store';
import { clearAnalyticsCache } from '@/services/network-analytics.service';
import { DEFAULT_ANALYTICS_FILTER } from '@trinetra-pulse/types';

async function flush(p: Promise<unknown>, ms = 300): Promise<unknown> {
  await jest.advanceTimersByTimeAsync(ms);
  return p;
}

describe('analytics store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearAnalyticsCache();
    useAnalyticsStore.getState().clear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts idle with no bundle', () => {
    const s = useAnalyticsStore.getState();
    expect(s.status).toBe('idle');
    expect(s.bundle).toBeNull();
    expect(s.networkId).toBeNull();
    expect(s.overlay).toBe('none');
  });

  it('loads analytics for a network and transitions to complete', async () => {
    const p = useAnalyticsStore.getState().loadAnalytics('NET-001');
    expect(useAnalyticsStore.getState().status).toBe('computing');
    await flush(p);
    const s = useAnalyticsStore.getState();
    expect(s.status).toBe('complete');
    expect(s.networkId).toBe('NET-001');
    expect(s.bundle?.networkId).toBe('NET-001');
    expect(s.error).toBeNull();
  });

  it('applies and persists a filter change via recompute', async () => {
    await flush(useAnalyticsStore.getState().loadAnalytics('NET-001'));
    // setFilter marks the bundle stale and kicks off a recompute.
    useAnalyticsStore.getState().setFilter({ ...DEFAULT_ANALYTICS_FILTER, minConfidence: 0.5 });
    await flush(Promise.resolve(), 300);
    const s = useAnalyticsStore.getState();
    expect(s.status).toBe('complete');
    expect(s.filters.minConfidence).toBe(0.5);
    expect(s.bundle?.networkId).toBe('NET-001');
  });

  it('selecting an entity clears other selections', () => {
    const s = useAnalyticsStore.getState();
    s.selectCommunity('c1');
    s.selectEntity('ent-1');
    const after = useAnalyticsStore.getState();
    expect(after.selectedCommunityId).toBeNull();
    expect(after.selectedEntityId).toBe('ent-1');
  });

  it('setting a metric drives the overlay', () => {
    const s = useAnalyticsStore.getState();
    s.setSelectedMetric('degree');
    expect(useAnalyticsStore.getState().overlay).toBe('degree');
    s.setSelectedMetric(null);
    expect(useAnalyticsStore.getState().overlay).toBe('none');
  });

  it('setOverlay changes the overlay directly', () => {
    useAnalyticsStore.getState().setOverlay('bridge');
    expect(useAnalyticsStore.getState().overlay).toBe('bridge');
  });

  it('clear resets to the idle default', () => {
    const s = useAnalyticsStore.getState();
    s.setOverlay('community');
    s.selectEntity('ent-1');
    s.clear();
    const after = useAnalyticsStore.getState();
    expect(after.status).toBe('idle');
    expect(after.bundle).toBeNull();
    expect(after.overlay).toBe('none');
    expect(after.selectedEntityId).toBeNull();
  });
});
