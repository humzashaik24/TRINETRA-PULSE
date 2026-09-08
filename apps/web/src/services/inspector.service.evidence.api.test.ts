/**
 * API-mode tests for the evidence branch of the Context Inspector
 * (Phase 17.6 + Phase 18.2).
 *
 * With `NEXT_PUBLIC_USE_MOCK_API=false` an evidence context must resolve through
 * the typed /api/v2 evidence adapter. Phase 18.2 additionally attaches a compact
 * read-only custody-chain summary when chain verification succeeds; when it
 * fails the row still resolves without a fabricated (or guessed) summary.
 */

import { resolveInspectorContext } from '@/services/inspector.service';
import type { InspectorEvidenceView } from '@/services/inspector.service';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
}));

jest.mock('@/lib/api/evidence', () => ({
  getEvidenceById: jest.fn(),
  getEvidenceChainVerification: jest.fn(),
}));

import { getEvidenceById, getEvidenceChainVerification } from '@/lib/api/evidence';

const mockedApi = jest.mocked({ getEvidenceById, getEvidenceChainVerification });

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';

const realRow = () => ({
  id: EVIDENCE_ID,
  investigation_id: INVESTIGATION_ID,
  evidence_type: 'FIR',
  title: 'First Information Report',
  description: 'Initial FIR recorded for Operation Meridian.',
  source: 'fir_registry.json',
  provenance: {
    source_id: 'fir_registry.json #FIR-001',
    dataset_id: 'fir_registry',
    document_id: 'fir-001',
    confidence: 0.9,
  },
  collected_at: '2026-08-18T08:30:00.000000',
  storage_ref: 'blob://fir-001',
  metadata: { is_demo: true, canonical_id: 'ev-001', dataset_id: 'fir_registry' },
  created_at: '2026-08-18T09:00:00.000000',
  updated_at: '2026-08-18T09:00:00.000000',
  integrity: { checksum: 'a'.repeat(64), status: 'VERIFIED' },
});

describe('inspector — evidence context in API mode (Phase 18.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getEvidenceById.mockResolvedValue(realRow() as never);
  });

  it('attaches a compact read-only custody summary when verification succeeds', async () => {
    mockedApi.getEvidenceChainVerification.mockResolvedValue({
      status: 'VALID',
      valid: true,
      entries: 2,
      reason: null,
      verified_at: '2026-08-18T09:05:00.000000',
    } as never);

    const res = await resolveInspectorContext({
      type: 'evidence',
      id: EVIDENCE_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(mockedApi.getEvidenceById).toHaveBeenCalledWith(EVIDENCE_ID, INVESTIGATION_ID);
    expect(mockedApi.getEvidenceChainVerification).toHaveBeenCalledWith(
      EVIDENCE_ID,
      INVESTIGATION_ID,
    );

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorEvidenceView;
      expect(view.kind).toBe('evidence');
      expect(view.title).toBe('First Information Report');
      expect(view.custodyChain).toEqual({
        status: 'VALID',
        entries: 2,
        verifiedAt: '2026-08-18T09:05:00.000000',
      });
    }
  });

  it('still resolves the row when chain verification fails — summary absent, never guessed', async () => {
    mockedApi.getEvidenceChainVerification.mockRejectedValue(
      new Error('integrity check impossible'),
    );

    const res = await resolveInspectorContext({
      type: 'evidence',
      id: EVIDENCE_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(res.status).toBe('ready');
    if (res.status === 'ready') {
      const view = res.view as InspectorEvidenceView;
      expect(view.kind).toBe('evidence');
      expect(view.title).toBe('First Information Report');
      expect(view.custodyChain).toBeUndefined();
    }
  });

  it('surfaces an evidence read failure as an explicit error state', async () => {
    mockedApi.getEvidenceById.mockRejectedValue(new Error('Evidence not found'));

    const res = await resolveInspectorContext({
      type: 'evidence',
      id: EVIDENCE_ID,
      investigationId: INVESTIGATION_ID,
    });

    expect(res.status).toBe('error');
    if (res.status === 'error') {
      expect(res.message).toContain('Evidence not found');
    }
    expect(mockedApi.getEvidenceChainVerification).not.toHaveBeenCalled();
  });
});