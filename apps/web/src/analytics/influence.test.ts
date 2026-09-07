import { computeInfluence } from './influence';
import { starGraph, META } from './fixtures';

describe('computeInfluence', () => {
  it('produces a 0-100 structural importance per entity', () => {
    const { nodes, edges } = starGraph();
    const result = computeInfluence(nodes, edges, META);
    expect(result).toHaveLength(4);
    for (const r of result) {
      expect(r.importance).toBeGreaterThanOrEqual(0);
      expect(r.importance).toBeLessThanOrEqual(100);
    }
  });

  it('ranks the star center first', () => {
    const { nodes, edges } = starGraph();
    const result = computeInfluence(nodes, edges, META);
    expect(result[0].entityId).toBe('a');
    expect(result[0].rank).toBe(1);
  });

  it('is deterministic', () => {
    const { nodes, edges } = starGraph();
    const a = computeInfluence(nodes, edges, META).map((r) => r.importance);
    const b = computeInfluence(nodes, edges, META).map((r) => r.importance);
    expect(a).toEqual(b);
  });

  it('reports component contributions', () => {
    const { nodes, edges } = starGraph();
    const result = computeInfluence(nodes, edges, META);
    const top = result[0];
    expect(top.components.degree).toBeGreaterThanOrEqual(0);
    expect(top.components.betweenness).toBeGreaterThanOrEqual(0);
    expect(top.components.closeness).toBeGreaterThanOrEqual(0);
    expect(top.components.pagerank).toBeGreaterThanOrEqual(0);
  });

  it('accepts custom weights', () => {
    const { nodes, edges } = starGraph();
    const deg = computeInfluence(nodes, edges, META, { weights: { degree: 1 } });
    const pagerank = computeInfluence(nodes, edges, META, { weights: { pagerank: 1 } });
    expect(deg[0].entityId).toBe('a');
    expect(pagerank[0].entityId).toBe('a');
  });
});
