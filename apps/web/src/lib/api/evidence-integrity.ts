/**
 * Typed client functions for the evidence-integrity API (/api/v2).
 *
 * These mirror the backend routes added during Phase 21:
 *   GET    /evidence/{id}/integrity
 *   GET    /evidence/{id}/blockchain
 *   POST   /evidence/{id}/blockchain/anchor
 *   POST   /evidence/{id}/blockchain/verify
 *
 * Response shapes follow the backend wire format (snake_case). Mapping to the
 * frontend camelCase integrity types happens in evidence-integrity.service.
 * The integrity payload is a 64-character cryptographic digest derived
 * server-side; raw evidence and PII never leave the platform.
 */

import { API_BASE_URL } from './config';
import { apiFetch } from './client';
import type { Uuid } from './investigations';

export type RealVerificationState =
  | 'NOT_ANCHORED'
  | 'VERIFIED'
  | 'MISMATCH'
  | 'PENDING'
  | 'UNAVAILABLE';

export interface RealCustodyEvent {
  sequence: number;
  action: string;
  event_timestamp?: string | null;
  evidence_checksum?: string | null;
  metadata_hash?: string | null;
  previous_event_hash?: string | null;
  current_event_hash?: string | null;
  actor?: string | null;
  metadata: Record<string, unknown>;
}

export interface RealEvidenceIntegrity {
  evidence_id: Uuid;
  investigation_id: Uuid;
  evidence_checksum?: string | null;
  custody_chain_hash?: string | null;
  associated_anchor_digest?: string | null;
  status: string;
  status_detail?: string | null;
  algorithm_version: string;
  custody_events: RealCustodyEvent[];
  generated_at: string;
}

export interface RealAnchorView {
  anchor_id: Uuid;
  evidence_id: Uuid;
  investigation_id: Uuid;
  custody_chain_hash: string;
  anchor_digest: string;
  network: string;
  provider: string;
  is_mock: boolean;
  status: string;
  transaction_id?: string | null;
  block_number?: number | null;
  contract_address?: string | null;
  anchored_at?: string | null;
  verified_at?: string | null;
  reason?: string | null;
  metadata: Record<string, unknown>;
}

export interface RealIntegrityProviderView {
  provider: string;
  network: string;
  healthy: boolean;
  is_mock: boolean;
  detail: string;
}

export interface RealEvidenceBlockchain {
  evidence_id: Uuid;
  investigation_id: Uuid;
  integrity: RealEvidenceIntegrity;
  anchor?: RealAnchorView | null;
  provider: RealIntegrityProviderView;
  verification_state: RealVerificationState;
  last_verified_at?: string | null;
  message?: string | null;
  generated_at: string;
}

export interface RealAnchorResponse {
  evidence_id: Uuid;
  investigation_id: Uuid;
  anchor?: RealAnchorView | null;
  verification_state: RealVerificationState;
  message?: string | null;
  anchored: boolean;
  already_anchored: boolean;
}

export interface RealVerifyResponse {
  evidence_id: Uuid;
  investigation_id: Uuid;
  verification_state: RealVerificationState;
  current_custody_chain_hash?: string | null;
  anchored_custody_chain_hash?: string | null;
  on_chain_digest?: string | null;
  detail?: string | null;
  verified_at?: string | null;
  anchor?: RealAnchorView | null;
  message?: string | null;
}

export async function getEvidenceIntegrity(
  evidenceId: Uuid,
): Promise<RealEvidenceIntegrity> {
  return apiFetch<RealEvidenceIntegrity>(
    API_BASE_URL,
    `/evidence/${evidenceId}/integrity`,
  );
}

export async function getEvidenceBlockchain(
  evidenceId: Uuid,
): Promise<RealEvidenceBlockchain> {
  return apiFetch<RealEvidenceBlockchain>(
    API_BASE_URL,
    `/evidence/${evidenceId}/blockchain`,
  );
}

export async function anchorEvidence(
  evidenceId: Uuid,
  message?: string,
): Promise<RealAnchorResponse> {
  return apiFetch<RealAnchorResponse>(
    API_BASE_URL,
    `/evidence/${evidenceId}/blockchain/anchor`,
    { method: 'POST', body: { message: message ?? null } },
  );
}

export async function verifyEvidence(
  evidenceId: Uuid,
): Promise<RealVerifyResponse> {
  return apiFetch<RealVerifyResponse>(
    API_BASE_URL,
    `/evidence/${evidenceId}/blockchain/verify`,
    { method: 'POST' },
  );
}