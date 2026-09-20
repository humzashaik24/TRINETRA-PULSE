'use client';

import { useEffect, useState } from 'react';
import { Button } from '@trinetra-pulse/ui';
import { loadLegalCorpus } from '@/lib/legal/legal-corpus';
import { searchLegalQA } from '@/lib/legal/legal-search';
import type { LegalQaEntry, LegalSearchResult } from '@/lib/legal/types';

// ============================================================
// KNOWLEDGE CANVAS — LEGAL RESEARCH
// ============================================================
// Deterministic retrieval over the bundled Indic case-law Q&A corpus.
// No generation step, no fabricated answers: results are corpus rows that
// share terms with the query, honestly reporting empty matches.
// ============================================================

export function LegalView() {
  const [entries, setEntries] = useState<LegalQaEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LegalSearchResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadLegalCorpus()
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Corpus unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setResults(entries ? searchLegalQA(entries, query) : []);
  };

  return (
    <div data-testid="canvas-legal-view" className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-heading text-foreground">Legal research</h2>
        <p className="text-caption text-foreground-muted">
          Retrieval across the bundled Indic case-law Q&A corpus ({entries?.length ?? '…'} entries).
          Deterministic local search — nothing here is generated or fabricated.
        </p>
      </div>

      <form onSubmit={run} className="flex gap-2">
        <input
          data-testid="canvas-legal-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. anticipatory bail, evidence admissibility…"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-label text-foreground"
        />
        <Button type="submit" variant="primary" size="sm" data-testid="canvas-legal-search">
          Search
        </Button>
      </form>

      {loadError && <p className="text-caption text-danger">{loadError}</p>}
      {!entries && !loadError && (
        <p className="text-caption text-foreground-muted" aria-busy="true">
          Loading corpus…
        </p>
      )}

      {results.length === 0 && query.length > 0 && (
        <p className="text-caption text-foreground-muted">No matches — check spelling or try broader terms.</p>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <article key={`${r.caseName}-${r.question}`} className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-label text-foreground">{r.caseName}</h3>
              <span className="font-mono text-overline text-foreground-muted">{r.judgementDate}</span>
            </div>
            <p className="mt-1 text-body-sm text-foreground">{r.question}</p>
            <p className="mt-1 text-body-sm text-foreground-muted">{r.answer}</p>
            <p className="mt-2 font-mono text-overline text-foreground-secondary">
              matched: {r.matchedTerms.join(', ')} · score {r.score}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}