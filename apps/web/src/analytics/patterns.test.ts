import { detectStructuralPatterns } from './patterns';
import type { TemporalAnalyticsResult, NetworkComponent, InfluenceResult } from '@trinetra-pulse/types';
import { node, edge } from './fixtures';

function snapshot(over: Partial<any> = {}): any {
  return {
    period: '2024-01-01T00:00:00.000Z|2024-01-01T00:00:00.999Z',
    label: '2024-01-01',
    nodeCount: 3,
    relationshipCount: 3,
    newNodes: 0,
    newRelationships: 0,
    inactiveRelationships: 0,
    communityCount: 2,
    averageDegree: 2,
    density: 0.5,
    metrics: {},
    centralityChange: {},
    topEntities: ['a', 'b'],
    activeEdgeIds: [],
    ...over,
  };
}

const components: NetworkComponent[] = [
  { componentId: 'comp1', nodeCount: 1, edgeCount: 0, density: 0, representativeNode: 'a', nodeIds: ['a'] },
  { componentId: 'comp2', nodeCount: 3, edgeCount: 2, density: 0.33, representativeNode: 'b', nodeIds: ['b', 'c', 'd'] },
];

const influence: InfluenceResult[] = [
  { entityId: 'a', importance: 90, components: { degree: 1, betweenness: 1, closeness: 1, pagerank: 1 }, rank: 1, metadata: {} as any },
  { entityId: 'b', importance: 50, components: { degree: 0.5, betweenness: 0.5, closeness: 0.5, pagerank: 0.5 }, rank: 2, metadata: {} as any },
];

describe('detectStructuralPatterns', () => {
  it('emits a deterministic id sequence for the same input', () => {
    const temporal: TemporalAnalyticsResult = { snapshots: [snapshot(), snapshot({ newRelationships: 4, newNodes: 3 })], periodLabels: ['x', 'y'] };
    const a = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    const b = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it('flags rapid connection growth between periods', () => {
    const temporal: TemporalAnalyticsResult = {
      snapshots: [snapshot(), snapshot({ newRelationships: 4, newNodes: 3 })],
      periodLabels: ['earlier', 'latest'],
    };
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    expect(patterns.some((p) => p.type === 'rapid_connection_growth')).toBe(true);
  });

  it('flags community merging on a count drop', () => {
    const temporal: TemporalAnalyticsResult = {
      snapshots: [snapshot({ communityCount: 5 }), snapshot({ communityCount: 3 })],
      periodLabels: ['a', 'b'],
    };
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    expect(patterns.some((p) => p.type === 'community_merging')).toBe(true);
  });

  it('flags community splitting on a count rise', () => {
    const temporal: TemporalAnalyticsResult = {
      snapshots: [snapshot({ communityCount: 2 }), snapshot({ communityCount: 4 })],
      periodLabels: ['a', 'b'],
    };
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    expect(patterns.some((p) => p.type === 'community_splitting')).toBe(true);
  });

  it('flags a sudden connectivity increase', () => {
    const temporal: TemporalAnalyticsResult = {
      snapshots: [
        snapshot({ centralityChange: {} }),
        snapshot({ centralityChange: { bob: { degree: 0.55 } } }),
      ],
      periodLabels: ['a', 'b'],
    };
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    expect(patterns.some((p) => p.type === 'sudden_degree_increase')).toBe(true);
  });

  it('falls back to an unavailable pattern when no data', () => {
    const patterns = detectStructuralPatterns({ temporal: null, components, influence, nodes: [], edges: [] });
    expect(patterns.length).toBe(1);
    expect(patterns[0].type).toBe('pattern_unavailable');
  });

  it('sorts by descending confidence', () => {
    const temporal: TemporalAnalyticsResult = {
      snapshots: [snapshot({ centralityChange: {} }), snapshot({ newRelationships: 4, newNodes: 3, centralityChange: { bob: { degree: 0.55 } } })],
      periodLabels: ['a', 'b'],
    };
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    const confs = patterns.map((p) => p.confidence);
    expect(confs).toEqual([...confs].sort((a, b) => b - a));
  });

  it('labels severity as analytical significance types', () => {
    const temporal: TemporalAnalyticsResult = {
      snapshots: [snapshot(), snapshot({ newRelationships: 4, newNodes: 3 })],
      periodLabels: ['a', 'b'],
    };
    const patterns = detectStructuralPatterns({ temporal, components, influence, nodes: [], edges: [] });
    const allowed = new Set(['high', 'medium', 'info']);
    for (const p of patterns) {
      expect(allowed.has(p.severity)).toBe(true);
    }
  });
});
