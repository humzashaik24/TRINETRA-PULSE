/**
 * PHASE 25 — LOCAL (ON-DEVICE) WHISPER ORCHESTRATOR.
 *
 * Browser-side orchestration for transcribing AUDIO evidence with on-device
 * Whisper through a dedicated Web Worker:
 *
 *   1. capability detection (Worker + WebAssembly + Web Audio API decode)
 *   2. authenticated retrieval of the evidence payload (the existing download
 *      endpoint is investigation-scoped and RBAC-enforced — there are NO public
 *      object-storage URLs and NO credentials in this module)
 *   3. Web Audio decode -> mono Float32Array (WAV / MP3 / OGG / WebM)
 *   4. worker init (model download first time, then cached by the browser via
 *      the library's supported cache) + transcription
 *   5. canonical ``LocalTranscriptionResult`` ready for server submission
 *
 * The audio stays on-device for inference; only this authorized client fetches
 * the payload once. Model timing/memory varies by runtime — we deliberately do
 * NOT report invented progress percentages; the worker relays the library's
 * real file/byte progress only, and the UI shows coarse phases.
 */

import { getEvidenceContent } from '@/lib/api/evidence';
import { getWhisperWorkerUrl } from './worker-url';
import type {
  LocalTranscriptionResult,
  LocalTranscriptionSegment,
  LocalWhisperModelId,
} from '@trinetra-pulse/types';

export type LocalWhisperPhase = 'downloading' | 'transcribing';

export type WhisperCapability =
  | { supported: true }
  | { supported: false; reason: string };

const SUPPORTED_CONTENT_TYPES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
]);

export function detectLocalWhisperCapability(): WhisperCapability {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'browser_api_unavailable' };
  }
  if (typeof Worker === 'undefined') {
    return { supported: false, reason: 'web_worker_unavailable' };
  }
  if (typeof WebAssembly === 'undefined') {
    return { supported: false, reason: 'webassembly_unavailable' };
  }
  const Ctx =
    typeof window.AudioContext !== 'undefined'
      ? window.AudioContext
      : (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
  if (typeof Ctx !== 'function') {
    return { supported: false, reason: 'audio_decode_unavailable' };
  }
  return { supported: true };
}

function isSupportedAudio(contentType: string): boolean {
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (SUPPORTED_CONTENT_TYPES.has(mime)) return true;
  // Fall back to an extension-free heuristic for loosely-typed uploads.
  return mime.startsWith('audio/');
}

export class UnsupportedAudioFormatError extends Error {
  readonly code = 'UNSUPPORTED_AUDIO_FORMAT';
  constructor(message = 'The evidence is not a supported audio format') {
    super(message);
    this.name = 'UnsupportedAudioFormatError';
  }
}

interface DecodedAudio {
  data: Float32Array;
  sampleRate: number;
  durationSeconds: number;
}

async function decodeAudio(blob: Blob): Promise<DecodedAudio> {
  const Ctx =
    typeof window.AudioContext !== 'undefined'
      ? window.AudioContext
      : (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
  if (typeof Ctx !== 'function') {
    throw new UnsupportedAudioFormatError(
      'Web Audio API is unavailable in this browser',
    );
  }
  const context = new Ctx();

  try {
    const arrayBuffer = await blob.arrayBuffer();
    let buffer: AudioBuffer;
    try {
      buffer = await context.decodeAudioData(arrayBuffer);
    } catch (err) {
      if (!isSupportedAudio(blob.type)) throw new UnsupportedAudioFormatError();
      throw err instanceof Error ? err : new Error('audio decode failed');
    }
    const sampleRate = buffer.sampleRate || 16000;
    // Mix down to a single mono channel the ASR pipeline can consume.
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) =>
      buffer.getChannelData(c),
    );
    const length = buffer.length;
    const data = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      let sample = 0;
      for (const channel of channels) sample += channel[i];
      data[i] = sample / channels.length;
    }
    return {
      data,
      sampleRate,
      durationSeconds: Number.isFinite(buffer.duration) ? buffer.duration : 0,
    };
  } finally {
    try {
      void context.close();
    } catch {
      // Some browsers throw on close() of a suspended context; ignore.
    }
  }
}

interface WorkerResult {
  text: string;
  language: string;
  segments: Array<{ start_seconds: number; end_seconds: number; text: string }>;
}

function runWorker(
  model: LocalWhisperModelId,
  audio: DecodedAudio,
  onPhase: (phase: LocalWhisperPhase, detail?: string) => void,
): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      worker?.terminate();
      worker = null;
    };

    try {
      worker = new Worker(getWhisperWorkerUrl(), { type: 'module' });
    } catch (err) {
      reject(err instanceof Error ? err : new Error('worker creation failed'));
      return;
    }

    const timeout = window.setTimeout(() => {
      worker?.terminate();
      if (!settled) {
        settled = true;
        reject(new Error('Transcription timed out'));
      }
    }, 20 * 60 * 1000);

    worker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as Record<string, unknown>;
      try {
        if (data.type === 'progress') {
          onPhase('downloading', typeof data.file === 'string' ? data.file : undefined);
          return;
        }
        if (data.type === 'ready') {
          worker?.postMessage(
            {
              type: 'transcribe',
              model,
              language: undefined,
              audio: audio.data,
              sampleRate: audio.sampleRate,
            },
            { transfer: [audio.data.buffer as ArrayBuffer] },
          );
          onPhase('transcribing');
          return;
        }
        if (data.type === 'result') {
          const output = data.data as WorkerResult;
          window.clearTimeout(timeout);
          cleanup();
          resolve({
            text: output.text || '',
            language: output.language || '',
            segments: Array.isArray(output.segments) ? output.segments : [],
          });
          return;
        }
        if (data.type === 'error') {
          window.clearTimeout(timeout);
          cleanup();
          reject(new Error(String(data.message ?? 'Unknown worker error')));
        }
      } catch (err) {
        window.clearTimeout(timeout);
        if (!settled) {
          settled = true;
          worker?.terminate();
          worker = null;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

    worker.addEventListener('error', (event: ErrorEvent) => {
      window.clearTimeout(timeout);
      if (!settled) {
        settled = true;
        worker?.terminate();
        worker = null;
        reject(new Error(event.message || 'Worker load failed'));
      }
    });

    worker.postMessage({ type: 'init', model, language: undefined });
  });
}

/**
 * Transcribe an AUDIO evidence item fully on-device.
 *
 * @throws UnsupportedAudioFormatError when the payload is not decodable audio.
 */
export async function runLocalWhisper(
  evidenceId: string,
  investigationId: string | undefined,
  checksum: string,
  model: LocalWhisperModelId,
  onPhase?: (phase: LocalWhisperPhase, detail?: string) => void,
): Promise<LocalTranscriptionResult> {
  const capability = detectLocalWhisperCapability();
  if (!capability.supported) {
    throw new Error(`Local Whisper is not supported by this browser (${capability.reason})`);
  }
  if (!/^[0-9a-fA-F]{64}$/.test(checksum)) {
    throw new Error('A valid SHA-256 checksum is required for local transcription');
  }

  const blob = await getEvidenceContent(evidenceId, investigationId);

  const decoded = await decodeAudio(blob);
  const durationSeconds = decoded.durationSeconds;

  onPhase?.('transcribing');
  const result = await runWorker(model, decoded, (phase, detail) =>
    onPhase?.(phase, detail),
  );

  const warnings: string[] =
    Number.isFinite(durationSeconds) && durationSeconds > 30 * 60
      ? ['The audio is long; on-device transcription may take a while.']
      : [];

  return {
    model_id: model,
    transcript: result.text,
    language: result.language,
    duration_seconds: durationSeconds,
    segments: result.segments as LocalTranscriptionSegment[],
    warnings,
  };
}

export { isSupportedAudio };
export type { DecodedAudio };