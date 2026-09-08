/**
 * PHASE 25 — LOCAL WHISPER TRANSCRIPTION PANEL TESTS.
 *
 * Renders the bidirectional "Server AI / Local Whisper" transcription control
 * against a controlled stance of the evidence store and a mocked capability
 * detector. No real worker, model or Transformers.js runtime is ever loaded in
 * Jest — the whisper module and the store action are both mocked, and the UI
 * is verified state by state (capability gate, mode selector, model picker,
 * honest phase text without invented percentages, checksum gate, LOCAL badge
 * provenance, error/success rendering, privacy framing).
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EvidenceAnalysisPanel } from './evidence-analysis-panel';
import type { LocalTranscriptionStage } from '@/state/evidence.store';

const mockStore: {
  analyses: unknown;
  analysisLoading: boolean;
  analysisRunning: boolean;
  analysisError: string | null;
  analysisAvailable: boolean;
  fetchAnalyses: jest.Mock;
  runAnalysis: jest.Mock;
  localTranscriptionState: LocalTranscriptionStage;
  localTranscriptionError: string | null;
  runLocalTranscription: jest.Mock;
  resetLocalTranscription: jest.Mock;
} = {
  analyses: null,
  analysisLoading: false,
  analysisRunning: false,
  analysisError: null,
  analysisAvailable: false,
  fetchAnalyses: jest.fn().mockResolvedValue(undefined),
  runAnalysis: jest.fn().mockResolvedValue(undefined),
  localTranscriptionState: 'idle',
  localTranscriptionError: null,
  runLocalTranscription: jest.fn().mockResolvedValue(undefined),
  resetLocalTranscription: jest.fn(),
};

const mockDetect = jest.fn();

jest.mock('@/state/evidence.store', () => ({
  useEvidenceStore: (selector: (s: unknown) => unknown) => selector(mockStore),
}));

jest.mock('@/lib/whisper/local-whisper', () => ({
  detectLocalWhisperCapability: (...args: unknown[]) => mockDetect(...args),
}));

const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';
const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const CHECKSUM = 'a'.repeat(64);
const OTHER_CHECKSUM = 'b'.repeat(64);

const renderPanel = ({
  evidenceType = 'AUDIO',
  checksum = CHECKSUM,
}: { evidenceType?: string; checksum?: string | null } = {}) =>
  render(
    <EvidenceAnalysisPanel
      evidenceId={EVIDENCE_ID}
      investigationId={INVESTIGATION_ID}
      evidenceType={evidenceType}
      checksum={checksum}
    />,
  );

const analysis = (overrides: Record<string, unknown> = {}) => ({
  id: 'ana-local-1',
  evidence_id: EVIDENCE_ID,
  investigation_id: INVESTIGATION_ID,
  media_type: 'AUDIO',
  capability: 'transcription',
  provider_type: 'openai',
  provider_name: 'External OpenAI',
  model: 'whisper-1',
  status: 'succeeded',
  result: {
    summary: 'Two voices are audible.',
    transcript: 'A locally transcribed body.',
    language: 'en',
    duration_seconds: 45,
    segments: [{ start_seconds: 0, end_seconds: 4, text: 'Segment one.' }],
  },
  checksum_at_analysis: CHECKSUM,
  started_at: '2026-08-18T09:00:00.000000',
  completed_at: '2026-08-18T09:00:45.000000',
  error_code: null,
  created_at: '2026-08-18T09:00:45.000000',
  updated_at: '2026-08-18T09:00:45.000000',
  created_by: null,
  mode: 'EXTERNAL',
  ...overrides,
});

describe('EvidenceAnalysisPanel Local Whisper (Phase 25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.analyses = null;
    mockStore.analysisLoading = false;
    mockStore.analysisRunning = false;
    mockStore.analysisError = null;
    mockStore.analysisAvailable = true;
    mockStore.localTranscriptionState = 'idle';
    mockStore.localTranscriptionError = null;
    mockDetect.mockReturnValue({ supported: true });
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('shows the bimodal transcription control only for AUDIO evidence with a reachable backend', () => {
    renderPanel();
    expect(screen.getByTestId('local-whisper-mode')).toBeInTheDocument();
    expect(screen.getByTestId('transcription-mode-server')).toBeInTheDocument();
    expect(screen.getByTestId('transcription-mode-local')).toBeInTheDocument();
  });

  it('keeps the local control hidden when no backend is reachable (mock mode)', () => {
    mockStore.analysisAvailable = false;
    renderPanel();
    expect(screen.queryByTestId('local-whisper-mode')).not.toBeInTheDocument();
    expect(screen.queryByTestId('transcription-mode-local')).not.toBeInTheDocument();
  });

  it('keeps the local control hidden for non-AUDIO evidence', () => {
    renderPanel({ evidenceType: 'IMAGE' });
    expect(screen.queryByTestId('local-whisper-mode')).not.toBeInTheDocument();
  });

  it('gates the local option with a capability check when the browser cannot host the worker', () => {
    mockDetect.mockReturnValue({ supported: false, reason: 'web_worker_unavailable' });
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    expect(screen.getByTestId('local-whisper-unsupported')).toBeInTheDocument();
    expect(screen.getByText(/requires Web Workers, WebAssembly and the Web Audio API/i))
      .toBeInTheDocument();
    expect(screen.getByTestId('local-whisper-run')).toBeDisabled();
  });

  it('selects the tiny model by default and allows switching to the base model', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    const model = screen.getByTestId('local-whisper-model') as HTMLSelectElement;
    expect(model.value).toBe('Xenova/whisper-tiny');
    fireEvent.change(model, { target: { value: 'Xenova/whisper-base' } });
    expect(model.value).toBe('Xenova/whisper-base');
  });

  it('refuses to start when the evidence has no integrity checksum (alert, no store action)', () => {
    renderPanel({ checksum: null });
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    fireEvent.click(screen.getByTestId('local-whisper-run'));
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringMatching(/no stored integrity checksum/i),
    );
    expect(mockStore.runLocalTranscription).not.toHaveBeenCalled();
  });

  it('runs local transcription through the store action with evidence id + checksum + model', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    fireEvent.change(screen.getByTestId('local-whisper-model'), {
      target: { value: 'Xenova/whisper-base' },
    });
    fireEvent.click(screen.getByTestId('local-whisper-run'));
    expect(mockStore.runLocalTranscription).toHaveBeenCalledWith(
      EVIDENCE_ID,
      CHECKSUM,
      'Xenova/whisper-base',
    );
  });

  it('shows the model-download phase honestly without invented percentages', () => {
    mockStore.localTranscriptionState = 'downloading';
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    expect(screen.getByText(/Downloading the Whisper model/i)).toBeInTheDocument();
    expect(screen.queryByTestId('local-whisper-run')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('local-whisper-mode').textContent ?? '',
    ).not.toContain('%');
  });

  it('shows the on-device transcribing phase without invented percentages', () => {
    mockStore.localTranscriptionState = 'transcribing';
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    expect(screen.getByText(/Transcribing on this device/i)).toBeInTheDocument();
    expect(
      screen.getByTestId('local-whisper-mode').textContent ?? '',
    ).not.toContain('%');
  });

  it('surfaces a failed local transcription as an explicit error', () => {
    mockStore.localTranscriptionState = 'failed';
    mockStore.localTranscriptionError = 'Error: 409 EVIDENCE_INTEGRITY_FAILED';
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    expect(screen.getByTestId('local-whisper-failed')).toBeInTheDocument();
    expect(screen.getByText(/EVIDENCE_INTEGRITY_FAILED/i)).toBeInTheDocument();
  });

  it('shows the succeeded confirmation note', () => {
    mockStore.localTranscriptionState = 'succeeded';
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    expect(screen.getByTestId('local-whisper-success')).toBeInTheDocument();
    expect(screen.getByText(/Locally transcribed.*badge/i)).toBeInTheDocument();
  });

  it('marks a LOCAL analysis with the LOCAL badge and Locally transcribed provenance', () => {
    mockStore.analyses = [
      analysis({
        provider_type: 'local',
        provider_name: 'Whisper',
        model: 'Xenova/whisper-tiny',
        mode: 'LOCAL',
      }),
    ];
    renderPanel();
    expect(screen.getByText('LOCAL')).toBeInTheDocument();
    expect(screen.getByText('Locally transcribed')).toBeInTheDocument();
    expect(screen.getByTestId('local-provenance-ana-local-1')).toBeInTheDocument();
  });

  it('frames on-device audio processing with the privacy note', () => {
    renderPanel();
    expect(screen.getByText(/stays on this device and is never sent to an AI provider/i))
      .toBeInTheDocument();
  });

  it('switches back to Server AI, hiding the local controls and re-enabling the server run', () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('transcription-mode-local'));
    expect(screen.getByTestId('local-whisper-model')).toBeInTheDocument();
    expect(screen.queryByTestId('evidence-analysis-run')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('transcription-mode-server'));
    expect(screen.queryByTestId('local-whisper-model')).not.toBeInTheDocument();
    expect(screen.getByTestId('evidence-analysis-run')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('evidence-analysis-run'));
    expect(mockStore.runAnalysis).toHaveBeenCalledWith(EVIDENCE_ID);
  });
});