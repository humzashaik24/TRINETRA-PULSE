import {
  findConnectedComponents,
  calculateDensity,
  calculateSummary,
  computeAveragePathLengthAndDiameter,
} from './components';
import { node, edge, starGraph, twoComponentGraph } from './fixtures';

describe('components & density', () => {
  describe('findConnectedComponents', () => {
    it('finds one component for a star graph', () => {
      const { nodes, edges } = starGraph();
      const components = findConnectedComponents(nodes, edges);
      expect(components).toHaveLength(1);
      expect(components[0].componentId).toBe('comp1');
      expect(components[0].nodeCount).toBe(4);
    });

    it('finds two components for a disconnected graph', () => {
      const { nodes, edges } = twoComponentGraph();
      const components = findConnectedComponents(nodes, edges);
      expect(components).toHaveLength(2);
    });

    it('sorts components largest-first', () => {
      const nodes = [node('a'), node('b'), node('c'), node('d')];
      const edges = [edge('ab', 'a', 'b')];
      const components = findConnectedComponents(nodes, edges);
      expect(components[0].componentId).toBe('comp1');
      expect(components[0].nodeCount).toBe(2);
      expect(components[0].nodeCount).toBeGreaterThan(components[1].nodeCount);
    });
  });

  describe('calculateDensity', () => {
    it('is 0 for an empty graph', () => {
      expect(calculateDensity([], []).density).toBe(0);
    });

    it('is 1 for a fully connected pair', () => {
      const nodes = [node('a'), node('b')];
      const edges = [edge('ab', 'a', 'b')];
      expect(calculateDensity(nodes, edges).density).toBe(1);
    });

    it('labels sparse graphs', () => {
      const nodes = [node('a'), node('b'), node('c'), node('d'), node('e'), node('f')];
      const edges = [edge('ab', 'a', 'b')];
      const result = calculateDensity(nodes, edges);
      expect(result.density).toBeLessThan(0.1);
      expect(result.interpretation).toContain('Sparse');
    });
  });

  describe('computeAveragePathLengthAndDiameter', () => {
    it('computes a finite average for a connected graph', () => {
      const { nodes, edges } = starGraph();
      const { averagePathLength, diameter } = computeAveragePathLengthAndDiameter(nodes, edges);
      expect(averagePathLength).not.toBeNull();
      expect(diameter).toBe(2);
    });

    it('returns nulls for an empty graph', () => {
      const { averagePathLength, diameter } = computeAveragePathLengthAndDiameter([], []);
      expect(averagePathLength).toBeNull();
      expect(diameter).toBeNull();
    });
  });

  describe('calculateSummary', () => {
    it('aggregates counts into a summary', () => {
      const { nodes, edges } = starGraph();
      const components = findConnectedComponents(nodes, edges);
      const summary = calculateSummary('net-1', nodes, edges, components, 1, ['a'], 2, 2);
      expect(summary.networkId).toBe('net-1');
      expect(summary.nodes).toBe(4);
      expect(summary.relationships).toBe(3);
      expect(summary.connectedComponents).toBe(1);
      expect(summary.topConnectedEntity).toBeDefined();
      expect(summary.averageDegree).toBeCloseTo(1.5, 1);
    });
  });
});
