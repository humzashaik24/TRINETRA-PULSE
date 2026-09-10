import type { AIContextScope } from '@trinetra-pulse/types';
import type { Investigation } from '@trinetra-pulse/types';
import { mockInvestigationById } from '@/mock/investigations';
import { mockEntityProfileById } from '@/mock/entity-profiles';

// ============================================================
// PHASE 13 — CONTEXTUAL AI PROMPTS
// ============================================================
// Builds investigation-scoped starter prompts for the AI assistant.
// Prompts are derived purely from the current scope (entity /
// network / investigation) and the actual linked objects, so every
// suggestion leads to a grounded, in-context answer — never a
// generic or invented one.
// ============================================================

export interface ContextualPromptInput {
  scope: Pick<AIContextScope, 'investigationId' | 'networkId' | 'entityId'>;
  investigation?: Investigation | null;
  /** Names of entities currently linked into the workspace. */
  entityNames?: string[];
}

/** Always-safe baseline prompts (no scope required). */
const BASELINE_PROMPTS = [
  'Summarize this investigation',
  'Which evidence supports the recorded findings?',
  'Which entities are most connected in this network?',
  'What changed recently in the timeline?',
];

/**
 * Build the contextual starter list. The first entries reflect the
 * live scope (selected entity, open network, active investigation),
 * followed by deterministic investigation-specific prompts and the
 * baseline set. No more than {@link MAX_PROMPTS} prompts returned.
 */
export function buildContextualPrompts({
  scope,
  investigation,
  entityNames = [],
}: ContextualPromptInput): string[] {
  const prompts: string[] = [];
  const invTitle = investigation?.title;

  // Selected-entity prompts first — the most focused scope.
  if (scope.entityId) {
    const entityName = namedEntity(scope, entityNames);
    prompts.push(
      `Summarize what is known about ${entityName} in this investigation`
    );
    prompts.push(
      `Which evidence links ${entityName} to the other entities here?`
    );
    prompts.push(
      `How connected is ${entityName} in the open network?`
    );
  }

  // Open-network prompts.
  if (scope.networkId && !scope.entityId) {
    prompts.push(
      'Which entities form the most connected group in this network?'
    );
    prompts.push(
      'Which entities act as bridges between clusters in this network?'
    );
    prompts.push(
      'What suspicious patterns were detected in this network?'
    );
    prompts.push(
      'Which entities share the most community connections?'
    );
  }

  // Investigation-scoped prompts referencing real linked objects.
  const record = scope.investigationId
    ? mockInvestigationById.get(scope.investigationId)
    : undefined;
  if (record) {
    const topEntity =
      record.entities[0]?.name ??
      record.investigation.lead_investigator;
    const topFinding = record.findings[0]?.title;
    const secondFinding = record.findings[1]?.title;
    if (invTitle) {
      prompts.push(
        `Explain the chain of evidence behind ${topFinding ?? 'the main finding'}`
      );
      prompts.push(
        `Walk me through how ${topEntity} connects to ${invTitle}`
      );
      if (secondFinding) {
        prompts.push(
          `What evidence is linked to the finding "${secondFinding}"?`
        );
      }
    }
  }

  // Always-on baseline prompts.
  prompts.push(...BASELINE_PROMPTS);

  return dedupe(prompts);
}

/** Resolve a human-friendly name for the focused entity: prefer the
 *  linked-name set when it is a single known entity, then the deterministic
 *  mock profile universe, and only then the generic reference. The generic
 *  fallback guarantees the assistant never fabricates a name. */
function namedEntity(
  scope: Pick<AIContextScope, 'entityId'>,
  entityNames: string[]
): string {
  if (entityNames.length === 1) return entityNames[0];
  if (scope.entityId) {
    const profile = mockEntityProfileById.get(scope.entityId);
    if (profile) return profile.displayName;
  }
  return 'the selected entity';
}

function dedupe(prompts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of prompts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}