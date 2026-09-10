// ============================================================
// KNOWLEDGE CANVAS — LEGAL RESEARCH (Tier 1.3)
// ============================================================

/** One Q&A entry of the bundled Indic case-law corpus. */
export interface LegalQaEntry {
  case_name: string;
  judgement_date: string;
  question: string;
  answer: string;
}

/** A deterministically-ranked retrieval hit with a verbatim quote. */
export interface LegalSearchResult {
  caseName: string;
  judgementDate: string;
  question: string;
  /** Verbatim answer text quoted from the corpus. */
  answer: string;
  /** Query terms that matched (in query order). */
  matchedTerms: string[];
  score: number;
}

export type LegalCorpusLoader = () => Promise<LegalQaEntry[]>;