import { ApiInvestigationProvider } from './api-provider';
import type { ProviderRequest } from '../provider';
import type { AIContext, AIContextScope, AIQuery } from '@trinetra-pulse/types';
import * as assistant from '@/lib/api/assistant';

jest.mock('@/lib/api/assistant', () => ({
  queryAssistant: jest.fn(),
}));

const mockedAssistant = assistant as jest.Mocked<typeof assistant>;

const scope: AIContextScope = {
  investigationId: 'inv-006',
  organizationId: 'org-1',
  userId: 'user-1',
  networkId: 'inv-006',
  entityId: 'ent-1',
  relationshipId: null,
  tab: 'investigation',
};

const query: AIQuery = {
  id: 'query-1',
  type: 'EVIDENCE_SUMMARY',
  text: 'Which evidence is recorded?',
  investigationId: 'inv-006',
  userId: 'user-1',
  organizationId: 'org-1',
  context: scope,
};

const context: AIContext = {
  scope,
  investigation: {
    type: 'Investigation',
    sourceId: 'inv-006',
    label: 'Operation Meridian',
    summary: 'Operation Meridian\nStatus: active',
    references: [{ id: 'Investigation:inv-006', sourceType: 'Investigation', sourceId: 'inv-006', label: 'Operation Meridian', relevance: 0.95 }],
  },
  entity: null,
  relationships: [],
  network: null,
  analytics: null,
  evidence: [],
  findings: [],
  timeline: null,
  truncated: false,
};

function makeReq(): ProviderRequest {
  return {
    query,
    context,
    history: [{ role: 'user', content: 'Which evidence is recorded?' }],
    serializedContext: {
      investigation: { sourceId: 'inv-006', title: 'Operation Meridian' },
      evidence: [{ sourceId: 'ev-1', label: 'Log', summary: 'Recorded' }],
    },
  };
}

describe('ApiInvestigationProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('posts the bounded context and scopes the request to the investigation', async () => {
    mockedAssistant.queryAssistant.mockResolvedValue({
      id: 'ai-1',
      queryId: 'query-1',
      status: 'complete',
      answer: 'One evidence record is referenced.',
      keyPoints: [],
      sources: [
        { id: 'Evidence:ev-1', sourceType: 'Evidence', sourceId: 'ev-1', label: 'Log', relevance: 0.6 },
      ],
      confidence: { answerGrounding: 0.6 },
      limitations: ['Response is grounded in the available context only.'],
      suggestedActions: [],
      incomplete: false,
      createdAt: '2026-01-01T00:00:00Z',
    });

    const provider = new ApiInvestigationProvider();
    const res = await provider.generate(makeReq());

    expect(mockedAssistant.queryAssistant).toHaveBeenCalledTimes(1);
    const arg = mockedAssistant.queryAssistant.mock.calls[0][0];
    expect(arg.scope.investigation_id).toBe('inv-006');
    expect(arg.scope.user_id).toBe('user-1');
    expect(arg.scope.network_id).toBe('inv-006');
    expect(arg.scope.entity_id).toBe('ent-1');
    expect(arg.context.investigation?.sourceId).toBe('inv-006');
    expect(arg.context.evidence?.[0].sourceId).toBe('ev-1');
    expect(arg.history).toEqual([{ role: 'user', content: 'Which evidence is recorded?' }]);

    expect(res.status).toBe('complete');
    expect(res.answer).toContain('evidence');
    expect(res.sources[0].sourceId).toBe('ev-1');
  });

  it('is named api and marks the backend-grounded model honestly', () => {
    const provider = new ApiInvestigationProvider();
    expect(provider.name).toBe('api');
    expect(provider.model).not.toContain('mock');
    expect(provider.supportsStreaming).toBe(true);
  });

  it('classifies client-side deterministically', async () => {
    const provider = new ApiInvestigationProvider();
    expect(await provider.classify('Summarize the investigation')).toBe('INVESTIGATION_SUMMARY');
    expect(await provider.classify('What evidence exists?')).toBe('EVIDENCE_SUMMARY');
  });

  it('propagates a not_found backend response unharmed', async () => {
    mockedAssistant.queryAssistant.mockResolvedValue({
      id: 'ai-2',
      queryId: 'query-2',
      status: 'not_found',
      answer: '',
      keyPoints: [],
      sources: [],
      confidence: { answerGrounding: 0 },
      limitations: ['No investigation scope was provided.'],
      suggestedActions: [],
      incomplete: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
    const provider = new ApiInvestigationProvider();
    const res = await provider.generate(makeReq());
    expect(res.status).toBe('not_found');
  });

  it('streams by chunking the complete answer', async () => {
    mockedAssistant.queryAssistant.mockResolvedValue({
      id: 'ai-3',
      queryId: 'query-3',
      status: 'complete',
      answer: 'A short answer for streaming.',
      keyPoints: [],
      sources: [],
      confidence: { answerGrounding: 0.6 },
      limitations: [],
      suggestedActions: [],
      incomplete: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
    const deltas: string[] = [];
    const provider = new ApiInvestigationProvider();
    const { streamState } = await provider.stream({
      ...makeReq(),
      onDelta: (d) => deltas.push(d),
    });
    expect(streamState).toBe('complete');
    expect(deltas.length).toBeGreaterThan(0);
  });
});