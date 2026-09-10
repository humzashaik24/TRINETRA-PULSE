'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Quote, Scale, Search, SearchX } from 'lucide-react';
import {
  Badge,
  Button,
  ChartCard,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@trinetra-pulse/ui';
import { loadLegalCorpus } from '@/lib/legal/legal-corpus';
import { searchLegalQA } from '@/lib/legal/legal-search';
import type {
  LegalCorpusLoader,
  LegalQaEntry,
  LegalSearchResult,
} from '@/lib/legal/types';

// ============================================================
// KNOWLEDGE CANVAS — LEGAL RESEARCH VIEW (Tier 1.3)
// ============================================================
// Offline legal research over the bundled Indic case-law corpus.
// Every hit is a verbatim quote with its case citation — this surface
// never generates answers and shows an honest empty state on no match.
// ============================================================

interface LegalResearchViewProps {
  investigationId: string;
  /** Injectable for deterministic tests. */
  corpusLoader?: LegalCorpusLoader;
}

export function LegalResearchView({
  investigationId,
  corpusLoader = loadLegalCorpus,
}: LegalResearchViewProps) {
  void investigationId;
  const [corpus, setCorpus] = useState<LegalQaEntry[] | null>(null);
  const [corpusState, setCorpusState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LegalSearchResult[] | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCorpusState('loading');
    void corpusLoader()
      .then((entries) => {
        if (!cancelled) {
          setCorpus(entries);
          setCorpusState('ready');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCorpusError(
            err instanceof Error ? err.message : 'Could not load the legal corpus.'
          );
          setCorpusState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [corpusLoader]);

  const runSearch = () => {
    if (!corpus) return;
    const trimmed = query.trim();
    setSearched(true);
    setResults(trimmed ? searchLegalQA(corpus, trimmed) : []);
  };

  return (
    <div className="space-y-6">
      <ChartCard
        title="Legal research assistant"
        subtitle="Offline retrieval over the bundled Indic case-law corpus — verbatim quotes only"
        action={
          corpusState === 'ready' && corpus ? (
            <Badge variant="info" size="sm">
              {corpus.length.toLocaleString()} entries loaded
            </Badge>
          ) : (
            <Badge variant="outline" size="sm">
              corpus offline
            </Badge>
          )
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
              placeholder="e.g. promotion denial, armed forces tribunal, DGMS"
              aria-label="Legal research query"
              className="w-full rounded-md border border-border bg-surface-elevated pl-9 pr-3 py-2 text-body-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button size="sm" onClick={runSearch} disabled={corpusState !== 'ready'}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Search
          </Button>
        </div>
      </ChartCard>

      {corpusState === 'loading' && (
        <div className="rounded-lg border border-border bg-surface p-8 flex items-center justify-center min-h-[240px]">
          <LoadingState message="Loading legal corpus…" />
        </div>
      )}

      {corpusState === 'error' && (
        <div className="rounded-lg border border-border bg-surface p-8 flex items-center justify-center min-h-[240px]">
          <ErrorState
            title="Legal corpus unavailable"
            message={corpusError ?? 'Could not reach the bundled corpus.'}
          />
        </div>
      )}

      {corpusState === 'ready' && !searched && (
        <ChartCard title="How retrieval works" subtitle="Grounded, not generated">
          <div className="flex items-start gap-2">
            <Scale className="h-4 w-4 text-foreground-muted shrink-0 mt-0.5" />
            <p className="text-body-sm text-foreground-secondary">
              Queries match against the question, answer and case name of each
              corpus entry using a deterministic keyword score. Results are quoted
              verbatim with their citation — nothing here is AI-generated, and a
              query with no match returns an honest empty result. Always have legal
              material reviewed by a professional.
            </p>
          </div>
        </ChartCard>
      )}

      {corpusState === 'ready' && searched && (
        <ChartCard
          title={results && results.length > 0 ? 'Citations' : 'No matches'}
          subtitle={
            results && results.length > 0
              ? `${results.length} verbatim citation${results.length === 1 ? '' : 's'}`
              : 'Nothing matched your query'
        }
        >
          {!results || results.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={<SearchX className="h-8 w-8" />}
                title="No matching citations"
                description="Retry with broader legal terms (for example “promotion”, “tribunal”, “remand”). The corpus only ever returns genuine verbatim matches."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r, i) => (
                <li key={`${r.caseName}-${i}`} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-foreground">{r.question}</p>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {r.matchedTerms.slice(0, 4).map((t) => (
                        <Badge key={t} variant="default" size="sm">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-caption text-foreground-muted mt-1 font-mono uppercase tracking-wide">
                    {r.caseName} · {r.judgementDate}
                  </p>
                  <blockquote className="mt-2 rounded-md border-l-2 border-brand bg-surface-elevated px-3 py-2 text-body-sm text-foreground-secondary">
                    <Quote className="h-3.5 w-3.5 text-foreground-muted inline mr-1" />
                    {r.answer}
                  </blockquote>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      )}
    </div>
  );
}