'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { loadLegalCorpus } from '@/lib/legal/legal-corpus';
import { searchLegalQA } from '@/lib/legal/legal-search';
import { useAppStore } from '@/state/app.store';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { Button } from '@trinetra-pulse/ui';

const MIN_QUERY_LENGTH = 2;

export default function LegalResearchPage() {
  const label = useAppStore((s) => s.setContextLabel);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReturnType<typeof searchLegalQA>>([]);
  const [searchedQ, setSearchedQ] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    label?.('Legal research');
    return () => label?.(null);
  }, [label]);

  const runSearch = async (q: string) => {
    const needle = q.trim();
    if (needle.length === 0) { setResults([]); setSearchedQ(null); return; }
    if (needle.length < MIN_QUERY_LENGTH) { setResults([]); setSearchedQ(null); setError('Type at least two characters to search grounded case-law QA.'); return; }
    setLoading(true); setError(null);
    try {
      const entries = await loadLegalCorpus();
      const hits = searchLegalQA(entries, needle);
      setResults(hits);
      setSearchedQ(needle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Legal corpus could not be loaded.');
      setSearchedQ(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="legal-research-workspace" className="space-y-6">
      <WorkspaceHeader
        title="Legal Research"
        description="Investigation-scoped review of grounded Indic case-law QA — informational only, never a legal conclusion"
      />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-xl border border-border-subtle bg-surface p-5">
        <form onSubmit={(e) => { e.preventDefault(); runSearch(query); }} className="flex flex-wrap items-center gap-3">
          <label htmlFor="legal-query" className="text-caption text-foreground-muted">Grounded case-law search</label>
          <input
            id="legal-query"
            data-testid="legal-query-input"
            className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 font-mono text-caption text-foreground placeholder:text-foreground-muted"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. section 138 negotiable instruments"
          />
          <Button type="submit" disabled={loading || query.trim().length < MIN_QUERY_LENGTH} data-testid="legal-search-button">
            {loading ? 'Searching…' : 'Search'}
          </Button>
          <p className="text-caption text-foreground-muted">
            Deterministic retrieval over the bundled 10,000-entry Indic corpus — informational, not legal advice.
          </p>
        </form>

        <div className="mt-5">
          {error && (
            <div role="alert" data-testid="legal-error" className="rounded-lg border border-danger/30 p-4">
              <p className="text-caption text-danger">{error}</p>
            </div>
          )}
          {searchedQ !== null && !error && results.length === 0 && (
            <div data-testid="legal-no-match" className="rounded-lg border border-warning/30 p-4">
              <p className="text-caption text-foreground">
                No grounded case in the corpus matched “{searchedQ}”.
              </p>
              <p className="mt-1 text-caption text-foreground-muted">
                Try a broader term, statute reference, or judgement date phrase.
              </p>
            </div>
          )}
          {searchedQ !== null && results.length > 0 && (
            <ul data-testid="legal-results" className="mt-2 space-y-3">
              {results.map((r) => (
                <li key={`${r.caseName}-${r.question}`} className="rounded-lg border border-border-subtle bg-surface-raised p-4">
                  <p className="text-label text-foreground">
                    <span className="font-mono text-caption text-foreground-muted">Case:</span> {r.caseName}
                    <span className="ml-2 font-mono text-caption text-foreground-muted">{r.judgementDate}</span>
                  </p>
                  <p className="mt-2 text-subheading text-foreground">{r.answer}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}