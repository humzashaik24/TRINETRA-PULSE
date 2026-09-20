/**
 * Phase B — generic dashboard network layout tests.
 *
 * The layout must place any node/edge set deterministically: connected
 * components via union-find, star-ring placement around the component hub,
 * and derived stats computed from the input (never hardcoded).
 */

import {
  connectedComponents,
  buildNetworkSummary,
  type NetworkLayoutNode,
  type NetworkLayoutEdge,
} from '@/lib/dashboard/layout';

describe('connectedComponents', () => {
  it('labels isolated nodes as their own components', () => {
    const membership = connectedComponents(['a', 'b', 'c'], []);
    expect(membership.get('a')).not.toBe(membership.get('b'));
    expect(membership.get('b')).not.toBe(membership.get('c'));
  });

  it('merges nodes joined by an edge', () => {
    const membership = connectedComponents(['a', 'b', 'c', 'd'], [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ]);
    expect(membership.get('a')).toBe(membership.get('b'));
    expect(membership.get('b')).toBe(membership.get('c'));
    expect(membership.get('d')).not.toBe(membership.get('a'));
  });

  it('resolves two disjoint subgraphs to two components', () => {
    const membership = connectedComponents(['a', 'b', 'c', 'd'], [
      { source: 'a', target: 'b' },
      { source: 'c', target: 'd' },
    ]);
    const componentOf = (id: string) => membership.get(id);
    expect(componentOf('a')).toBe(componentOf('b'));
    expect(componentOf('c')).toBe(componentOf('d'));
    expect(componentOf('a')).not.toBe(componentOf('c'));
  });
});

function node(id: string, overrides: Partial<NetworkLayoutNode> = {}): NetworkLayoutNode {
  return { id, label: id.toUpperCase(), type: 'person', size: 12, connections: 0, ...overrides };
}

function edge(id: string, source: string, target: string, weight = 0.5): NetworkLayoutEdge {
  return { id, source, target, type: 'PART_OF', weight };
}

describe('buildNetworkSummary', () => {
  it('handles empty input gracefully', () => {
    const summary = buildNetworkSummary({ nodes: [], edges: [] });
    expect(summary.nodes).toHaveLength(0);
    expect(summary.edges).toHaveLength(0);
    expect(summary.clusters).toHaveLength(0);
    expect(summary.density).toBe(0);
    expect(summary.communityCount).toBe(0);
    expect(summary.averageDegree).toBe(0);
    expect(summary.highCentralityCount).toBe(0);
  });

  it('places a single component with the hub at the cluster center', () => {
    const summary = buildNetworkSummary({
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
    });
    expect(summary.communityCount).toBe(1);
    expect(summary.clusters).toHaveLength(1);
    expect(summary.clusters[0].label).toBe('Primary cluster');
    expect(summary.clusters[0].nodeIds).toHaveLength(3);
    // Hub is the highest-degree node (b).
    const hub = summary.nodes.find((n) => n.id === 'b');
    expect(hub).toBeDefined();
    expect(hub!.x).toBeCloseTo(0.2, 5);
    expect(hub!.y).toBeCloseTo(0.5, 5);
    // Ring nodes stay within bounds around the center.
    for (const n of summary.nodes.filter((n) => n.id !== 'b')) {
      expect(n.x).toBeGreaterThanOrEqual(0.03);
      expect(n.x).toBeLessThanOrEqual(0.97);
      const dx = n.x - 0.2;
      const dy = n.y - 0.5;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThanOrEqual(0.3);
    }
    expect(summary.density).toBeCloseTo(0.666666, 5);
    expect(summary.averageDegree).toBeCloseTo(4 / 3, 5);
    expect(summary.highCentralityCount).toBe(0);
  });

  it('labels multiple components distinctly', () => {
    const summary = buildNetworkSummary({
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('e1', 'a', 'b'), edge('e2', 'c', 'd')],
    });
    expect(summary.communityCount).toBe(2);
    expect(summary.clusters.map((c) => c.label)).toEqual(['Community 1', 'Community 2']);
    const colors = summary.clusters.map((c) => c.color);
    expect(new Set(colors).size).toBe(2);
  });

  it('highlights high-degree hubs and scales their size', () => {
    const spokes = Array.from({ length: 9 }, (_, i) => `spoke-${i}`);
    const ring = spokes.map((id) => node(id));
    const edges = spokes.map((id, i) => edge(`e-${i}`, 'hub', id));
    const summary = buildNetworkSummary({
      // connections deliberately undefined so the layout computes them from
      // edge degree (as it does for real workspace entities).
      nodes: [node('hub', { connections: undefined }), ...ring],
      edges,
    });
    const hub = summary.nodes.find((n) => n.id === 'hub');
    expect(hub?.connections).toBe(9);
    expect(hub?.highlighted).toBe(true);
    expect(hub?.size).toBe(18);
    expect(summary.highCentralityCount).toBe(1);
  });

  it('carries node connections and edge weights through', () => {
    const summary = buildNetworkSummary({
      nodes: [node('a', { connections: 2, type: 'organization' }), node('b')],
      edges: [edge('e1', 'a', 'b', 0.9)],
    });
    const a = summary.nodes.find((n) => n.id === 'a');
    expect(a?.type).toBe('organization');
    expect(a?.connections).toBe(2);
    expect(summary.edges[0].weight).toBe(0.9);
    expect(summary.edges[0].type).toBe('PART_OF');
  });
});