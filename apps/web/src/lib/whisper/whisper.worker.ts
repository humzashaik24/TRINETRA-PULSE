/**
 * PHASE 25 — LOCAL WHISPER TRANSCRIPTION WORKER.
 *
 * Dedicated Web Worker that owns the on-device Whisper pipeline so the main
 * thread (and the rest of the UI) never blocks during model loading or
 * inference. Model weights are downloaded on first use and cached by the
 * browser through the ``@huggingface/transformers`` supported cache; the audio
 * to transcribe arrives as a transferable ``Float32Array`` (mono, raw samples)
 * alongside its sample rate and never leaves the worker for inference.
 *
 * Protocol
 * --------
 * in  { type: 'init', model, language? }            -> lazily load pipeline
 * out { type: 'ready', model }
 * out { type: 'progress', file?, loaded?, total? }  (real library events only)
 * in  { type: 'transcribe', audio: Float32Array, sampleRate, model, language? }
 * out { type: 'result', data: WhisperOutput }
 * out { type: 'error', message }
 *
 * Progress is relayed verbatim from the library (file/byte callbacks); the UI
 * never invents percentages for download progress.
 */

import { env, pipeline } from '@huggingface/transformers';
import type { LocalTranscriptionSegment } from '@trinetra-pulse/types';

type PipelineInstance = (audio: unknown, options?: unknown) => Promise<unknown>;

// Models always come from the remote Hub (cached by the browser) — never from
// a local path that could be a bundled file we do not control.
env.allowLocalModels = false;

const ASR_TASK = 'automatic-speech-recognition';

interface WhisperChunk {
  timestamp?: [number, number] | null;
  text?: string;
}

interface WhisperOutput {
  text: string;
  chunks?: WhisperChunk[];
  language?: string;
}

let transcriber: PipelineInstance | null = null;

async function getTranscriber(
  model: string,
  progressCallback: (data: Record<string, unknown>) => void,
): Promise<PipelineInstance> {
  if (!transcriber) {
    transcriber = (await pipeline(ASR_TASK, model, {
      progress_callback: progressCallback,
    })) as unknown as PipelineInstance;
  }
  return transcriber;
}

function toSegments(output: WhisperOutput): LocalTranscriptionSegment[] {
  const chunks = Array.isArray(output.chunks) ? output.chunks : [];
  return chunks
    .filter((c): c is WhisperChunk & { text: string } => typeof c.text === 'string')
    .map((c) => {
      const [start, end] = Array.isArray(c.timestamp) ? c.timestamp : [0, 0];
      return {
        start_seconds: Math.max(0, Number.isFinite(start) ? start : 0),
        end_seconds: Math.max(0, Number.isFinite(end) ? end : 0),
        text: c.text,
      };
    });
}

self.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data as Record<string, unknown>;

  try {
    if (data.type === 'init') {
      await getTranscriber(String(data.model), (p) =>
        self.postMessage({
          type: 'progress',
          status: p.status,
          file: p.file ?? undefined,
          loaded: p.loaded ?? undefined,
          total: p.total ?? undefined,
        }),
      );
      self.postMessage({ type: 'ready', model: String(data.model) });
      return;
    }

    if (data.type === 'transcribe') {
      const audio = data.audio as Float32Array;
      const sampleRate = typeof data.sampleRate === 'number' ? data.sampleRate : 16000;
      const language =
        typeof data.language === 'string' && data.language.length > 0
          ? data.language
          : undefined;

      const run = await getTranscriber(String(data.model), (p) =>
        self.postMessage({
          type: 'progress',
          status: p.status,
          file: p.file ?? undefined,
          loaded: p.loaded ?? undefined,
          total: p.total ?? undefined,
        }),
      );

      const options: Record<string, unknown> = {};
      if (language) options.language = language;

      const output = (await run(
        { data: audio, sample_rate: sampleRate },
        options,
      )) as WhisperOutput;

      self.postMessage({
        type: 'result',
        data: {
          text: output.text || '',
          language: output.language ?? language ?? '',
          segments: toSegments(output),
        },
      });
      return;
    }

    self.postMessage({ type: 'error', message: 'unknown worker message type' });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});