export type ProvenanceSourceType =
  | 'document'
  | 'database'
  | 'api'
  | 'manual_entry'
  | 'ai_extraction'
  | 'witness'
  | 'surveillance'
  | 'other';

export interface DataProvenance {
  id: string;
  entity_id: string | null;
  relationship_id: string | null;
  source_type: ProvenanceSourceType;
  source_name: string | null;
  source_document_id: string | null;
  timestamp: string | null;
  extraction_method: string | null;
  confidence: number;
  evidence_refs: string[];
  analyst_verification: string | null;
  verification_timestamp: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
