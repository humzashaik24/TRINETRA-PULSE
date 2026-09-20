import type {
  GraphEdge,
  GraphFilters,
  GraphNode,
  GraphTimelineRange,
} from '@trinetra-pulse/types';
import { buildNetwork, type NetworkSeed } from '@/mock/networks/build';
import {
  selectVisible,
  selectionVisuals,
  type DepthMode,
} from './selectors';
import { findShortestPath, type PathGraph } from './path';
import { nodeColorFor, transformEdge, transformNode } from './transform';
import {
  clusteredLayout,
  detectCommunities,
  hierarchicalLayout,
  radialLayout,
} from './layout';

const SEED: NetworkSeed = {
  id: 'T',
  name: 'T',
  description: 'test',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  nodes: [
    { entityId: 'e1', label: 'A', type: 'person', confidence: 0.9, sources: ['S1'], activityAt: '2026-01-05T00:00:00Z' },
    { entityId: 'e2', label: 'B', type: 'person', confidence: 0.5, sources: ['S1'], activityAt: '2026-01-06T00:00:00Z' },
    { entityId: 'e3', label: 'C', type: 'phone', confidence: 0.8, sources: ['S2'], activityAt: '2025-01-01T00:00:00Z' },
    { entityId: 'e4', label: 'D', type: 'organization', confidence: 0.7, sources: ['S1'], activityAt: '2026-01-07T00:00:00Z' },
  ],
  edges: [
    ['e1', 'e2', 'USES', 0.9, 'S1', '2026-01-05T00:00:00Z'],
    ['e1', 'e3', 'OWNS', 0.8, 'S2', '2026-01-05T00:00:00Z'],
    ['e3', 'e4', 'KNOWS', 0.7, 'S1', '2026-01-06T00:00:00Z'],
  ],
  clusters: [],
};

const graph = buildNetwork(SEED);

const baseFilters: GraphFilters = {
  entityTypes: [],
  relationshipTypes: [],
  minConfidence: 0,
  statuses: [],
  sources: [],
  activity: 'all',
};

const noRange: GraphTimelineRange = { from: null, to: null };

const fullDepth: DepthMode = { kind: 'full' };

describe('graph/selectors', () => {
  it('shows everything in full depth with no filters', () => {
    const { visibleNodes, visibleEdges } = selectVisible({
      nodes: graph.nodes,
      edges: graph.edges,
      filters: baseFilters,
      depth: fullDepth,
      timeline: noRange,
      expanded: new Set(),
    });
    expect(visibleNodes.length).toBe(4);
    expect(visibleEdges.length).toBe(3);
  });

  it('filters by entity type', () => {
    const { visibleNodes, visibleEdges } = selectVisible({
      nodes: graph.nodes,
      edges: graph.edges,
      filters: { ...baseFilters, entityTypes: ['person'] },
      depth: fullDepth,
      timeline: noRange,
      expanded: new Set(),
    });
    expect(visibleNodes.map((n) => n.entityId).sort()).toEqual(['e1', 'e2']);
    // edges only retained when both ends remain visible
    expect(visibleEdges.length).toBe(1);
  });

  it('filters by relationship type', () => {
    const { visibleEdges } = selectVisible({
      nodes: graph.nodes,
      edges: graph.edges,
      filters: { ...baseFilters, relationshipTypes: ['OWNS'] },
      depth: fullDepth,
      timeline: noRange,
      expanded: new Set(),
    });
    expect(visibleEdges.map((e) => e.type)).toEqual(['OWNS']);
  });

  it('restricts visibility to a hop radius around a center', () => {
    const a = graph.nodes.find((n) => n.entityId === 'e1')!;
    const { visibleNodes } = selectVisible({
      nodes: graph.nodes,
      edges: graph.edges,
      filters: baseFilters,
      depth: { kind: 'hop', centerId: a.id, depth: 1 },
      timeline: noRange,
      expanded: new Set(),
    });
    // e1 + its direct neighbors e2, e3
    expect(visibleNodes.map((n) => n.entityId).sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('respects the timeline bounds', () => {
    const { visibleEdges } = selectVisible({
      nodes: graph.nodes,
      edges: graph.edges,
      filters: baseFilters,
      depth: fullDepth,
      timeline: { from: '2026-01-06T00:00:00Z', to: '2026-01-06T00:00:00Z' },
      expanded: new Set(),
    });
    expect(visibleEdges.length).toBe(1);
  });

  it('distinguishes expanded-isolated nodes from plain nodes', () => {
    const a = graph.nodes.find((n) => n.entityId === 'e1')!;
    const { visibleNodes } = selectVisible({
      nodes: graph.nodes,
      edges: graph.edges,
      filters: { ...baseFilters, entityTypes: ['organization'] },
      depth: { kind: 'hop', centerId: a.id, depth: 1 },
      timeline: noRange,
      expanded: new Set([graph.nodes.find((n) => n.entityId === 'e4')!.id]),
    });
    // e4 has no person-type neighbours and is expanded, so it surfaces.
    expect(visibleNodes.map((n) => n.entityId)).toContain('e4');
  });

  it('computes dim/focus sets for a selected node', () => {
    const a = graph.nodes.find((n) => n.entityId === 'e1')!;
    const nodesIds = new Set(graph.nodes.map((n) => n.id));
    const edgeIds = new Set(graph.edges.map((e) => e.id));
    const visuals = selectionVisuals(a.id, null, graph.edges, new Set([...nodesIds, ...edgeIds]));
    expect(visuals.focusedNodeIds.has(a.id)).toBe(true);
    expect(visuals.focusedEdgeIds.size).toBe(2);
  });
});

describe('graph/path', () => {
  const pathGraph: PathGraph = { nodes: graph.nodes, edges: graph.edges };

  it('finds the shortest path across multiple hops', () => {
    const a = graph.nodes.find((n) => n.entityId === 'e1')!;
    const d = graph.nodes.find((n) => n.entityId === 'e4')!;
    const path = findShortestPath(pathGraph, a.id, d.id);
    expect(path).not.toBeNull();
    expect(path!.nodeIds[0]).toBe(a.id);
    expect(path!.nodeIds[path!.nodeIds.length - 1]).toBe(d.id);
    expect(path!.length).toBe(2);
    expect(path!.edgeIds.length).toBe(2);
  });

  it('returns null when nodes are disconnected', () => {
    // e2 connects only to e1; create a synthetic isolated node.
    const isolated: GraphNode = {
      ...graph.nodes[0],
      id: 'iso',
      entityId: 'iso-e',
      position: { x: 0, y: 0 },
      connections: 0,
    };
    const path = findShortestPath(
      { nodes: [...graph.nodes, isolated], edges: graph.edges },
      isolated.id,
      graph.nodes.find((n) => n.entityId === 'e1')!.id
    );
    expect(path).toBeNull();
  });
});

describe('graph/transform', () => {
  it('maps nodes to render descriptors', () => {
    const node = graph.nodes.find((n) => n.entityId === 'e1')!;
    const render = transformNode(node);
    expect(render.entityId).toBe('e1');
    expect(render.entityType).toBe('person');
    expect(render.shape).toBe('circle');
  });

  it('maps edges with direction and provenance label', () => {
    const edge = graph.edges.find((e) => e.type === 'KNOWS')!;
    const render = transformEdge(edge);
    expect(render.directed).toBe(false);
    expect(render.sourceLabel).toBe('S1');
  });

  it('assigns deterministic colors per entity type', () => {
    expect(nodeColorFor('person')).not.toBe(nodeColorFor('phone'));
    expect(nodeColorFor('person')).toBe(nodeColorFor('person'));
  });
});

describe('graph/layout', () => {
  it('lays out nodes hierarchically with unique coordinates', () => {
    const positions = hierarchicalLayout(graph.nodes, graph.edges, 800, 600);
    expect(positions.size).toBe(graph.nodes.length);
    const xs = new Set(Array.from(positions.values()).map((p) => p.x));
    expect(xs.size).toBeGreaterThan(1);
  });

  it('lays out nodes radially around the seed', () => {
    const a = graph.nodes.find((n) => n.entityId === 'e1')!;
    const positions = radialLayout(graph.nodes, graph.edges, 800, 600, a.id);
    expect(positions.get(a.id)).toBeDefined();
    expect(positions.size).toBe(graph.nodes.length);
  });
});

// ------------------------------------------------------------
// Phase C.5 — deterministic cluster-aware layout
// ------------------------------------------------------------

function makeNode(entityId: string, type: GraphNode['type'] = 'person'): GraphNode {
  return {
    id: entityId,
    entityId,
    type,
    label: entityId,
    displayLabel: entityId,
    status: 'confirmed',
    confidence: 0.9,
    position: { x: 0, y: 0 },
    size: 12,
    style: { size: 12, shape: 'circle' },
    connections: 0,
    sources: ['S1'],
    metadata: {},
  };
}

function makeEdge(source: string, target: string): GraphEdge {
  return {
    id: `${source}->${target}`,
    relationshipId: `${source}->${target}`,
    source,
    target,
    type: 'KNOWS',
    label: 'knows',
    confidence: 0.9,
    status: 'confirmed',
    direction: 'undirected',
    weight: 1,
    sourceRecordLabel: 'S1',
    evidence: [],
    extractionMethod: 'MANUAL',
    metadata: {},
  };
}

/**
 * Two communities (A around hub a1, B around hub b1) joined by a
 * dedicated bridge node `m` (a3–m–b2). The bridge is deliberately a
 * different, lower-degree entity than each community hub.
 */
function twoClusterFixture() {
  const nodes = [
    makeNode('a1'),
    makeNode('a2'),
    makeNode('a3'),
    makeNode('a4'),
    makeNode('b1'),
    makeNode('b2'),
    makeNode('b3'),
    makeNode('b4'),
    makeNode('m'),
  ];
  const clusterA = [
    ['a1', 'a2'],
    ['a1', 'a3'],
    ['a1', 'a4'],
    ['a2', 'a3'],
  ];
  const clusterB = [
    ['b1', 'b2'],
    ['b1', 'b3'],
    ['b1', 'b4'],
    ['b2', 'b3'],
    ['b2', 'b4'],
    ['b3', 'b4'],
  ];
  const bridge = [
    ['a3', 'm'],
    ['m', 'b2'],
  ];
  const edges = [...clusterA, ...clusterB, ...bridge].map(([s, t]) =>
    makeEdge(s, t)
  );
  return { nodes, edges };
}

function centroid(positions: ReturnType<typeof clusteredLayout>, ids: string[]) {
  const sum = ids.reduce(
    (acc, id) => {
      const p = positions.get(id)!;
      return { x: acc.x + p.x, y: acc.y + p.y };
    },
    { x: 0, y: 0 }
  );
  return { x: sum.x / ids.length, y: sum.y / ids.length };
}

describe('graph/layout — clustered (Phase C.5)', () => {
  const { nodes, edges } = twoClusterFixture();

  it('produces deterministic positions across runs', () => {
    const a = clusteredLayout(nodes, edges, 900, 700);
    const b = clusteredLayout(nodes, edges, 900, 700);
    expect(JSON.stringify(Array.from(a.entries()))).toBe(
      JSON.stringify(Array.from(b.entries()))
    );
  });

  it('does not mutate the graph data contract', () => {
    const nodesBefore = JSON.stringify(nodes);
    const edgesBefore = JSON.stringify(edges);
    clusteredLayout(nodes, edges, 900, 700);
    expect(JSON.stringify(nodes)).toBe(nodesBefore);
    expect(JSON.stringify(edges)).toBe(edgesBefore);
    expect(nodes.every((n) => n.position.x === 0 && n.position.y === 0)).toBe(true);
  });

  it('detects the two communities from topology alone', () => {
    const { clusterOf, clusters } = detectCommunities(nodes, edges);
    expect(clusters.length).toBe(2);
    expect(clusterOf.get('a2')).toBe(clusterOf.get('a3'));
    expect(clusterOf.get('b2')).toBe(clusterOf.get('b3'));
    expect(clusterOf.get('a2')).not.toBe(clusterOf.get('b2'));
  });

  it('separates clusters visually', () => {
    const positions = clusteredLayout(nodes, edges, 900, 700);
    const ca = centroid(positions, ['a2', 'a3', 'a4']);
    const cb = centroid(positions, ['b2', 'b3', 'b4']);
    const separation = Math.hypot(ca.x - cb.x, ca.y - cb.y);
    expect(separation).toBeGreaterThan(150);
    // every member is nearest to its own cluster centroid
    for (const [id, c] of [
      ['a2', ca],
      ['a3', ca],
      ['b2', cb],
      ['b3', cb],
    ] as const) {
      const p = positions.get(id)!;
      const own = Math.hypot(p.x - c.x, p.y - c.y);
      const other = Math.hypot(p.x - (c === ca ? cb.x : ca.x), p.y - (c === ca ? cb.y : ca.y));
      expect(own).toBeLessThan(other);
    }
  });

  it('keeps the cluster hub centred for immediate visibility', () => {
    const positions = clusteredLayout(nodes, edges, 900, 700);
    // a1 has degree 4 (3 intra-cluster + bridge), the highest in its cluster.
    const ca = centroid(positions, ['a1', 'a2', 'a3', 'a4']);
    const distances = ['a1', 'a2', 'a3', 'a4'].map((id) => {
      const p = positions.get(id)!;
      return { id, d: Math.hypot(p.x - ca.x, p.y - ca.y) };
    });
    const nearest = distances.reduce((a, b) => (a.d <= b.d ? a : b));
    expect(nearest.id).toBe('a1');
  });

  it('positions the bridge entity between the clusters it connects', () => {
    const positions = clusteredLayout(nodes, edges, 900, 700);
    const ca = centroid(positions, ['a1', 'a2', 'a3', 'a4']);
    const cb = centroid(positions, ['b1', 'b2', 'b3', 'b4']);
    const midpoint = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
    const bridge = positions.get('m')!;
    const toMidpoint = Math.hypot(bridge.x - midpoint.x, bridge.y - midpoint.y);
    const toOwn = Math.hypot(bridge.x - ca.x, bridge.y - ca.y);
    const toOther = Math.hypot(bridge.x - cb.x, bridge.y - cb.y);
    expect(toMidpoint).toBeLessThan(toOwn);
    expect(toMidpoint).toBeLessThan(toOther);
  });
});
