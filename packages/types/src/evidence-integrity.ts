// ============================================================
// PHASE 21 — BLOCKCHAIN EVIDENCE INTEGRITY ANCHORING
// ============================================================
// Evidence integrity describes the cryptographic integrity state of an
// evidence custody chain and its optional blockchain anchor. Language is
// deliberately neutral: an anchored digest proves a checksum existed on-chain
// at a point in time; it proves nothing about whether the underlying evidence
// content is truthful, and it never implies guilt.
// ============================================================

export type EvidenceIntegrityVerificationState =
  | 'VERIFIED'
  | 'MISMATCH'
  | 'NOT_ANCHORED'
  | 'PENDING'
  | 'UNAVAILABLE';

export type EvidenceIntegrityStatus =
  | 'ANCHORED'
  | 'NOT_ANCHORED'
  | 'CHECKSUM_UNAVAILABLE';

/** One chained event of the derived evidence custody chain. */
export interface EvidenceCustodyEvent {
  sequence: number;
  action: string;
  eventTimestamp?: string | null;
  evidenceChecksum?: string | null;
  metadataHash?: string | null;
  previousEventHash?: string | null;
  currentEventHash?: string | null;
  actor?: string | null;
  metadata: Record<string, unknown>;
}

/** Derived custody-chain + checksum read for one evidence item. */
export interface EvidenceIntegritySummary {
  evidenceId: string;
  investigationId: string;
  evidenceChecksum?: string | null;
  custodyChainHash?: string | null;
  associatedAnchorDigest?: string | null;
  status: EvidenceIntegrityStatus;
  statusDetail?: string | null;
  algorithmVersion: string;
  custodyEvents: EvidenceCustodyEvent[];
  generatedAt: string;
}

/** Persisted blockchain anchor view (wire snake_case mapped). */
export interface EvidenceBlockchainAnchorView {
  anchorId: string;
  evidenceId: string;
  investigationId: string;
  custodyChainHash: string;
  anchorDigest: string;
  network: string;
  provider: string;
  isMock: boolean;
  status: 'PENDING' | 'ANCHORED' | 'UNAVAILABLE';
  transactionId?: string | null;
  blockNumber?: number | null;
  contractAddress?: string | null;
  anchoredAt?: string | null;
  verifiedAt?: string | null;
  reason?: string | null;
  metadata: Record<string, unknown>;
}

/** Blockchain provider health surfaced to the UI (never client secrets). */
export interface EvidenceIntegrityProviderView {
  provider: string;
  network: string;
  healthy: boolean;
  isMock: boolean;
  detail: string;
}

/** Full blockchain anchor + integrity view for one evidence item. */
export interface EvidenceBlockchainView {
  evidenceId: string;
  investigationId: string;
  integrity: EvidenceIntegritySummary;
  anchor?: EvidenceBlockchainAnchorView | null;
  provider: EvidenceIntegrityProviderView;
  verificationState: EvidenceIntegrityVerificationState;
  lastVerifiedAt?: string | null;
  message?: string | null;
  generatedAt: string;
}

/** Result of the anchor action (idempotent). */
export interface EvidenceAnchorResult {
  evidenceId: string;
  investigationId: string;
  anchor?: EvidenceBlockchainAnchorView | null;
  verificationState: EvidenceIntegrityVerificationState;
  message?: string | null;
  anchored: boolean;
  alreadyAnchored: boolean;
}

/** Result of the verify action. */
export interface EvidenceVerifyResult {
  evidenceId: string;
  investigationId: string;
  verificationState: EvidenceIntegrityVerificationState;
  currentCustodyChainHash?: string | null;
  anchoredCustodyChainHash?: string | null;
  onChainDigest?: string | null;
  detail?: string | null;
  verifiedAt?: string | null;
  anchor?: EvidenceBlockchainAnchorView | null;
  message?: string | null;
}

/** Compact integrity payload embedded in AI context (grounded, bounded). */
export interface EvidenceIntegrityContextPayload {
  verificationState: EvidenceIntegrityVerificationState;
  isMock: boolean;
  network?: string;
  anchorDigest?: string | null;
  custodyChainHash?: string;
  checksumPrefixed?: string | null;
}