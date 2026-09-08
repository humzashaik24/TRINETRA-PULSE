/**
 * @jest-environment jsdom
 *
 * PHASE 25 — LOCAL WHISPER ORCHESTRATOR TESTS.
 *
 * Exercises the REAL ``runLocalWhisper`` orchestrator with the download API and
 * capability detector mocked and a controlled fake Web Worker + fake Web Audio
 * context standing in for the Transformers.js runtime (which NEVER loads in
 * Jest). The worker-URL module is replaced by a plain string (the
 * ``import.meta.url`` construction is webpack-only).
 */

import {
  runLocalWhisper,
  UnsupportedAudioFormatError,
} from './local-whisper';

jest.mock('@/lib/api/evidence', () => ({
  getEvidenceContent: jest.fn(),
}));

import { getEvidenceContent } from '@/lib/api/evidence';

// ``import.meta.url`` construction is a webpack-only concern (see worker-url.ts);
// jest replaces it with a plain URL so the REAL orchestrator logic stays loaded.
jest.mock('./worker-url', () => ({
  getWhisperWorkerUrl: () => 'https://app.local/whisper.worker.js',
}));

jest.mock('@/lib/whisper/local-whisper', () => ({
  ...jest.requireActual<typeof import('./local-whisper')>('./local-whisper'),
  detectLocalWhisperCapability: jest.fn(),
}));

import { detectLocalWhisperCapability } from './local-whisper';

const EVIDENCE_ID = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';
const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const CHECKSUM = 'a'.repeat(64);
const MODEL = 'Xenova/whisper-tiny' as const;
const SAMPLE_RATE = 16000;
const FRAME_COUNT = 1600;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

class FakeAudioBuffer {
  duration: number;
  constructor(durationSeconds: number) {
    this.duration = durationSeconds;
  }
  numberOfChannels = 2;
  length = FRAME_COUNT;
  sampleRate = SAMPLE_RATE;
  getChannelData(_channel: number): Float32Array {
    return new Float32Array(FRAME_COUNT).fill(0.05);
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeAudioContext {
  bufferSeconds = 1;
  decodeAudioData(_data: ArrayBuffer): Promise<FakeAudioBuffer> {
    const duration = this.bufferSeconds;
    return Promise.resolve(new FakeAudioBuffer(duration));
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

let fakeAudioContext: FakeAudioContext;

// jsdom ships a Blob without `arrayBuffer()`; the orchestrator only needs
// `.type` and `.arrayBuffer()`.
function fakeBlob(type: string): Blob {
  return {
    type,
    size: 8,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as unknown as Blob;
}

class FakeWorker {
  private handler: ((event: MessageEvent) => void) | null = null;
  constructor(_url: URL | string, _options?: { type?: string }) {
    void _url;
    void _options;
  }
  addEventListener(type: string, cb: (event: MessageEvent) => void) {
    if (type === 'message') this.handler = cb;
  }
  postMessage(message: unknown) {
    const msg = message as { type: string };
    if (msg.type === 'init') {
      queueMicrotask(() => this.handler?.({ data: { type: 'ready' } } as MessageEvent));
    }
    if (msg.type === 'transcribe') {
      queueMicrotask(() =>
        this.handler?.({
          data: {
            type: 'result',
            data: {
              text: 'hello world',
              language: 'en',
              segments: [
                { start_seconds: 0, end_seconds: 4, text: 'hello' },
              ],
            },
          },
        } as MessageEvent),
      );
    }
  }
  terminate() {
    this.handler = null;
  }
}

type Mocked<T extends (...args: any[]) => unknown> = jest.MockedFunction<T>;

describe('local-whisper orchestrator (Phase 25)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeAudioContext = new FakeAudioContext();
    (detectLocalWhisperCapability as Mocked<typeof detectLocalWhisperCapability>).mockReturnValue({
      supported: true,
    });
    (getEvidenceContent as Mocked<typeof getEvidenceContent>).mockResolvedValue(
      fakeBlob('audio/wav'),
    );
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: class extends FakeAudioContext {},
      writable: true,
    });
    (globalThis as Record<string, unknown>).Worker = FakeWorker;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).Worker;
    Reflect.deleteProperty(window, 'AudioContext');
  });

  it('fetches the authorized evidence payload and hands the decoded mono audio to the worker', async () => {
    const result = await runLocalWhisper(
      EVIDENCE_ID,
      INVESTIGATION_ID,
      CHECKSUM,
      MODEL,
    );

    expect(getEvidenceContent).toHaveBeenCalledWith(EVIDENCE_ID, INVESTIGATION_ID);
    expect(result.transcript).toBe('hello world');
    expect(result.language).toBe('en');
    expect(result.segments).toEqual([
      { start_seconds: 0, end_seconds: 4, text: 'hello' },
    ]);
    expect(result.duration_seconds).toBe(1);
    expect(result.warnings).toEqual([]);
    await flush();
  });

  it('emits a long-audio warning for payloads longer than 30 minutes', async () => {
    fakeAudioContext = new FakeAudioContext();
    fakeAudioContext.bufferSeconds = 30 * 60 + 1;
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: class extends FakeAudioContext {
        decodeAudioData(data: ArrayBuffer): Promise<FakeAudioBuffer> {
          return Promise.resolve(new FakeAudioBuffer(fakeAudioContext.bufferSeconds));
        }
      },
      writable: true,
    });

    const result = await runLocalWhisper(EVIDENCE_ID, INVESTIGATION_ID, CHECKSUM, MODEL);

    expect(result.duration_seconds).toBe(1801);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/long/)]) as unknown as string[],
    );
    await flush();
  });

  it('rejects undecodable payloads with UnsupportedAudioFormatError', async () => {
    (getEvidenceContent as Mocked<typeof getEvidenceContent>).mockResolvedValue(
      fakeBlob('application/octet-stream'),
    );
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: class {
        decodeAudioData(): Promise<never> {
          return Promise.reject(new Error('decode failed'));
        }
      },
      writable: true,
    });

    await expect(
      runLocalWhisper(EVIDENCE_ID, INVESTIGATION_ID, CHECKSUM, MODEL),
    ).rejects.toBeInstanceOf(UnsupportedAudioFormatError);
  });
});