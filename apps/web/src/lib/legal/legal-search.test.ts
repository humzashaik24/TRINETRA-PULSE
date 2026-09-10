import { searchLegalQA, tokens } from '@/lib/legal/legal-search';
import type { LegalQaEntry } from '@/lib/legal/types';

// ============================================================
// TIER 1.3 — LEGAL RETRIEVAL (pure, deterministic)
// ============================================================

const CORPUS: LegalQaEntry[] = [
  {
    case_name: 'Union of India vs. Maj. Gen. Manomoy Ganguly',
    judgement_date: '1st August 2018',
    question: 'What decision did the Armed Forces Tribunal (AFT) make regarding promotion?',
    answer:
      'The AFT directed the appellants to post Maj. Gen. Manomoy Ganguly as DGMS (Army).',
  },
  {
    case_name: 'V. Senthil Balaji vs. The State',
    judgement_date: '7th August 2023',
    question: 'What were the conditions imposed during remand?',
    answer: 'The High Court imposed two conditions during the investigation and remand period.',
  },
  {
    case_name: 'Reliance Industries vs. State of Maharashtra',
    judgement_date: '12th May 2012',
    question: 'Does the tribunal have concurrent jurisdiction?',
    answer: 'The Supreme Court examined the scope of the tribunal jurisdiction under the statute.',
  },
];

describe('tokens', () => {
  it('lowercases, splits words and drops stopwords', () => {
    expect(tokens('What did the tribunal decide?')).toEqual(['tribunal', 'decide']);
  });

  it('returns nothing for a stopword-only / empty input', () => {
    expect(tokens('')).toEqual([]);
    expect(tokens('the and of')).toEqual([]);
  });
});

describe('searchLegalQA', () => {
  it('ranks verbatim corpus matches deterministically', () => {
    const first = searchLegalQA(CORPUS, 'tribunal promotion');
    const second = searchLegalQA(CORPUS, 'tribunal promotion');
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0].caseName).toContain('Ganguly');
    expect(first[0].matchedTerms).toContain('tribunal');
    expect(first[0].answer).toBe(
      'The AFT directed the appellants to post Maj. Gen. Manomoy Ganguly as DGMS (Army).'
    );
  });

  it('returns an honest empty list when nothing matches', () => {
    expect(searchLegalQA(CORPUS, 'unrelated nonexistent topic')).toEqual([]);
  });

  it('respects an empty query and the result limit', () => {
    expect(searchLegalQA(CORPUS, '')).toEqual([]);
    expect(searchLegalQA(CORPUS, '  ')).toEqual([]);
    const results = searchLegalQA(CORPUS, 'tribunal', 1);
    expect(results).toHaveLength(1);
  });

  it('matches against the case name as well as question/answer', () => {
    const results = searchLegalQA(CORPUS, 'Senthil');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].caseName).toContain('Senthil');
  });

  it('is stable under repeated evaluation', () => {
    const a = searchLegalQA(CORPUS, 'remand investigation');
    const b = searchLegalQA(CORPUS, 'remand investigation');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});