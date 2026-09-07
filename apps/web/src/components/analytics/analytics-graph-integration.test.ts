import { findGraphNodeId, showOnGraph, inspectEntity, inspectCentrality, inspectCommunity, inspectComponent, inspectPattern } from './analytics-graph-integration';
import { useGraphStore } from '@/state/graph.store';
import { useAnalyticsStore } from '@/state/analytics.store';
import { useShellStore } from '@/state/shell.store';

const NODE = {
  id: 'n-1',
  entityId: 'ent-1',
  label: 'Alice',
  type: 'person',
  displayLabel: 'Alice',
  status: 'active',
  confidence: 0.9,
  position: { x: 0, y: 0 },
  size: 1,
  style: { fill: '#fff', stroke: '#000' },
  connections: 2,
  sources: ['S1'],
  metadata: {},
} as any;

describe('analytics-graph-integration', () => {
  const setGraphNodes = (nodes: any[]) =>
    useGraphStore.setState({ nodes } as any);

  beforeEach(() => {
    useAnalyticsStore.getState().clear();
    useShellStore.setState({ inspectorContext: null, inspectorOpen: false } as any);
  });

  it('findGraphNodeId resolves by entityId and falls back to node id', () => {
    setGraphNodes([NODE]);
    expect(findGraphNodeId('ent-1')).toBe('n-1');
    expect(findGraphNodeId('n-1')).toBe('n-1');
    expect(findGraphNodeId('missing')).toBeNull();
  });

  it('showOnGraph centers, focuses and selects a matching node', () => {
    setGraphNodes([NODE]);
    const calls: string[] = [];
    useGraphStore.setState({
      centerOnNode: () => calls.push('center'),
      focusNode: () => calls.push('focus'),
      selectNode: () => calls.push('select'),
    } as any);
    showOnGraph('ent-1');
    expect(calls).toEqual(['center', 'focus', 'select']);
  });

  it('inspectEntity selects the entity and opens an entity context', () => {
    setGraphNodes([NODE]);
    inspectEntity('ent-1', 'Alice');
    expect(useAnalyticsStore.getState().selectedEntityId).toBe('ent-1');
    const ctx = useShellStore.getState().inspectorContext as any;
    expect(ctx?.type).toBe('entity');
    expect(ctx?.id).toBe('ent-1');
  });

  it('inspectCentrality opens a centrality context', () => {
    setGraphNodes([NODE]);
    inspectCentrality('ent-1', 'degree', 'Alice');
    const ctx = useShellStore.getState().inspectorContext as any;
    expect(ctx?.type).toBe('centrality');
    expect(ctx?.metric).toBe('degree');
    expect(ctx?.entityId).toBe('ent-1');
  });

  it('inspectCommunity selects the community and switches the overlay', () => {
    inspectCommunity('c1');
    expect(useAnalyticsStore.getState().selectedCommunityId).toBe('c1');
    expect(useAnalyticsStore.getState().overlay).toBe('community');
    expect((useShellStore.getState().inspectorContext as any)?.type).toBe('community');
  });

  it('inspectComponent selects the component and switches the overlay', () => {
    inspectComponent('comp1');
    expect(useAnalyticsStore.getState().selectedComponentId).toBe('comp1');
    expect(useAnalyticsStore.getState().overlay).toBe('component');
    expect((useShellStore.getState().inspectorContext as any)?.type).toBe('component');
  });

  it('inspectPattern selects the pattern and opens a pattern context', () => {
    inspectPattern('pat-1', 'Rapid growth');
    expect(useAnalyticsStore.getState().selectedPatternId).toBe('pat-1');
    const ctx = useShellStore.getState().inspectorContext as any;
    expect(ctx?.type).toBe('pattern');
    expect(ctx?.id).toBe('pat-1');
  });
});
