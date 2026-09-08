/**
 * PHASE 25 — WORKER URL RESOLUTION (ISOLATED).
 *
 * The ``import.meta.url``-based construction MUST stay in its own module so
 * the rest of the orchestrator can be compiled to CommonJS by ts-jest. At
 * build time, webpack statically analyzes ``new URL('./whisper.worker.ts',
 * import.meta.url)`` and emits the worker as its own chunk; in test
 * environments this module is replaced with a plain URL string mock.
 */

export function getWhisperWorkerUrl(): string {
  return new URL('./whisper.worker.ts', import.meta.url).toString();
}