// Investigation Direction Intelligence — typed contracts (Phase 26).
//
// Directions are analytical leads computed on request from persisted
// investigation data. They are grounded, deterministic and read-only: they
// never establish guilt or criminal intent, never invent evidence or
// relationships, and never modify investigation data. `confidence` is the
// confidence that the recorded data supports the suggested next step,
// clamped to [0.0, 1.0].

export type InvestigationDirectionType =
  | 'unresolved_connection'
  | 'high_connectivity_entity'
  | 'bridge_entity'
  | 'suspicious_pattern'
  | 'evidence_gap'
  | 'timeline_gap'
  | 'relationship_verification'
  | 'entity_resolution'
  | 'follow_up_evidence';

export type InvestigationDirectionPriority = 'low' | 'medium' | 'high' | 'critical';

/** Lifecycle contract. Directions are generated fresh (always `new`); the
 *  remaining states are reserved for a future analyst-decision workflow. */
export type InvestigationDirectionStatus = 'new' | 'reviewing' | 'dismissed' | 'acted_on';

export type SupportingFactType =
  | 'degree_observed'
  | 'articulation_point'
  | 'unresolved_pair'
  | 'shared_evidence'
  | 'pattern_detected'
  | 'relationship_without_evidence'
  | 'verification_pending'
  | 'resolution_pending'
  | 'timestamp_missing'
  | 'timeline_gap'
  | 'dangling_evidence_reference';

export interface InvestigationSupportingFact {
  fact_type: SupportingFactType;
  description: string;
  entity_id: string | null;
  relationship_id: string | null;
  evidence_id: string | null;
  value: number | string | Record<string, unknown> | null;
}

export interface InvestigationDirection {
  id: string;
  investigation_id: string;
  direction_type: InvestigationDirectionType;
  title: string;
  summary: string;
  priority: InvestigationDirectionPriority;
  confidence: number;
  rationale: string;
  supporting_facts: InvestigationSupportingFact[];
  related_entity_ids: string[];
  related_relationship_ids: string[];
  related_evidence_ids: string[];
  status: InvestigationDirectionStatus;
  created_at: string;
}

export interface InvestigationDirectionsResponse {
  investigation_id: string;
  computed_at: string;
  directions: InvestigationDirection[];
}