import type { AIContext, AIQueryType } from '@trinetra-pulse/types';
import { buildAnsweredResponse } from './grounding';

const entityContext: AIContext = {
  scope: { entityId: 'ent-1' },
  entity: {
    type: 'Entity',
    sourceId: 'ent-1',
    label: 'Rahul',
    summary: 'Rahul\nType: person\nResolution: resolved (confidence 90%)\nConnections: 6',
    references: [{ id: 'Entity:ent-1', sourceType: 'Entity', sourceId: 'ent-1', label: 'Rahul', relevance: 1 }],
  },
  investigation: null,
  relationships: [],
  evidence: [],
  findings: [],
  truncated: false,
};

function respond(context: AIContext, type: AIQueryType) {
  return buildAnsweredResponse({
    queryId: 'q1',
    type,
    context,
    refs: {},
  });
}

describe('grounding', () => {
  it('produces an entity summary from recorded context', () => {
    const res = respond(entityContext, 'ENTITY_SUMMARY');
    expect(res.status).toBe('complete');
    expect(res.answer).toContain('Rahul');
    expect(res.keyPoints?.join(' ')).toContain('person');
  });

  it('yields not_found when context does not support the requested type', () => {
    const res = respond({ ...entityContext, entity: null, investigation: null }, 'INVESTIGATION_SUMMARY');
    expect(res.status).toBe('not_found');
  });

  it('keeps language neutral (no guilt assertions)', () => {
    const res = respond(entityContext, 'NETWORK_ANALYSIS');
    const text = [res.answer, ...(res.keyPoints ?? []), ...(res.limitations ?? [])].join(' ').toLowerCase();
    expect(text).not.toMatch(/\b(criminal|guilty|mastermind|dangerous)\b/);
  });

  it('adds a truncation limitation when incomplete', () => {
    const res = respond({ ...entityContext, truncated: true }, 'ENTITY_SUMMARY');
    expect(res.incomplete).toBe(true);
    expect(res.limitations?.join(' ')).toContain('currently available context');
  });

  it('suggests read-only navigation actions', () => {
    const res = respond(entityContext, 'ENTITY_SUMMARY');
    const types = res.suggestedActions.map((a) => a.type);
    expect(types).toContain('OPEN_ENTITY');
    expect(types).not.toContain('DELETE_ENTITY');
  });

  it('surfaces multi-source corroboration for relationship intelligence', () => {
    const res = respond(
      {
        ...entityContext,
        relationships: [
          {
            type: 'Relationship' as const,
            sourceId: 'rel-1',
            label: 'A — KNOWS — B',
            summary: 'A KNOWS B\nConfidence: 70%',
            references: [
              { id: 'Relationship:rel-1', sourceType: 'Relationship' as const, sourceId: 'rel-1', label: 'A — KNOWS — B', relevance: 0.5 },
              {
                id: 'g-x+y:rel-1', sourceType: 'Relationship' as const, sourceId: 'rel-1', label: 'A — B correlation', relevance: 0.5,
                payload: { sourceCount: 3, confidenceLabel: 'MEDIUM', status: 'NEEDS_REVIEW' },
              },
            ],
          },
        ],
      },
      'RELATIONSHIP_INTELLIGENCE',
    );
    expect(res.answer).toContain('jointly observed across 3 independent sources');
    expect(res.keyPoints?.join(' ')).toContain('Independent sources: 3');
    expect(res.suggestedActions.map((a) => a.type)).toContain('OPEN_RELATIONSHIP');
  });

  it('describes single-source relationships as pending corroboration in neutral terms', () => {
    const res = respond(
      {
        ...entityContext,
        relationships: [
          {
            type: 'Relationship' as const,
            sourceId: 'rel-1',
            label: 'A — KNOWS — B',
            summary: 'A KNOWS B\nConfidence: 40%',
            references: [
              { id: 'Relationship:rel-1', sourceType: 'Relationship' as const, sourceId: 'rel-1', label: 'A — KNOWS — B', relevance: 0.5 },
              {
                id: 'rel-intel:rel-1', sourceType: 'Relationship' as const, sourceId: 'rel-1', label: 'A — B correlation', relevance: 0.5,
                payload: { sourceCount: 1, confidenceLabel: 'LOW', status: 'NEEDS_REVIEW' },
              },
            ],
          },
        ],
      },
      'RELATIONSHIP_INTELLIGENCE',
    );
    expect(res.answer).toContain('single source');
    expect(res.answer).toContain('pending corroboration');
    expect(res.limitations?.join(' ').toLowerCase()).not.toMatch(/\b(criminal|guilty|mastermind|dangerous)\b/);
  });
});
