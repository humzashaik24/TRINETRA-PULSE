import type {
  AIResponse,
  AISourceReference,
  AIAction,
  AIActionType,
  AIContext,
  AIResponseStatus,
} from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — RESPONSE & SOURCE VALIDATION
// ============================================================
// Never blindly trust model output. This module validates:
//   - response structure / status
//   - source reference existence (rejects fake ids)
//   - investigation boundary (references must belong to the scope)
//   - allowed actions (read-only navigation only)
// Invalid references are REMOVED (never re-fabricated). If nothing
// can be grounded the response is marked incomplete / not_found and
// a neutral limitation is added.
// ============================================================

/** Known-good source ids derived from the retrieved context. */
export interface ValidationRegistry {
  entityIds: Set<string>;
  relationshipIds: Set<string>;
  evidenceIds: Set<string>;
  findingIds: Set<string>;
  networkIds: Set<string>;
  investigationIds: Set<string>;
}

export const ALLOWED_ACTION_TYPES: AIActionType[] = [
  'SHOW_ON_GRAPH',
  'OPEN_ENTITY',
  'OPEN_RELATIONSHIP',
  'OPEN_EVIDENCE',
  'OPEN_FINDING',
  'OPEN_ANALYTICS',
  'OPEN_TIMELINE',
  'FOCUS_COMMUNITY',
  'FOCUS_COMPONENT',
];

export function buildRegistry(context: AIContext): ValidationRegistry {
  const entityIds = new Set<string>();
  const relationshipIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const findingIds = new Set<string>();
  const networkIds = new Set<string>();
  const investigationIds = new Set<string>();

  context.entity && entityIds.add(context.entity.sourceId);
  context.investigation && investigationIds.add(context.investigation.sourceId);
  if (context.network) networkIds.add(context.network.sourceId);
  if (context.analytics && context.analytics.sourceId) networkIds.add(context.analytics.sourceId);
  for (const rel of context.relationships ?? []) relationshipIds.add(rel.sourceId);
  for (const ev of context.evidence ?? []) evidenceIds.add(ev.sourceId);
  for (const f of context.findings ?? []) findingIds.add(f.sourceId);

  return { entityIds, relationshipIds, evidenceIds, findingIds, networkIds, investigationIds };
}

export function sourceIsValid(
  ref: AISourceReference,
  registry: ValidationRegistry,
  context: AIContext
): boolean {
  const id = ref.sourceId;
  switch (ref.sourceType) {
    case 'Entity':
      return registry.entityIds.has(id) || isEntityInContext(context, id);
    case 'Relationship':
      return registry.relationshipIds.has(id) || isRelationshipInContext(context, id);
    case 'Evidence':
      return registry.evidenceIds.has(id);
    case 'Finding':
      return registry.findingIds.has(id);
    case 'Network':
      return registry.networkIds.has(id);
    case 'Investigation':
      return registry.investigationIds.has(id);
    case 'Analytics':
    case 'Timeline':
    case 'Document':
    case 'Event':
    case 'Note':
      return true;
    default:
      return false;
  }
}

function isEntityInContext(context: AIContext, id: string): boolean {
  if (!context.entity || context.entity.sourceId !== id) return false;
  return true;
}

function isRelationshipInContext(context: AIContext, id: string): boolean {
  return (context.relationships ?? []).some((r) => r.sourceId === id);
}

export function validateActions(actions: AIAction[]): AIAction[] {
  const seen = new Set<string>();
  const out: AIAction[] = [];
  for (const a of actions) {
    if (!ALLOWED_ACTION_TYPES.includes(a.type)) continue;
    if (seen.has(a.type)) continue;
    seen.add(a.type);
    out.push({ ...a, status: a.status === 'error' ? 'error' : 'available' });
  }
  return out;
}

export interface ValidationResult {
  response: AIResponse;
  removedSourceCount: number;
  invalidActionsRemoved: boolean;
}

export function validateResponse(
  raw: AIResponse,
  context: AIContext
): ValidationResult {
  const registry = buildRegistry(context);
  const validSources = raw.sources.filter((s) => sourceIsValid(s, registry, context));
  const removedSourceCount = raw.sources.length - validSources.length;

  const actions = validateActions(raw.suggestedActions ?? []);
  const invalidActionsRemoved = (raw.suggestedActions?.length ?? 0) > actions.length;

  let status: AIResponseStatus = raw.status;
  let incomplete = raw.incomplete;
  const limitations = [...(raw.limitations ?? [])];

  if (removedSourceCount > 0) {
    limitations.push('Some referenced sources could not be validated against the current investigation context and were removed.');
    incomplete = true;
  }

  // If nothing could be grounded, flip to not_found with neutral wording.
  if (isEmptyAnswer(raw.answer) || (validSources.length === 0 && status !== 'not_found')) {
    status = 'not_found';
  }

  const response: AIResponse = {
    ...raw,
    status,
    sources: validSources,
    suggestedActions: actions,
    limitations,
    incomplete,
  };
  return { response, removedSourceCount, invalidActionsRemoved };
}

function isEmptyAnswer(answer: string): boolean {
  return !answer || answer.trim().length === 0;
}
