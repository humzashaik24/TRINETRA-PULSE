import type {
  PatternDetectionResponse,
  PatternDetectionResult,
  StructuralPattern,
} from '@trinetra-pulse/types';
import { API_BASE_URL } from './config';
import { apiFetch } from './client';

export async function getInvestigationPatterns(
  investigationId: string,
): Promise<PatternDetectionResponse> {
  return apiFetch<PatternDetectionResponse>(
    API_BASE_URL,
    `/investigations/${investigationId}/patterns`,
  );
}

/** Map persisted API findings into the existing analytics panel contract. */
export function mapPatternDetectionToStructuralPattern(
  pattern: PatternDetectionResult,
): StructuralPattern {
  const typeMap: Record<PatternDetectionResult['pattern_type'], StructuralPattern['type']> = {
    CIRCULAR_FUND_FLOW: 'relationship_concentration',
    BURNER_SIM: 'sudden_degree_increase',
    NETWORK_HUB: 'relationship_concentration',
    BRIDGE_ENTITY: 'new_bridge_formation',
    RAPID_RELATIONSHIP_EXPANSION: 'rapid_connection_growth',
  };
  const severityMap: Record<PatternDetectionResult['severity'], StructuralPattern['severity']> = {
    LOW: 'info',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'high',
  };
  const window = pattern.metadata.window as { from?: string; to?: string } | undefined;
  return {
    id: pattern.id,
    type: typeMap[pattern.pattern_type],
    title: pattern.title,
    description: pattern.description,
    confidence: pattern.confidence,
    severity: severityMap[pattern.severity],
    affectedEntities: pattern.entity_ids,
    affectedRelationships: pattern.relationship_ids,
    detectedAt: pattern.detected_at,
    evidenceReferences: pattern.evidence_ids,
    period: {
      from: window?.from ?? '',
      to: window?.to ?? '',
    },
    sources: [],
  };
}
