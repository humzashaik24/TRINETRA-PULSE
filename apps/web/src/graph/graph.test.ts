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
import { hierarchicalLayout, radialLayout } from './layout';

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
  intelligenceStatuses: [],
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

  it('filters edges by intelligence status (Phase 21)', () => {
    const nodes = graph.nodes;
    const nid = (entityId: string) => nodes.find((n) => n.entityId === entityId)!.id;
    const e1 = nid('e1');
    const e2 = nid('e2');
    const e3 = nid('e3');
    const e4 = nid('e4');

    const reviewed: GraphEdge = {
      id: 'x1',
      relationshipId: 'rel-x',
      source: e1,
      target: e2,
      type: 'KNOWS',
      label: 'A — KNOWS — B',
      confidence: 0.8,
      status: 'needs_review',
      direction: 'undirected',
      weight: 1,
      sourceRecordLabel: 'S1',
      evidence: ['r1'],
      extractionMethod: 'RULE_BASED',
      metadata: {},
      intelligence: { status: 'REVIEWED', confidence: 0.85, confidenceLabel: 'HIGH', sourceCount: 2, correlationKey: 'g-a+b' },
    };
    const singleSource: GraphEdge = {
      id: 'x2',
      relationshipId: 'rel-y',
      source: e1,
      target: e3,
      type: 'OWNS',
      label: 'A — OWNS — C',
      confidence: 0.6,
      status: 'needs_review',
      direction: 'undirected',
      weight: 1,
      sourceRecordLabel: 'S2',
      evidence: ['r2'],
      extractionMethod: 'RULE_BASED',
      metadata: {},
      intelligence: { status: 'NEEDS_REVIEW', confidence: 0.35, confidenceLabel: 'LOW', sourceCount: 1, correlationKey: '' },
    };
    const noIntel: GraphEdge = {
      id: 'x3',
      relationshipId: 'rel-z',
      source: e1,
      target: e4,
      type: 'WORKS_FOR',
      label: 'A — CONTROLS — D',
      confidence: 0.7,
      status: 'needs_review',
      direction: 'undirected',
      weight: 1,
      sourceRecordLabel: 'S1',
      evidence: [],
      extractionMethod: 'RULE_BASED',
      metadata: {},
    };

    const reviewedOnly = selectVisible({
      nodes,
      edges: [reviewed, singleSource, noIntel],
      filters: { ...baseFilters, intelligenceStatuses: ['REVIEWED'] },
      depth: { kind: 'full' },
      timeline: noRange,
      expanded: new Set(),
    });
    expect(reviewedOnly.visibleEdges.map((e) => e.id)).toEqual(['x1']);

    // No filter active → all edges (with or without intelligence) remain.
    const all = selectVisible({
      nodes,
      edges: [reviewed, singleSource, noIntel],
      filters: baseFilters,
      depth: { kind: 'full' },
      timeline: noRange,
      expanded: new Set(),
    });
    expect(all.visibleEdges.map((e) => e.id).sort()).toEqual(['x1', 'x2', 'x3']);
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
