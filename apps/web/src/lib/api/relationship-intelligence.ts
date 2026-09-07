/**
 * Typed client functions for the relationship-intelligence API (/api/v2).
 *
 * These mirror the backend routes added during Phase 21:
 *   GET    /relationships/{id}/intelligence
 *   GET    /relationships/{id}/observations
 *   GET    /relationships/{id}/evidence
 *   POST   /relationships/{id}/confirm
 *   POST   /relationships/{id}/reject
 *   POST   /investigations/{id}/relationships/evaluate
 *   GET    /investigations/{id}/relationships/intelligence
 *
 * Response shapes follow the backend wire format (snake_case). Mapping to the
 * frontend camelCase intelligence types happens in relationship-intelligence.service.
 */

import { API_BASE_URL } from './config';
import { apiFetch } from './client';
import type { JsonObject, Uuid } from './investigations';

export type RealIntelligenceStatus = 'NEEDS_REVIEW' | 'REVIEWED' | 'DISCARDED';
export type RealConfidenceLabel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RealRelationshipObservation {
  observation_id: string;
  source_id: string;
  source_label: string;
  reference?: string | null;
  observed_at?: string | null;
  confidence: number;
}

export interface RealRelationshipEvidenceSupportRead {
  relationship_id: Uuid;
  investigation_id: Uuid;
  evidence_count: number;
  evidence_ids: Uuid[];
  datasets: string[];
  linked: boolean;
  message: string;
}

export interface RealRelationshipIntelligence {
  relationship_id: Uuid;
  investigation_id: Uuid;
  source_entity_id: Uuid;
  source_entity_name: string | null;
  source_entity_type: string | null;
  target_entity_id: Uuid;
  target_entity_name: string | null;
  target_entity_type: string | null;
  relationship_type: string;
  direction: 'directed' | 'undirected';
  confidence: number;
  source: string | null;
  evidence_refs: string[];
  verification_status: string | null;
  extraction_method: string | null;
  intelligence_status: RealIntelligenceStatus;
  linkage_score: number;
  confidence_label: RealConfidenceLabel;
  correlation_version: string;
  correlation_key: string;
  observation_count: number;
  source_count: number;
  observation_predicate: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  conflict_flags: string[];
  observations: RealRelationshipObservation[];
  evidence: RealRelationshipEvidenceSupportRead;
  verified_by: Uuid | null;
  verified_at: string | null;
  rejection_reason: string | null;
  metadata_: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealRelationshipIntelligenceItem {
  relationship_id: Uuid;
  investigation_id: Uuid;
  source_entity_id: Uuid;
  source_entity_name: string | null;
  source_entity_type: string | null;
  target_entity_id: Uuid;
  target_entity_name: string | null;
  target_entity_type: string | null;
  relationship_type: string;
  direction: 'directed' | 'undirected';
  confidence: number;
  verification_status: string | null;
  extraction_method: string | null;
  intelligence_status: RealIntelligenceStatus;
  linkage_score: number;
  confidence_label: RealConfidenceLabel;
  correlation_version: string;
  correlation_key: string;
  observation_count: number;
  source_count: number;
  observation_predicate: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  conflict_count: number;
  evidence_count: number;
  verified_by: Uuid | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

export interface RealRelationshipIntelligenceList {
  investigation_id: Uuid;
  items: RealRelationshipIntelligenceItem[];
  algorithm_version: string;
  evaluated_at: string;
}

export interface RealRelationshipEvaluationResponse {
  investigation_id: Uuid;
  evaluated_relationships: number;
  correlation_groups: number;
  correlated_relationships: number;
  conflicts_detected: number;
  algorithm_version: string;
  evaluated_at: string;
}

export interface RealRelationshipObservationsResponse {
  relationship_id: Uuid;
  investigation_id: Uuid;
  observations: RealRelationshipObservation[];
  algorithm_version: string;
  evaluated_at: string;
}

export async function getRelationshipIntelligence(
  relationshipId: Uuid,
): Promise<RealRelationshipIntelligence> {
  return apiFetch<RealRelationshipIntelligence>(
    API_BASE_URL,
    `/relationships/${relationshipId}/intelligence`,
  );
}

export async function getRelationshipObservations(
  relationshipId: Uuid,
): Promise<RealRelationshipObservationsResponse> {
  return apiFetch<RealRelationshipObservationsResponse>(
    API_BASE_URL,
    `/relationships/${relationshipId}/observations`,
  );
}

export async function getRelationshipEvidence(
  relationshipId: Uuid,
): Promise<RealRelationshipEvidenceSupportRead> {
  return apiFetch<RealRelationshipEvidenceSupportRead>(
    API_BASE_URL,
    `/relationships/${relationshipId}/evidence`,
  );
}

export async function listRelationshipIntelligence(
  investigationId: Uuid,
): Promise<RealRelationshipIntelligenceList> {
  return apiFetch<RealRelationshipIntelligenceList>(
    API_BASE_URL,
    `/investigations/${investigationId}/relationships/intelligence`,
  );
}

export async function evaluateRelationshipIntelligence(
  investigationId: Uuid,
): Promise<RealRelationshipEvaluationResponse> {
  return apiFetch<RealRelationshipEvaluationResponse>(
    API_BASE_URL,
    `/investigations/${investigationId}/relationships/evaluate`,
    { method: 'POST' },
  );
}

export async function confirmRelationship(
  relationshipId: Uuid,
  reason?: string,
): Promise<RealRelationshipIntelligence> {
  return apiFetch<RealRelationshipIntelligence>(
    API_BASE_URL,
    `/relationships/${relationshipId}/confirm`,
    { method: 'POST', body: { reason: reason ?? null } },
  );
}

export async function rejectRelationship(
  relationshipId: Uuid,
  reason?: string,
): Promise<RealRelationshipIntelligence> {
  return apiFetch<RealRelationshipIntelligence>(
    API_BASE_URL,
    `/relationships/${relationshipId}/reject`,
    { method: 'POST', body: { reason: reason ?? null } },
  );
}
