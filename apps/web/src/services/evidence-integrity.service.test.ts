import {
  getEvidenceIntegrity,
  getEvidenceBlockchain,
  anchorEvidenceBlockchain,
  verifyEvidenceBlockchain,
  evidenceIntegrityContextPayload,
  checksumSourceText,
} from './evidence-integrity.service';

// ============================================================
// PHASE 21 — EVIDENCE INTEGRITY SERVICE (mock-backed)
// ============================================================

const SEEDED = 'ev-intel-001';
const NOT_SEEDED = 'ev-intel-002';

describe('evidence-integrity.service (mock)', () => {
  it('seeds a pre-anchored, verified state for the demo evidence', async () => {
    const view = await getEvidenceBlockchain(SEEDED);
    expect(view.verificationState).toBe('VERIFIED');
    expect(view.integrity.status).toBe('ANCHORED');
    expect(view.anchor).not.toBeNull();
    expect(view.provider.isMock).toBe(true);
    expect(view.provider.network).toBe('trinetra-mock-chain');
  });

  it('exposes the derived checksum as an honest sha256 prefix', async () => {
    const view = await getEvidenceBlockchain(SEEDED);
    expect(view.integrity.evidenceChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(view.anchor?.anchorDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('derives a custody chain with at least the upload event', async () => {
    const view = await getEvidenceBlockchain(SEEDED);
    expect(view.integrity.custodyEvents.length).toBeGreaterThanOrEqual(1);
    expect(view.integrity.custodyEvents[0].action).toBe('EVIDENCE_UPLOADED');
  });

  it('is deterministic — the same evidence yields the same chain hash', async () => {
    const a = await getEvidenceIntegrity(NOT_SEEDED);
    const b = await getEvidenceIntegrity(NOT_SEEDED);
    expect(a.custodyChainHash).toBe(b.custodyChainHash);
    expect(a.status).toBe('NOT_ANCHORED');
  });

  it('reports NOT_ANCHORED for unseeded evidence with no anchor', async () => {
    const view = await getEvidenceBlockchain(NOT_SEEDED);
    expect(view.verificationState).toBe('NOT_ANCHORED');
    expect(view.anchor).toBeNull();
  });

  it('builds deterministic canonical checksum source text', async () => {
    const a = await checksumSourceTextFor(NOT_SEEDED);
    const b = await checksumSourceTextFor(NOT_SEEDED);
    expect(a).toBe(b);
    expect(a).toContain('|');
  });

  it('anchors then verifies an initially unanchored item (idempotent)', async () => {
    const anchored = await anchorEvidenceBlockchain(NOT_SEEDED, 'demo anchor');
    expect(anchored.anchored).toBe(true);
    expect(anchored.alreadyAnchored).toBe(false);
    expect(anchored.anchor?.network).toBe('trinetra-mock-chain');
    expect(anchored.anchor?.isMock).toBe(true);

    const view = await getEvidenceBlockchain(NOT_SEEDED);
    expect(view.verificationState).toBe('VERIFIED');

    const again = await anchorEvidenceBlockchain(NOT_SEEDED);
    expect(again.anchored).toBe(false);
    expect(again.alreadyAnchored).toBe(true);

    const verified = await verifyEvidenceBlockchain(NOT_SEEDED);
    expect(verified.verificationState).toBe('VERIFIED');
    expect(verified.onChainDigest).toBe(verified.anchor?.anchorDigest);
  });

  it('surfaces an AI context payload without raw evidence fields', async () => {
    const payload = await evidenceIntegrityContextPayload(SEEDED);
    expect(payload).not.toBeNull();
    expect(payload?.verificationState).toBe('VERIFIED');
    expect(payload?.isMock).toBe(true);
    expect(payload?.anchorDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(payload?.checksumPrefixed).toMatch(/^sha256:/);
  });
});

async function checksumSourceTextFor(id: string): Promise<string> {
  const { getEvidence } = await import('@/services/evidence.service');
  const evidence = await getEvidence(id);
  return Promise.resolve(checksumSourceText(evidence));
}