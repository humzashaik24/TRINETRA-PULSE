import type {
  AIResponse,
  AIQueryType,
  AIContext,
  AIContextSource,
  AIAction,
  AISourceReference,
} from '@trinetra-pulse/types';
import type { AIRoutableRefs } from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — ANSWER GROUNDING
// ============================================================
// Deterministic response generation from retrieved context. The
// responder ONLY states what the provided context supports
// (SOURCE FACT / ANALYTICAL INFERENCE / INVESTIGATIVE LEAD) and
// refuses to invent facts. Where the context is absent it marks
// the response `not_found` / incomplete with a neutral "I don't
// have enough information..." style answer.
//
// Neutral language rules are enforced: structural importance,
// observed/inferred relationship, high connectivity — never guilt.
//
// Responses are structured into labeled sections so demo answers
// are substantive AND auditable:
//   SOURCE FACT        — values directly present in recorded data.
//   ANALYTICAL INFERENCE — single-step measures derived from the
//                          recorded graph/analytics.
//   INVESTIGATIVE LEAD — recorded findings/evidence worth follow-up.
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
      answerGeneral(answer, context);
      break;
    case 'SOURCE_LOOKUP':
      answerSources(answer, context);
      break;
    default:
      answerGeneral(answer, context);
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
  const lines = linesOf(e.summary).filter((l) => l.trim());
  const type = valueOf(lines, 'Type') ?? 'recorded entity';
  const resolution = valueOf(lines, 'Resolution');
  const connections = valueOf(lines, 'Connections');
  const description = valueOf(lines, 'Description');

  const parts: string[] = [];
  parts.push(`${entityText(context)} is recorded in the investigation as ${a(type)}.`);
  if (resolution) {
    parts.push(`Its resolution state is ${resolution.split(' (')[0]} (${resolution.match(/confidence\s*([0-9]+(?:\.[0-9]+)?)%/i)?.[1] ?? 'recorded'}% model confidence).`);
  }
  if (connections) {
    parts.push(`It has ${connections} recorded connection(s) in the network.`);
  }
  if (description) {
    parts.push(`Recorded description: ${description}`);
  }
  answer.answer = parts.join(' ');
  answer.keyPoints = lines.slice(1, 5).map((l) =>
    l.replace(/^(Type|Resolution|Connections|Description):\s*/, '')
  );
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
  const lines = linesOf(inv.summary).filter(Boolean);
  const status = valueOf(lines, 'Status');
  const priority = valueOf(lines, 'Priority');
  const counts = valueOf(lines, 'Entities');
  const description = valueOf(lines, 'Description');

  const parts: string[] = [];
  parts.push(
    `This is an ongoing investigation of "${inv.label}"${status ? ` (${status})` : ''}${priority ? `, ${priority} priority` : ''}.`
  );
  if (counts) parts.push(`The recorded dataset contains ${counts}.`);
  if (description) parts.push(`Summary: ${description}`);
  if (!parts.length) parts.push('Status and priority are recorded in the context.');
  answer.answer = parts.join(' ');
  answer.keyPoints = lines.slice(1);

  const findings = (context.findings ?? []).slice(0, 2);
  if (findings.length) {
    answer.answer += `\n\nINVESTIGATIVE LEAD — ${findings
      .map((f) => `• ${f.label}`)
      .join('\n')}`;
  }
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

  const blocks: string[] = [];
  const facts: string[] = [];
  const inferences: string[] = [];

  const scopeTitle = network ? `the "${network.label}" network` : 'the current network scope';

  if (network) {
    const nLines = linesOf(network.summary);
    const nodes = valueOf(nLines, 'Nodes');
    const rels = valueOf(nLines, 'Relationships');
    const communities = valueOf(nLines, 'Communities');
    if (nodes) facts.push(`${network.label} has ${nodes} recorded node(s).`);
    if (rels) facts.push(`${rels} relationship(s) are recorded between them.`);
    if (communities) facts.push(`The graph resolves into ${communities} community cluster grouping(s).`);
  }
  if (analytics) {
    const aLines = linesOf(analytics.summary);
    const components = valueOf(aLines, 'Components');
    const avgDegree = valueOf(aLines, 'Average degree');
    const density = valueOf(aLines, 'Density');
    if (components) facts.push(`It forms ${components} connected component(s).`);
    if (avgDegree) facts.push(`Average degree is ${avgDegree}.`);
    if (density) facts.push(`Graph density is ${density}.`);
    const top = valueOf(aLines, 'Top connected');
    if (top) {
      inferences.push(
        `Structural analytics identify ${top} as the most-connected entity in the recorded graph (highest number of recorded connections).`
      );
    }
    const bridges = valueOf(aLines, 'Bridge entities');
    if (bridges) {
      inferences.push(
        `${bridges} recorded entity(ies) sit in bridge positions between communities, based on connectivity alone.`
      );
    }
  }

  const connections = (context.relationships ?? []).slice(0, 5).map((r) => {
    const confidence = valueOf(linesOf(r.summary), 'Confidence');
    return `• ${r.label}${confidence ? ` (recorded confidence ${confidence})` : ''}`;
  });

  blocks.push(`The analysis below is grounded in recorded graph and analytics data for ${scopeTitle}.`);
  if (facts.length) {
    blocks.push('SOURCE FACT — Recorded figures for the network:');
    blocks.push(facts.map((f) => `• ${f}`).join('\n'));
  }
  if (connections.length) {
    blocks.push('SOURCE FACT — Key connections recorded in the investigation data:');
    blocks.push(connections.join('\n'));
  }
  if (inferences.length) {
    blocks.push('ANALYTICAL INFERENCE — Derived from the recorded structure:');
    blocks.push(inferences.map((f) => `• ${f}`).join('\n'));
  }

  const leads = (context.findings ?? []).slice(0, 2);
  if (leads.length) {
    blocks.push('INVESTIGATIVE LEAD — Recorded findings worth following up:');
    blocks.push(leads.map((f) => `• ${f.label}`).join('\n'));
  }

  answer.answer = blocks.join('\n\n');
  answer.keyPoints = [...facts, ...connections].slice(0, 8).map((f) => f.replace(/^•\s*/, ''));
  answer.sources = [
    ...(network?.references ?? []),
    ...(analytics?.references ?? []),
    ...(context.entity?.references ?? []),
    ...(context.relationships ?? []).slice(0, 5).flatMap((r) => r.references),
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
  const list = relationships.slice(0, 3).map((r) => {
    const confidence = valueOf(linesOf(r.summary), 'Confidence');
    return `• ${r.label}${confidence ? ` (recorded confidence ${confidence})` : ''}`;
  });
  const lines = linesOf(rel.summary);
  answer.answer = [
    `The ${rel.label} relationship is present in the recorded data.`,
    'SOURCE FACT — Recorded relationship(s):',
    list.join('\n'),
    'Relationships are recorded as observed or inferred associations between entities within the investigation scope.',
  ].join('\n\n');
  answer.keyPoints = lines.slice(1);
  answer.sources = relationships.slice(0, 3).flatMap((r) => r.references);
  answer.sources = [rel.references[0], ...answer.sources, ...(context.evidence?.[0]?.references ?? [])];
  answer.confidence = { answerGrounding: 0.6, relationship: parseConfidence(rel.summary) };
  addLimitation(answer, 'Relationships are recorded as observed/inferred; they do not establish guilt.');
}

function answerGroup(answer: AIResponse, context: AIContext) {
  const entity = context.entity;
  const network = context.network;
  const blocks: string[] = [];
  blocks.push(
    'The analysis of network groups is based on structural connectivity. Any entity connecting distinct communities is described by its structural position (bridge potential), never as a leader.'
  );
  const points: string[] = [];
  if (entity) points.push(`${entity.label} is part of the available network scope.`);
  if (network) {
    const summaryLine = linesOf(network.summary)[1];
    points.push(`Network ${network.label}: ${summaryLine ?? 'structure recorded'}.`);
  }
  if (analyticsTop(context)) points.push(`Most-connected recorded entity: ${analyticsTop(context) ?? ''}.`);
  if (points.length) {
    blocks.push('SOURCE FACT — Recorded placement:');
    blocks.push(points.map((p) => `• ${p}`).join('\n'));
  }
  answer.answer = blocks.join('\n\n');
  answer.keyPoints = points;
  answer.sources = [...(entity?.references ?? []), ...(network?.references ?? []), ...(context.analytics?.references ?? [])];
  answer.confidence = { answerGrounding: 0.5, analytics: 0.7 };
  addLimitation(answer, 'Structural position is not an indication of criminality.');
}

function answerTimeline(answer: AIResponse, context: AIContext) {
  const items = context.timelineItems ?? (context.timeline ? [context.timeline] : []);
  if (items.length === 0 && (context.evidence?.length ?? 0) === 0) {
    answer.status = 'not_found';
    answer.answer = "I don't have enough timeline information in the current context to answer that.";
    return;
  }
  if (items.length === 0) {
    const evidenceItems = (context.evidence ?? []).slice(0, 3);
    answer.answer = 'The available evidence records these observed items.';
    answer.keyPoints = evidenceItems.map((e) => e.label);
    answer.sources = evidenceItems.flatMap((e) => e.references);
    answer.confidence = { answerGrounding: 0.6 };
    return;
  }
  const enumerated = items.slice(0, 6).map((t) => {
    const tl = linesOf(t.summary);
    const timestamp = valueOf(tl, 'Timestamp');
    const category = valueOf(tl, 'Category');
    return `• ${timestamp ?? 'Time unavailable'} — ${t.label}${category ? ` (${category})` : ''}`;
  });
  answer.answer = [
    `The timeline records ${items.length} observed item(s).`,
    'SOURCE FACT — Recorded timeline entries:',
    enumerated.join('\n'),
    'Timeline changes are observations from the recorded data, not conclusions.',
  ].join('\n\n');
  answer.keyPoints = items.slice(0, 5).map((t) => t.label);
  answer.sources = [
    ...(context.timeline?.references ?? []),
    ...items.slice(0, 6).flatMap((t) => t.references),
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
  const listed = evidence.slice(0, 5).map((e) => {
    const tl = linesOf(e.summary);
    const type = valueOf(tl, 'Type');
    const summary = valueOf(tl, 'Summary');
    return `• ${e.label}${type ? ` (${type})` : ''}${summary ? ` — ${summary}` : ''}`;
  });
  answer.answer = [
    `There are ${evidence.length} evidence item(s) recorded in the current investigation context.`,
    'SOURCE FACT — Recorded evidence:',
    listed.join('\n'),
    'Evidence supports recorded findings; it does not prove guilt.',
  ].join('\n\n');
  answer.keyPoints = evidence.slice(0, 4).map((e) => e.label);
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
  const listed = findings.slice(0, 4).map((f) => {
    const fl = linesOf(f.summary);
    const category = valueOf(fl, 'Category');
    const description = valueOf(fl, 'Description');
    return `• ${f.label}${category ? ` (${category})` : ''}${description ? ` — ${description}` : ''}`;
  });
  answer.answer = [
    `There are ${findings.length} recorded finding(s) in the current investigation.`,
    'INVESTIGATIVE LEAD — Recorded findings:',
    listed.join('\n'),
    'Findings are analytical conclusions with recorded confidence.',
  ].join('\n\n');
  answer.keyPoints = findings.slice(0, 4).map((f) => f.label);
  answer.sources = findings.flatMap((f) => f.references);
  answer.confidence = { answerGrounding: 0.66 };
  addLimitation(answer, 'Findings are analytical conclusions with recorded confidence.');
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
    ...(context.relationships ?? []).flatMap((r) => r.references),
  ];
  answer.keyPoints = [...new Set(answer.sources.map((s) => `${s.sourceType}: ${s.label}`))].slice(0, 8);
  answer.confidence = { answerGrounding: 0.75 };
}

function answerGeneral(answer: AIResponse, context: AIContext) {
  const parts: string[] = [];
  if (context.investigation) parts.push(`Investigation: ${context.investigation.label}`);
  if (context.entity) parts.push(`Entity: ${context.entity.label} — ${valueOf(linesOf(context.entity.summary), 'Type') ?? 'recorded entity'}`);
  if (context.network) parts.push(`Network: ${context.network.label}`);
  if (context.analytics) {
    const aLines = linesOf(context.analytics.summary);
    const top = valueOf(aLines, 'Top connected');
    if (top) parts.push(`Most-connected recorded entity: ${top}`);
  }
  const findings = (context.findings ?? []).slice(0, 2);
  if (findings.length) parts.push(`Recorded finding(s): ${findings.map((f) => f.label).join(', ')}`);

  if (!parts.length) {
    answer.answer = '';
    return;
  }
  answer.answer = `The available context shows:\n${parts.map((p) => `• ${p}`).join('\n')}`;
  answer.keyPoints = parts.slice(1).map((p) => p.replace(/^[^:]+:\s*/, ''));
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

function linesOf(summary: string | undefined): string[] {
  return (summary ?? '').split('\n').map((l) => l.trim());
}

/** Find a "Key: value" line by key prefix (case-insensitive). */
function valueOf(lines: string[], key: string): string | null {
  const prefix = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, 'i');
  for (const line of lines) {
    const m = line.match(prefix);
    if (m && typeof m[1] === 'string') return m[1].trim();
  }
  return null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function analyticsTop(context: AIContext): string | null {
  if (!context.analytics) return null;
  return valueOf(linesOf(context.analytics.summary), 'Top connected');
}

function a(entityType: string): string {
  return /^[aeiou]/i.test(entityType) ? `an ${entityType}` : `a ${entityType}`;
}

function suggestQuestions(type: AIQueryType, context: AIContext): string[] {
  const q: string[] = [];
  if (context.entity) q.push('Why is this entity structurally important?');
  if (context.network) q.push('Which entities are most connected in this network?');
  if (context.relationships && context.relationships.length > 0) q.push('What evidence is linked to these relationships?');
  if (context.findings && context.findings.length > 0) q.push('What are the major findings so far?');
  if (context.timelineItems && context.timelineItems.length > 0) q.push('What happened in the recorded timeline?');
  if (type === 'INVESTIGATION_SUMMARY') q.push('What evidence supports the recorded findings?');
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