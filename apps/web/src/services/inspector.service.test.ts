import {
  resolveInspectorContext,
  type InspectorEntityView,
  type InspectorCentralityView,
  type InspectorCommunityView,
  type InspectorComponentView,
  type InspectorPatternView,
} from '@/services/inspector.service';
import {
  fetchRelationship,
} from '@/services/entity.service';
import { useAnalyticsStore } from '@/state/analytics.store';

// ============================================================
// PHASE 3.5 — INSPECTOR DATA RESOLUTION
// ============================================================

describe('resolveInspectorContext', () => {
  it('resolves a known entity to a ready entity view', async () => {
    const res = await resolveInspectorContext({
      type: 'entity',
      id: 'ent-person-001',
      name: 'Rahul Kumar',
    });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorEntityView;
      expect(view.kind).toBe('entity');
      expect(view.name).toBe('Rahul Kumar');
      expect(view.entityType).toBe('person');
      expect(view.connections).toBeGreaterThanOrEqual(0);
      expect(view.evidence).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns an error resolution for an unknown entity', async () => {
    const res = await resolveInspectorContext({
      type: 'entity',
      id: 'does-not-exist',
    });
    expect(res.status).toBe('error');
    expect(res.view).not.toBeNull();
  });

  it('resolves a dataset context synchronously', async () => {
    const res = await resolveInspectorContext({ type: 'dataset', id: 'ds-001' });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect(res.view.kind).toBe('dataset');
      expect((res.view as { name: string }).name).toBeTruthy();
    }
  });

  it('resolves a finding context from a suspicious pattern id', async () => {
    const res = await resolveInspectorContext({ type: 'finding', id: 'sp-001' });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect(res.view.kind).toBe('finding');
      expect((res.view as { title: string }).title).toBeTruthy();
    }
  });

  it('resolves a network node context', async () => {
    const res = await resolveInspectorContext({
      type: 'network',
      id: 'n1',
      label: 'NETWORK N1',
      nodeLabel: 'Rahul Kumar',
    });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      expect(res.view.kind).toBe('network');
      expect((res.view as { nodeLabel?: string }).nodeLabel).toBe('Rahul Kumar');
    }
  });
});

describe('fetchRelationship (Phase 3.5 addition)', () => {
  it('resolves a known relationship', async () => {
    const rel = await fetchRelationship('rel-001');
    expect(rel.id).toBe('rel-001');
    expect(rel.type).toBeTruthy();
    expect(rel.sourceEntityName).toBeTruthy();
    expect(rel.targetEntityName).toBeTruthy();
  });

  it('throws for an unknown relationship id', async () => {
    await expect(fetchRelationship('nope')).rejects.toThrow(/not found/i);
  });
});

describe('resolveInspectorContext — Phase 8 analytics views', () => {
  beforeEach(() => {
    useAnalyticsStore.setState({ bundle: null } as any);
  });

  it('resolves a centrality context from its payload without a bundle', async () => {
    const res = await resolveInspectorContext({
      type: 'centrality',
      id: 'degree:ent-person-001',
      metric: 'degree',
      entityId: 'ent-person-001',
      entityName: 'Rahul Kumar',
      score: 0.5,
      rank: 3,
    });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorCentralityView;
      expect(view.kind).toBe('centrality');
      expect(view.metric).toBe('degree');
      expect(view.entityName).toBe('Rahul Kumar');
      expect(view.rank).toBe(3);
    }
  });

  it('resolves a community context and enriches label/size from the bundle', async () => {
    useAnalyticsStore.setState({
      bundle: {
        communities: [{ id: 'c1', label: 'Connected Group 1', size: 5, internalEdgeCount: 4, density: 0.5, cohesion: 0.6, representativeEntities: ['a'], bridgeEntityIds: [], nodeIds: ['a', 'b'] }],
        components: [],
        patterns: [],
      },
    } as any);
    const res = await resolveInspectorContext({ type: 'community', id: 'c1' });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorCommunityView;
      expect(view.kind).toBe('community');
      expect(view.label).toBe('Connected Group 1');
      expect(view.size).toBe(5);
    }
  });

  it('resolves a component context using componentId', async () => {
    useAnalyticsStore.setState({
      bundle: {
        communities: [],
        components: [{ componentId: 'comp1', nodeCount: 4, edgeCount: 3, density: 0.5, representativeNode: 'a', nodeIds: ['a'] }],
        patterns: [],
      },
    } as any);
    const res = await resolveInspectorContext({ type: 'component', id: 'comp1' });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorComponentView;
      expect(view.kind).toBe('component');
      expect(view.nodeCount).toBe(4);
    }
  });

  it('resolves a pattern context with analytical severity only', async () => {
    useAnalyticsStore.setState({
      bundle: {
        communities: [],
        components: [],
        patterns: [
          {
            id: 'pat-1',
            type: 'rapid_connection_growth',
            title: 'Rapid connection growth',
            severity: 'high',
            confidence: 0.9,
            description: 'desc',
            affectedEntities: ['a'],
            period: { from: 'x', to: 'y' },
          },
        ],
      },
    } as any);
    const res = await resolveInspectorContext({ type: 'pattern', id: 'pat-1', patternType: 'rapid_connection_growth' });
    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorPatternView;
      expect(view.kind).toBe('pattern');
      expect(view.severity).toBe('high');
      expect(view.confidence).toBe(0.9);
    }
  });
});