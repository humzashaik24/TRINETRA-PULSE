import {
  queryAssistant,
  type AssistantScope,
  type SerializedContextBundle,
} from '@/lib/api/assistant';
import type { AIResponse } from '@trinetra-pulse/types';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';

// ============================================================
// KNOWLEDGE CANVAS — AI CONTEXT ASSEMBLY
// ============================================================
// The Canvas AI panel is ANOTHER CLIENT of Trinetra's grounded,
// investigation-scoped AI contract. This module assembles the bounded
// ``context`` bundle and ``scope`` from investigation data + the current
// Canvas selection and forwards it to ``queryAssistant`` — the same path
// the rest of the product uses. No provider key ever enters the browser;
// answers distinguish SOURCE FACTS / ANALYTICAL INFERENCE / LEADS with
// confidence and sources returned by the backend neutrality guard.
// ============================================================

/** Bounded sample sizes — the backend contract is context-unlimited but
 *  the bundle must stay small enough to ship over the wire. */
const MAX_ENTITIES = 80;
const MAX_RELATIONSHIPS = 120;
const MAX_EVIDENCE = 80;
const MAX_FINDINGS = 40;
const MAX_TIMELINE = 80;

export interface CanvasQueryPrimer {
  investigationId: string;
  networkId?: string | null;
  data: InvestigationWorkspaceData;
  question: string;
  selectedEntityId?: string | null;
  selectedEvidenceId?: string | null;
  selectedRelationshipId?: string | null;
  selectedFindingId?: string | null;
}

/**
 * A selected canvas reference must resolve in the active investigation before
 * it is sent to AI. This deliberately prevents a missing selection from
 * degrading into a broad, generic investigation prompt.
 */
export function selectedCanvasContextAvailable(primer: CanvasQueryPrimer): boolean {
  if (primer.selectedEntityId) {
    return primer.data.entities.some((entity) => entity.entity_id === primer.selectedEntityId);
  }
  if (primer.selectedEvidenceId) {
    return primer.data.evidence.some((evidence) => evidence.evidence_id === primer.selectedEvidenceId);
  }
  if (primer.selectedRelationshipId) {
    return primer.data.relationships.some(
      (relationship) => relationship.relationship_id === primer.selectedRelationshipId,
    );
  }
  if (primer.selectedFindingId) {
    return primer.data.findings.some((finding) => finding.id === primer.selectedFindingId);
  }
  return true;
}

export function buildCanvasScope(primer: CanvasQueryPrimer): AssistantScope {
  return {
    investigation_id: primer.investigationId,
    network_id: primer.networkId ?? null,
    entity_id: primer.selectedEntityId ?? null,
    relationship_id: primer.selectedRelationshipId ?? null,
  };
}

export function buildCanvasContext(
  primer: CanvasQueryPrimer,
): SerializedContextBundle {
  const { data } = primer;

  const entity = data.entities.find((e) => e.entity_id === primer.selectedEntityId);

  const relationships = data.relationships
    .slice(0, MAX_RELATIONSHIPS)
    .map((r) => ({
      sourceId: r.relationship_id,
      label: `${r.source_entity_name} ${r.type.toLowerCase().replace(/_/g, ' ')} ${r.target_entity_name}`,
      confidence: r.confidence,
    }));

  const evidence = data.evidence.slice(0, MAX_EVIDENCE).map((e) => ({
    sourceId: e.evidence_id,
    label: e.title,
    summary: e.summary,
  }));

  const findings = data.findings
    .slice(0, MAX_FINDINGS)
    .map((f) => ({
      sourceId: f.id,
      label: f.title,
      summary: f.description,
    }));

  // Focused selection: when a finding is selected, surface it FIRST in the
  // bounded bundle so the neutrality guard sees the reference explicitly.
  if (primer.selectedFindingId) {
    const focused = data.findings.findIndex((f) => f.id === primer.selectedFindingId);
    if (focused > 0) {
      const selected = findings[focused];
      findings[focused] = findings[0];
      findings[0] = selected;
    }
  }

  const timeline = data.timeline
    .slice(0, MAX_TIMELINE)
    .map((t) => ({
      sourceId: t.ref_id ?? undefined,
      timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : null,
      label: t.title,
      summary: t.description ?? undefined,
    })) as SerializedContextBundle['timeline'];

  const investigation = data.investigation
    ? {
        sourceId: data.investigation.id,
        title: data.investigation.title,
        status: data.investigation.status,
        priority: data.investigation.priority,
        entityCount: data.entities.length,
        relationshipCount: data.relationships.length,
        evidenceCount: data.evidence.length,
      }
    : null;

  const entityBundle = entity
    ? {
        sourceId: entity.entity_id,
        label: entity.name,
        type: entity.entity_type,
        connections: data.relationships.filter(
          (r) =>
            r.source_entity_id === entity.entity_id ||
            r.target_entity_id === entity.entity_id,
        ).length,
      }
    : null;

  return {
    investigation,
    entity: entityBundle,
    relationships,
    evidence,
    findings,
    timeline,
    truncated:
      data.entities.length > MAX_ENTITIES ||
      data.relationships.length > MAX_RELATIONSHIPS,
  };
}

/** Ask the Trinetra-grounded AI about the Canvas context + selection. */
export async function askCanvasAssistant(
  primer: CanvasQueryPrimer,
): Promise<AIResponse> {
  if (!selectedCanvasContextAvailable(primer)) {
    throw new Error('Selected context unavailable: it is not part of the active investigation.');
  }
  return queryAssistant({
    text: primer.question,
    scope: buildCanvasScope(primer),
    context: buildCanvasContext(primer),
  });
}

/**
 * Starter prompts shown when NO object is selected. Every action stays
 * within the active investigation scope.
 */
export const CANVAS_AI_PROMPTS: readonly string[] = [
  'Summarize this investigation',
  'What should I investigate next?',
  'Where might I be missing a connection?',
  'Which evidence is least reliable?',
];

// ------------------------------------------------------------
// Contextual quick actions
// ------------------------------------------------------------

export type CanvasSelectionKind = 'none' | 'entity' | 'relationship' | 'evidence' | 'finding';

export interface CanvasQuickAction {
  id: string;
  label: string;
  prompt: string;
}

function quickAction(id: string, label: string, prompt: string): CanvasQuickAction {
  return { id, label, prompt };
}

/**
 * Bounded, contextual AI actions. Each prompt names the selected object
 * explicitly so the scope never degrades into a broad generic ask — the
 * panel stays grounded in the object the investigator is looking at.
 */
export function canvasQuickActions(selection: {
  kind: CanvasSelectionKind;
  label?: string | null;
}): CanvasQuickAction[] {
  const subject = selection.label?.trim() ? selection.label.trim() : '';
  switch (selection.kind) {
    case 'entity': {
      const s = subject || 'this entity';
      return [
        quickAction('explain', `Explain ${s}`, `Explain ${s} and its role in the investigation, separating source facts from inference.`),
        quickAction('involved-in', `What is ${s} involved in?`, `What is ${s} involved in across the entities, relationships and evidence?`),
        quickAction('credibility', `Assess ${s}`, `Assess ${s} credibility using only grounded evidence and labelled sources.`),
        quickAction('connections', `Who connects to ${s}?`, `Which confirmed entities and relationships connect to ${s}?`),
      ];
    }
    case 'relationship': {
      const s = subject || 'this connection';
      return [
        quickAction('explain', `Explain ${s}`, `Explain ${s} and what it means for the investigation, separating source facts from inference.`),
        quickAction('evaluate', `Evaluate ${s}`, `Evaluate ${s} confidence and whether the evidence supports it.`),
        quickAction('evidence', `Evidence for ${s}`, `What evidence supports ${s}? List only grounded, sourced items.`),
      ];
    }
    case 'evidence': {
      const s = subject || 'this evidence';
      return [
        quickAction('summarize', `Summarize ${s}`, `Summarize ${s} and what it establishes, separating source facts from inference.`),
        quickAction('supports', `What does ${s} support?`, `What do ${s} support or refute across the relationships and findings?`),
        quickAction('reliability', `Assess ${s}`, `Assess ${s} reliability using grounded metadata and sources.`),
      ];
    }
    case 'finding': {
      const s = subject || 'this finding';
      return [
        quickAction('explain', `Explain ${s}`, `Explain ${s} evidence chain, separating source facts from inference.`),
        quickAction('corroborate', `Supports or refutes ${s}?`, `What supports or refutes ${s}? Distinguish supporting from contradicting evidence.`),
        quickAction('chase', `How to chase ${s}`, `What should I do next to validate or update ${s}?`),
      ];
    }
    case 'none':
    default:
      return CANVAS_AI_PROMPTS.map((prompt, i) => quickAction(`base-${i}`, prompt, prompt));
  }
}
