export type EntityType =
  | 'person'
  | 'phone'
  | 'vehicle'
  | 'location'
  | 'organization'
  | 'account'
  | 'transaction'
  | 'event'
  | 'case'
  | 'document'
  | 'evidence';

export interface Entity {
  id: string;
  entity_type: EntityType;
  name: string;
  canonical_name: string | null;
  description: string | null;
  attributes: Record<string, unknown>;
  risk_score: number;
  is_verified: boolean;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntityCreate {
  entity_type: EntityType;
  name: string;
  description?: string;
  attributes?: Record<string, unknown>;
}

export interface EntityUpdate {
  name?: string;
  canonical_name?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  is_verified?: boolean;
  is_flagged?: boolean;
}
