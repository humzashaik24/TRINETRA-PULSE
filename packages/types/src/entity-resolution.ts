export type VerificationState =
  | 'confirmed'
  | 'probable'
  | 'possible'
  | 'rejected'
  | 'needs_review';

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
