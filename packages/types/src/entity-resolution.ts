export type VerificationState =
  | 'confirmed'
  | 'auto_resolved'
  | 'probable'
  | 'possible'
  | 'rejected'
  | 'needs_review';

export type ResolutionMethod = 'auto' | 'manual' | 'imported';

export interface MatchFeature {
  feature: string;
  label: string;
  matched: boolean | null;
  value: string;
  weight: number;
  value_1: unknown;
  value_2: unknown;
  normalized_1: unknown;
  normalized_2: unknown;
  source_1: string | null;
  source_2: string | null;
}

export interface ResolutionContradiction {
  type: string;
  field: string;
  values: unknown[];
  detail: string | null;
  label: string | null;
}

export interface ResolutionSourceRef {
  source_dataset: string;
  source_record: string | null;
  source_type: string | null;
  original_value: string | null;
  normalized_value: string | null;
  dataset_id: string | null;
  evidence_refs: string[];
}

/**
 * Entity resolution candidate as returned by the real /api/v2 layer (Phase 20).
 *
 * Neutral, explainable identity-correlation record. The `linkage_score`
 * expresses "confidence these records refer to the same observed entity" — it
 * is never a probability of criminality or guilt.
 */
export interface EntityResolutionCandidate {
  id: string;
  investigation_id: string;
  entity_id_1: string;
  entity_id_2: string;
  entity_1_name: string | null;
  entity_2_name: string | null;
  entity_1_type: string | null;
  entity_2_type: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  linkage_score: number;
  resolution_version: string;
  resolution_method: ResolutionMethod;
  matched_features: MatchFeature[];
  contradictions: ResolutionContradiction[];
  source_refs: ResolutionSourceRef[];
  matching_attributes: unknown[];
  evidence: string[];
  verification_state: VerificationState;
  last_evaluated_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ResolutionCandidatesResponse {
  investigation_id: string;
  entity_id: string | null;
  candidates: EntityResolutionCandidate[];
  algorithm_version: string;
  evaluated_at: string;
}

export interface ResolutionEvaluationResult {
  investigation_id: string;
  evaluated_pairs: number;
  created_resolutions: number;
  skipped_existing: number;
  algorithm_version: string;
  evaluated_at: string;
}

export interface EntityResolution {
  id: string;
  entity_id_1: string;
  entity_id_2: string;
  confidence: string;
  matching_attributes: Array<{
    attribute: string;
    value_1: unknown;
    value_2: unknown;
    similarity: number;
  }>;
  evidence: string[];
  verification_state: VerificationState;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}
