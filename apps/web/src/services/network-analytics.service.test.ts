import {
  getNetworkAnalytics,
  getCentrality,
  getInfluence,
  getCommunities,
  getComponents,
  getDensity,
  getSummary,
  getBridges,
  getPatterns,
  getTemporalAnalytics,
  clearAnalyticsCache,
  _analyticsInternal,
} from './network-analytics.service';
import { DEFAULT_ANALYTICS_FILTER } from '@trinetra-pulse/types';

const NET = 'NET-001';

async function flushJob(p: Promise<unknown>, ms = 200): Promise<unknown> {
  await jest.advanceTimersByTimeAsync(ms);
  return p;
}

describe('network analytics service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearAnalyticsCache();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a complete analytics bundle for a real network', async () => {
    const p = getNetworkAnalytics(NET);
    const bundle = (await flushJob(p)) as Awaited<ReturnType<typeof getNetworkAnalytics>>;
    expect(bundle.networkId).toBe(NET);
    expect(bundle.status).toBe('complete');
    expect(bundle.summary!.nodes).toBeGreaterThan(0);
    expect(bundle.influence!.length).toBeGreaterThan(0);
    expect(bundle.communities.length).toBeGreaterThan(0);
  });

  it('caches results across identical calls', async () => {
    const first = (await flushJob(getNetworkAnalytics(NET))) as any;
    expect(_analyticsInternal.cacheSize()).toBe(1);
    const before = _analyticsInternal.cacheSize();
    const second = (await flushJob(getNetworkAnalytics(NET))) as any;
    expect(second).toEqual(first);
    expect(_analyticsInternal.cacheSize()).toBe(before);
  });

  it('exposes centrality by type', async () => {
    const degree = (await flushJob(getCentrality(NET, 'degree'))) as Awaited<ReturnType<typeof getCentrality>>;
    expect(degree.results.length).toBeGreaterThan(0);
    expect(degree.metadata.nodeCount).toBeGreaterThan(0);
  });

  it('throws on an unknown centrality type', async () => {
    jest.useRealTimers();
    await expect(getCentrality(NET, 'nope' as any)).rejects.toThrow();
  });

  it('rejects for an unknown network', async () => {
    const p = getNetworkAnalytics('MISSING');
    jest.advanceTimersByTimeAsync(200);
    await expect(p).rejects.toThrow();
  });

  it('derives sections from the shared bundle', async () => {
    const results = await Promise.all([
      flushJob(getInfluence(NET)),
      flushJob(getCommunities(NET)),
      flushJob(getComponents(NET)),
      flushJob(getDensity(NET)),
      flushJob(getSummary(NET)),
      flushJob(getBridges(NET)),
      flushJob(getPatterns(NET)),
    ]);
    const [influence, communities, components, density, summary, bridges, patterns] = results as any[];
    expect(influence.length).toBeGreaterThan(0);
    expect(communities.length).toBeGreaterThan(0);
    expect(components.length).toBeGreaterThan(0);
    expect(density.density).toBeGreaterThanOrEqual(0);
    expect(summary.connectedComponents).toBeGreaterThan(0);
    expect(bridges.entities).toBeDefined();
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('exposes temporal analytics when the network has timestamps', async () => {
    const temporal = (await flushJob(getTemporalAnalytics(NET))) as Awaited<ReturnType<typeof getTemporalAnalytics>>;
    expect(temporal).not.toBeNull();
  });
});
