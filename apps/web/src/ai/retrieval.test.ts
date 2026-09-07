import {
  retrieveInvestigationContext,
  serializeBundle,
  sourcesFromBundle,
} from './retrieval';
import type { ContextSourceBundle } from './context-builder';
import * as api from '@/lib/api/investigations';

jest.mock('@/lib/api/investigations', () => ({
  getInvestigationSummary: jest.fn(),
  getInvestigation: jest.fn(),
  listEntitiesForInvestigation: jest.fn(),
  listRelationshipsForInvestigation: jest.fn(),
  listEvidenceForInvestigation: jest.fn(),
  listFindingsForInvestigation: jest.fn(),
  getTimeline: jest.fn(),
  getNetworkGraph: jest.fn(),
  getNetworkAnalytics: jest.fn(),
  getEntity: jest.fn(),
}));

const mocked = api as jest.Mocked<typeof api>;

const INV = '6c887c98-939a-50ce-ac27-f58376941de2';

const summary = {
  id: INV,
  title: 'Operation Meridian',
  status: 'active',
  priority: 'high',
  entity_count: 2,
  relationship_count: 1,
  evidence_count: 1,
  finding_count: 1,
  event_count: 1,
  note_count: 1,
  updated_at: '2026-01-01T00:00:00Z',
};

const entities = [
  {
    id: 'ent-1',
    investigation_id: INV,
    entity_type: 'person',
    canonical_name: 'Rahul Kumar',
    name: 'Rahul Kumar',
    description: 'Flagged individual',
    attributes: {},
    confidence: 0.9,
    risk_score: 0.85,
    is_verified: true,
    is_flagged: true,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ent-2',
    investigation_id: INV,
    entity_type: 'account',
    canonical_name: 'A/C 1234',
    name: 'A/C 1234',
    description: null,
    attributes: {},
    confidence: 0.7,
    risk_score: 0.5,
    is_verified: true,
    is_flagged: false,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const relationships = [
  {
    id: 'rel-1',
    investigation_id: INV,
    source_entity_id: 'ent-1',
    target_entity_id: 'ent-2',
    relationship_type: 'controls',
    confidence: 0.85,
    source: null,
    evidence_refs: [],
    verification_status: 'verified',
    description: null,
    weight: 1,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const evidence = [
  {
    id: 'ev-1',
    investigation_id: INV,
    evidence_type: 'document',
    title: 'Bank Transaction Log',
    description: 'Recorded transfer to flagged account',
    source: 'FIR Records',
    provenance: {},
    collected_at: '2026-01-02T00:00:00Z',
    storage_ref: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const findings = [
  {
    id: 'fnd-1',
    investigation_id: INV,
    title: 'Shared company relationship observed',
    description: 'Two flagged entities share a registered company address.',
    severity: 'medium',
    confidence: 'observed',
    status: 'open',
    entity_refs: ['ent-1'],
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('ai/retrieval — investigation-scoped real retrieval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mocked.getInvestigationSummary.mockResolvedValue(summary);
    mocked.getInvestigation.mockResolvedValue({
      id: INV,
      title: 'Operation Meridian',
      description: 'Demo investigation',
      status: 'active',
      priority: 'high',
      lead_investigator: 'Inspector Mehta',
      assigned_team: [],
      tags: [],
      started_at: null,
      closed_at: null,
      metadata: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
    mocked.listEntitiesForInvestigation.mockResolvedValue(entities);
    mocked.listRelationshipsForInvestigation.mockResolvedValue(relationships);
    mocked.listEvidenceForInvestigation.mockResolvedValue(evidence);
    mocked.listFindingsForInvestigation.mockResolvedValue(findings);
    mocked.getTimeline.mockResolvedValue({
      investigation_id: INV,
      entries: [
        { kind: 'event', at: '2026-01-02T00:00:00Z', title: 'Arrest logged', ref_id: 'evt-1', actor: 'Inspector Mehta', description: 'Recorded event' },
        { kind: 'finding', at: '2026-01-03T00:00:00Z', title: 'Shared address', ref_id: null, actor: null, description: 'drop me' },
        { kind: 'note', at: null, title: 'Case note', ref_id: null, actor: 'Analyst', description: null },
      ],
    });
    mocked.getNetworkGraph.mockResolvedValue({
      investigation_id: INV,
      nodes: [
        { id: 'ent-1', name: 'Rahul Kumar', entity_type: 'person', risk_score: 0.85, is_verified: true, is_flagged: true },
        { id: 'ent-2', name: 'A/C 1234', entity_type: 'account', risk_score: 0.5, is_verified: true, is_flagged: false },
      ],
      edges: [{ id: 'rel-1', source: 'ent-1', target: 'ent-2', relationship_type: 'controls', weight: 0.85 }],
    });
    mocked.getNetworkAnalytics.mockResolvedValue({
      investigation_id: INV,
      entity_count: 2,
      relationship_count: 1,
      connected_components: 1,
      average_degree: 0.5,
      flagged_entity_count: 1,
      verified_entity_count: 2,
      high_risk_entity_count: 1,
    });
  });

  it('returns a bounded, investigation-scoped bundle', async () => {
    const result = await retrieveInvestigationContext({ investigationId: INV });
    expect(result).not.toBeNull();
    expect(result!.bundle.investigation?.title).toBe('Operation Meridian');
    expect(result!.bundle.relationships).toHaveLength(1);
    expect(result!.bundle.relationships?.[0].sourceName).toBe('Rahul Kumar');
    expect(result!.bundle.evidence?.[0].title).toBe('Bank Transaction Log');
    expect(result!.bundle.findings?.[0].id).toBe('fnd-1');
    // findings are excluded from the timeline slice (mock-parity)
    expect(result!.bundle.timeline).toHaveLength(2);
    expect(result!.bundle.analytics?.nodes).toBe(2);
    expect(result!.bundle.network?.id).toBe(INV);
  });

  it('retrieves strictly the investigation scope (no cross-investigation reads)', async () => {
    await retrieveInvestigationContext({ investigationId: INV });
    expect(mocked.listEntitiesForInvestigation).toHaveBeenCalledWith(INV);
    expect(mocked.listRelationshipsForInvestigation).toHaveBeenCalledWith(INV);
    expect(mocked.listEvidenceForInvestigation).toHaveBeenCalledWith(INV);
    expect(mocked.listFindingsForInvestigation).toHaveBeenCalledWith(INV);
    expect(mocked.getTimeline).toHaveBeenCalledWith(INV);
    expect(mocked.getNetworkGraph).toHaveBeenCalledWith(INV);
    expect(mocked.getNetworkAnalytics).toHaveBeenCalledWith(INV);
  });

  it('attaches the selected entity only when it belongs to the investigation', async () => {
    mocked.getEntity.mockResolvedValue(entities[0]);
    const result = await retrieveInvestigationContext({
      investigationId: INV,
      entityId: 'ent-1',
    });
    expect(result!.bundle.entity?.name).toBe('Rahul Kumar');
    expect(result!.bundle.entity?.connectionsCount).toBe(1);
    expect(result!.bundle.entity?.resolutionState).toBe('flagged');
  });

  it('skips an entity that belongs to another investigation (isolation)', async () => {
    mocked.getEntity.mockResolvedValue({
      ...entities[0],
      id: 'ent-x',
      investigation_id: 'other-inv',
    });
    const result = await retrieveInvestigationContext({
      investigationId: INV,
      entityId: 'ent-x',
    });
    expect(result!.bundle.entity).toBeUndefined();
  });

  it('returns null when there is no investigation scope', async () => {
    const result = await retrieveInvestigationContext({});
    expect(result).toBeNull();
    expect(mocked.getInvestigationSummary).not.toHaveBeenCalled();
  });

  it('degrades safely to null when retrieval fails', async () => {
    mocked.getInvestigationSummary.mockRejectedValue(new Error('down'));
    const result = await retrieveInvestigationContext({ investigationId: INV });
    expect(result).toBeNull();
  });

  it('serializes the bundle into the backend DATA payload', () => {
    const bundle: ContextSourceBundle = {
      investigation: {
        id: INV,
        title: 'Operation Meridian',
        status: 'active',
        priority: 'high',
        description: null,
        entityCount: 2,
        relationshipCount: 1,
        evidenceCount: 1,
      },
      entity: {
        id: 'ent-1',
        name: 'Rahul Kumar',
        entityType: 'person',
        resolutionState: 'flagged',
        confidence: 0.9,
        connectionsCount: 1,
      },
      relationships: [
        {
          id: 'rel-1',
          sourceName: 'Rahul Kumar',
          targetName: 'A/C 1234',
          type: 'controls',
          confidence: 0.85,
          sourceEntityId: 'ent-1',
          targetEntityId: 'ent-2',
        },
      ],
      evidence: [
        { id: 'ev-1', title: 'Bank Transaction Log', summary: 'Recorded transfer', evidenceType: 'document' },
      ],
      findings: [
        { id: 'fnd-1', title: 'Shared company relationship observed', description: 'desc', category: 'medium', confidence: 'observed' },
      ],
      timeline: [
        { id: 'tl-evt-1', timestamp: '2026-01-02T00:00:00Z', title: 'Arrest logged', description: null, category: 'event' },
      ],
    };
    const payload = serializeBundle(bundle, false);
    expect(payload.investigation?.sourceId).toBe(INV);
    expect(payload.entity?.sourceId).toBe('ent-1');
    expect(payload.relationships?.[0].label).toContain('controls');
    expect(payload.evidence?.[0].summary).toBe('Recorded transfer');
    expect(payload.findings?.[0].sourceId).toBe('fnd-1');
    expect(payload.timeline?.[0].sourceId).toBe('tl-evt-1');
  });

  it('derives sources strictly from the bounded bundle', () => {
    const bundle: ContextSourceBundle = {
      investigation: {
        id: INV, title: 'Operation Meridian', status: 'active', priority: 'high',
        description: null, entityCount: 2, relationshipCount: 1, evidenceCount: 1,
      },
      relationships: [{ id: 'rel-1', sourceName: 'A', targetName: 'B', type: 'controls', confidence: 0.8, sourceEntityId: 'a', targetEntityId: 'b' }],
      evidence: [{ id: 'ev-1', title: 'Log', summary: '', evidenceType: 'document' }],
      findings: [{ id: 'fnd-1', title: 'F', description: '', category: 'low', confidence: 'observed' }],
    };
    const refs = sourcesFromBundle(bundle);
    const ids = refs.map((r) => r.id);
    expect(ids).toEqual([
      'Investigation:6c887c98-939a-50ce-ac27-f58376941de2',
      'Relationship:rel-1',
      'Evidence:ev-1',
      'Finding:fnd-1',
    ]);
  });
});