'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Loader2,
  ShieldAlert,
  Play,
  AudioLines,
  Laptop,
} from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { formatDateTime, formatPercent } from '@/lib/format';
import { useEvidenceStore, type LocalTranscriptionStage } from '@/state/evidence.store';
import { detectLocalWhisperCapability } from '@/lib/whisper/local-whisper';
import type {
  EvidenceAnalysis,
  EvidenceAnalysisMediaKind,
  EvidenceAnalysisMode,
  LocalWhisperModelId,
} from '@trinetra-pulse/types';
import { LOCAL_WHISPER_MODELS } from '@trinetra-pulse/types';

// ============================================================
// PHASE 24 — MULTIMEDIA UNDERSTANDING PANEL
// ============================================================
// Renders the persisted server-side analysis history for an evidence item.
// Analysis is relational-only (computed by the backend, never in the browser):
// the panel loads through the evidence store and stays honestly absent in mock
// mode. Every result block is an AI-generated candidate, never a fact — the UI
// keeps the product's neutral vocabulary and shows a re-verification hint.
//
// PHASE 25 — LOCAL WHISPER TRANSCRIPTION MODE
// For AUDIO evidence the panel offers a bimodal transcription choice: Server
// AI (backend capability) or Local Whisper (on-device, transforms.js worker).
// Local inference runs entirely in the browser; the authoritative payload is
// fetched through the authenticated download endpoint and the structured
// result is submitted back to the backend, which re-verifies the checksum and
// persists a ``provider_type=LOCAL`` row ("Locally transcribed").
// ============================================================

const MEDIA_KIND_LABELS: Record<EvidenceAnalysisMediaKind, string> = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
};

const STATUS_CONFIG: Record<
  EvidenceAnalysis['status'],
  { label: string; variant: 'success' | 'danger' }
> = {
  succeeded: { label: 'Succeeded', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
};

const MODE_CONFIG: Record<
  EvidenceAnalysisMode,
  { label: string; variant: 'warning' | 'info' }
> = {
  MOCK: { label: 'MOCK', variant: 'warning' },
  EXTERNAL: { label: 'EXTERNAL', variant: 'info' },
  LOCAL: { label: 'LOCAL', variant: 'info' },
};

type WhisperMode = 'server' | 'local';

const MODEL_IDS: readonly LocalWhisperModelId[] = LOCAL_WHISPER_MODELS;

const STAGE_LABELS: Record<LocalTranscriptionStage, { label: string; running: boolean }> = {
  idle: { label: 'Ready', running: false },
  unsupported: { label: 'Not supported by this browser', running: false },
  downloading: { label: 'Downloading the Whisper model (first time only)…', running: true },
  transcribing: { label: 'Transcribing on this device…', running: true },
  submitting: { label: 'Submitting the transcript to the backend…', running: true },
  succeeded: { label: 'Locally transcribed and saved', running: false },
  failed: { label: 'Local transcription failed', running: false },
};

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div className="mt-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
        {title}
      </div>
      {children}
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: EvidenceAnalysis }) {
  const { status, mode, media_type, capability } = analysis;
  const failed = status === 'failed';
  const result = analysis.result ?? ({} as EvidenceAnalysis['result']);
  const observations = result.observations ?? [];
  const entities = result.entities ?? [];
  const locations = result.locations ?? [];
  const warnings = result.warnings ?? [];
  const timestamps = result.timestamps ?? [];
  const segments = result.segments ?? [];

  return (
    <li
      className="rounded-md border border-border bg-surface-elevated/40 p-2.5"
      data-testid={`evidence-analysis-${analysis.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge size="sm" variant={STATUS_CONFIG[status].variant}>
            {STATUS_CONFIG[status].label}
          </Badge>
          <Badge size="sm" variant={MODE_CONFIG[mode].variant}>
            {MODE_CONFIG[mode].label}
          </Badge>
          <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
            {MEDIA_KIND_LABELS[media_type]}
          </span>
          <span className="font-mono text-[10px] text-foreground-muted">{capability}</span>
        </div>
        <span className="text-[10px] text-foreground-muted">
          {analysis.completed_at ?? analysis.started_at
            ? formatDateTime(analysis.completed_at ?? analysis.started_at)
            : ''}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-foreground-muted">
        {analysis.provider_name} · {analysis.model}
        {mode === 'LOCAL' && analysis.provider_type === 'local' ? (
          <span
            className="ml-1.5 inline-flex items-center gap-1 rounded bg-evidence/10 px-1.5 py-0.5 text-[10px] font-medium text-evidence"
            data-testid={`local-provenance-${analysis.id}`}
          >
            <Laptop className="h-2.5 w-2.5" />
            Locally transcribed
          </span>
        ) : null}
      </p>

      {failed ? (
        <div className="mt-2 rounded-md bg-danger-subtle px-2 py-1.5 text-[11px] text-danger">
          <ShieldAlert className="mr-1 inline h-3 w-3" />
          {analysis.error_code
            ? analysis.error_code.replace(/_/g, ' ')
            : 'The analysis could not be completed'}
        </div>
      ) : (
        <div>
          {result.summary ? (
            <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">
              {result.summary}
            </p>
          ) : null}

          {observations.length > 0 ? (
            <ResultSection title="Observations">
              <ul className="mt-1 space-y-1">
                {observations.map((obs, i) => (
                  <li key={i} className="text-xs text-foreground-secondary">
                    {obs.text}
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {entities.length > 0 ? (
            <ResultSection title="Candidate entities">
              <ul className="mt-1 space-y-1">
                {entities.map((ent, i) => (
                  <li key={i} className="text-xs text-foreground-secondary">
                    <span className="font-medium text-foreground">{ent.name}</span>
                    {ent.type ? ` · ${ent.type}` : ''}
                    {ent.confidence != null ? ` · ${formatPercent(ent.confidence)}` : ''}
                    {ent.context ? <span className="block text-foreground-muted">{ent.context}</span> : null}
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {locations.length > 0 ? (
            <ResultSection title="Locations">
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {locations.map((loc, i) => (
                  <li key={i} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-foreground-secondary">
                    {loc}
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {timestamps.length ? (
            <ResultSection title="Timeline">
              <ul className="mt-1 space-y-1">
                {timestamps.map((ts, i) => (
                  <li key={i} className="text-xs text-foreground-secondary">
                    <span className="font-mono text-foreground-muted">
                      {formatSeconds(ts.start_seconds)}
                      {ts.end_seconds ? `–${formatSeconds(ts.end_seconds)}` : ''}
                    </span>
                    {' · '}
                    {ts.description}
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}

          {result.transcript ? (
            <ResultSection title="Transcript">
              <details className="mt-1" data-testid="evidence-analysis-transcript">
                <summary className="cursor-pointer text-[11px] text-evidence hover:underline">
                  Show transcript
                </summary>
                <div className="mt-1 space-y-1">
                  {segments.length ? (
                    segments.map((seg, i) => (
                      <p key={i} className="text-xs leading-relaxed text-foreground-secondary">
                        <span className="font-mono text-[10px] text-foreground-muted">
                          {formatSeconds(seg.start_seconds)}
                        </span>{' '}
                        {seg.text}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs leading-relaxed text-foreground-secondary">
                      {result.transcript}
                    </p>
                  )}
                </div>
              </details>
            </ResultSection>
          ) : null}

          {warnings.length > 0 ? (
            <ResultSection title="Warnings">
              <ul className="mt-1 space-y-1">
                {warnings.map((warn, i) => (
                  <li key={i} className="text-[11px] text-foreground-muted">
                    {warn}
                  </li>
                ))}
              </ul>
            </ResultSection>
          ) : null}
        </div>
      )}

      <p className="mt-2 flex items-center justify-between gap-2 text-[10px] text-foreground-muted">
        <span>Checksum at analysis</span>
        <span className="font-mono">{shortHash(analysis.checksum_at_analysis)}</span>
      </p>
    </li>
  );
}

export function EvidenceAnalysisPanel({
  evidenceId,
  investigationId,
  evidenceType,
  checksum,
  className,
}: {
  evidenceId: string;
  investigationId?: string;
  /** Declared evidence type (used to gate the AUDIO-only Local Whisper mode). */
  evidenceType?: string;
  /** Authoritative SHA-256 from the evidence integrity block (Phase 25). */
  checksum?: string | null;
  className?: string;
}) {
  const analyses = useEvidenceStore((s) => s.analyses);
  const analysisLoading = useEvidenceStore((s) => s.analysisLoading);
  const analysisRunning = useEvidenceStore((s) => s.analysisRunning);
  const analysisError = useEvidenceStore((s) => s.analysisError);
  const analysisAvailable = useEvidenceStore((s) => s.analysisAvailable);
  const fetchAnalyses = useEvidenceStore((s) => s.fetchAnalyses);
  const runAnalysis = useEvidenceStore((s) => s.runAnalysis);
  const localTranscriptionState = useEvidenceStore((s) => s.localTranscriptionState);
  const localTranscriptionError = useEvidenceStore((s) => s.localTranscriptionError);
  const runLocalTranscription = useEvidenceStore(
    (s) => s.runLocalTranscription,
  );
  const resetLocalTranscription = useEvidenceStore(
    (s) => s.resetLocalTranscription,
  );

  const [whisperMode, setWhisperMode] = useState<WhisperMode>('server');
  const [modelId, setModelId] = useState<LocalWhisperModelId>(
    MODEL_IDS[0] ?? 'Xenova/whisper-tiny',
  );
  // Browser capability is static per session; detect once, on the client.
  const [capability] = useState(() => detectLocalWhisperCapability());

  useEffect(() => {
    if (evidenceId) {
      void fetchAnalyses(evidenceId);
    }
    // fetchAnalyses is bound to the stable store instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId]);

  useEffect(() => {
    if (!evidenceId || !evidenceType) return;
    if (evidenceType.toUpperCase() !== 'AUDIO') {
      setWhisperMode('server');
      resetLocalTranscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId, evidenceType]);

  const isAudio = (evidenceType ?? '').toUpperCase() === 'AUDIO';
  const localBusy =
    localTranscriptionState === 'downloading' ||
    localTranscriptionState === 'transcribing' ||
    localTranscriptionState === 'submitting';

  const stage = STAGE_LABELS[localTranscriptionState] ?? STAGE_LABELS.idle;

  return (
    <div className={cn('space-y-3', className)} data-testid="evidence-analysis-panel">
      <div className="flex items-center justify-between gap-2">
        <h4 className="tp-data-label flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Multimedia Understanding
        </h4>
      </div>

      {!analysisAvailable && !analysisLoading && !analysisRunning && !analysisError ? (
        <p className="text-[11px] leading-relaxed text-foreground-muted">
          AI understanding is computed server-side by the Trinetra backend. Point
          the app at the backend to run and review analyses of this evidence.
        </p>
      ) : null}

      {analysisLoading && !analyses ? (
        <p className="flex items-center gap-2 text-[11px] text-foreground-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading analyses…
        </p>
      ) : null}

      {analysisRunning ? (
        <p className="flex items-center gap-2 text-[11px] text-foreground-muted">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyzing payload…
        </p>
      ) : null}

      {analysisError && !analysisLoading && !analysisRunning ? (
        <div className="rounded-md bg-danger-subtle px-2 py-1.5 text-[11px] text-danger">
          <ShieldAlert className="mr-1 inline h-3 w-3" />
          {analysisError}
        </div>
      ) : null}

      {analyses && analyses.length === 0 ? (
        <p className="text-[11px] text-foreground-muted">
          No analyses have been run on this evidence item yet.
        </p>
      ) : null}

      {analyses && analyses.length > 0 ? (
        <ul className="space-y-2">
          {analyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </ul>
      ) : null}

      {(analyses?.length ?? 0) > 0 || analysisAvailable ? (
        <p className="text-[10px] leading-relaxed text-foreground-muted">
          Results are AI-generated candidates, not verified facts. Re-verify an
          item&apos;s content before relying on it in an investigation.
        </p>
      ) : null}

      {analysisAvailable && isAudio ? (
        <LocalWhisperMode
          state={localTranscriptionState}
          error={localTranscriptionError}
          supported={capability.supported}
          busy={localBusy}
          stageLabel={stage.label}
          mode={whisperMode}
          onModeChange={setWhisperMode}
          modelId={modelId}
          onModelChange={setModelId}
          onRun={() => {
            if (!checksum) {
              resetLocalTranscription();
              window.alert?.(
                'This evidence has no stored integrity checksum, so local transcription cannot start.',
              );
              return;
            }
            void runLocalTranscription(evidenceId, checksum, modelId);
          }}
        />
      ) : null}

      {analysisAvailable && whisperMode === 'server' ? (
        <div className="flex justify-end">
          <button
            onClick={() => void runAnalysis(evidenceId)}
            disabled={analysisRunning}
            className="inline-flex items-center gap-1.5 rounded-md border border-evidence/30 bg-evidence-subtle px-2.5 py-1 text-[11px] font-medium text-evidence tp-transition hover:bg-evidence/10 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="evidence-analysis-run"
          >
            {analysisRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {analysisRunning ? 'Analyzing…' : 'Run analysis'}
          </button>
        </div>
      ) : null}

      {isAudio && analysisAvailable ? (
        <p className="text-[10px] leading-relaxed text-foreground-muted">
          Audio processed in Local Whisper mode stays on this device and is
          never sent to an AI provider. The authenticated payload is fetched
          once and the returned transcript is submitted to the backend for
          custody.
        </p>
      ) : null}
    </div>
  );
}

function LocalWhisperMode({
  state,
  error,
  supported,
  busy,
  stageLabel,
  mode,
  onModeChange,
  modelId,
  onModelChange,
  onRun,
}: {
  state: LocalTranscriptionStage;
  error: string | null;
  supported: boolean;
  busy: boolean;
  stageLabel: string;
  mode: WhisperMode;
  onModeChange: (mode: WhisperMode) => void;
  modelId: LocalWhisperModelId;
  onModelChange: (model: LocalWhisperModelId) => void;
  onRun: () => void;
}) {
  return (
    <div
      className="rounded-md border border-border bg-surface-elevated/30 p-2.5"
      data-testid="local-whisper-mode"
    >
      <div className="flex items-center gap-1.5">
        <AudioLines className="h-3 w-3 text-foreground-muted" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
          Transcription mode
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onModeChange('server')}
          aria-pressed={mode === 'server'}
          className={cn(
            'rounded-md border px-2 py-1 text-[11px] font-medium tp-transition',
            mode === 'server'
              ? 'border-evidence/40 bg-evidence/10 text-evidence'
              : 'border-border text-foreground-muted hover:bg-surface',
          )}
          data-testid="transcription-mode-server"
        >
          Server AI
        </button>
        <button
          onClick={() => onModeChange('local')}
          aria-pressed={mode === 'local'}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium tp-transition',
            mode === 'local'
              ? 'border-evidence/40 bg-evidence/10 text-evidence'
              : 'border-border text-foreground-muted hover:bg-surface',
          )}
          data-testid="transcription-mode-local"
        >
          <Laptop className="h-3 w-3" />
          Local / Offline
        </button>
      </div>

      {mode === 'local' ? (
        <div className="mt-2 space-y-2">
          {!supported || state === 'unsupported' ? (
            <div
              className="rounded-md bg-danger-subtle px-2 py-1.5 text-[11px] text-danger"
              data-testid="local-whisper-unsupported"
            >
              <ShieldAlert className="mr-1 inline h-3 w-3" />
              Local Whisper requires Web Workers, WebAssembly and the Web Audio
              API in this browser. Switch to Server AI or use a modern browser.
            </div>
          ) : null}

          {busy ? (
            <div
              className="flex items-center gap-2 text-[11px] text-foreground-muted"
              data-testid="local-whisper-busy"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              {stageLabel}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
                Model
                <select
                  value={modelId}
                  onChange={(e) => onModelChange(e.target.value as LocalWhisperModelId)}
                  className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] text-foreground"
                  data-testid="local-whisper-model"
                >
                  {MODEL_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id.replace('Xenova/', '')}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={onRun}
                disabled={!supported}
                className="inline-flex items-center gap-1.5 rounded-md border border-evidence/30 bg-evidence-subtle px-2.5 py-1 text-[11px] font-medium text-evidence tp-transition hover:bg-evidence/10 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="local-whisper-run"
              >
                <Laptop className="h-3 w-3" />
                {state === 'succeeded' ? 'Transcribe again' : 'Transcribe locally'}
              </button>
            </div>
          )}

          {state === 'succeeded' ? (
            <p
              className="text-[11px] text-evidence"
              data-testid="local-whisper-success"
            >
              The on-device transcript was saved to the analysis history; it is
              marked with a &ldquo;Locally transcribed&rdquo; badge.
            </p>
          ) : null}

          {state === 'failed' ? (
            <div
              className="rounded-md bg-danger-subtle px-2 py-1.5 text-[11px] text-danger"
              data-testid="local-whisper-failed"
            >
              <ShieldAlert className="mr-1 inline h-3 w-3" />
              {error ?? 'Local transcription failed'}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default EvidenceAnalysisPanel;