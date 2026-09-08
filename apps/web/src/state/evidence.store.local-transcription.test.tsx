/**
 * PHASE 25 — LOCAL WHISPER TRANSCRIPTION STORE ORCHESTRATION TESTS.
 *
 * Exercises the REAL evidence store slice with a mocked api layer and a mocked
 * whisper orchestrator. Verifies the capability gate, the phase transitions
 * (downloading / transcribing / submitting / succeeded), the exact submission
 * payload, failure surfacing, reset semantics and coexistence with the Phase
 * 24 server-analysis history.
 */

import { useEvidenceStore } from '@/state/evidence.store';
import type {
  EvidenceAnalysis,
  LocalTranscriptionResult,
} from '@trinetra-pulse/types';

jest.mock('@/lib/api/config', () => ({
  DATA_SOURCE: 'api',
  API_BASE_URL: '/api/v2',
  isMockData: () => false,
}));

jest.mock('@/lib/api/evidence', () => ({
  analyzeEvidence: jest.fn(),
  getEvidenceAnalyses: jest.fn(),
  getEvidenceById: jest.fn(),
  getEvidenceChain: jest.fn(),
  getEvidenceChainVerification: jest.fn(),
  loadEvidenceSearch: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    totalPages: 0,
    facets: {},
  }),
  mapEvidenceItem: jest.fn((x) => x),
  recordEvidenceChainVerification: jest.fn(),
  getEvidenceContent: jest.fn(),
  submitLocalTranscription: jest.fn(),
}));

import {
  submitLocalTranscription,
  analyzeEvidence,
} from '@/lib/api/evidence';

const mockDetect = jest.fn();
const mockRunLocalWhisper = jest.fn();

jest.mock('@/lib/whisper/local-whisper', () => ({
  detectLocalWhisperCapability: (...args: unknown[]) => mockDetect(...args),
  runLocalWhisper: (...args: unknown[]) => mockRunLocalWhisper(...args),
}));

const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';
const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const CHECKSUM = 'a'.repeat(64);
const MODEL = 'Xenova/whisper-tiny' as const;

const localResult: LocalTranscriptionResult = {
  model_id: MODEL,
  transcript: 'On-device transcript body.',
  language: 'en',
  duration_seconds: 45,
  segments: [{ start_seconds: 0, end_seconds: 4, text: 'Segment one.' }],
  warnings: [],
};

const submittedRead = (overrides: Record<string, unknown> = {}): EvidenceAnalysis =>
  ({
    id: 'ana-local-1',
    evidence_id: EVIDENCE_ID,
    investigation_id: INVESTIGATION_ID,
    media_type: 'AUDIO',
    capability: 'transcription',
    provider_type: 'local',
    provider_name: 'Whisper',
    model: MODEL,
    status: 'succeeded',
    result: {
      summary: 'Two voices are audible.',
      observations: [],
      entities: [],
      locations: [],
      transcript: localResult.transcript,
      language: localResult.language,
      duration_seconds: localResult.duration_seconds,
      segments: localResult.segments,
      warnings: [],
    },
    checksum_at_analysis: CHECKSUM,
    started_at: '2026-08-18T09:00:45.000000',
    completed_at: '2026-08-18T09:00:45.000000',
    error_code: null,
    created_at: '2026-08-18T09:00:45.000000',
    updated_at: '2026-08-18T09:00:45.000000',
    created_by: null,
    mode: 'LOCAL',
    ...overrides,
  }) as EvidenceAnalysis;

const typeMock = <T extends (...args: never[]) => unknown>(fn: unknown): jest.MockedFunction<T> =>
  fn as jest.MockedFunction<T>;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('evidence store Local Whisper orchestration (Phase 25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The store is a module-level singleton; reset it to a pristine scope.
    useEvidenceStore.getState().setInvestigationId(null);
    mockDetect.mockReturnValue({ supported: true });
    mockRunLocalWhisper.mockImplementation(
      async (
        evidenceId: string,
        investigationId: string | undefined,
        checksum: string,
        model: string,
        onPhase?: (phase: 'downloading' | 'transcribing') => void,
      ) => {
        void evidenceId;
        void investigationId;
        void checksum;
        void model;
        onPhase?.('downloading');
        onPhase?.('transcribing');
        return localResult;
      },
    );
    typeMock<typeof submitLocalTranscription>(
      submitLocalTranscription,
    ).mockResolvedValue(submittedRead());
  });

  it('gates local transcription on the browser capability check', async () => {
    mockDetect.mockReturnValue({ supported: false, reason: 'web_worker_unavailable' });
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await flush();

    await useEvidenceStore.getState().runLocalTranscription(EVIDENCE_ID, CHECKSUM, MODEL);

    expect(useEvidenceStore.getState().localTranscriptionState).toBe('unsupported');
    expect(useEvidenceStore.getState().localTranscriptionError).toBe('web_worker_unavailable');
    expect(mockRunLocalWhisper).not.toHaveBeenCalled();
  });

  it('runs the full flow with expected phases and scopes the orchestrator call', async () => {
    const phases: string[] = [];
    const unsub = useEvidenceStore.subscribe((s, prev) => {
      if (prev.localTranscriptionState !== s.localTranscriptionState) {
        phases.push(s.localTranscriptionState);
      }
    });
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await flush();

    await useEvidenceStore.getState().runLocalTranscription(EVIDENCE_ID, CHECKSUM, MODEL);
    unsub();

    expect(mockRunLocalWhisper).toHaveBeenCalledWith(
      EVIDENCE_ID,
      INVESTIGATION_ID,
      CHECKSUM,
      MODEL,
      expect.any(Function),
    );
    expect(phases).toEqual(
      expect.arrayContaining(['downloading', 'transcribing', 'submitting', 'succeeded']),
    );
    expect(useEvidenceStore.getState().localTranscriptionState).toBe('succeeded');
    expect(useEvidenceStore.getState().localTranscriptionError).toBeNull();
    expect(useEvidenceStore.getState().analysisAvailable).toBe(true);
  });

  it('submits the canonical LocalTranscriptionSubmitPayload derived from the result', async () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await flush();

    await useEvidenceStore.getState().runLocalTranscription(EVIDENCE_ID, CHECKSUM, MODEL);

    expect(submitLocalTranscription).toHaveBeenCalledWith(
      EVIDENCE_ID,
      {
        mode: 'LOCAL',
        checksum: CHECKSUM,
        model_id: MODEL,
        transcript: localResult.transcript,
        language: localResult.language,
        duration_seconds: localResult.duration_seconds,
        segments: localResult.segments,
        warnings: localResult.warnings,
      },
      INVESTIGATION_ID,
    );
  });

  it('surfaces an orchestrator failure without submitting', async () => {
    mockRunLocalWhisper.mockRejectedValue(
      new Error('Error: 409 EVIDENCE_INTEGRITY_FAILED (checksum_mismatch)'),
    );
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await flush();

    await useEvidenceStore.getState().runLocalTranscription(EVIDENCE_ID, CHECKSUM, MODEL);

    expect(useEvidenceStore.getState().localTranscriptionState).toBe('failed');
    expect(useEvidenceStore.getState().localTranscriptionError).toContain(
      'EVIDENCE_INTEGRITY_FAILED',
    );
    expect(submitLocalTranscription).not.toHaveBeenCalled();
  });

  it('allows the local transcript to coexist with a prior server analysis (no overwrite)', async () => {
    const serverRead: EvidenceAnalysis = {
      id: 'ana-server-1',
      evidence_id: EVIDENCE_ID,
      investigation_id: INVESTIGATION_ID,
      media_type: 'AUDIO',
      capability: 'transcription',
      provider_type: 'openai',
      provider_name: 'External OpenAI',
      model: 'whisper-1',
      status: 'succeeded',
      result: {
        summary: 'A server summary.',
        observations: [],
        entities: [],
        locations: [],
        transcript: 'Server transcript.',
        warnings: [],
      },
      checksum_at_analysis: CHECKSUM,
      started_at: '2026-08-18T08:00:00.000000',
      completed_at: '2026-08-18T08:00:05.000000',
      error_code: null,
      created_at: '2026-08-18T08:00:05.000000',
      updated_at: '2026-08-18T08:00:05.000000',
      created_by: null,
      mode: 'EXTERNAL',
    };
    typeMock<typeof analyzeEvidence>(analyzeEvidence).mockResolvedValue(serverRead);

    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await flush();
    await useEvidenceStore.getState().runAnalysis(EVIDENCE_ID);

    await useEvidenceStore.getState().runLocalTranscription(EVIDENCE_ID, CHECKSUM, MODEL);

    const ids = (useEvidenceStore.getState().analyses ?? []).map((a) => a.id);
    expect(ids).toContain('ana-server-1');
    expect(ids).toContain('ana-local-1');
    expect(ids[0]).toBe('ana-local-1');
  });

  it('resets the local transcription slice explicitly', async () => {
    useEvidenceStore.getState().setInvestigationId(INVESTIGATION_ID);
    await flush();
    await useEvidenceStore.getState().runLocalTranscription(EVIDENCE_ID, CHECKSUM, MODEL);

    useEvidenceStore.getState().resetLocalTranscription();
    expect(useEvidenceStore.getState().localTranscriptionState).toBe('idle');
    expect(useEvidenceStore.getState().localTranscriptionError).toBeNull();
  });
});