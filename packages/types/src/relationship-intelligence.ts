// ============================================================
// PHASE 21 — RELATIONSHIP INTELLIGENCE
// ============================================================
// Multi-source correlation for relationships. Aggregates individual
// source observations into a single analyst-facing surface WITHOUT
// collapsing inference into observation: every per-source observation
// is preserved, and the correlation summary is derived deterministically
// (no randomness, no O(N^2) cross-products).
//
// Language is intentionally neutral — correlation describes how many
// independent sources jointly observed a relationship, never guilt,
// criminality or propensity.
// ============================================================

// ------------------------------------------------------------
// Status & confidence
// ------------------------------------------------------------

export type RelationshipIntelligenceStatus =
  | 'NEEDS_REVIEW'
  | 'REVIEWED'
  | 'DISCARDED';

export const RELATIONSHIP_INTELLIGENCE_STATUSES: readonly RelationshipIntelligenceStatus[] = [
  'NEEDS_REVIEW',
  'REVIEWED',
  'DISCARDED',
];

export type RelationshipConfidenceLabel = 'HIGH' | 'MEDIUM' | 'LOW';

// ------------------------------------------------------------
// Per-source observation (unchanged, preserved individually)
// ------------------------------------------------------------

export interface RelationshipObservation {
  id: string;
  sourceId: string;
  sourceLabel: string;
  /** Source record / evidence reference backing this observation. */
  reference?: string | null;
  /** When the source recorded the observation (may be unknown). */
  observedAt?: string | null;
  /** Confidence reported in the association (0-1). */
  confidence: number;
}

// ------------------------------------------------------------
// Conflict flags (derived, never fabricated)
// ------------------------------------------------------------

export interface RelationshipConflict {
  observationId: string;
  sourceId: string;
  sourceLabel: string;
  /** Lower source observation confidence (0-1). */
  confidence: number;
  conflictType: 'CONTRADICTING_SOURCE' | 'CONFLICTING_ATTRIBUTE';
  summary: string;
  reference?: string | null;
}

// ------------------------------------------------------------
// Evidence support for a correlation (honest "no linked evidence")
// ------------------------------------------------------------

export interface RelationshipEvidenceSummary {
  relationshipId: string;
  supported: boolean;
  evidenceIds: string[];
  directCount: number;
}

// ------------------------------------------------------------
// Correlation summary (the analyst-facing surface)
// ------------------------------------------------------------

export interface RelationshipIntelligence {
  relationshipId: string;
  status: RelationshipIntelligenceStatus;
  correlationKey: string;
  sourceCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  /** Confidence in the joint multi-source correlation (0-1). */
  confidence: number;
  confidenceLabel: RelationshipConfidenceLabel;
  observationCount: number;
  observations: RelationshipObservation[];
  evidenceCount: number;
  evidenceSupport: RelationshipEvidenceSummary | null;
  conflicts: RelationshipConflict[];
  conflictFlags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipIntelligenceList {
  items: RelationshipIntelligence[];
  total: number;
}

// ------------------------------------------------------------
// Links surfaced for the Context Inspector
// ------------------------------------------------------------

export interface RelationshipEvidenceLink {
  relationshipId: string;
  evidenceId: string;
  title: string;
  sourceName: string;
  direction: 'direct' | 'contextual';
}

// ------------------------------------------------------------
// Correlation evaluation result (POST evaluate)
// ------------------------------------------------------------

export interface RelationshipEvaluationResult {
  relationshipId: string;
  intelligence: RelationshipIntelligence | null;
  observations: RelationshipObservation[];
  observationCount: number;
  evidenceCount: number;
  correlationKey: string;
}
