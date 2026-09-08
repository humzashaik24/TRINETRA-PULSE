/**
 * PHASE 24 — MULTIMEDIA UNDERSTANDING PANEL COMPONENT TESTS.
 *
 * Renders the analysis panel against a controlled stance of the evidence store.
 * The panel must stay honest in mock mode (no fabricated analyses), show an
 * explicit error on failed reads, render persisted server-side results with
 * neutral, AI-generated-candidate framing, and only offer a new run when a
 * backend is reachable.
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EvidenceAnalysisPanel } from './evidence-analysis-panel';

// Phase 25 compatibility: the panel now imports the capability detector from
// the whisper module; jest mocks it (capability is a pure browser check).
jest.mock('@/lib/whisper/local-whisper', () => ({
  detectLocalWhisperCapability: jest.fn(() => ({ supported: true })),
  runLocalWhisper: jest.fn(),
}));

const mockStore: {
  analyses: unknown;
  analysisLoading: boolean;
  analysisRunning: boolean;
  analysisError: string | null;
  analysisAvailable: boolean;
  fetchAnalyses: jest.Mock;
  runAnalysis: jest.Mock;
} = {
  analyses: null,
  analysisLoading: false,
  analysisRunning: false,
  analysisError: null,
  analysisAvailable: false,
  fetchAnalyses: jest.fn().mockResolvedValue(undefined),
  runAnalysis: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/state/evidence.store', () => ({
  useEvidenceStore: (selector: (s: unknown) => unknown) => selector(mockStore),
}));

const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';
const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

const analysis = (overrides: Record<string, unknown> = {}) => ({
  id: 'ana-1',
  evidence_id: EVIDENCE_ID,
  investigation_id: INVESTIGATION_ID,
  media_type: 'IMAGE',
  capability: 'vision',
  provider_type: 'mock',
  provider_name: 'Deterministic Mock',
  model: 'trinetra-deterministic-local-v0',
  status: 'succeeded',
  result: {
    summary: 'An office entrance is visible in the image.',
    observations: [{ text: 'A person appears near the entrance.' }],
    entities: [{ name: 'Office building', type: 'location', context: 'seen at the entrance', confidence: 0.9 }],
    locations: ['Entrance'],
    warnings: [],
  },
  checksum_at_analysis: 'a'.repeat(64),
  started_at: '2026-08-18T09:00:00.000000',
  completed_at: '2026-08-18T09:00:45.000000',
  error_code: null,
  created_at: '2026-08-18T09:00:45.000000',
  updated_at: '2026-08-18T09:00:45.000000',
  created_by: null,
  mode: 'MOCK',
  ...overrides,
});

const renderPanel = () =>
  render(
    <EvidenceAnalysisPanel evidenceId={EVIDENCE_ID} investigationId={INVESTIGATION_ID} />,
  );

describe('EvidenceAnalysisPanel (Phase 24)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.analyses = null;
    mockStore.analysisLoading = false;
    mockStore.analysisRunning = false;
    mockStore.analysisError = null;
    mockStore.analysisAvailable = false;
  });

  afterEach(cleanup);

  it('requests analyses on mount and explains relational-only availability honestly', () => {
    renderPanel();

    expect(mockStore.fetchAnalyses).toHaveBeenCalledWith(EVIDENCE_ID);
    expect(screen.getByTestId('evidence-analysis-panel')).toBeInTheDocument();
    expect(
      screen.getByText(/computed server-side by the Trinetra backend/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-analysis-run')).not.toBeInTheDocument();
  });

  it('renders a loading state while the history resolves', () => {
    mockStore.analysisLoading = true;
    renderPanel();
    expect(screen.getByText(/Loading analyses/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/No analyses have been run/i),
    ).not.toBeInTheDocument();
  });

  it('renders an honest empty state with a run action when a backend is present', () => {
    mockStore.analyses = [];
    mockStore.analysisAvailable = true;

    renderPanel();

    expect(screen.getByText(/No analyses have been run/i)).toBeInTheDocument();
    expect(screen.getByTestId('evidence-analysis-run')).toBeInTheDocument();
    expect(screen.getByText(/AI-generated candidates, not verified facts/i)).toBeInTheDocument();
  });

  it('surfaces a failed read as an explicit error, never a fabricated analysis', () => {
    mockStore.analysisError = 'Error: 503 PROVIDER_NOT_CONFIGURED';
    mockStore.analysisAvailable = false;

    renderPanel();

    expect(screen.getByText(/PROVIDER_NOT_CONFIGURED/i)).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-analysis-run')).not.toBeInTheDocument();
  });

  it('renders a succeeded analysis with summary, observations, provider and checksum', () => {
    mockStore.analyses = [analysis()];
    mockStore.analysisAvailable = true;

    renderPanel();

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('MOCK')).toBeInTheDocument();
    expect(screen.getByText(/An office entrance is visible/i)).toBeInTheDocument();
    expect(screen.getByText('A person appears near the entrance.')).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Mock/)).toBeInTheDocument();
    expect(screen.getByText(/aaaa…aaaa/)).toBeInTheDocument();
  });

  it('labels EXTERNAL runs distinctly', () => {
    mockStore.analyses = [
      analysis({
        provider_type: 'openai',
        provider_name: 'External OpenAI',
        model: 'gpt-4o-mini',
        mode: 'EXTERNAL',
      }),
    ];
    mockStore.analysisAvailable = true;

    renderPanel();

    expect(screen.getByText('EXTERNAL')).toBeInTheDocument();
    expect(screen.getByText(/External OpenAI · gpt-4o-mini/i)).toBeInTheDocument();
  });

  it('renders candidate entities and locations', () => {
    mockStore.analyses = [analysis()];
    mockStore.analysisAvailable = true;

    renderPanel();

    expect(screen.getByText(/Candidate entities/i)).toBeInTheDocument();
    expect(screen.getByText('Office building')).toBeInTheDocument();
    expect(screen.getByText('Entrance')).toBeInTheDocument();
  });

  it('renders a failed analysis with its machine-safe error code', () => {
    mockStore.analyses = [
      analysis({
        status: 'failed',
        error_code: 'PROVIDER_AUTHENTICATION_FAILED',
        completed_at: null,
        result: {},
      }),
    ];
    mockStore.analysisAvailable = true;

    renderPanel();

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/provider authentication failed/i)).toBeInTheDocument();
  });

  it('reveals audio transcripts and segments on demand', () => {
    mockStore.analyses = [
      analysis({
        media_type: 'AUDIO',
        capability: 'transcription',
        result: {
          summary: 'Two voices are audible.',
          transcript: 'Full transcript body.',
          segments: [
            { start_seconds: 0, end_seconds: 4, text: 'Segment one.' },
            { start_seconds: 5, end_seconds: 9, text: 'Segment two.' },
          ],
        },
      }),
    ];
    mockStore.analysisAvailable = true;

    renderPanel();

    fireEvent.click(screen.getByTestId('evidence-analysis-transcript'));
    expect(screen.getByText('Segment one.')).toBeInTheDocument();
    expect(screen.getByText('Segment two.')).toBeInTheDocument();
  });

  it('renders video timeline observations with timings', () => {
    mockStore.analyses = [
      analysis({
        media_type: 'VIDEO',
        capability: 'video',
        result: {
          summary: 'A vehicle moves across the frame.',
          timestamps: [
            { start_seconds: 61, end_seconds: 63, description: 'Vehicle visible at the gate.' },
          ],
        },
      }),
    ];
    mockStore.analysisAvailable = true;

    renderPanel();

    expect(screen.getByText(/Vehicle visible at the gate/i)).toBeInTheDocument();
    expect(screen.getByText(/1m 1s–1m 3s/)).toBeInTheDocument();
  });

  it('runs a new analysis through the store action', () => {
    mockStore.analyses = [];
    mockStore.analysisAvailable = true;

    renderPanel();

    fireEvent.click(screen.getByTestId('evidence-analysis-run'));
    expect(mockStore.runAnalysis).toHaveBeenCalledWith(EVIDENCE_ID);
  });

  it('disables the run action and shows progress while analyzing', () => {
    mockStore.analyses = [];
    mockStore.analysisAvailable = true;
    mockStore.analysisRunning = true;

    renderPanel();

    expect(screen.getByText(/Analyzing payload/i)).toBeInTheDocument();
    const runButton = screen.getByTestId('evidence-analysis-run');
    expect(runButton).toBeDisabled();
  });
});