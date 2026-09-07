import { computeCommunities } from './community';
import { starGraph, twoComponentGraph, node, edge } from './fixtures';

describe('computeCommunities', () => {
  it('is deterministic across runs', () => {
    const { nodes, edges } = starGraph();
    const a = computeCommunities(nodes, edges);
    const b = computeCommunities(nodes, edges);
    expect(a).toEqual(b);
  });

  it('labels groups as connected groups, not criminal groups', () => {
    const { nodes, edges } = starGraph();
    const communities = computeCommunities(nodes, edges);
    expect(communities.length).toBeGreaterThan(0);
    for (const c of communities) {
      expect(c.label).toContain('Connected Group');
      expect(c.id).toMatch(/^c/);
    }
  });

  it('keeps a two-component graph in separate communities', () => {
    const { nodes, edges } = twoComponentGraph();
    const communities = computeCommunities(nodes, edges);
    expect(communities.length).toBeGreaterThanOrEqual(2);
  });

  it('reports internal edge counts and density in [0,1]', () => {
    const { nodes, edges } = starGraph();
    const communities = computeCommunities(nodes, edges);
    for (const c of communities) {
      expect(c.density).toBeGreaterThanOrEqual(0);
      expect(c.density).toBeLessThanOrEqual(1);
      expect(c.cohesion).toBeGreaterThanOrEqual(0);
      expect(c.cohesion).toBeLessThanOrEqual(1);
      expect(c.nodeIds.length).toBe(c.size);
    }
  });

  it('handles an empty graph', () => {
    expect(computeCommunities([], [])).toEqual([]);
  });

  it('handles a single isolated node', () => {
    const communities = computeCommunities([node('a')], []);
    expect(communities.length).toBe(1);
    expect(communities[0].nodeIds).toEqual(['a']);
  });

  it('assigns representative entities from the community members', () => {
    const { nodes, edges } = starGraph();
    const communities = computeCommunities(nodes, edges);
    const biggest = communities[0];
    expect(biggest.representativeEntities).not.toHaveLength(0);
    expect(biggest.bridgeEntityIds).toBeDefined();
  });
});
