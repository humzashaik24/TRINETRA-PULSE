import type { AIContext, AIResponse } from '@trinetra-pulse/types';
import { validateResponse, validateActions, ALLOWED_ACTION_TYPES } from './validation';

const context: AIContext = {
  scope: { investigationId: 'inv-1' },
  investigation: {
    type: 'Investigation',
    sourceId: 'inv-1',
    label: 'Op Meridian',
    summary: 'status active',
    references: [{ id: 'Investigation:inv-1', sourceType: 'Investigation', sourceId: 'inv-1', label: 'Op', relevance: 1 }],
  },
  entity: {
    type: 'Entity',
    sourceId: 'ent-1',
    label: 'Rahul',
    summary: 'resolved',
    references: [{ id: 'Entity:ent-1', sourceType: 'Entity', sourceId: 'ent-1', label: 'Rahul', relevance: 1 }],
  },
  relationships: [],
  evidence: [],
  findings: [],
  truncated: false,
};

const baseResponse: AIResponse = {
  id: 'r1',
  queryId: 'q1',
  status: 'complete',
  answer: 'A grounded answer.',
  keyPoints: ['point'],
  sources: [
    { id: 'Entity:ent-1', sourceType: 'Entity', sourceId: 'ent-1', label: 'Rahul', relevance: 1 },
  ],
  confidence: { answerGrounding: 0.7 },
  suggestedActions: [],
  incomplete: false,
  createdAt: new Date().toISOString(),
};

describe('validation', () => {
  it('removes references to entities outside the retrieved context', () => {
    const malicious: AIResponse = {
      ...baseResponse,
      sources: [
        { id: 'Entity:ent-1', sourceType: 'Entity', sourceId: 'ent-1', label: 'Rahul', relevance: 1 },
        { id: 'Entity:hacked', sourceType: 'Entity', sourceId: 'hacked', label: 'Outside', relevance: 1 },
      ],
    };
    const { response, removedSourceCount } = validateResponse(malicious, context);
    expect(removedSourceCount).toBe(1);
    expect(response.sources.map((s) => s.sourceId)).toEqual(['ent-1']);
    expect(response.incomplete).toBe(true);
  });

  it('flags a response as not_found when nothing grounded remains', () => {
    const empty: AIResponse = {
      ...baseResponse,
      answer: '',
      sources: [{ id: 'Entity:hacked', sourceType: 'Entity', sourceId: 'hacked', label: 'X', relevance: 1 }],
    };
    const { response } = validateResponse(empty, context);
    expect(response.status).toBe('not_found');
    expect(response.sources).toHaveLength(0);
  });

  it('keeps valid references intact', () => {
    const { response, removedSourceCount } = validateResponse(baseResponse, context);
    expect(removedSourceCount).toBe(0);
    expect(response.sources).toHaveLength(1);
  });
});

describe('validateActions', () => {
  it('filters non-navigation actions', () => {
    const actions = [
      { id: 'a1', type: 'SHOW_ON_GRAPH', label: 'Show', target: { entityId: 'ent-1' }, status: 'available' },
      { id: 'a2', type: 'DELETE_ENTITY', label: 'Delete', status: 'available' },
      { id: 'a3', type: 'OPEN_ENTITY', label: 'Open', status: 'available' },
    ] as any;
    const out = validateActions(actions);
    const types = out.map((a) => a.type);
    expect(types).not.toContain('DELETE_ENTITY');
    expect(types).toContain('SHOW_ON_GRAPH');
    expect(types).toContain('OPEN_ENTITY');
  });

  it('exposes only allowed action types', () => {
    expect(ALLOWED_ACTION_TYPES).toContain('SHOW_ON_GRAPH');
    expect(ALLOWED_ACTION_TYPES).toContain('OPEN_ENTITY');
    expect(ALLOWED_ACTION_TYPES).not.toContain('DELETE_ENTITY');
  });
});
