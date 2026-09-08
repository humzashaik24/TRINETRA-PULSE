import type {
  AIQuery,
  AIQueryType,
  AIContextScope,
  AIRoutableRefs,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — QUERY ROUTER
// ============================================================
// Classifies a natural-language question into a structured
// AIQueryType and extracts tentative references (entities,
// relationships, network, timeline, etc.). The router uses
// deterministic heuristics over the query text and the current
// context scope; it does NOT invent database queries. Downstream
// tools resolve the references against the real data.
// ============================================================

export interface RoutingResult {
  type: AIQueryType;
  refs: AIRoutableRefs;
}

const KEYWORDS: Record<AIQueryType, string[]> = {
  ENTITY_LOOKUP: ['who is', 'who was', 'what is this entity', 'about this entity', 'about this person', 'who is this'],
  ENTITY_SUMMARY: ['summarize this entity', 'entity summary', 'overview of this entity', 'describe this entity', 'describe this person', 'details about this entity'],
  RELATIONSHIP_EXPLANATION: ['why is this relationship', 'what is this relationship', 'explain this relationship', 'why are these connected', 'what connects these two', 'why are they connected'],
  NETWORK_EXPLORATION: ['what does this network', 'network look like', 'what connects', 'connect these', 'strongest connections', 'which entities connect', 'what connections exist'],
  NETWORK_ANALYSIS: ['most connected', 'centrality', 'betweenness', 'most important entity', 'key entities', 'network analysis', 'structural importance'],
  COMMUNITY_EXPLANATION: ['communities', 'clusters', 'groups in this network', 'explain this community'],
  BRIDGE_EXPLANATION: ['bridge', 'connects these communities', 'connects these groups', 'link between communities', 'bridge entity'],
  TIMELINE_QUERY: ['timeline', 'what changed', 'between these dates', 'around this date', 'when did', 'recently', 'new relationships', 'what happened'],
  EVIDENCE_SUMMARY: ['evidence', 'what evidence', 'supporting evidence', 'summarize the evidence'],
  FINDING_SUMMARY: ['findings', 'major findings', 'what are the findings', 'finding summary'],
  COMPARISON: ['compare', 'vs', 'versus', 'difference between'],
  INVESTIGATION_SUMMARY: ['summarize this investigation', 'summarize the investigation', 'investigation summary', 'overview of the investigation', 'what is this investigation', 'summarize the case', 'case summary'],
  SOURCE_LOOKUP: ['source', 'where does', 'which source', 'provenance', 'where is this from'],
  GENERAL_CONTEXTUAL_QUERY: [],
};

const grep = (text: string, keywords: string[]) =>
  keywords.some((k) => text.includes(k));

export function routeQuery(
  query: Pick<AIQuery, 'text'> & { scope: AIContextScope }
): RoutingResult {
  const text = query.text.trim().toLowerCase();
  const scope = query.scope;

  const refs: AIRoutableRefs = {};
  if (scope.entityId) refs.entityIds = [scope.entityId];
  if (scope.networkId) refs.networkId = scope.networkId;
  if (scope.investigationId) refs.timelineRange = scope.timelineRange;

  // Comparison is the most specific, check first.
  if (grep(text, KEYWORDS.COMPARISON)) {
    return { type: 'COMPARISON', refs };
  }

  for (const [type, keywords] of Object.entries(KEYWORDS) as [AIQueryType, string[]][]) {
    if (type === 'COMPARISON') continue;
    if (grep(text, keywords)) {
      return { type, refs };
    }
  }

  return { type: 'GENERAL_CONTEXTUAL_QUERY', refs };
}

export function classifyType(text: string): AIQueryType {
  return routeQuery({ text, scope: {} }).type;
}
