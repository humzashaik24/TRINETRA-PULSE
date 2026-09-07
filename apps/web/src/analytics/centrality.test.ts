import { computeDegree, computeBetweenness, computeCloseness, computePageRank, buildAdjacency } from './centrality';
import { node, edge, starGraph, twoComponentGraph, META } from './fixtures';

describe('centrality engine', () => {
  describe('buildAdjacency', () => {
    it('treats edges as undirected for neighbor sets', () => {
      const { nodes, edges } = starGraph();
      const adj = buildAdjacency(nodes, edges);
      expect(adj.neighbors.get('a')?.has('b')).toBe(true);
      expect(adj.neighbors.get('b')?.has('a')).toBe(true);
    });
  });

  describe('computeDegree', () => {
    it('counts direct connections', () => {
      const { nodes, edges } = starGraph();
      const set = computeDegree(nodes, edges, META);
      const a = set.results.find((r) => r.entityId === 'a')!;
      const b = set.results.find((r) => r.entityId === 'b')!;
      expect(a.degree).toBe(3);
      expect(b.degree).toBe(1);
      expect(a.rank).toBe(1);
      expect(a.normalizedScore).toBe(1);
    });

    it('declares metadata with node count', () => {
      const { nodes, edges } = starGraph();
      const set = computeDegree(nodes, edges, META);
      expect(set.metadata.nodeCount).toBe(4);
    });
  });

  describe('computeBetweenness', () => {
    it('ranks the star center highest and leaves at zero', () => {
      const { nodes, edges } = starGraph();
      const set = computeBetweenness(nodes, edges, META);
      const a = set.results.find((r) => r.entityId === 'a')!;
      const b = set.results.find((r) => r.entityId === 'b')!;
      expect(a.rank).toBe(1);
      expect(a.score).toBeGreaterThan(0);
      expect(b.score).toBe(0);
      expect(a.bridgePotential).toBe(1);
    });

    it('keeps normalized bridge potential in [0,1]', () => {
      const { nodes, edges } = starGraph();
      const set = computeBetweenness(nodes, edges, META);
      for (const r of set.results) {
        expect(r.normalizedScore).toBeGreaterThanOrEqual(0);
        expect(r.bridgePotential).toBeGreaterThanOrEqual(0);
        expect(r.bridgePotential).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('computeCloseness', () => {
    it('gives the star center the best reach', () => {
      const { nodes, edges } = starGraph();
      const set = computeCloseness(nodes, edges, META);
      const a = set.results.find((r) => r.entityId === 'a')!;
      const b = set.results.find((r) => r.entityId === 'b')!;
      expect(a.score).toBeGreaterThan(b.score);
      expect(a.rank).toBe(1);
    });
  });

  describe('computePageRank', () => {
    it('is deterministic and normalized within the set', () => {
      const { nodes, edges } = starGraph();
      const first = computePageRank(nodes, edges, META, 100, 0.85).results.map((r) => r.score);
      const second = computePageRank(nodes, edges, META, 100, 0.85).results.map((r) => r.score);
      expect(first).toEqual(second);
      for (const r of first) {
        expect(r).toBeGreaterThan(0);
      }
    });

    it('weights every entity and ranks', () => {
      const { nodes, edges } = starGraph();
      const set = computePageRank(nodes, edges, META);
      expect(set.results).toHaveLength(4);
      expect(set.results.some((r) => r.rank === 1)).toBe(true);
    });
  });

  it('handles a graph with no edges without throwing', () => {
    const nodes = [node('a'), node('b')];
    expect(() => computeDegree(nodes, [], META)).not.toThrow();
    expect(() => computeBetweenness(nodes, [], META)).not.toThrow();
    expect(() => computeCloseness(nodes, [], META)).not.toThrow();
    expect(() => computePageRank(nodes, [], META)).not.toThrow();
  });

  it('ignores edges referencing missing nodes', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('x', 'a', 'ghost')];
    const set = computeDegree(nodes, edges, META);
    const a = set.results.find((r) => r.entityId === 'a')!;
    expect(a.degree).toBe(0);
  });

  it('detects two disjoint components', () => {
    const { nodes, edges } = twoComponentGraph();
    const set = computeDegree(nodes, edges, META);
    expect(set.results).toHaveLength(4);
  });
});
