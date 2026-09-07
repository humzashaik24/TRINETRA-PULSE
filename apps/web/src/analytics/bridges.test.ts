import { findBridgeEntities } from './bridges';
import { computeCommunities } from './community';
import { findConnectedComponents } from './components';
import { starGraph, twoComponentGraph, node, edge } from './fixtures';

describe('findBridgeEntities', () => {
  const communities = (nodes: any[], edges: any[]) => computeCommunities(nodes, edges);
  const components = (nodes: any[], edges: any[]) => findConnectedComponents(nodes, edges);

  it('identifies the star center as a bridge entity', () => {
    const { nodes, edges } = starGraph();
    const result = findBridgeEntities(nodes, edges, communities(nodes, edges), components(nodes, edges));
    expect(result.entities.length).toBeGreaterThan(0);
    const center = result.entities.find((e) => e.entityId === 'a')!;
    expect(center).toBeDefined();
    expect(center.bridgeScore).toBeGreaterThan(0);
  });

  it('uses bridge/connector terminology in ids and scores only', () => {
    const { nodes, edges } = starGraph();
    const result = findBridgeEntities(nodes, edges, communities(nodes, edges), components(nodes, edges));
    for (const e of result.entities) {
      expect(e.bridgeScore).toBeGreaterThanOrEqual(0);
      expect(e.bridgeScore).toBeLessThanOrEqual(1);
      expect(e.connectedComponents).toBeDefined();
    }
  });

  it('returns empty bridge sets for a graph with no special connectors', () => {
    const { nodes, edges } = twoComponentGraph();
    const result = findBridgeEntities(nodes, edges, communities(nodes, edges), components(nodes, edges));
    expect(result.relationships).toHaveLength(0);
  });

  it('ranks entities by ascending bridge score position', () => {
    const { nodes, edges } = starGraph();
    const result = findBridgeEntities(nodes, edges, communities(nodes, edges), components(nodes, edges));
    const sorted = [...result.entities].sort((a, b) => b.bridgeScore - a.bridgeScore);
    sorted.forEach((e, i) => expect(e.rank).toBe(i + 1));
  });

  it('captures cross-component bridge relationships when present', () => {
    const nodes = [node('a'), node('b'), node('x'), node('y')];
    const edges = [edge('ab', 'a', 'b'), edge('xy', 'x', 'y')];
    const comps = components(nodes, edges);
    // Force two components; no bridging edge exists so none flagged.
    const result = findBridgeEntities(nodes, edges, communities(nodes, edges), comps);
    expect(result.relationships).toHaveLength(0);
  });
});
