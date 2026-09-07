import type {
  AIResponse,
  AIQueryType,
  AIContext,
  AIContextSource,
  AIAction,
  AISourceReference,
  AISemanticState,
} from '@trinetra-pulse/types';
import type { AIRoutableRefs } from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — ANSWER GROUNDING
// ============================================================
// Deterministic response generation from retrieved context. The
// responder ONLY states what the provided context supports
// (OBSERVED/ANALYTICAL) and refuses to invent facts. Where the
// context is absent it marks the response `not_found` / incomplete
// with a neutral "I don't have enough information..." style answer.
//
// Neutral language rules are enforced: structural importance,
// observed/inferred relationship, high connectivity — never guilt.
// ============================================================

export interface GroundingInput {
  queryId: string;
  type: AIQueryType;
  context: AIContext;
  refs: AIRoutableRefs;
}

function entityText(context: AIContext): string {
  const e = context.entity;
  return e ? `Entity ${e.label}` : 'the selected entity';
}

function refsFor(sources: AIContextSource[]): AISourceReference[] {
  return sources.flatMap((s) => s.references);
}

function actionsFor(context: AIContext): AIAction[] {
  const actions: AIAction[] = [];
  if (context.entity) {
    actions.push({
      id: 'act-open-entity',
      type: 'OPEN_ENTITY',
      label: 'Open entity',
      target: { entityId: context.entity.sourceId },
      status: 'available',
    });
  }
  if (context.network) {
    actions.push({
      id: 'act-show-graph',
      type: 'SHOW_ON_GRAPH',
      label: 'Show on graph',
      target: { networkId: context.network.sourceId },
      status: 'available',
    });
  }
  if (context.relationships && context.relationships.length > 0) {
    const rel = context.relationships[0];
    actions.push({
      id: 'act-open-relationship',
      type: 'OPEN_RELATIONSHIP',
      label: 'Open relationship',
      target: { relationshipId: rel.sourceId },
      status: 'available',
    });
  }
  return actions;
}

// ------------------------------------------------------------
// Question / phrasing helpers for deterministic responses
// ------------------------------------------------------------

export function buildAnsweredResponse(input: GroundingInput): AIResponse {
  const { queryId, type, context } = input;
  const answer: AIResponse = {
    id: `ai-${queryId}`,
    queryId,
    status: 'complete',
    answer: '',
    keyPoints: [],
    sources: refsFor(context.evidence?.concat(context.relationships ?? []) ?? []),
    confidence: { answerGrounding: 0.55 },
    limitations: [],
    suggestedActions: actionsFor(context),
    suggestedQuestions: suggestQuestions(type, context),
    incomplete: context.truncated,
    createdAt: new Date().toISOString(),
  };
  if (context.truncated) {
    answer.limitations?.push('Response based on the currently available context.');
  }

  switch (type) {
    case 'ENTITY_SUMMARY':
    case 'ENTITY_LOOKUP':
      answerEntitySummary(answer, context);
      break;
    case 'INVESTIGATION_SUMMARY':
      answerInvestigationSummary(answer, context);
      break;
    case 'NETWORK_EXPLORATION':
    case 'NETWORK_ANALYSIS':
      answerNetwork(answer, context);
      break;
    case 'RELATIONSHIP_EXPLANATION':
      answerRelationship(answer, context);
      break;
    case 'RELATIONSHIP_INTELLIGENCE':
      answerRelationshipIntelligence(answer, context);
      break;
    case 'BRIDGE_EXPLANATION':
    case 'COMMUNITY_EXPLANATION':
      answerGroup(answer, context);
      break;
    case 'TIMELINE_QUERY':
      answerTimeline(answer, context);
      break;
    case 'EVIDENCE_SUMMARY':
      answerEvidence(answer, context);
      break;
    case 'FINDING_SUMMARY':
      answerFindings(answer, context);
      break;
    case 'COMPARISON':
      answerGeneral(answer, context, 'Compare the following entities');
      break;
    case 'SOURCE_LOOKUP':
      answerSources(answer, context);
      break;
    case 'BLOCKCHAIN_ANCHOR':
      answerBlockchainAnchor(answer, context);
      break;
    default:
      answerGeneral(answer, context, 'The available context shows');
  }

  if (!answer.answer) {
    answer.status = 'not_found';
    answer.answer =
      "I don't have enough information in the current investigation context to answer that.";
  }

  return answer;
}

// ------------------------------------------------------------
// Neutral deterministic builders
// ------------------------------------------------------------

function answerEntitySummary(answer: AIResponse, context: AIContext) {
  const e = context.entity;
  if (!e) {
    answer.status = 'not_found';
    answer.answer = "I don't have enough information in the current investigation context to answer that.";
    return;
  }
  const keyPoints = e.summary.split('\n').filter((l) => l.trim());
  answer.answer =
    `${entityText(context)} has ${keyPoints.length > 1 ? `${keyPoints[1]} and ${keyPoints.length - 1} further recorded attributes` : 'limited recorded attributes'} in the current investigation context.`;
  answer.keyPoints = keyPoints.slice(1, 5).map((l) => l.replace(/^Type:|^Resolution:|^Connections:|^Description:/, (m) => m.trim()));
  answer.sources = [e.references[0], ...answer.sources].filter(Boolean);
  answer.confidence = { answerGrounding: 0.7, resolution: parseConfidence(e.summary) };
  addLimitation(answer, 'This reflects system-recorded associations, not any determination of guilt.');
}

function answerInvestigationSummary(answer: AIResponse, context: AIContext) {
  const inv = context.investigation;
  if (!inv) {
    answer.status = 'not_found';
    answer.answer = "I don't have enough information about the current investigation.";
    return;
  }
  const lines = inv.summary.split('\n').filter(Boolean);
  answer.answer = `This is an investigation with the following recorded characteristics: ${lines[1] ?? 'status and priority are recorded in the context.'}`;
  answer.keyPoints = lines.slice(1);
  answer.sources = [inv.references[0], ...(context.findings?.[0]?.references ?? [])];
  answer.confidence = { answerGrounding: 0.7 };
  addLimitation(answer, 'Summary is based solely on recorded investigation data.');
}

function answerNetwork(answer: AIResponse, context: AIContext) {
  const analytics = context.analytics;
  const network = context.network;
  if (!analytics && !network) {
    answer.status = 'not_found';
    answer.answer = "I don't have enough network or analytics information in the current context to answer that.";
    return;
  }
  const lines = (analytics?.summary ?? '').split('\n').filter(Boolean);
  answer.answer =
    `The current network scope is represented by the available graph and analytics. ${lines[0] ? `Observed: ${lines[0]}.` : ''}`;
  answer.keyPoints = lines.slice(1);
  answer.sources = [
    ...(network?.references ?? []),
    ...(analytics?.references ?? []),
    ...(context.entity?.references ?? []),
  ];
  answer.confidence = { answerGrounding: 0.65, analytics: 0.8 };
  addLimitation(answer, 'These are structural measures (connectivity/influence), not accusations.');
}

function answerRelationship(answer: AIResponse, context: AIContext) {
  const relationships = context.relationships ?? [];
  if (relationships.length === 0) {
    answer.status = 'not_found';
    answer.answer = "There is no recorded relationship in the current context to explain.";
    return;
  }
  const rel = relationships[0];
  answer.answer = `The ${rel.label} relationship is present in the recorded data with the following characteristics.`;
  answer.keyPoints = rel.summary.split('\n').slice(1);
  answer.sources = [rel.references[0], ...(context.evidence?.[0]?.references ?? [])];
  answer.confidence = { answerGrounding: 0.6, relationship: parseConfidence(rel.summary) };
  addLimitation(answer, 'Relationships are recorded as observed/inferred; they do not establish guilt.');
}

function answerRelationshipIntelligence(answer: AIResponse, context: AIContext) {
  const relationships = context.relationships ?? [];
  if (relationships.length === 0) {
    answer.status = 'not_found';
    answer.answer = "There is no recorded relationship in the current context to assess for corroboration.";
    return;
  }
  const rel = relationships[0];
  const intelRef = rel.references.find((r) => r.payload);
  const sourceCount = typeof intelRef?.payload?.sourceCount === 'number' ? intelRef.payload.sourceCount : undefined;
  const confidenceLabel = typeof intelRef?.payload?.confidenceLabel === 'string' ? intelRef.payload.confidenceLabel : undefined;

  const corroboration =
    sourceCount !== undefined && sourceCount >= 2
      ? `This ${rel.label} relationship is jointly observed across ${sourceCount} independent sources (${confidenceLabel ?? 'correlated'}).`
      : sourceCount !== undefined
        ? `This ${rel.label} relationship is currently based on a single source and is pending corroboration against additional independent records.`
        : `Corroboration for this ${rel.label} relationship has not been assessed in the current context.`;

  answer.answer = corroboration;
  answer.keyPoints = [
    `Relationship: ${rel.label}`,
    ...rel.summary.split('\n').slice(1),
    sourceCount !== undefined
      ? `Independent sources: ${sourceCount}`
      : 'Independent sources: not recorded',
  ];
  answer.sources = rel.references;
  answer.confidence = { answerGrounding: 0.6, relationship: parseConfidence(rel.summary) };
  addLimitation(answer, 'Corroboration counts how many independent sources observed the link; it is not a determination of guilt.');
}

function answerGroup(answer: AIResponse, context: AIContext) {  const entity = context.entity;
  const network = context.network;
  answer.answer =
    'The analysis of network groups is based on structural connectivity. Any entity connecting distinct communities is described by its structural position (bridge potential), never as a leader or mastermind.';
  answer.keyPoints = [
    ...(entity ? [`${entity.label} is part of the available network scope.`] : []),
    ...(network ? [`Network ${network.label}: ${network.summary.split('\n')[1] ?? 'structure recorded'}.`] : []),
  ];
  answer.sources = [...(entity?.references ?? []), ...(network?.references ?? []), ...(context.analytics?.references ?? [])];
  answer.confidence = { answerGrounding: 0.5, analytics: 0.7 };
  addLimitation(answer, 'Structural position is not an indication of criminality.');
}

function answerTimeline(answer: AIResponse, context: AIContext) {
  const timeline = context.timeline;
  if (!timeline && (context.evidence?.length ?? 0) === 0) {
    answer.status = 'not_found';
    answer.answer = "I don't have enough timeline information in the current context to answer that.";
    return;
  }
  const items = timeline
    ? timeline.summary.split('\n').slice(1)
    : (context.evidence ?? []).slice(0, 3).map((e) => e.label);
  answer.answer =
    'The available timeline records these observed changes and events. Observed changes are separated from interpretation.';
  answer.keyPoints = items.slice(0, 5);
  answer.sources = [
    ...(timeline?.references ?? []),
    ...(context.evidence?.slice(0, 3) ?? []).flatMap((e) => e.references),
  ];
  answer.confidence = { answerGrounding: 0.6 };
  addLimitation(answer, 'Timeline changes are observations, not conclusions.');
}

function answerEvidence(answer: AIResponse, context: AIContext) {
  const evidence = context.evidence ?? [];
  if (evidence.length === 0) {
    answer.status = 'not_found';
    answer.answer = "There is no recorded evidence in the current context to summarize.";
    return;
  }
  answer.answer = `There are ${evidence.length} evidence item(s) recorded in the current investigation context.`;
  answer.keyPoints = evidence.slice(0, 4).map((e) => `${e.label} — ${e.summary.split('\n')[1] ?? ''}`.trim());
  answer.sources = evidence.flatMap((e) => e.references);
  answer.confidence = { answerGrounding: 0.68, evidence: 0.7 };
  addLimitation(answer, 'Evidence supports recorded findings; it does not prove guilt.');
}

function answerFindings(answer: AIResponse, context: AIContext) {
  const findings = context.findings ?? [];
  if (findings.length === 0) {
    answer.status = 'not_found';
    answer.answer = "There are no recorded findings in the current context.";
    return;
  }
  answer.answer = `There are ${findings.length} recorded finding(s) in the current investigation.`;
  answer.keyPoints = findings.slice(0, 4).map((f) => `${f.label} — ${f.summary.split('\n')[1] ?? ''}`.trim());
  answer.sources = findings.flatMap((f) => f.references);
  answer.confidence = { answerGrounding: 0.66 };
  addLimitation(answer, 'Findings are analytical conclusions with recorded confidence.');
}

function answerBlockchainAnchor(answer: AIResponse, context: AIContext) {
  const evidence = context.evidence ?? [];
  const anchored = evidence
    .map((e) => ({
      e,
      integrity: e.references.find((r) => r.payload && 'verificationState' in r.payload),
    }))
    .filter((item) => item.integrity);

  if (anchored.length === 0) {
    answer.status = 'not_found';
    answer.answer =
      "I don't have blockchain anchor information for any evidence item in the current investigation context.";
    return;
  }

  const verified = anchored.filter(
    (item) => item.integrity?.payload?.verificationState === 'VERIFIED',
  );
  const mock = anchored.some((item) => item.integrity?.payload?.isMock === true);

  const counts = (state: string) =>
    anchored.filter((item) => item.integrity?.payload?.verificationState === state).length;

  const lines = anchored.slice(0, 4).map(({ e, integrity }) => {
    const p = integrity?.payload;
    const state = String(p?.verificationState ?? 'unknown').replace(/_/g, ' ').toLowerCase();
    const network = p?.network ? ` on ${p.network}` : '';
    return `${e.label} — integrity state ${state}${network}.`;
  });

  answer.answer =
    `Of the ${evidence.length} evidence item(s) in context, ${verified.length} anchor state is verified and ${counts('MISMATCH')} show a mismatch; ${counts('NOT_ANCHORED')} are not anchored.`;
  if (mock) {
    answer.answer += ' These anchors reference the demo mock registry, not a real blockchain.';
  }
  answer.keyPoints = lines;
  answer.sources = anchored.flatMap(({ e, integrity }) => [
    e.references[0],
    ...(integrity ? [integrity] : []),
  ]);
  answer.confidence = { answerGrounding: 0.7 };
  addLimitation(
    answer,
    'Anchor state proves a cryptographic digest was registered at a point in time; it does not determine guilt or evidence truthfulness. Raw evidence and PII remain off-chain.',
  );
}

function answerSources(answer: AIResponse, context: AIContext) {
  answer.answer = 'The available context is grounded in the following system sources.';
  answer.sources = [
    ...(context.entity?.references ?? []),
    ...(context.investigation?.references ?? []),
    ...(context.network?.references ?? []),
    ...(context.analytics?.references ?? []),
    ...(context.evidence ?? []).flatMap((e) => e.references),
    ...(context.findings ?? []).flatMap((f) => f.references),
  ];
  answer.keyPoints = [...new Set(answer.sources.map((s) => `${s.sourceType}: ${s.label}`))].slice(0, 8);
  answer.confidence = { answerGrounding: 0.75 };
}

function answerGeneral(answer: AIResponse, context: AIContext, opener: string) {
  const parts: string[] = [];
  if (context.entity) parts.push(context.entity.summary);
  if (context.investigation) parts.push(context.investigation.summary);
  if (context.network) parts.push(context.network.summary);
  if (context.analytics) parts.push(context.analytics.summary);
  answer.answer = parts.length ? `${opener}:\n${parts[0]}` : '';
  answer.keyPoints = parts.slice(1).map((p) => p.split('\n')[0]);
  answer.sources = refsFor(
    [
      ...(context.entity ? [context.entity] : []),
      ...(context.investigation ? [context.investigation] : []),
      ...(context.network ? [context.network] : []),
      ...(context.analytics ? [context.analytics] : []),
      ...(context.evidence ?? []),
    ]
  );
  answer.confidence = { answerGrounding: 0.5 };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function suggestQuestions(type: AIQueryType, context: AIContext): string[] {
  const q: string[] = [];
  if (context.entity) q.push('Why is this entity structurally important?');
  if (context.network) q.push('Which entities are most connected in this network?');
  if (context.evidence && context.evidence.length > 0) q.push('Which evidence supports the recorded findings?');
  if (context.relationships && context.relationships.length > 0) q.push('What evidence is linked to these relationships?');
  if (type === 'INVESTIGATION_SUMMARY') q.push('What are the major findings so far?');
  return q.slice(0, 3);
}

function addLimitation(answer: AIResponse, text: string) {
  if (!answer.limitations) answer.limitations = [];
  if (!answer.limitations.includes(text)) answer.limitations.push(text);
}

function parseConfidence(summary: string): number | undefined {
  const m = summary.match(/confidence\s*([0-9]+)%/i);
  return m ? parseInt(m[1], 10) / 100 : undefined;
}
