import { AIInvestigationOrchestrator } from './ai-investigation.service';
import * as api from '@/lib/api/investigations';
import * as assistant from '@/lib/api/assistant';
import * as mockInvestigationService from '@/services/investigation.service';
import * as mockNetworkService from '@/services/network.service';
import * as mockAnalyticsService from '@/services/network-analytics.service';
import * as mockEntityService from '@/services/entity.service';

// API mode: real backend data source, api provider, real retrieval.
jest.mock('@/lib/api/config', () => ({
  DATA_SOURCE: 'api',
  API_BASE_URL: '/api/v2',
  isMockData: () => false,
}));

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

jest.mock('@/lib/api/assistant', () => ({
  ...jest.requireActual('@/lib/api/assistant'),
  queryAssistant: jest.fn(),
}));
const assistantModule = jest.requireActual('@/lib/api/assistant') as typeof assistant;
const { mapBackendAIResponse } = assistantModule;

// Mock-mode demo services MUST NOT be consulted when in API mode.
jest.mock('@/services/investigation.service', () => ({
  getInvestigation: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  getInvestigationEvidence: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  getInvestigationFindings: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  getInvestigationTimeline: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  getInvestigationEntities: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  getInvestigationRelationships: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
}));
jest.mock('@/services/network.service', () => ({
  getNetworkSummary: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  getNetwork: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
}));
jest.mock('@/services/network-analytics.service', () => ({
  getSummary: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
}));
jest.mock('@/services/entity.service', () => ({
  fetchEntity: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
  fetchRelationshipsForEntities: jest.fn(() => {
    throw new Error('mock service must not be used in API mode');
  }),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedAssistantApi = assistant as jest.Mocked<typeof assistant>;

const INV = 'inv-006';
const OTHER = 'inv-999';

function seedApiResponse(investigationId: string) {
  mockedApi.getInvestigationSummary.mockResolvedValue({
    id: investigationId,
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
  });
  mockedApi.getInvestigation.mockResolvedValue({
    id: investigationId,
    title: 'Operation Meridian',
    description: null,
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
  mockedApi.listEntitiesForInvestigation.mockResolvedValue([
    {
      id: 'ent-1', investigation_id: investigationId, entity_type: 'person',
      canonical_name: 'Rahul Kumar', name: 'Rahul Kumar', description: 'Flagged individual',
      attributes: {}, confidence: 0.9, risk_score: 0.85, is_verified: true, is_flagged: true,
      metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ent-2', investigation_id: investigationId, entity_type: 'account',
      canonical_name: 'A/C 1234', name: 'A/C 1234', description: null,
      attributes: {}, confidence: 0.7, risk_score: 0.5, is_verified: true, is_flagged: false,
      metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ]);
  mockedApi.listRelationshipsForInvestigation.mockResolvedValue([
    {
      id: 'rel-1', investigation_id: investigationId, source_entity_id: 'ent-1',
      target_entity_id: 'ent-2', relationship_type: 'controls', confidence: 0.85,
      source: null, evidence_refs: [], verification_status: 'verified', description: null,
      weight: 1, metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ]);
  mockedApi.listEvidenceForInvestigation.mockResolvedValue([
    {
      id: 'ev-1', investigation_id: investigationId, evidence_type: 'document',
      title: 'Bank Transaction Log', description: 'Recorded transfer to flagged account',
      source: null, provenance: {}, collected_at: '2026-01-02T00:00:00Z', storage_ref: null,
      metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ]);
  mockedApi.listFindingsForInvestigation.mockResolvedValue([
    {
      id: 'fnd-1', investigation_id: investigationId, title: 'Shared company relationship observed',
      description: 'Two flagged entities share a company address.', severity: 'medium',
      confidence: 'observed', status: 'open', entity_refs: ['ent-1'],
      metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    },
  ]);
  mockedApi.getTimeline.mockResolvedValue({
    investigation_id: investigationId,
    entries: [
      { kind: 'event', at: '2026-01-02T00:00:00Z', title: 'Arrest logged', ref_id: 'evt-1', actor: 'Inspector Mehta', description: 'Recorded event' },
      { kind: 'finding', at: '2026-01-03T00:00:00Z', title: 'Shared address', ref_id: null, actor: null, description: 'drop me' },
    ],
  });
  mockedApi.getNetworkGraph.mockResolvedValue({
    investigation_id: investigationId,
    nodes: [
      { id: 'ent-1', name: 'Rahul Kumar', entity_type: 'person', risk_score: 0.85, is_verified: true, is_flagged: true },
      { id: 'ent-2', name: 'A/C 1234', entity_type: 'account', risk_score: 0.5, is_verified: true, is_flagged: false },
    ],
    edges: [{ id: 'rel-1', source: 'ent-1', target: 'ent-2', relationship_type: 'controls', weight: 0.85 }],
  });
  mockedApi.getNetworkAnalytics.mockResolvedValue({
    investigation_id: investigationId,
    entity_count: 2,
    relationship_count: 1,
    connected_components: 1,
    average_degree: 0.5,
    flagged_entity_count: 1,
    verified_entity_count: 2,
    high_risk_entity_count: 1,
  });
  mockedApi.getEntity.mockResolvedValue({
    id: 'ent-1', investigation_id: investigationId, entity_type: 'person',
    canonical_name: 'Rahul Kumar', name: 'Rahul Kumar', description: 'Flagged individual',
    attributes: {}, confidence: 0.9, risk_score: 0.85, is_verified: true, is_flagged: true,
    metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  });
}

function backendAnswer(investigationId: string) {
  return {
    id: 'ai-1',
    query_id: 'query-1',
    status: 'complete',
    answer: `1 evidence record(s) are referenced in the current context: Bank Transaction Log.`,
    key_points: [],
    confidence: { answerGrounding: 0.6 },
    limitations: ['Response is grounded in the currently available context only.'],
    suggested_actions: [],
    sources: [
      { id: `Investigation:${investigationId}`, source_type: 'Investigation', source_id: investigationId, label: 'Operation Meridian', relevance: 0.95 },
      { id: 'Entity:ent-1', source_type: 'Entity', source_id: 'ent-1', label: 'Rahul Kumar', relevance: 1 },
      { id: 'Relationship:rel-1', source_type: 'Relationship', source_id: 'rel-1', label: 'Rahul Kumar — controls — A/C 1234', relevance: 0.5 },
      { id: 'Evidence:ev-1', source_type: 'Evidence', source_id: 'ev-1', label: 'Bank Transaction Log', relevance: 0.6 },
      { id: 'Finding:fnd-1', source_type: 'Finding', source_id: 'fnd-1', label: 'Shared company relationship observed', relevance: 0.55 },
    ],
    incomplete: false,
  };
}

describe('AIInvestigationOrchestrator in API mode (NEXT_PUBLIC_USE_MOCK_API=false)', () => {
  let orchestrator: AIInvestigationOrchestrator;

  beforeEach(() => {
    jest.resetAllMocks();
    seedApiResponse(INV);
    mockedAssistantApi.queryAssistant.mockImplementation(async (req) => {
      return mapBackendAIResponse(backendAnswer(req.scope.investigation_id!));
    });
    orchestrator = new AIInvestigationOrchestrator();
  });

  it('defaults to the api provider when the data source is real', () => {
    expect((orchestrator as unknown as { provider: { name: string } }).provider.name).toBe('api');
  });

  it('answers from the persisted, investigation-scoped retrieval (not the mock services)', async () => {
    const res = await orchestrator.answer({
      text: 'Which evidence is recorded?',
      scope: { investigationId: INV, networkId: INV, entityId: 'ent-1' },
    });

    expect(res.status).toBe('complete');
    expect(res.answer).toContain('evidence');
    const sourceIds = res.sources.map((s) => s.sourceId);
    expect(sourceIds).toContain('ev-1');
    expect(sourceIds).toContain('rel-1');
    expect(sourceIds).toContain('fnd-1');
    expect(sourceIds).toContain(INV);

    // Exact scope used: only this investigation is ever read.
    expect(mockedApi.listEntitiesForInvestigation).toHaveBeenCalledWith(INV);
    expect(mockedApi.listRelationshipsForInvestigation).toHaveBeenCalledWith(INV);
    expect(mockedApi.listEvidenceForInvestigation).toHaveBeenCalledWith(INV);
    expect(mockedApi.getTimeline).toHaveBeenCalledWith(INV);
    expect(mockedApi.getNetworkGraph).toHaveBeenCalledWith(INV);

    // The in-memory demo services must never be consulted in API mode.
    for (const fn of [
      mockInvestigationService.getInvestigation,
      mockInvestigationService.getInvestigationEvidence,
      mockNetworkService.getNetworkSummary,
      mockAnalyticsService.getSummary,
      mockEntityService.fetchEntity,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('forwards the bounded context serialized to the backend', async () => {
    await orchestrator.answer({
      text: 'Which evidence is recorded?',
      scope: { investigationId: INV },
    });
    const arg = mockedAssistantApi.queryAssistant.mock.calls[0][0];
    expect(arg.scope.investigation_id).toBe(INV);
    expect(arg.context.investigation?.sourceId).toBe(INV);
    expect(arg.context.evidence?.[0].sourceId).toBe('ev-1');
    expect(arg.context.relationships?.[0].sourceId).toBe('rel-1');
    expect(arg.context.findings?.[0].sourceId).toBe('fnd-1');
  });

  it('keeps each investigation isolated (no cross-investigation leakage)', async () => {
    await orchestrator.answer({
      text: 'Which evidence is recorded?',
      scope: { investigationId: OTHER },
    });
    expect(mockedApi.listEntitiesForInvestigation).toHaveBeenCalledWith(OTHER);
    expect(mockedApi.listRelationshipsForInvestigation).toHaveBeenCalledWith(OTHER);
    expect(mockedApi.getNetworkGraph).toHaveBeenCalledWith(OTHER);
    // Never touched the canonical investigation.
    expect(mockedApi.listEvidenceForInvestigation).not.toHaveBeenCalledWith(INV);
  });

  it('surfaces only validated sources and drops any that are out of scope', async () => {
    const frontend = mapBackendAIResponse(backendAnswer(INV));
    mockedAssistantApi.queryAssistant.mockResolvedValue({
      ...frontend,
      sources: [
        ...frontend.sources,
        { id: 'Evidence:foreign-ev', sourceId: 'foreign-ev', sourceType: 'Evidence', label: 'Foreign', relevance: 1 },
        { id: 'Finding:foreign-fnd', sourceId: 'foreign-fnd', sourceType: 'Finding', label: 'Foreign', relevance: 1 },
      ],
    });
    const res = await orchestrator.answer({
      text: 'Which evidence is recorded?',
      scope: { investigationId: INV },
    });
    const sourceIds = res.sources.map((s) => s.sourceId);
    expect(sourceIds).not.toContain('foreign-ev');
    expect(sourceIds).not.toContain('foreign-fnd');
    expect(res.incomplete).toBe(true);
  });

  it('degrades safely when retrieval has no investigation scope', async () => {
    const res = await orchestrator.answer({
      text: 'Who is involved?',
      scope: {},
    });
    // validateResponse flips empty, ungrounded answers to not_found.
    expect(res.status).toBe('not_found');
  });
});