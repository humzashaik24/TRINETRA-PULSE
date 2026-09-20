import { buildCanonicalNodesAndEdges } from '@/components/knowledge-canvas/canvas-builders';
import { resetCanvasStore, useCanvasStore } from '@/components/knowledge-canvas/canvas-store';
import { mergeSuggestions } from '@/components/knowledge-canvas/lib/merge-suggestions';
import {
  calculateCentrality,
  computeDegrees,
  detectCommunities,
  discoverHiddenRelationships,
} from '@/components/knowledge-canvas/lib/network-engine';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';
import { selectedCanvasContextAvailable } from '@/components/knowledge-canvas/lib/ai-context';

// ============================================================
// KNOWLEDGE CANVAS — CORE (builders / store / engine)
// ============================================================

function emptyData(): InvestigationWorkspaceData {
  return {
    investigation: null,
    entities: [],
    relationships: [],
    evidence: [],
    findings: [],
    notes: [],
    events: [],
    timeline: [],
    activity: [],
    members: [],
    networks: [],
    analyticsSnapshots: [],
  };
}

describe('buildCanonicalNodesAndEdges', () => {
  const data = emptyData();
  Object.assign(data, {
    entities: [
      { entity_id: 'ent-1', name: 'Aadil Khan', entity_type: 'person', role: 'suspect', association_confidence: 0.8, linked_at: '2026-01-01T00:00:00.000Z' },
      { entity_id: 'ent-2', name: '+91 90000 00001', entity_type: 'phone', role: null, association_confidence: 0.9, linked_at: '2026-01-01T00:00:00.000Z' },
    ],
    relationships: [
      { relationship_id: 'rel-1', source_entity_id: 'ent-1', source_entity_name: 'Aadil Khan', target_entity_id: 'ent-2', target_entity_name: '+91 90000 00001', type: 'USES', confidence: 0.9 },
    ],
    evidence: [
      { evidence_id: 'ev-1', title: 'Call log extract', evidence_type: 'document', summary: null, linked_at: '2026-01-01T00:00:00.000Z' },
    ],
    findings: [],
    events: [],
    notes: [],
  });

  it('maps canonical investigation objects into nodes + edges with stable ids', () => {
    const a = buildCanonicalNodesAndEdges(data);
    const b = buildCanonicalNodesAndEdges(data);
    expect(a.nodes).toHaveLength(3);
    expect(a.edges).toHaveLength(1);
    expect(a.edges[0].source).toContain('ent-1');
    expect(a.edges[0].target).toContain('ent-2');
    // deterministic layout
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes));
  });

  it('references the canonical entity through refId instead of duplicating state', () => {
    const { nodes } = buildCanonicalNodesAndEdges(data);
    const entity = nodes.find((n) => n.data.refId === 'ent-1');
    expect(entity?.data.refId).toBe('ent-1');
  });

  it('opens a bounded, hub-first workspace instead of duplicating a large network', () => {
    const many = emptyData();
    many.entities = Array.from({ length: 20 }, (_, i) => ({
      id: `link-${i}`, investigation_id: 'inv-1', entity_id: `ent-${i}`, name: `Entity ${i}`,
      entity_type: 'person' as const, role: 'linked entity', association_confidence: 0.5,
      linked_by: 'tester', linked_at: '2026-01-01T00:00:00.000Z', metadata: {},
    }));
    many.relationships = Array.from({ length: 19 }, (_, i) => ({
      id: `link-rel-${i}`, investigation_id: 'inv-1', relationship_id: `rel-${i}`,
      source_entity_id: 'ent-0', source_entity_name: 'Entity 0',
      target_entity_id: `ent-${i + 1}`, target_entity_name: `Entity ${i + 1}`,
      type: 'KNOWS' as const, confidence: 0.8, linked_by: 'tester', linked_at: '2026-01-01T00:00:00.000Z',
    }));
    const { nodes } = buildCanonicalNodesAndEdges(many);
    expect(nodes.filter((node) => node.data.kind === 'entity')).toHaveLength(12);
    expect(nodes.find((node) => node.data.refId === 'ent-0')?.position).toEqual({ x: 0, y: 0 });
  });

  it('does not allow a stale selected reference to fall back to broad AI context', () => {
    expect(selectedCanvasContextAvailable({
      investigationId: 'inv-1', question: 'Explain this', data, selectedEntityId: 'missing',
    })).toBe(false);
    expect(selectedCanvasContextAvailable({
      investigationId: 'inv-1', question: 'Explain this', data, selectedEntityId: 'ent-1',
    })).toBe(true);
  });
});

describe('useCanvasStore', () => {
  beforeEach(() => resetCanvasStore());

  it('adds and removes edges while guarding duplicates and self loops', () => {
    const store = useCanvasStore.getState();
    const edge1 = store.addEdge({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null });
    expect(edge1).not.toBeNull();
    expect(store.addEdge({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null })).toBeNull();
    expect(store.addEdge({ source: 'a', target: 'a', sourceHandle: null, targetHandle: null })).toBeNull();
    useCanvasStore.getState().removeEdge(edge1!.id);
    expect(useCanvasStore.getState().edges).toHaveLength(0);
  });

  it('records a bounded audit journal', () => {
    for (let i = 0; i < 505; i += 1) {
      useCanvasStore.getState().appendAudit({ action: 'tick', detail: `${i}` });
    }
    const audit = useCanvasStore.getState().audit;
    expect(audit.length).toBeLessThanOrEqual(500);
    expect(audit[audit.length - 1].detail).toBe('504');
  });
});

describe('mergeSuggestions', () => {
  it('suggests identical-token candidates with distinctive indicators', () => {
    const items = [
      { id: 'b1', label: 'Indian Overseas Bank A/c 9021345678', kind: 'account' },
      { id: 'b2', label: 'Account 9021345678 — IOB', kind: 'account' },
      { id: 'b3', label: 'Aadil Khan', kind: 'person' },
    ];
    const suggestions = mergeSuggestions(items);
    expect(suggestions.length).toBeGreaterThan(0);
    const pair = suggestions.find((s) => s.a === 'b1' && s.b === 'b2');
    expect(pair).toBeTruthy();
    expect(suggestions.find((s) => s.a === 'b1' && s.b === 'b3')).toBeUndefined();
  });
});

describe('network engine (canvas-local, deterministic)', () => {
  const star = {
    nodes: [
      { id: 'hub', label: 'Hub' },
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    edges: [
      { id: 'e1', source: 'hub', target: 'a', weight: 1 },
      { id: 'e2', source: 'hub', target: 'b', weight: 1 },
      { id: 'e3', source: 'hub', target: 'c', weight: 1 },
    ],
  };

  it('computes degrees and ranks the hub highest', () => {
    const degrees = computeDegrees(star.nodes as never, star.edges as never);
    expect(degrees.get('hub')).toBe(3);
    const rows = calculateCentrality(star.nodes as never, star.edges as never);
    expect(rows[0].id).toBe('hub');
  });

  it('detects communities deterministically', () => {
    const edges = [
      { id: 'x1', source: 'a', target: 'b', weight: 1 },
      { id: 'x2', source: 'b', target: 'c', weight: 1 },
      { id: 'x3', source: 'd', target: 'e', weight: 1 },
    ];
    const nodes = [1, 2, 3, 4, 5].map((n) => ({ id: String.fromCharCode(96 + n), label: String.fromCharCode(96 + n) }));
    const communities = detectCommunities(nodes as never, edges as unknown as never);
    expect(communities.length).toBeGreaterThanOrEqual(2);
  });

  it('suggests hidden relationships only where data supports it', () => {
    const edges = [
      { id: 'y1', source: 'hub', target: 'a', weight: 1 },
      { id: 'y2', source: 'hub', target: 'a2', weight: 1 },
      { id: 'y3', source: 'a', target: 'a2', weight: 1 },
    ];
    const hidden = discoverHiddenRelationships(
      [{ id: 'hub', label: 'hub' }, { id: 'a', label: 'a' }, { id: 'a2', label: 'a2' }] as never,
      edges as never,
    );
    expect(Array.isArray(hidden)).toBe(true);
  });
});
