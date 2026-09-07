import type {
  RelationshipConfidenceLabel,
  RelationshipEvidenceLink,
  RelationshipEvidenceSummary,
  RelationshipIntelligence,
  RelationshipIntelligenceList,
  RelationshipIntelligenceStatus,
  RelationshipObservation,
  RelationshipEvaluationResult,
} from '@trinetra-pulse/types';
import { mockEntityRelationships } from '@/mock/entity-relationships';
import {
  mockEvidenceByRelationshipId,
  mockEvidenceById,
} from '@/mock/evidence-intelligence';
import { isMockData } from '@/lib/api/config';
import * as api from '@/lib/api/relationship-intelligence';
import type {
  RealRelationshipIntelligence,
  RealRelationshipIntelligenceItem,
} from '@/lib/api/relationship-intelligence';

// ============================================================
// PHASE 21 — RELATIONSHIP INTELLIGENCE SERVICE
// ============================================================
// Aggregates individual source observations into a single analyst-facing
// correlation surface. The mock path derives data deterministically from the
// existing relationship mocks (one observation per distinct evidence
// reference; no fabricated conflicts). The real path maps the /api/v2
// response shape onto the shared intelligence types.
//
// Language is intentionally neutral — correlation describes how many
// independent sources jointly observed a relationship, never guilt,
// criminality or propensity.
// ============================================================

const LATENCY = 160;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function confidenceLabelFor(score: number): RelationshipConfidenceLabel {
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

const STATUS_LABEL: Record<RelationshipIntelligenceStatus, string> = {
  NEEDS_REVIEW: 'Needs review',
  REVIEWED: 'Reviewed',
  DISCARDED: 'Discarded',
};

// ------------------------------------------------------------
// Deterministic mock derivation
// ------------------------------------------------------------

interface ObservationSeed {
  reference: string;
  sourceLabel: string;
  observedAt: string;
}

/**
 * Historic mock relationships carry an `evidence` array of source references
 * (e.g. "cdr_extract.csv #2241", "FIR-2026-001 / R5"). Each distinct reference
 * is treated as a single observation, mirroring the backend's fallback of one
 * observation per distinct evidence reference. Derived deterministically —
 * never fabricated.
 */
function seedObservations(relId: string, references: string[], source: string): RelationshipObservation[] {
  const seen = new Set<string>();
  const observations: RelationshipObservation[] = [];
  for (const reference of references) {
    if (seen.has(reference)) continue;
    seen.add(reference);
    // Derive the observation's source from the evidence reference's document
    // prefix (mirrors backend data_provenance, one source per evidence ref).
    // Only fall back to the relationship source field when no prefix exists.
    const sep = reference.indexOf('/');
    const prefixRaw = (sep >= 0 ? reference.slice(0, sep) : reference).trim();
    const sourceLabel = prefixRaw || source || reference;
    observations.push({
      id: `obs-${relId}-${observations.length + 1}`,
      sourceId: sourceLabel,
      sourceLabel,
      reference,
      observedAt: null,
      confidence: 1,
    });
  }
  return observations;
}

function deriveConflicts(
  relId: string,
  observations: RelationshipObservation[],
  baseConfidence: number,
): string[] {
  const bySource = new Map<string, RelationshipObservation[]>();
  for (const obs of observations) {
    const list = bySource.get(obs.sourceId) ?? [];
    list.push(obs);
    bySource.set(obs.sourceId, list);
  }
  const conflicts: string[] = [];
  for (const [sourceLabel, group] of bySource) {
    if (group.length > 1 && baseConfidence < 0.6) {
      conflicts.push(
        `conflicting_observations:${sourceLabel}:${group.length}`,
      );
    }
  }
  return conflicts;
}

function buildMockIntelligence(
  relId: string,
  source: string,
  confidence: number,
  timestamp: string | undefined,
  evidenceRefs: string[],
): RelationshipIntelligence {
  const observations = seedObservations(relId, evidenceRefs, source);
  const distinctSources = new Set(observations.map((o) => o.sourceId)).size;
  const isCorrelated = distinctSources >= 2;
  const support = mockEvidenceByRelationshipId.get(relId);
  const evidenceCount = support?.evidenceIds.length ?? 0;
  const evidenceSupport: RelationshipEvidenceSummary | null =
    support && support.evidenceIds.length > 0
      ? {
          relationshipId: relId,
          supported: true,
          evidenceIds: support.evidenceIds,
          directCount: support.directEvidenceCount,
        }
      : {
          relationshipId: relId,
          supported: false,
          evidenceIds: [],
          directCount: 0,
        };

  const baseScore = isCorrelated
    ? Math.min(0.95, 0.5 + 0.15 * distinctSources)
    : Math.min(0.55, confidence);
  const conflictCount = deriveConflicts(relId, observations, confidence).length;
  const linkageScore = Math.max(0.05, Math.min(0.98, baseScore - conflictCount * 0.08));

  const timestamps = observations
    .map((o) => o.observedAt)
    .filter((t): t is string => Boolean(t));
  if (timestamp) timestamps.push(timestamp);

  const firstObservedAt = timestamps.length
    ? timestamps.reduce((a, b) => (a < b ? a : b))
    : null;
  const lastObservedAt = timestamps.length
    ? timestamps.reduce((a, b) => (a > b ? a : b))
    : null;

  return {
    relationshipId: relId,
    status: 'NEEDS_REVIEW',
    correlationKey: isCorrelated ? `g-${Array.from(new Set(observations.map((o) => o.sourceId))).sort().join('+')}` : '',
    sourceCount: distinctSources,
    firstObservedAt,
    lastObservedAt,
    confidence: Math.round(linkageScore * 1000) / 1000,
    confidenceLabel: confidenceLabelFor(linkageScore),
    observationCount: observations.length,
    observations,
    evidenceCount,
    evidenceSupport,
    conflicts: [],
    conflictFlags: deriveConflicts(relId, observations, confidence),
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
  };
}

const mockCache = new Map<string, RelationshipIntelligence>();

export interface RelationshipIntelligenceSnapshot {
  status: RelationshipIntelligenceStatus;
  confidence: number;
  confidenceLabel: RelationshipConfidenceLabel;
  sourceCount: number;
  correlationKey: string;
}

/**
 * Compact deterministic snapshot of relationship intelligence for embedding on
 * relationship records (badges, list rows). Mirrors buildMockIntelligence but
 * only derives correlation metadata, so it stays cheap when called in loops.
 */
export function relationshipIntelligenceSnapshot(
  relId: string,
): RelationshipIntelligenceSnapshot | undefined {
  const rel = mockEntityRelationships.find((r) => r.id === relId);
  if (!rel) return undefined;
  const observations = seedObservations(rel.id, rel.evidence, rel.source);
  const distinctSources = new Set(observations.map((o) => o.sourceId)).size;
  const isCorrelated = distinctSources >= 2;
  const conflictCount = deriveConflicts(rel.id, observations, rel.confidence).length;
  const baseScore = isCorrelated
    ? Math.min(0.95, 0.5 + 0.15 * distinctSources)
    : Math.min(0.55, rel.confidence);
  const linkageScore = Math.max(0.05, Math.min(0.98, baseScore - conflictCount * 0.08));
  return {
    status: 'NEEDS_REVIEW',
    confidence: Math.round(linkageScore * 1000) / 1000,
    confidenceLabel: confidenceLabelFor(linkageScore),
    sourceCount: distinctSources,
    correlationKey: isCorrelated
      ? `g-${Array.from(new Set(observations.map((o) => o.sourceId))).sort().join('+')}`
      : '',
  };
}

function mockIntelligenceFor(relId: string): RelationshipIntelligence {
  const cached = mockCache.get(relId);
  if (cached) return cached;
  const rel = mockEntityRelationships.find((r) => r.id === relId);
  if (!rel) throw new Error(`Relationship not found: ${relId}`);
  const built = buildMockIntelligence(
    rel.id,
    rel.source,
    rel.confidence,
    rel.timestamp,
    rel.evidence,
  );
  mockCache.set(relId, built);
  return built;
}

// ------------------------------------------------------------
// Real → frontend mapping
// ------------------------------------------------------------

function mapRealIntelligence(r: RealRelationshipIntelligence): RelationshipIntelligence {
  const support = r.evidence;
  return {
    relationshipId: r.relationship_id,
    status: mapStatus(r.intelligence_status),
    correlationKey: r.correlation_key,
    sourceCount: r.source_count,
    firstObservedAt: r.first_observed_at,
    lastObservedAt: r.last_observed_at,
    confidence: r.linkage_score,
    confidenceLabel: r.confidence_label,
    observationCount: r.observation_count,
    observations: r.observations.map((o) => ({
      id: o.observation_id,
      sourceId: o.source_id,
      sourceLabel: o.source_label,
      reference: o.reference ?? null,
      observedAt: o.observed_at ?? null,
      confidence: o.confidence,
    })),
    evidenceCount: support.evidence_count,
    evidenceSupport: {
      relationshipId: r.relationship_id,
      supported: support.linked,
      evidenceIds: support.evidence_ids,
      directCount: support.evidence_count,
    },
    conflicts: [],
    conflictFlags: r.conflict_flags,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapStatus(status: string): RelationshipIntelligenceStatus {
  if (status === 'NEEDS_REVIEW') return 'NEEDS_REVIEW';
  if (status === 'REVIEWED') return 'REVIEWED';
  if (status === 'DISCARDED') return 'DISCARDED';
  return 'NEEDS_REVIEW';
}

function mapListItem(
  item: RealRelationshipIntelligenceItem,
): Pick<
  RelationshipIntelligence,
  | 'relationshipId'
  | 'status'
  | 'correlationKey'
  | 'sourceCount'
  | 'confidence'
  | 'confidenceLabel'
  | 'observationCount'
  | 'firstObservedAt'
  | 'lastObservedAt'
  | 'evidenceCount'
> {
  return {
    relationshipId: item.relationship_id,
    status: mapStatus(item.intelligence_status),
    correlationKey: item.correlation_key,
    sourceCount: item.source_count,
    confidence: item.linkage_score,
    confidenceLabel: item.confidence_label,
    observationCount: item.observation_count,
    firstObservedAt: item.first_observed_at,
    lastObservedAt: item.last_observed_at,
    evidenceCount: item.evidence_count,
  };
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export function getIntelligenceStatusLabel(status: RelationshipIntelligenceStatus): string {
  return STATUS_LABEL[status];
}

export async function getRelationshipIntelligence(
  relationshipId: string,
): Promise<RelationshipIntelligence> {
  await delay();
  if (isMockData()) return mockIntelligenceFor(relationshipId);
  const raw = await api.getRelationshipIntelligence(relationshipId);
  return mapRealIntelligence(raw);
}

export async function getRelationshipObservations(
  relationshipId: string,
): Promise<RelationshipObservation[]> {
  if (isMockData()) return mockIntelligenceFor(relationshipId).observations;
  const raw = await api.getRelationshipObservations(relationshipId);
  return raw.observations.map((o) => ({
    id: o.observation_id,
    sourceId: o.source_id,
    sourceLabel: o.source_label,
    reference: o.reference ?? null,
    observedAt: o.observed_at ?? null,
    confidence: o.confidence,
  }));
}

export async function getRelationshipEvidence(
  relationshipId: string,
): Promise<RelationshipEvidenceSummary> {
  if (isMockData()) {
    const intel = mockIntelligenceFor(relationshipId);
    return intel.evidenceSupport ?? {
      relationshipId,
      supported: false,
      evidenceIds: [],
      directCount: 0,
    };
  }
  const raw = await api.getRelationshipEvidence(relationshipId);
  return {
    relationshipId: raw.relationship_id,
    supported: raw.linked,
    evidenceIds: raw.evidence_ids,
    directCount: raw.evidence_count,
  };
}

export async function listRelationshipIntelligence(
  investigationId: string,
): Promise<RelationshipIntelligenceList> {
  await delay();
  if (isMockData()) {
    const items = mockEntityRelationships.map((r) => mockIntelligenceFor(r.id));
    return { items, total: items.length };
  }
  const raw = await api.listRelationshipIntelligence(investigationId);
  const items = raw.items.map((item) => ({
    ...mapListItem(item),
    observations: [],
    conflicts: [],
    conflictFlags: [],
    evidence: [],
    evidenceSupport: null,
    createdAt: '',
    updatedAt: '',
  }));
  return { items, total: items.length };
}

export async function evaluateRelationshipIntelligence(
  investigationId: string,
): Promise<{ evaluatedRelationships: number; correlationGroups: number; conflictsDetected: number }> {
  await delay(240);
  if (isMockData()) {
    const items = mockEntityRelationships.map((r) => mockIntelligenceFor(r.id));
    const groups = new Set(items.map((i) => i.correlationKey).filter(Boolean));
    return {
      evaluatedRelationships: items.length,
      correlationGroups: groups.size,
      conflictsDetected: items.reduce((n, i) => n + i.conflictFlags.length, 0),
    };
  }
  const raw = await api.evaluateRelationshipIntelligence(investigationId);
  return {
    evaluatedRelationships: raw.evaluated_relationships,
    correlationGroups: raw.correlation_groups,
    conflictsDetected: raw.conflicts_detected,
  };
}

export async function confirmRelationship(
  relationshipId: string,
  reason?: string,
): Promise<RelationshipIntelligence> {
  await delay();
  if (isMockData()) {
    const intel = mockIntelligenceFor(relationshipId);
    const next: RelationshipIntelligence = { ...intel, status: 'REVIEWED' };
    mockCache.set(relationshipId, next);
    return next;
  }
  const raw = await api.confirmRelationship(relationshipId, reason);
  return mapRealIntelligence(raw);
}

export async function rejectRelationship(
  relationshipId: string,
  reason?: string,
): Promise<RelationshipIntelligence> {
  await delay();
  if (isMockData()) {
    const intel = mockIntelligenceFor(relationshipId);
    const next: RelationshipIntelligence = { ...intel, status: 'DISCARDED' };
    mockCache.set(relationshipId, next);
    return next;
  }
  const raw = await api.rejectRelationship(relationshipId, reason);
  return mapRealIntelligence(raw);
}

export async function evaluateRelationship(
  relationshipId: string,
): Promise<RelationshipEvaluationResult> {
  const intel = await getRelationshipIntelligence(relationshipId);
  return {
    relationshipId,
    intelligence: intel,
    observations: intel.observations,
    observationCount: intel.observationCount,
    evidenceCount: intel.evidenceCount,
    correlationKey: intel.correlationKey,
  };
}

// Bidirectional navigation between a relationship and its evidence links
// (used by the Context Inspector intelligence panel).

export async function fetchRelationshipEvidenceLinks(
  relationshipId: string,
): Promise<RelationshipEvidenceLink[]> {
  const intel = await getRelationshipIntelligence(relationshipId);
  const support = intel.evidenceSupport;
  if (!support || !intel.evidenceCount) return [];
  return support.evidenceIds.map((evidenceId) => {
    const ev = mockEvidenceById.get(evidenceId);
    return {
      relationshipId,
      evidenceId,
      title: ev?.title ?? evidenceId,
      sourceName: ev?.sourceName ?? 'Evidence',
      direction: 'direct' as const,
    };
  });
}

