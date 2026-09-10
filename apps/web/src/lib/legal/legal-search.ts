// ============================================================
// KNOWLEDGE CANVAS — LEGAL RETRIEVAL (Tier 1.3)
// ============================================================
// Deterministic, dependency-free keyword retrieval over the bundled
// Indic case-law Q&A corpus. There is no generation step: results are
// corpus rows whose question / answer / case name share terms with the
// query, ranked by a fixed scoring scheme (identical input always
// yields identical output). Nothing is fabricated when there is no
// match — the caller must show the honest "no matches" state.
// ============================================================

import type { LegalQaEntry, LegalSearchResult } from './types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'was', 'were', 'be', 'are', 'of', 'in', 'on',
  'at', 'to', 'for', 'and', 'or', 'not', 'no', 'nor', 'so', 'but',
  'as', 'by', 'with', 'from', 'under', 'over', 'he', 'she', 'it', 'they',
  'we', 'you', 'his', 'her', 'their', 'its', 'this', 'that', 'these',
  'those', 'who', 'what', 'which', 'when', 'where', 'how', 'why', 'whom',
  'did', 'does', 'do', 'has', 'have', 'had', 'being', 'been', 'than',
  'into', 'between', 'through', 'against', 'during', 'after', 'before',
  'up', 'out', 'about', 'again', 'further', 'once', 'here', 'there',
  'then', 'while', 'vs', 'v', 'vs.', 'maj', 'gen', 'mr', 'mrs', 'ms',
  'dr', 'amp', 'ref', 'sub', 'the', 'andor', 'per', 'via',
]);

const WORD_RE = /[a-z0-9]+/g;

/** Lower-cased, stopword-free tokens for a piece of text. */
export function tokens(text: string): string[] {
  const out: string[] = [];
  for (const match of text.toLowerCase().match(WORD_RE) ?? []) {
    if (match.length >= 2 && !STOPWORDS.has(match)) out.push(match);
  }
  return out;
}

function phraseBonus(text: string): number {
  const q = normalize(text);
  if (!q) return 0;
  if (normalizeCasefold(text).includes(q)) return 12;
  return 0;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCasefold(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Score one corpus row against the query tokens (deterministic). */
function scoreEntry(entry: LegalQaEntry, qTokens: string[]): {
  score: number;
  matched: string[];
} {
  const qIndex = normalize(entry.question);
  const aIndex = normalize(entry.answer);
  const cIndex = normalizeCasefold(entry.case_name).toLowerCase();
  const matched: string[] = [];
  let score = 0;
  for (const token of qTokens) {
    let fieldScore = 0;
    if (cIndex.includes(token)) fieldScore = 3;
    else if (qIndex.includes(token)) fieldScore = 2;
    else if (aIndex.includes(token)) fieldScore = 1;
    if (fieldScore > 0) {
      matched.push(token);
      score += fieldScore;
    }
  }
  if (matched.length === 0) return { score: 0, matched };
  score += phraseBonus(entry.question + ' ' + entry.answer);
  return { score, matched };
}

/**
 * Deterministic retrieval over the corpus. Returns rows sharing at least
 * one meaningful term with the query, ranked by score then by case name
 * and question (stable tie-breaking). Empty / short queries return [].
 */
export function searchLegalQA(
  entries: LegalQaEntry[],
  query: string,
  limit = 8
): LegalSearchResult[] {
  const qTokens = tokens(query);
  if (qTokens.length === 0) return [];

  const ranked: { result: LegalSearchResult; sort: [number, string, string] }[] = [];
  for (const entry of entries) {
    const { score, matched } = scoreEntry(entry, qTokens);
    if (score === 0) continue;
    ranked.push({
      result: {
        caseName: entry.case_name,
        judgementDate: entry.judgement_date,
        question: entry.question,
        answer: entry.answer,
        matchedTerms: matched,
        score,
      },
      sort: [-score, entry.case_name, entry.question],
    });
  }

  ranked.sort((a, b) => {
    for (let i = 0; i < a.sort.length; i += 1) {
      if (a.sort[i] < b.sort[i]) return -1;
      if (a.sort[i] > b.sort[i]) return 1;
    }
    return 0;
  });

  return ranked.slice(0, limit).map((r) => r.result);
}