import { mockNetworkGraphs, mockNetworkSummaries } from './index';

describe('mock networks data integrity', () => {
  it('provides the expected network catalogue', () => {
    expect(mockNetworkGraphs.map((n) => n.id)).toEqual(['NET-001', 'NET-002', 'NET-003', 'NET-004']);
    expect(mockNetworkSummaries.length).toBe(4);
  });

  it('reference only existing node ids in edges and clusters', () => {
    for (const graph of mockNetworkGraphs) {
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }
      for (const cluster of graph.clusters) {
        for (const nodeId of cluster.nodeIds) {
          expect(nodeIds.has(nodeId)).toBe(true);
        }
      }
    }
  });

  it('has unique node and edge ids per network', () => {
    for (const graph of mockNetworkGraphs) {
      const nodeIds = graph.nodes.map((n) => n.id);
      const edgeIds = graph.edges.map((e) => e.id);
      expect(new Set(nodeIds).size).toBe(nodeIds.length);
      expect(new Set(edgeIds).size).toBe(edgeIds.length);
    }
  });

  it('NET-001 satisfies the phase entity/relationship scale', () => {
    const clean = mockNetworkGraphs.find((n) => n.id === 'NET-001');
    expect(clean).toBeDefined();
    expect(clean!.nodes.length).toBeGreaterThanOrEqual(40);
    expect(clean!.nodes.length).toBeLessThanOrEqual(60);
    expect(clean!.edges.length).toBeGreaterThanOrEqual(100);
    expect(clean!.clusters.length).toBeGreaterThanOrEqual(5);
    expect(clean!.metadata.connectedComponents).toBeGreaterThanOrEqual(2);
  });

  it('covers multiple entity types and relationship kinds', () => {
    const clean = mockNetworkGraphs.find((n) => n.id === 'NET-001');
    const types = new Set(clean!.nodes.map((n) => n.type));
    const kinds = Array.from(new Set(clean!.edges.map((e) => e.type)));
    expect(types.size).toBeGreaterThanOrEqual(8);
    expect(kinds.length).toBeGreaterThanOrEqual(8);
    expect(kinds).toEqual(
      expect.arrayContaining(['USES', 'OWNS', 'KNOWS', 'WORKS_FOR', 'LOCATED_AT', 'OWNS_ACCOUNT', 'SENT_TRANSACTION', 'INVOLVED_IN', 'PART_OF', 'SUPPORTED_BY'])
    );
  });

  it('references canonical Phase 6 entity ids where available', () => {
    const clean = mockNetworkGraphs.find((n) => n.id === 'NET-001');
    const entityIds = new Set(clean!.nodes.map((n) => n.entityId));
    expect(entityIds.has('ent-person-001')).toBe(true);
    expect(entityIds.has('ent-phone-001')).toBe(true);
    expect(entityIds.has('ent-org-001')).toBe(true);
    expect(entityIds.has('ent-case-001')).toBe(true);
  });

  it('exposes a spread of timestamps for the timeline', () => {
    const clean = mockNetworkGraphs.find((n) => n.id === 'NET-001');
    const years = new Set(
      clean!.edges.map((e) => e.timestamp?.slice(0, 4)).filter(Boolean)
    );
    expect(years.size).toBeGreaterThanOrEqual(3);
  });

  it('builds consistent summaries', () => {
    for (const summary of mockNetworkSummaries) {
      expect(summary.nodeCount).toBe(mockNetworkGraphs.find((g) => g.id === summary.id)!.nodes.length);
      expect(summary.relationshipCount).toBe(mockNetworkGraphs.find((g) => g.id === summary.id)!.edges.length);
      expect(summary.status).toBe('ready');
      expect(summary.sources.length).toBeGreaterThan(0);
    }
  });
});