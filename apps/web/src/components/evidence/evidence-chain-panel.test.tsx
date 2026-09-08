/**
 * PHASE 18.2 — EVIDENCE CUSTODY CHAIN PANEL COMPONENT TESTS.
 *
 * Renders the chain panel against a controlled stance of the evidence store.
 * The panel must stay honest in mock mode (no fabricated chains), show an
 * explicit error on failed reads, and only offer an audited re-verification
 * when a real chain is present.
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EvidenceChainPanel } from './evidence-chain-panel';

const mockStore: {
  chain: unknown;
  chainVerification: unknown;
  chainLoading: boolean;
  chainError: string | null;
  chainAvailable: boolean;
  fetchChain: jest.Mock;
  verifyChain: jest.Mock;
} = {
  chain: null,
  chainVerification: null,
  chainLoading: false,
  chainError: null,
  chainAvailable: false,
  fetchChain: jest.fn().mockResolvedValue(undefined),
  verifyChain: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/state/evidence.store', () => ({
  useEvidenceStore: (selector: (s: unknown) => unknown) => selector(mockStore),
}));

const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';
const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

const chainEntry = (sequenceNumber: number) => ({
  id: `chain-${sequenceNumber}`,
  evidence_id: EVIDENCE_ID,
  investigation_id: INVESTIGATION_ID,
  sequence_number: sequenceNumber,
  action: sequenceNumber === 1 ? 'evidence_created' : 'evidence_accessed',
  payload_hash: 'p'.repeat(64),
  metadata_hash: 'm'.repeat(64),
  previous_entry_hash: sequenceNumber === 1 ? null : 'h' + '1'.repeat(64),
  entry_hash: sequenceNumber.toString().repeat(64),
  actor_id: null,
  actor_email: 'Inspector Mehta',
  details: {},
  created_at: '2026-08-18T09:00:00.000000',
  updated_at: '2026-08-18T09:00:00.000000',
});

const renderPanel = () =>
  render(
    <EvidenceChainPanel evidenceId={EVIDENCE_ID} investigationId={INVESTIGATION_ID} />,
  );

describe('EvidenceChainPanel (Phase 18.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.chain = null;
    mockStore.chainVerification = null;
    mockStore.chainLoading = false;
    mockStore.chainError = null;
    mockStore.chainAvailable = false;
  });

  afterEach(cleanup);

  it('requests the chain on mount and explains mock-mode emptiness honestly', () => {
    renderPanel();

    expect(mockStore.fetchChain).toHaveBeenCalledWith(EVIDENCE_ID);
    expect(screen.getByTestId('evidence-chain-panel')).toBeInTheDocument();
    expect(
      screen.getByText(/Custody chains are recorded in the relational database/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-chain-verify')).not.toBeInTheDocument();
  });

  it('renders a loading state while the chain resolves', () => {
    mockStore.chainLoading = true;
    renderPanel();
    expect(screen.getByText(/Loading chain/i)).toBeInTheDocument();
  });

  it('renders links, validation status and an audited verify action for a valid chain', () => {
    mockStore.chain = [chainEntry(1), chainEntry(2)];
    mockStore.chainVerification = {
      status: 'VALID',
      valid: true,
      entries: 2,
      reason: null,
      verified_at: '2026-08-18T09:05:00.000000',
    };
    mockStore.chainAvailable = true;

    renderPanel();

    expect(screen.getByText('Chain valid')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getAllByText(/Inspector Mehta/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('evidence-chain-technical')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('evidence-chain-verify'));
    expect(mockStore.verifyChain).toHaveBeenCalledWith(EVIDENCE_ID);
  });

  it('flags a tampered chain with the danger badge', () => {
    mockStore.chain = [chainEntry(1)];
    mockStore.chainVerification = {
      status: 'TAMPERED',
      valid: false,
      entries: 1,
      reason: 'Payload mismatch at link #1',
      verified_at: '2026-08-18T09:05:00.000000',
    };
    mockStore.chainAvailable = true;

    renderPanel();

    expect(screen.getByText('Tampered')).toBeInTheDocument();
    expect(screen.getByText(/Payload mismatch at link #1/i)).toBeInTheDocument();
  });

  it('renders an honest empty state when the evidence has no chain yet', () => {
    mockStore.chain = [];
    mockStore.chainAvailable = true;

    renderPanel();

    expect(
      screen.getByText(/This evidence item has no custody chain yet/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('evidence-chain-verify')).toBeInTheDocument();
  });

  it('surfaces a failed chain read as an explicit error, never a fabricated chain', () => {
    mockStore.chainError = 'Error: integrity check impossible';
    mockStore.chain = null;

    renderPanel();

    expect(screen.getByText(/integrity check impossible/i)).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-chain-verify')).not.toBeInTheDocument();
  });
});