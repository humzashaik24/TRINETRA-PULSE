import { buildTemporalSnapshots } from './temporal';
import { node, edge } from './fixtures';

const META_DAY1 = '2024-01-01T00:00:00.000Z';
const META_DAY2 = '2024-01-10T00:00:00.000Z';
const META_DAY3 = '2024-01-20T00:00:00.000Z';

function datedNodes(): ReturnType<typeof node>[] {
  return [
    node('a', { activityAt: META_DAY1 }),
    node('b', { activityAt: META_DAY2 }),
    node('c', { activityAt: META_DAY3 }),
  ];
}

describe('buildTemporalSnapshots', () => {
  it('returns null when no temporal data exists', () => {
    expect(buildTemporalSnapshots([node('a')], [], { periods: 3 })).toBeNull();
  });

  it('produces period snapshots with cumulative bookkeeping', () => {
    const nodes = datedNodes();
    const edges = [
      edge('ab', 'a', 'b', { timestamp: META_DAY1 }),
      edge('bc', 'b', 'c', { timestamp: META_DAY2 }),
    ];
    const result = buildTemporalSnapshots(nodes, edges, { periods: 3 });
    expect(result).not.toBeNull();
    expect(result!.snapshots.length).toBe(3);
    // Cumulative: second period must report a new node (c appears).
    expect(result!.snapshots.some((s) => s.newNodes > 0)).toBe(true);
    expect(result!.snapshots.some((s) => s.newRelationships > 0)).toBe(true);
  });

  it('exposes activeEdgeIds per snapshot', () => {
    const nodes = datedNodes();
    const edges = [edge('ab', 'a', 'b', { timestamp: META_DAY1 })];
    const result = buildTemporalSnapshots(nodes, edges, { periods: 1 });
    expect(result!.snapshots[0].activeEdgeIds).toEqual(['ab']);
  });

  it('labels each period', () => {
    const nodes = datedNodes();
    const edges = [edge('ab', 'a', 'b', { timestamp: META_DAY1 })];
    const result = buildTemporalSnapshots(nodes, edges, { periods: 2 });
    expect(result!.periodLabels.length).toBe(2);
    for (const label of result!.periodLabels) expect(label.length).toBeGreaterThan(0);
  });

  it('caps the period count', () => {
    const nodes = datedNodes();
    const edges = [edge('ab', 'a', 'b', { timestamp: META_DAY1 })];
    const result = buildTemporalSnapshots(nodes, edges, { periods: 999 });
    expect(result!.snapshots.length).toBeLessThanOrEqual(8);
  });
});
