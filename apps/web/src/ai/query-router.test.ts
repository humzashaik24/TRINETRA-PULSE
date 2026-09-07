import { routeQuery, classifyType } from './query-router';

describe('query-router', () => {
  it('routes comparison queries first', () => {
    const result = routeQuery({ text: 'compare entity A vs entity B', scope: {} });
    expect(result.type).toBe('COMPARISON');
  });

  it.each([
    ['who is this entity', 'ENTITY_LOOKUP'],
    ['summarize this entity', 'ENTITY_SUMMARY'],
    ['why is this relationship present', 'RELATIONSHIP_EXPLANATION'],
    ['which communities exist', 'COMMUNITY_EXPLANATION'],
    ['which entities are most connected', 'NETWORK_ANALYSIS'],
    ['tell me about the timeline', 'TIMELINE_QUERY'],
    ['summarize the evidence', 'EVIDENCE_SUMMARY'],
    ['what are the findings', 'FINDING_SUMMARY'],
    ['summarize this investigation', 'INVESTIGATION_SUMMARY'],
    ['what is the provenance of this source', 'SOURCE_LOOKUP'],
  ])('routes "%s" to %s', (text, expected) => {
    expect(routeQuery({ text, scope: {} }).type).toBe(expected);
  });

  it('falls back to general contextual for unknown queries', () => {
    expect(routeQuery({ text: 'hello there', scope: {} }).type).toBe(
      'GENERAL_CONTEXTUAL_QUERY'
    );
  });

  it('carries the scope entity into routable refs', () => {
    const result = routeQuery({
      text: 'tell me about this entity',
      scope: { entityId: 'ent-1', networkId: 'net-1' },
    });
    expect(result.refs.entityIds).toEqual(['ent-1']);
    expect(result.refs.networkId).toBe('net-1');
  });

  it('classifyType returns the routed type', () => {
    expect(classifyType('summarize this investigation')).toBe(
      'INVESTIGATION_SUMMARY'
    );
  });
});
