import { readFileSync } from 'fs';
import { join } from 'path';
import { LEGAL_CORPUS_PATH } from '@/lib/legal/legal-corpus';
import { searchLegalQA, tokens } from '@/lib/legal/legal-search';
import type { LegalQaEntry } from '@/lib/legal/types';

// ============================================================
// TIER 1.3 — BUNDLED CORPUS INTEGRITY
// ============================================================
// The corpus is bundled as static data served from `/data`. This test
// reads the same file the browser fetches and asserts it is a valid,
// well-formed Q&A set, deterministic under retrieval.
// ============================================================

const CORPUS_PATH = join(process.cwd(), 'public', 'data', 'indic-legal-qa.json');

function loadFromDisk(): LegalQaEntry[] {
  const raw = readFileSync(CORPUS_PATH, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Corpus root is not an array');
  return parsed as LegalQaEntry[];
}

describe('bundled legal corpus', () => {
  let corpus: LegalQaEntry[];

  beforeAll(() => {
    corpus = loadFromDisk();
  });

  it('serves the expected static path and contains a substantial corpus', () => {
    expect(LEGAL_CORPUS_PATH).toBe('/data/indic-legal-qa.json');
    expect(corpus.length).toBeGreaterThan(1000);
  });

  it('is fully well-formed', () => {
    for (const entry of corpus) {
      expect(typeof entry.case_name).toBe('string');
      expect(entry.case_name.length).toBeGreaterThan(0);
      expect(typeof entry.judgement_date).toBe('string');
      expect(typeof entry.question).toBe('string');
      expect(entry.question.length).toBeGreaterThan(0);
      expect(typeof entry.answer).toBe('string');
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it('returns deterministic, quoted hits for a real query', () => {
    const query = 'promotion denial armed forces tribunal';
    const first = searchLegalQA(corpus, query);
    const second = searchLegalQA(corpus, query);
    expect(first.length).toBeGreaterThan(0);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    for (const hit of first) {
      expect(hit.answer.length).toBeGreaterThan(0);
      expect(hit.caseName.length).toBeGreaterThan(0);
      expect(hit.matchedTerms.length).toBeGreaterThan(0);
    }
  });

  it('surfaces honest no-match results for nonsense queries', () => {
    const gibberish = tokens('zzq') ? 'zzqwxv quontropiix blargh' : 'xqzt vpq';
    expect(searchLegalQA(corpus, gibberish).length).toBe(0);
  });
});