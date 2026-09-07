import type { ExtractionMethod } from './entity-intelligence';

export type RelationshipType =
  | 'known_associiate'
  | 'family'
  | 'communicates'
  | 'transaction'
  | 'located_at'
  | 'owns'
  | 'member_of'
  | 'contacts'
  | 'travels_with'
  | 'associated_with'
  | 'other';

export type VerificationStatus =
  | 'confirmed'
  | 'probable'
  | 'possible'
  | 'rejected'
  | 'needs_review';

export interface Relationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  confidence: number;
  source: string | null;
  evidence_refs: string[];
  extraction_method: ExtractionMethod;
  verification_status: VerificationStatus;
  description: string | null;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface RelationshipCreate {
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  confidence?: number;
  source?: string;
  evidence_refs?: string[];
  extraction_method?: ExtractionMethod;
  description?: string;
  weight?: number;
}
