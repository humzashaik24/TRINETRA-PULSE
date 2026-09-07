import { applyAnalyticsFilter, analyticsFilterKey, analyticsFiltersEqual } from './filter';
import type { AnalyticsFilter } from '@trinetra-pulse/types';
import { node, edge } from './fixtures';

function baseFilter() {
  return {
    entityTypes: [],
    relationshipTypes: [],
    communityIds: [],
    componentIds: [],
    sources: [],
    from: null,
    to: null,
    minConfidence: 0,
  };
}

describe('applyAnalyticsFilter', () => {
  const nodes = [
    node('a', { type: 'person' as any, sources: ['S1'] }),
    node('b', { type: 'organization' as any, sources: ['S2'] }),
  ];
  const edges = [edge('ab', 'a', 'b', { type: 'KNOWS' as any, confidence: 0.9 })];

  it('passes everything through with an empty filter', () => {
    const { nodes: n, edges: e } = applyAnalyticsFilter(nodes, edges, baseFilter());
    expect(n).toHaveLength(2);
    expect(e).toHaveLength(1);
  });

  it('filters by entity type', () => {
    const { nodes: n } = applyAnalyticsFilter(nodes, edges, { ...baseFilter(), entityTypes: ['person'] });
    expect(n.map((x) => x.id)).toEqual(['a']);
  });

  it('filters by relationship type', () => {
    const { edges: e } = applyAnalyticsFilter(nodes, edges, { ...baseFilter(), relationshipTypes: ['OWNS'] });
    expect(e).toHaveLength(0);
  });

  it('filters by source', () => {
    const { nodes: n } = applyAnalyticsFilter(nodes, edges, { ...baseFilter(), sources: ['S1'] });
    expect(n.map((x) => x.id)).toEqual(['a']);
  });

  it('filters edges by confidence', () => {
    const { edges: e } = applyAnalyticsFilter(nodes, edges, { ...baseFilter(), minConfidence: 0.95 });
    expect(e).toHaveLength(0);
  });

  it('keeps edges only when both endpoints remain', () => {
    const nodes2 = [
      node('a', { type: 'person' as any }),
      node('b', { type: 'organization' as any }),
      node('c', { type: 'organization' as any }),
    ];
    const edges2 = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
    const { edges: e } = applyAnalyticsFilter(nodes2, edges2, { ...baseFilter(), entityTypes: ['person'] });
    expect(e).toHaveLength(0);
  });

  it('filters by node activity time range', () => {
    const dated = [node('a', { activityAt: '2024-01-05T00:00:00.000Z' })];
    const { nodes: n } = applyAnalyticsFilter(dated, [], {
      ...baseFilter(),
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-02T00:00:00.000Z',
    });
    expect(n).toHaveLength(0);
  });
});

describe('analyticsFiltersEqual & analyticsFilterKey', () => {
  it('treats equal filters as equal', () => {
    const a = baseFilter();
    const b = baseFilter();
    expect(analyticsFiltersEqual(a, b)).toBe(true);
  });

  it('detects changed filters', () => {
    const a = baseFilter();
    const b = { ...baseFilter(), minConfidence: 0.5 };
    expect(analyticsFiltersEqual(a, b)).toBe(false);
  });

  it('produces identical keys regardless of array order', () => {
    const a = { ...baseFilter(), entityTypes: ['person', 'organization'] } as AnalyticsFilter;
    const b = { ...baseFilter(), entityTypes: ['organization', 'person'] } as AnalyticsFilter;
    expect(analyticsFilterKey(a)).toBe(analyticsFilterKey(b));
  });
});
