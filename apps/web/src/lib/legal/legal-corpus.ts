// ============================================================
// KNOWLEDGE CANVAS — LEGAL CORPUS LOADER (Tier 1.3)
// ============================================================
// Loads the bundled Indic case-law Q&A corpus served from the app's
// static `/data` directory. The result is cached for the session.
// ============================================================

import type { LegalQaEntry } from './types';

export const LEGAL_CORPUS_PATH = '/data/indic-legal-qa.json';

let cache: LegalQaEntry[] | null = null;

/** Fetch + validate the bundled corpus (browser). */
export async function loadLegalCorpus(): Promise<LegalQaEntry[]> {
  if (cache) return cache;
  const res = await fetch(LEGAL_CORPUS_PATH);
  if (!res.ok) {
    throw new Error(`Legal corpus unavailable (HTTP ${res.status}).`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Legal corpus is malformed.');
  }
  cache = data as LegalQaEntry[];
  return cache;
}

/** Test hook to drop the session cache. */
export function resetLegalCorpusCache(): void {
  cache = null;
}