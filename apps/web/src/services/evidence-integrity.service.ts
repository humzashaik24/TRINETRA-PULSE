import type {
  EvidenceItem,
  EvidenceBlockchainView,
  EvidenceIntegritySummary,
  EvidenceBlockchainAnchorView,
  EvidenceIntegrityVerificationState,
  EvidenceCustodyEvent,
  EvidenceAnchorResult,
  EvidenceVerifyResult,
  EvidenceIntegrityContextPayload,
} from '@trinetra-pulse/types';
import { getEvidence } from '@/services/evidence.service';
import { isMockData } from '@/lib/api/config';
import * as api from '@/lib/api/evidence-integrity';
import type {
  RealEvidenceBlockchain,
  RealEvidenceIntegrity,
  RealAnchorView,
  RealIntegrityProviderView,
  RealAnchorResponse,
  RealVerifyResponse,
} from '@/lib/api/evidence-integrity';

// ============================================================
// PHASE 21 — BLOCKCHAIN EVIDENCE INTEGRITY SERVICE
// ============================================================
// Layer the evidence integrity view (derived SHA-256 custody chain + optional
// blockchain anchor) onto the existing evidence services.
//
// Mock mode: the demo derives REAL SHA-256 digests via the Web Crypto API over
// deterministic evidence reference metadata and simulates an honest, clearly
// labelled ("MOCK") anchor store. ev-intel-001 is pre-anchored so the demo
// opens on a realistic VERIFIED state.
//
// API mode: every call maps to the /api/v2 evidence-integrity endpoints.
// Only server-derived digest fields cross the wire — raw evidence and PII
// never leave the platform, and no client-side secrets exist.
// ============================================================

const LATENCY = 180;
const MOCK_NETWORK = 'trinetra-mock-chain';
const MOCK_PROVIDER = 'mock';
const ALGORITHM_VERSION = 'evidence-integrity-v1';
const DEMO_ANCHORED_EVIDENCE = 'ev-intel-001';

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function investigationIdOf(evidence: EvidenceItem): string {
  return evidence.investigationId ?? '';
}

// ---- deterministic hashing (real SHA-256 via Web Crypto) ------------------

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Canonical, deterministic metadata text used to compute the mock checksum. */
export function checksumSourceText(evidence: Pick<EvidenceItem, 'id' | 'title' | 'sourceName' | 'provenance'>): string {
  return [evidence.id, evidence.title, evidence.sourceName, evidence.provenance.sourceId ?? ''].join('|');
}

/** First 12 chars, safe to show in UI/AI context. */
export function prefixedChecksum(hex: string): string {
  return `sha256:${hex}`;
}

// ---- mock custody chain ----------------------------------------------------

async function custodyEventHash(parts: (string | number | null | undefined)[]): Promise<string> {
  const canonical = parts.map((p) => (p == null ? '' : String(p))).join(':');
  return sha256Hex(canonical);
}

interface MockCustodyEventParts {
  sequence: number;
  action: string;
  eventTimestamp: string;
  evidenceChecksum: string;
  metadataHash: string | null;
  actor: string | null;
}

async function buildCustodyEvent(prev: string | null, parts: MockCustodyEventParts): Promise<EvidenceCustodyEvent> {
  const currentEventHash = await custodyEventHash([
    prev ?? '',
    parts.sequence,
    parts.action,
    parts.eventTimestamp,
    parts.evidenceChecksum,
    parts.metadataHash ?? '',
    parts.actor ?? '',
  ]);
  return {
    sequence: parts.sequence,
    action: parts.action,
    eventTimestamp: parts.eventTimestamp,
    evidenceChecksum: parts.evidenceChecksum,
    metadataHash: parts.metadataHash ?? null,
    previousEventHash: prev,
    currentEventHash,
    actor: parts.actor ?? null,
    metadata: { isMock: true, algorithmVersion: ALGORITHM_VERSION },
  };
}

async function deriveCustodyEvents(
  evidence: EvidenceItem,
  checksum: string,
): Promise<EvidenceCustodyEvent[]> {
  const events: EvidenceCustodyEvent[] = [];
  const metadataHash = await custodyEventHash([evidence.description ?? '', evidence.evidenceType, evidence.observedAt ?? '']);
  const uploaded = await buildCustodyEvent(null, {
    sequence: 1,
    action: 'EVIDENCE_UPLOADED',
    eventTimestamp: evidence.createdAt ?? evidence.observedAt ?? new Date().toISOString(),
    evidenceChecksum: checksum,
    metadataHash,
    actor: 'system',
  });
  events.push(uploaded);
  return events;
}

// ---- mock anchor store (in-memory, mirrors evidence.service persistence) ---

interface MockAnchorRecord {
  anchorId: string;
  evidenceId: string;
  investigationId: string;
  custodyChainHash: string;
  anchorDigest: string;
  network: string;
  provider: string;
  isMock: boolean;
  status: 'ANCHORED';
  transactionId: string;
  blockNumber: number;
  contractAddress: string | null;
  anchoredAt: string;
  verifiedAt: string | null;
}

const mockAnchorStore = new Map<string, MockAnchorRecord>();

function deterministicTxId(digest: string): string {
  return `0x${digest.slice(0, 40)}`;
}

function deterministicBlock(digest: string): number {
  const n = Number.parseInt(digest.slice(0, 8), 16);
  return 4_000_000 + (n % 1_000_000);
}

function mockAnchorDigest(evidenceId: string, investigationId: string, checksum: string, custodyChainHash: string): Promise<string> {
  return sha256Hex(`${evidenceId}${investigationId}${checksum}${custodyChainHash}1`);
}

async function findMockAnchor(evidenceId: string): Promise<MockAnchorRecord | undefined> {
  return mockAnchorStore.get(evidenceId);
}

// ---- provider view ---------------------------------------------------------

function providerView(): { provider: string; network: string; healthy: boolean; isMock: boolean; detail: string } {
  return {
    provider: MOCK_PROVIDER,
    network: MOCK_NETWORK,
    healthy: true,
    isMock: true,
    detail: 'Deterministic in-memory anchor registry (demo). No real chain writes.',
  };
}

// ---- mock integrity + blockchain views -------------------------------------

async function mockIntegrity(evidence: EvidenceItem): Promise<EvidenceIntegritySummary> {
  const checksum = await sha256Hex(checksumSourceText(evidence));
  const custodyEvents = await deriveCustodyEvents(evidence, checksum);
  const custodyChainHash = custodyEvents[custodyEvents.length - 1]?.currentEventHash ?? checksum;
  const anchor = await findMockAnchor(evidence.id);
  return {
    evidenceId: evidence.id,
    investigationId: investigationIdOf(evidence),
    evidenceChecksum: prefixedChecksum(checksum),
    custodyChainHash,
    associatedAnchorDigest: anchor?.anchorDigest ?? null,
    status: anchor ? 'ANCHORED' : 'NOT_ANCHORED',
    statusDetail: anchor
      ? 'Custody chain hash is anchored on the mock registry.'
      : 'Checksum derived locally; not yet anchored.',
    algorithmVersion: ALGORITHM_VERSION,
    custodyEvents,
    generatedAt: new Date().toISOString(),
  };
}

function toAnchorView(record: MockAnchorRecord): EvidenceBlockchainAnchorView {
  return {
    anchorId: record.anchorId,
    evidenceId: record.evidenceId,
    investigationId: record.investigationId,
    custodyChainHash: record.custodyChainHash,
    anchorDigest: record.anchorDigest,
    network: record.network,
    provider: record.provider,
    isMock: record.isMock,
    status: record.status,
    transactionId: record.transactionId,
    blockNumber: record.blockNumber,
    contractAddress: record.contractAddress,
    anchoredAt: record.anchoredAt,
    verifiedAt: record.verifiedAt,
    reason: null,
    metadata: { isMock: true, algorithmVersion: ALGORITHM_VERSION },
  };
}

function stateFor(
  integrity: EvidenceIntegritySummary,
  anchor: EvidenceBlockchainAnchorView | null,
): { state: EvidenceIntegrityVerificationState; lastVerifiedAt: string | null } {
  if (!anchor) return { state: 'NOT_ANCHORED', lastVerifiedAt: null };
  if (anchor.anchorDigest !== integrity.associatedAnchorDigest) {
    return { state: 'MISMATCH', lastVerifiedAt: null };
  }
  return { state: 'VERIFIED', lastVerifiedAt: anchor.verifiedAt ?? null };
}

async function mockBlockchainView(evidence: EvidenceItem): Promise<EvidenceBlockchainView> {
  const integrity = await mockIntegrity(evidence);
  const record = await findMockAnchor(evidence.id);
  const anchor = record ? toAnchorView(record) : null;
  const { state, lastVerifiedAt } = stateFor(integrity, anchor);
  return {
    evidenceId: evidence.id,
    investigationId: investigationIdOf(evidence),
    integrity,
    anchor,
    provider: providerView(),
    verificationState: state,
    lastVerifiedAt,
    message:
      state === 'VERIFIED'
        ? 'Anchored digest matches the locally derived custody chain (MOCK registry).'
        : state === 'MISMATCH'
          ? 'Anchored digest does not match the current custody chain (MOCK registry).'
          : 'Evidence is not anchored on the mock registry yet.',
    generatedAt: new Date().toISOString(),
  };
}

async function mockAnchorEvidence(evidence: EvidenceItem, message?: string): Promise<EvidenceAnchorResult> {
  const integrity = await mockIntegrity(evidence);
  const existing = await findMockAnchor(evidence.id);
  if (existing) {
    return {
      evidenceId: evidence.id,
      investigationId: investigationIdOf(evidence),
      anchor: toAnchorView(existing),
      verificationState: 'VERIFIED',
      message: 'Evidence was already anchored on the mock registry.',
      anchored: false,
      alreadyAnchored: true,
    };
  }
  if (!integrity.custodyChainHash || !integrity.evidenceChecksum) {
    return {
      evidenceId: evidence.id,
      investigationId: investigationIdOf(evidence),
      anchor: null,
      verificationState: 'UNAVAILABLE',
      message: 'No local checksum available to anchor.',
      anchored: false,
      alreadyAnchored: false,
    };
  }
  const digest = await mockAnchorDigest(
    evidence.id,
    investigationIdOf(evidence),
    integrity.evidenceChecksum,
    integrity.custodyChainHash,
  );
  const record: MockAnchorRecord = {
    anchorId: `anc-${evidence.id}`,
    evidenceId: evidence.id,
    investigationId: investigationIdOf(evidence),
    custodyChainHash: integrity.custodyChainHash,
    anchorDigest: digest,
    network: MOCK_NETWORK,
    provider: MOCK_PROVIDER,
    isMock: true,
    status: 'ANCHORED',
    transactionId: deterministicTxId(digest),
    blockNumber: deterministicBlock(digest),
    contractAddress: null,
    anchoredAt: new Date().toISOString(),
    verifiedAt: null,
  };
  mockAnchorStore.set(evidence.id, record);
  return {
    evidenceId: evidence.id,
    investigationId: investigationIdOf(evidence),
    anchor: toAnchorView(record),
    verificationState: 'PENDING',
    message: message
      ? `Anchor submitted on the demo registry (MOCK): ${message}`
      : 'Anchor submitted on the demo registry (MOCK).',
    anchored: true,
    alreadyAnchored: false,
  };
}

async function mockVerifyEvidence(evidence: EvidenceItem): Promise<EvidenceVerifyResult> {
  const integrity = await mockIntegrity(evidence);
  const record = await findMockAnchor(evidence.id);
  if (!record) {
    return {
      evidenceId: evidence.id,
      investigationId: investigationIdOf(evidence),
      verificationState: 'NOT_ANCHORED',
      currentCustodyChainHash: integrity.custodyChainHash,
      anchoredCustodyChainHash: null,
      onChainDigest: null,
      detail: 'No anchor exists on the mock registry for this evidence.',
      verifiedAt: null,
      anchor: null,
      message: 'No anchor found on the mock registry.',
    };
  }
  const digest = await mockAnchorDigest(
    evidence.id,
    investigationIdOf(evidence),
    integrity.evidenceChecksum ?? '',
    integrity.custodyChainHash ?? '',
  );
  const matches = record.anchorDigest === digest;
  if (matches) {
    record.verifiedAt = new Date().toISOString();
    mockAnchorStore.set(evidence.id, { ...record });
  }
  return {
    evidenceId: evidence.id,
    investigationId: investigationIdOf(evidence),
    verificationState: matches ? 'VERIFIED' : 'MISMATCH',
    currentCustodyChainHash: integrity.custodyChainHash,
    anchoredCustodyChainHash: record.custodyChainHash,
    onChainDigest: record.anchorDigest,
    detail: matches
      ? 'On-chain digest matches the locally derived custody chain.'
      : 'On-chain digest differs from the current local custody chain.',
    verifiedAt: matches ? record.verifiedAt : null,
    anchor: toAnchorView(record),
    message: matches
      ? 'Integrity verified against the mock registry.'
      : 'Integrity mismatch detected against the mock registry.',
  };
}

// ---- real-path mapping -----------------------------------------------------

function mapCustodyEvent(e: api.RealCustodyEvent): EvidenceCustodyEvent {
  return {
    sequence: e.sequence,
    action: e.action,
    eventTimestamp: e.event_timestamp ?? null,
    evidenceChecksum: e.evidence_checksum ?? null,
    metadataHash: e.metadata_hash ?? null,
    previousEventHash: e.previous_event_hash ?? null,
    currentEventHash: e.current_event_hash ?? null,
    actor: e.actor ?? null,
    metadata: e.metadata ?? {},
  };
}

function mapIntegrity(e: RealEvidenceIntegrity): EvidenceIntegritySummary {
  return {
    evidenceId: e.evidence_id,
    investigationId: e.investigation_id,
    evidenceChecksum: e.evidence_checksum ?? null,
    custodyChainHash: e.custody_chain_hash ?? null,
    associatedAnchorDigest: e.associated_anchor_digest ?? null,
    status: e.status as EvidenceIntegritySummary['status'],
    statusDetail: e.status_detail ?? null,
    algorithmVersion: e.algorithm_version,
    custodyEvents: (e.custody_events ?? []).map(mapCustodyEvent),
    generatedAt: e.generated_at,
  };
}

function mapAnchor(e: RealAnchorView | null | undefined): EvidenceBlockchainAnchorView | null {
  if (!e) return null;
  return {
    anchorId: e.anchor_id,
    evidenceId: e.evidence_id,
    investigationId: e.investigation_id,
    custodyChainHash: e.custody_chain_hash,
    anchorDigest: e.anchor_digest,
    network: e.network,
    provider: e.provider,
    isMock: e.is_mock,
    status: e.status as EvidenceBlockchainAnchorView['status'],
    transactionId: e.transaction_id ?? null,
    blockNumber: e.block_number ?? null,
    contractAddress: e.contract_address ?? null,
    anchoredAt: e.anchored_at ?? null,
    verifiedAt: e.verified_at ?? null,
    reason: e.reason ?? null,
    metadata: e.metadata ?? {},
  };
}

function mapProvider(e: RealIntegrityProviderView): EvidenceBlockchainView['provider'] {
  return {
    provider: e.provider,
    network: e.network,
    healthy: e.healthy,
    isMock: e.is_mock,
    detail: e.detail,
  };
}

function mapBlockchainView(e: RealEvidenceBlockchain): EvidenceBlockchainView {
  return {
    evidenceId: e.evidence_id,
    investigationId: e.investigation_id,
    integrity: mapIntegrity(e.integrity),
    anchor: mapAnchor(e.anchor),
    provider: mapProvider(e.provider),
    verificationState: e.verification_state as EvidenceIntegrityVerificationState,
    lastVerifiedAt: e.last_verified_at ?? null,
    message: e.message ?? null,
    generatedAt: e.generated_at,
  };
}

function mapAnchorResponse(e: RealAnchorResponse): EvidenceAnchorResult {
  return {
    evidenceId: e.evidence_id,
    investigationId: e.investigation_id,
    anchor: mapAnchor(e.anchor),
    verificationState: e.verification_state as EvidenceIntegrityVerificationState,
    message: e.message ?? null,
    anchored: e.anchored,
    alreadyAnchored: e.already_anchored,
  };
}

function mapVerifyResponse(e: RealVerifyResponse): EvidenceVerifyResult {
  return {
    evidenceId: e.evidence_id,
    investigationId: e.investigation_id,
    verificationState: e.verification_state as EvidenceIntegrityVerificationState,
    currentCustodyChainHash: e.current_custody_chain_hash ?? null,
    anchoredCustodyChainHash: e.anchored_custody_chain_hash ?? null,
    onChainDigest: e.on_chain_digest ?? null,
    detail: e.detail ?? null,
    verifiedAt: e.verified_at ?? null,
    anchor: mapAnchor(e.anchor),
    message: e.message ?? null,
  };
}

// ---- demo seeding ----------------------------------------------------------

async function seedDemoAnchor(): Promise<void> {
  if (mockAnchorStore.has(DEMO_ANCHORED_EVIDENCE)) return;
  try {
    const evidence = await getEvidence(DEMO_ANCHORED_EVIDENCE);
    const integrity = await mockIntegrity(evidence);
    if (!integrity.custodyChainHash) return;
    const digest = await mockAnchorDigest(
      evidence.id,
      investigationIdOf(evidence),
      integrity.evidenceChecksum ?? '',
      integrity.custodyChainHash,
    );
    mockAnchorStore.set(evidence.id, {
      anchorId: `anc-${evidence.id}`,
      evidenceId: evidence.id,
      investigationId: investigationIdOf(evidence),
      custodyChainHash: integrity.custodyChainHash,
      anchorDigest: digest,
      network: MOCK_NETWORK,
      provider: MOCK_PROVIDER,
      isMock: true,
      status: 'ANCHORED',
      transactionId: deterministicTxId(digest),
      blockNumber: deterministicBlock(digest),
      contractAddress: null,
      anchoredAt: '2026-09-05T10:30:00.000Z',
      verifiedAt: '2026-09-05T11:00:00.000Z',
    });
  } catch {
    // evidence not found — skip the seeded demo anchor
  }
}

// ---- public API ------------------------------------------------------------

/** Get the full integrity + blockchain anchor view for one evidence item. */
export async function getEvidenceBlockchain(
  evidenceId: string,
): Promise<EvidenceBlockchainView> {
  if (!isMockData()) {
    return mapBlockchainView(await api.getEvidenceBlockchain(evidenceId));
  }
  await delay();
  await seedDemoAnchor();
  const evidence = await getEvidence(evidenceId);
  return mockBlockchainView(evidence);
}

/** Get the standalone derived custody-chain integrity view (mock-only parity). */
export async function getEvidenceIntegrity(
  evidenceId: string,
): Promise<EvidenceIntegritySummary> {
  if (!isMockData()) {
    return mapIntegrity(await api.getEvidenceIntegrity(evidenceId));
  }
  await delay();
  await seedDemoAnchor();
  const evidence = await getEvidence(evidenceId);
  return mockIntegrity(evidence);
}

/** Anchor the current custody-chain digest (idempotent). */
export async function anchorEvidenceBlockchain(
  evidenceId: string,
  message?: string,
): Promise<EvidenceAnchorResult> {
  if (!isMockData()) {
    return mapAnchorResponse(await api.anchorEvidence(evidenceId, message));
  }
  await delay(LATENCY + 120);
  await seedDemoAnchor();
  const evidence = await getEvidence(evidenceId);
  return mockAnchorEvidence(evidence, message);
}

/** Verify the current custody-chain digest against any on-chain anchor. */
export async function verifyEvidenceBlockchain(
  evidenceId: string,
): Promise<EvidenceVerifyResult> {
  if (!isMockData()) {
    return mapVerifyResponse(await api.verifyEvidence(evidenceId));
  }
  await delay(LATENCY + 120);
  await seedDemoAnchor();
  const evidence = await getEvidence(evidenceId);
  return mockVerifyEvidence(evidence);
}

/** Compact bounded integrity payload for AI grounding (single evidence item). */
export async function evidenceIntegrityContextPayload(
  evidenceId: string,
): Promise<EvidenceIntegrityContextPayload | null> {
  try {
    const view = await getEvidenceBlockchain(evidenceId);
    return {
      verificationState: view.verificationState,
      isMock: view.provider.isMock ?? true,
      network: view.provider.network,
      anchorDigest: view.anchor?.anchorDigest ?? null,
      custodyChainHash: view.integrity.custodyChainHash ?? undefined,
      checksumPrefixed: view.integrity.evidenceChecksum ?? null,
    };
  } catch {
    return null;
  }
}