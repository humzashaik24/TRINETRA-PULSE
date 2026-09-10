import {
  computeStatistics,
  expandNeighborhood,
  findPath,
  getClusters,
  getEdges,
  getNeighbors,
  getNetwork,
  getNetworks,
  getNodes,
  getStatistics,
  getTimeline,
  searchNetwork,
} from './network.service';

describe('network.service', () => {
  it('lists the mock network catalogue', async () => {
    const networks = await getNetworks();
    expect(networks.map((n) => n.id)).toEqual(['NET-001', 'NET-002', 'NET-003', 'NET-004']);
    expect(networks[0].nodeCount).toBeGreaterThan(0);
    expect(networks[0].relationshipCount).toBeGreaterThan(0);
  });

  it('fetches a network graph by id', async () => {
    const graph = await getNetwork('NET-001');
    expect(graph.nodes.length).toBe(55);
    expect(graph.edges.length).toBe(110);
    expect(graph.clusters.length).toBe(6);
  });

  it('throws for an unknown network', async () => {
    await expect(getNetwork('NOPE')).rejects.toThrow('Network not found');
  });

  it('returns nodes, edges and clusters independently', async () => {
    const [nodes, edges, clusters] = await Promise.all([
      getNodes('NET-002'),
      getEdges('NET-002'),
      getClusters('NET-002'),
    ]);
    expect(nodes.length).toBe(28);
    expect(edges.length).toBe(47);
    expect(clusters.length).toBe(4);
  });

  it('expands the 1-hop / 2-hop neighborhood around a node', async () => {
    const graph = await getNetwork('NET-003');
    const hub = graph.nodes.find((n) => n.entityId === 'ent-person-030');
    expect(hub).toBeDefined();

    const one = await getNeighbors('NET-003', hub!.id);
    expect(one.centerId).toBe(hub!.id);
    expect(one.nodes.length).toBeGreaterThan(1);
    expect(one.nodes.some((n) => n.id === hub!.id && n.entityId === 'ent-person-030')).toBe(true);

    const two = expandNeighborhood(graph, hub!.id, { depth: 2 });
    expect(two.nodes.length).toBeGreaterThanOrEqual(one.nodes.length);
  });

  it('computes statistics consistent with the graph', async () => {
    const stats = await getStatistics('NET-001');
    expect(stats.networkId).toBe('NET-001');
    expect(stats.nodes).toBe(55);
    expect(stats.relationships).toBe(110);
    expect(stats.connectedComponents).toBe(2);
    expect(stats.averageDegree).toBeGreaterThan(0);
    expect(stats.density).toBeGreaterThan(0);
    expect(stats.density).toBeLessThan(1);
  });

  it('computes visible-subset statistics', async () => {
    const graph = await getNetwork('NET-003');
    const nodes = new Set(graph.nodes.slice(0, 5).map((n) => n.id));
    const edges = new Set(
      graph.edges.filter((e) => nodes.has(e.source) && nodes.has(e.target)).map((e) => e.id)
    );
    const stats = computeStatistics(graph, { nodes, edges });
    expect(stats.nodes).toBe(5);
    expect(stats.relationships).toBe(edges.size);
  });

  it('finds a shortest path between two entities', async () => {
    const graph = await getNetwork('NET-001');
    const a = graph.nodes.find((n) => n.entityId === 'ent-person-001');
    const b = graph.nodes.find((n) => n.entityId === 'ent-org-002');
    expect(a).toBeDefined();
    expect(b).toBeDefined();

    const path = await findPath('NET-001', a!.id, b!.id);
    expect(path).not.toBeNull();
    expect(path!.nodeIds[0]).toBe(a!.id);
    expect(path!.nodeIds[path!.nodeIds.length - 1]).toBe(b!.id);
    expect(path!.edgeIds.length).toBe(path!.nodeIds.length - 1);
    expect(path!.confidence).toBeGreaterThan(0);
    expect(path!.confidence).toBeLessThanOrEqual(1);
  });

  it('returns null when no path exists (disjoint component)', async () => {
    // NET-001 has an isolated coastal component; use an entity from it.
    const graph = await getNetwork('NET-001');
    const main = graph.nodes.find((n) => n.entityId === 'ent-person-001');
    const coastal = graph.nodes.find((n) => n.entityId === 'ent-org-004');
    expect(main).toBeDefined();
    expect(coastal).toBeDefined();
    const path = await findPath('NET-001', main!.id, coastal!.id);
    expect(path).toBeNull();
  });

  it('searches nodes and edges by query', async () => {
    const byName = await searchNetwork({ query: 'kumar', networkId: 'NET-001' });
    expect(byName.length).toBeGreaterThan(0);
    expect(byName.every((r) => r.kind === 'node')).toBe(true);

    const byType = await searchNetwork({ query: 'uses', networkId: 'NET-001' });
    expect(byType.some((r) => r.kind === 'edge')).toBe(true);
  });

  it('returns a timeline bound by observed range', async () => {
    const range = await getTimeline('NET-001');
    expect(range.from).toBeTruthy();
    expect(range.to).toBeTruthy();
    expect(new Date(range.from!).getTime()).toBeLessThanOrEqual(new Date(range.to!).getTime());
  });
});
