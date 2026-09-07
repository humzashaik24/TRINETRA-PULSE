import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockEvidenceItems } from '@/mock';
import type { EvidenceBlockchainView } from '@trinetra-pulse/types';
import { EvidenceIntegritySection } from './evidence-integrity-section';

// ============================================================
// PHASE 21 — EVIDENCE INTEGRITY SECTION
// ============================================================

jest.mock('@/services/evidence-integrity.service', () => ({
  getEvidenceBlockchain: jest.fn(),
  anchorEvidenceBlockchain: jest.fn(),
  verifyEvidenceBlockchain: jest.fn(),
}));

import {
  getEvidenceBlockchain,
  anchorEvidenceBlockchain,
  verifyEvidenceBlockchain,
} from '@/services/evidence-integrity.service';

const mockedGet = getEvidenceBlockchain as jest.MockedFunction<typeof getEvidenceBlockchain>;
const mockedAnchor = anchorEvidenceBlockchain as jest.MockedFunction<typeof anchorEvidenceBlockchain>;
const mockedVerify = verifyEvidenceBlockchain as jest.MockedFunction<typeof verifyEvidenceBlockchain>;

function viewFixture(overrides: Partial<EvidenceBlockchainView> = {}): EvidenceBlockchainView {
  return {
    evidenceId: 'ev-intel-001',
    investigationId: 'inv-006',
    integrity: {
      evidenceId: 'ev-intel-001',
      investigationId: 'inv-006',
      evidenceChecksum: `sha256:${'a'.repeat(64)}`,
      custodyChainHash: 'b'.repeat(64),
      associatedAnchorDigest: 'c'.repeat(64),
      status: 'ANCHORED',
      statusDetail: 'Anchored on the mock registry.',
      algorithmVersion: 'evidence-integrity-v1',
      custodyEvents: [
        {
          sequence: 1,
          action: 'EVIDENCE_UPLOADED',
          eventTimestamp: '2026-09-05T09:00:00.000Z',
          evidenceChecksum: `sha256:${'a'.repeat(64)}`,
          metadataHash: null,
          previousEventHash: null,
          currentEventHash: 'b'.repeat(64),
          actor: 'system',
          metadata: {},
        },
      ],
      generatedAt: '2026-09-06T09:00:00.000Z',
    },
    anchor: {
      anchorId: 'anc-ev-intel-001',
      evidenceId: 'ev-intel-001',
      investigationId: 'inv-006',
      custodyChainHash: 'b'.repeat(64),
      anchorDigest: 'c'.repeat(64),
      network: 'trinetra-mock-chain',
      provider: 'mock',
      isMock: true,
      status: 'ANCHORED',
      transactionId: `0x${'d'.repeat(40)}`,
      blockNumber: 4123456,
      contractAddress: null,
      anchoredAt: '2026-09-05T10:30:00.000Z',
      verifiedAt: '2026-09-05T11:00:00.000Z',
      reason: null,
      metadata: {},
    },
    provider: { provider: 'mock', network: 'trinetra-mock-chain', healthy: true, isMock: true, detail: '' },
    verificationState: 'VERIFIED',
    lastVerifiedAt: '2026-09-05T11:00:00.000Z',
    message: 'Anchored digest matches the locally derived custody chain.',
    generatedAt: '2026-09-06T09:00:00.000Z',
    ...overrides,
  };
}

describe('EvidenceIntegritySection', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedAnchor.mockReset();
    mockedVerify.mockReset();
  });

  it('renders the layered chain panel and the blockchain panel with a mock badge', async () => {
    mockedGet.mockResolvedValue(viewFixture());
    render(<EvidenceIntegritySection evidence={mockEvidenceItems[0]} />);
    expect(await screen.findByTestId('evidence-chain-panel')).toBeTruthy();
    expect(screen.getByTestId('evidence-blockchain-panel')).toBeTruthy();
    expect(screen.getAllByText('MOCK').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/verified/i).length).toBeGreaterThan(0);
  });

  it('shows a loading state before data resolves', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    render(<EvidenceIntegritySection evidence={mockEvidenceItems[0]} />);
    expect(screen.getByText(/computing integrity chain/i)).toBeTruthy();
  });

  it('surfaces an error when the integrity read fails', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));
    render(<EvidenceIntegritySection evidence={mockEvidenceItems[0]} />);
    expect(await screen.findByText(/boom/)).toBeTruthy();
  });

  it('triggers anchor and verify actions', async () => {
    mockedGet.mockResolvedValue(viewFixture({ verificationState: 'NOT_ANCHORED', anchor: null }));
    mockedAnchor.mockResolvedValue({
      evidenceId: 'ev-intel-001',
      investigationId: 'inv-006',
      anchor: null,
      verificationState: 'PENDING',
      message: 'ok',
      anchored: true,
      alreadyAnchored: false,
    });
    mockedVerify.mockResolvedValue({
      evidenceId: 'ev-intel-001',
      investigationId: 'inv-006',
      verificationState: 'VERIFIED',
      anchor: null,
      message: 'ok',
    });
    render(<EvidenceIntegritySection evidence={mockEvidenceItems[0]} />);
    fireEvent.click(await screen.findByRole('button', { name: /anchor digest/i }));
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));
    await waitFor(() => {
      expect(mockedAnchor).toHaveBeenCalledTimes(1);
      expect(mockedVerify).toHaveBeenCalledTimes(1);
    });
  });
});