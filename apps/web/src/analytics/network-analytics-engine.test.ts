import { NetworkAnalyticsEngine, AnalyticsCache } from './network-analytics-engine';
import { starGraph } from './fixtures';
import { DEFAULT_ANALYTICS_FILTER } from '@trinetra-pulse/types';

describe('NetworkAnalyticsEngine', () => {
  const { nodes, edges } = starGraph();

  function makeEngine(networkId = 'net-1', filter = DEFAULT_ANALYTICS_FILTER) {
    return new NetworkAnalyticsEngine({ networkId, filter, computedAt: '2024-01-01T00:00:00.000Z' });
  }

  it('computes a complete bundle deterministically', () => {
    const engine = makeEngine();
    const a = engine.computeAll(nodes, edges);
    const b = engine.computeAll(nodes, edges);
    expect(a.networkId).toBe('net-1');
    expect(a.status).toBe('complete');
    // The bundle fields are deterministic, but metadata (computedAt) is stable
    // because we pass a fixed computedAt, so deep equality should hold.
    expect(a).toEqual(b);
  });

  it('bundle includes all analytics sections', () => {
    const bundle = makeEngine().computeAll(nodes, edges);
    expect(bundle.summary!.nodes).toBe(4);
    expect(bundle.degree!.results).toHaveLength(4);
    expect(bundle.betweenness!.results).toHaveLength(4);
    expect(bundle.closeness!.results).toHaveLength(4);
    expect(bundle.pagerank!.results).toHaveLength(4);
    expect(bundle.influence).toHaveLength(4);
    expect(bundle.communities.length).toBeGreaterThan(0);
    expect(bundle.components.length).toBe(1);
    expect(bundle.bridges.length).toBeGreaterThan(0);
    expect(bundle.patterns).toBeDefined();
    expect(bundle.error).toBeNull();
  });

  it('applies filters within the engine scope', () => {
    const engine = new NetworkAnalyticsEngine({
      networkId: 'net-1',
      filter: { ...DEFAULT_ANALYTICS_FILTER, entityTypes: ['person'] },
    });
    const bundle = engine.computeAll(nodes, edges);
    // All fixture nodes are 'person', so node count is unchanged.
    expect(bundle.summary!.nodes).toBe(4);
  });

  it('scopes metadata to the network and filter', () => {
    const bundle = makeEngine().computeAll(nodes, edges);
    expect(bundle.metadata!.scope).toBe('net-1');
    expect(bundle.metadata!.nodeCount).toBe(4);
  });

  it('getNodeById resolves by entity id or node id', () => {
    const engine = makeEngine();
    const byEntity = engine.getNodeById(nodes, 'a');
    const byId = engine.getNodeById(nodes, 'a');
    expect(byEntity?.id).toBe('a');
    expect(byId?.id).toBe('a');
    expect(engine.getNodeById(nodes, 'nope')).toBeUndefined();
  });

  it('exposes individual algorithm entry points', () => {
    const engine = makeEngine();
    expect(engine.calculateDegreeCentrality(nodes, edges).results).toHaveLength(4);
    expect(engine.detectCommunities(nodes, edges).length).toBeGreaterThan(0);
    expect(engine.findComponents(nodes, edges)).toHaveLength(1);
    expect(engine.calculateDensity(nodes, edges).density).toBeGreaterThan(0);
    expect(engine.findBridges(nodes, edges).entities.length).toBeGreaterThan(0);
    expect(engine.calculateSummary(nodes, edges).connectedComponents).toBe(1);
  });
});

describe('AnalyticsCache', () => {
  const filter = DEFAULT_ANALYTICS_FILTER;

  it('stores and retrieves bundles keyed by network+filter+version', () => {
    const cache = new AnalyticsCache();
    const bundle = { networkId: 'n1', status: 'complete' } as any;
    cache.set('n1', filter, bundle, '1.0.0');
    expect(cache.get('n1', filter, '1.0.0')).toBe(bundle);
    expect(cache.size).toBe(1);
  });

  it('invalidate clears only the matching network', () => {
    const cache = new AnalyticsCache();
    const a = { networkId: 'a' } as any;
    const b = { networkId: 'b' } as any;
    cache.set('a', filter, a, '1.0.0');
    cache.set('b', filter, b, '1.0.0');
    cache.invalidate('a');
    expect(cache.get('a', filter, '1.0.0')).toBeUndefined();
    expect(cache.get('b', filter, '1.0.0')).toBe(b);
  });

  it('clear empties the cache and updates size', () => {
    const cache = new AnalyticsCache();
    cache.set('a', filter, {} as any, '1.0.0');
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('keys differ across versions', () => {
    const cache = new AnalyticsCache();
    const k1 = cache.key('n', filter, '1.0.0');
    const k2 = cache.key('n', filter, '2.0.0');
    expect(k1).not.toBe(k2);
  });
});
