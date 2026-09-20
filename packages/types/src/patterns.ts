export type PatternDetectionType =
  | 'CIRCULAR_FUND_FLOW'
  | 'BURNER_SIM'
  | 'NETWORK_HUB'
  | 'BRIDGE_ENTITY'
  | 'RAPID_RELATIONSHIP_EXPANSION';

export type PatternDetectionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PatternDetectionResult {
  id: string;
  investigation_id: string;
  pattern_type: PatternDetectionType;
  severity: PatternDetectionSeverity;
  confidence: number;
  title: string;
  description: string;
  entity_ids: string[];
  relationship_ids: string[];
  evidence_ids: string[];
  event_ids: string[];
  metadata: Record<string, unknown>;
  detected_at: string;
}

export interface PatternDetectionResponse {
  investigation_id: string;
  patterns: PatternDetectionResult[];
}

// ============================================================
// PHASE C — UNIFIED PATTERNS WORKSPACE CONTRACT
// ============================================================
// The Patterns workspace presents the backend detection engine output
// (`PatternDetectionResult`) enriched with investigation-scoped context
// (`entityRefs` / `evidenceRefs` / `relationshipRefs`). Every field traces to
// a real backend value or the investigation's persisted rows. Fields the
// backend cannot supply are simply absent — never invented.
// ============================================================

/** Entity context referenced by a pattern, resolved from the
 *  investigation-scoped persisted entity rows. */
export interface PatternEntityRef {
  id: string;
  name: string;
  type: string;
}

/** Evidence context referenced by a pattern, resolved from the
 *  investigation-scoped persisted evidence rows. */
export interface PatternEvidenceRef {
  id: string;
  title: string;
}

/** Relationship context referenced by a pattern, resolved from the
 *  investigation-scoped persisted relationship rows. */
export interface PatternRelationshipRef {
  id: string;
  sourceName?: string;
  targetName?: string;
  type?: string;
}

/**
 * Unified investigation-scoped pattern artifact rendered by the Patterns
 * workspace. Extends the wire contract with context enrichment.
 *
 * Sourcing rules:
 *  - `typeLabel`        : API mode → the authoritative backend `pattern_type`
 *                         term (never renamed); mock mode → the fixture label.
 *  - `status`           : mock fixture only; absent in API mode (the relational
 *                         model has no review queue, so a status is honest only
 *                         when the source carries one).
 *  - `metrics`          : API mode → deterministic rows derived from the backend
 *                         `metadata` (real analytic values); mock mode → fixture
 *                         metrics.
 *  - `timeAgo`          : API mode → computed from the real `detected_at`;
 *                         mock mode → fixture value.
 *  - `entityRefs` / `evidenceRefs` / `relationshipRefs` : resolved from the
 *    investigation's persisted rows; empty when unavailable.
 */
export interface PatternArtifact extends PatternDetectionResult {
  typeLabel: string;
  status?: 'new' | 'reviewing' | 'dismissed' | 'confirmed';
  metrics: Record<string, string>;
  timeAgo: string;
  entityRefs: PatternEntityRef[];
  evidenceRefs: PatternEvidenceRef[];
  relationshipRefs: PatternRelationshipRef[];
}
