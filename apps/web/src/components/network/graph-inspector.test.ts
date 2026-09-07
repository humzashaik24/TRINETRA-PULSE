import { graphNodeToContext, graphEdgeToContext } from './graph-inspector';
import type { GraphEdge, GraphNode } from '@trinetra-pulse/types';

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: 'NET-001-n-001',
    entityId: 'ent-person-001',
    type: 'person',
    label: 'Rajesh Kumar',
    displayLabel: 'Rajesh Kumar',
    status: 'probable',
    confidence: 0.87,
    position: { x: 0, y: 0 },
    size: 18,
    style: { size: 18 },
    connections: 5,
    sources: ['FIR-2026-001'],
    metadata: {},
    ...overrides,
  };
}

function makeEdge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    id: 'NET-001-e-001',
    relationshipId: 'rel-e-001',
    source: 'NET-001-n-001',
    target: 'NET-001-n-002',
    type: 'KNOWS',
    label: 'knows',
    confidence: 0.72,
    status: 'probable',
    direction: 'directed',
    weight: 1,
    sourceRecordLabel: 'CDR-2026',
    timestamp: '2026-01-15T10:00:00Z',
    evidence: ['Subscriber matched on CDR record'],
    extractionMethod: 'STRUCTURED_MAPPING',
    metadata: {},
    ...overrides,
  };
}

describe('graph-inspector', () => {
  describe('graphNodeToContext', () => {
    it('maps a graph node to an entity inspector context with graph hints', () => {
      const ctx = graphNodeToContext(makeNode());
      expect(ctx.type).toBe('entity');
      expect(ctx.id).toBe('ent-person-001');
      expect(ctx.name).toBe('Rajesh Kumar');
      expect(ctx.entityType).toBe('person');
      expect(ctx.confidence).toBe(0.87);
      expect(ctx.connections).toBe(5);
      expect(ctx.sources).toEqual(['FIR-2026-001']);
    });

    it('falls back to the canonical entity id for profile lookup', () => {
      const ctx = graphNodeToContext(makeNode());
      // The context id must be the canonical entity id so Phase 6
      // entity data (when available) is used by the inspector.
      expect(ctx.id).toBe('ent-person-001');
    });
  });

  describe('graphEdgeToContext', () => {
    const labels = new Map<string, { name: string; type: string }>([
      ['NET-001-n-001', { name: 'Rajesh Kumar', type: 'person' }],
      ['NET-001-n-002', { name: '+91 98765 43210', type: 'phone' }],
    ]);

    it('maps a graph edge to a relationship inspector context with node names', () => {
      const ctx = graphEdgeToContext(makeEdge(), labels);
      expect(ctx.type).toBe('relationship');
      expect(ctx.relationshipType).toBe('KNOWS');
      expect(ctx.sourceEntityName).toBe('Rajesh Kumar');
      expect(ctx.sourceEntityType).toBe('person');
      expect(ctx.targetEntityName).toBe('+91 98765 43210');
      expect(ctx.targetEntityType).toBe('phone');
      expect(ctx.sourceEntityId).toBe('NET-001-n-001');
      expect(ctx.targetEntityId).toBe('NET-001-n-002');
      expect(ctx.confidence).toBe(0.72);
      expect(ctx.source).toBe('CDR-2026');
      expect(ctx.evidence).toEqual(['Subscriber matched on CDR record']);
      expect(ctx.direction).toBe('directed');
      expect(ctx.verificationStatus).toBe('probable');
    });

    it('falls back to raw ids when node labels are absent', () => {
      const ctx = graphEdgeToContext(makeEdge(), new Map());
      expect(ctx.sourceEntityName).toBe('NET-001-n-001');
      expect(ctx.targetEntityName).toBe('NET-001-n-002');
    });
  });
});
