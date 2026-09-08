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
