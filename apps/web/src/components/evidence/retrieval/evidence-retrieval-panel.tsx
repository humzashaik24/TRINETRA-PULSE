'use client';

import React, { useState } from 'react';
import { Search, CircleGauge, FileText, Link2, Sparkles, AlertTriangle } from 'lucide-react';
import { Badge, Button } from '@trinetra-pulse/ui';
import { useEvidenceStore } from '@/state/evidence.store';
import { retrieveEvidenceContext } from '@/ai/evidence-retrieval';
import { retrieveInvestigationContext } from '@/ai/retrieval';
import { isMockData } from '@/lib/api/config';
import { OPERATION_MERIDIAN_ID } from '@/lib/api/evidence';
import { DEMO_INVESTIGATION_ID } from '@/navigation/journey';
import { EVIDENCE_TYPE_LABELS, formatPercent } from '@/lib/format';
import { EVIDENCE_TYPE_VARIANT } from '@/components/evidence/evidence-domain';
import type { AIContextSource, AIContextScope, AISourceReference } from '@trinetra-pulse/types';

// ============================================================
// EVIDENCE RETRIEVAL (Grounded AI) — Phase 12 / 17.6
// ============================================================
// Query-driven grounded retrieval. Sources are evidence items
// that carry provenance + clickable references. A truncated run
// is surfaced explicitly so callers never mistake it for a
// complete result set.
// Phase 17.6 — mock mode uses the deterministic in-memory retrieval;
// API mode uses the persisted investigation-scoped retrieval
// (GET /api/v2 ... from ai/retrieval.ts). No silent fallback.
// ============================================================

interface RetrievalResult {
  sources: AIContextSource[];
  linkedEntityIds: string[];
  linkedFindingIds: string[];
  truncated: boolean;
  note?: string;
}

const SAMPLE_QUERIES = [
  'Who is linked to the primary device subscriber?',
  'What evidence supports the flagged transfer?',
  'Summarize the movement to Chennai in February',
];

/** Map persisted evidence rows from the bounded retrieval bundle into the
 *  panel's AIContextSource shape, keeping the evidence-type chip payload. */
function sourcesFromApiBundle(
  bundle: Awaited<ReturnType<typeof retrieveInvestigationContext>> | null,
): AIContextSource[] {
  if (!bundle) return [];
  return (bundle.bundle.evidence ?? []).map((e): AIContextSource => ({
    type: 'Evidence',
    sourceId: e.id,
    label: e.title,
    summary: e.summary,
    references: [
      {
        id: `Evidence:${e.id}`,
        sourceType: 'Evidence',
        sourceId: e.id,
        label: e.title,
        relevance: 0.6,
        payload: { evidenceType: e.evidenceType },
      } satisfies AISourceReference,
    ],
  }));
}

export function EvidenceRetrievalPanel({
  onSelectEvidence,
}: {
  onSelectEvidence?: (id: string) => void;
}) {
  const investigationId = useEvidenceStore((s) => s.investigationId) ?? (isMockData() ? DEMO_INVESTIGATION_ID : OPERATION_MERIDIAN_ID);
  const selectItem = useEvidenceStore((s) => s.selectItem);
  const handleSelect = onSelectEvidence ?? selectItem;

  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RetrievalResult | null>(null);

  const run = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRunning(true);
    setResult(null);
    const scope: AIContextScope = {};
    let next: RetrievalResult;
    if (isMockData()) {
      const r = await retrieveEvidenceContext({ query: trimmed, investigationId, scope });
      next = {
        sources: r.evidenceSources,
        linkedEntityIds: r.linkedEntityIds,
        linkedFindingIds: r.linkedFindingIds,
        truncated: r.truncated,
        note: r.note,
      };
    } else {
      const r = await retrieveInvestigationContext({ investigationId });
      const sources = sourcesFromApiBundle(r);
      next = {
        sources,
        linkedEntityIds: (r?.sources ?? [])
          .filter((s) => s.sourceType === 'Entity')
          .map((s) => s.sourceId),
        linkedFindingIds: (r?.sources ?? [])
          .filter((s) => s.sourceType === 'Finding')
          .map((s) => s.sourceId),
        truncated: r?.truncated ?? false,
        note: r ? undefined : 'Retrieval encountered an error. Evidence context may be incomplete.',
      };
    }
    setResult(next);
    setRunning(false);
  };

  return (
    <div className="space-y-4" data-testid="evidence-retrieval-panel">
      <div className="flex items-center gap-2">
        <CircleGauge className="h-4 w-4 text-evidence" />
        <h3 className="text-sm font-semibold text-foreground">Grounded evidence retrieval</h3>
      </div>
      <p className="text-xs text-foreground-muted">
        Ask a question and retrieve the evidence context that would back an AI response.
        Results are evidence items with provenance and clickable references — never fabricated.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void run(query);
            }}
            placeholder="e.g. What evidence supports the flagged transfer?"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-sm text-foreground placeholder:text-foreground-muted tp-transition focus:border-border-focus focus:outline-none"
            data-testid="retrieval-query-input"
            aria-label="Retrieval query"
          />
        </div>
        <Button size="sm" onClick={() => void run(query)} disabled={running || query.trim() === ''} data-testid="retrieval-run">
          {running ? 'Retrieving…' : 'Retrieve'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuery(q);
              void run(q);
            }}
            className="rounded-full border border-border bg-surface-elevated/40 px-2 py-1 text-[10px] text-foreground-secondary hover:border-evidence/50 hover:text-evidence tp-transition"
          >
            {q}
          </button>
        ))}
      </div>

      {running && (
        <p className="text-xs text-foreground-muted" data-testid="retrieval-loading">Retrieving evidence context…</p>
      )}

      {!running && result && (
        <div className="space-y-3" data-testid="retrieval-result">
          {result.truncated && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-subtle/40 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <p className="text-[11px] leading-relaxed text-warning">{result.note ?? 'Results were truncated.'}</p>
            </div>
          )}

          {result.sources.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-xs text-foreground-muted">
              No evidence retrieved for this query.
            </p>
          ) : (
            <div className="space-y-2">
              {result.sources.map((src) => {
                const firstRef = src.references[0];
                const evidenceType = firstRef?.payload?.evidenceType as keyof typeof EVIDENCE_TYPE_LABELS | undefined;
                return (
                  <div key={src.sourceId} className="rounded-lg border border-border bg-surface p-3" data-testid={`retrieval-source-${src.sourceId}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-evidence" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{src.label}</p>
                          <p className="font-mono text-[10px] text-foreground-muted">{src.sourceId}</p>
                        </div>
                      </div>
                      {evidenceType && (
                        <Badge size="sm" variant={EVIDENCE_TYPE_VARIANT[evidenceType]}>
                          {EVIDENCE_TYPE_LABELS[evidenceType]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">{src.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-foreground-muted">
                      {firstRef?.relevance !== undefined && (
                        <span>
                          relevance {formatPercent(firstRef.relevance)}
                        </span>
                      )}
                      <button
                        onClick={() => handleSelect(src.sourceId)}
                        className="inline-flex items-center gap-1 text-evidence hover:underline"
                      >
                        <Link2 className="h-3 w-3" />
                        Open evidence
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(result.linkedEntityIds.length > 0 || result.linkedFindingIds.length > 0) && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <Sparkles className="h-3.5 w-3.5 text-evidence" />
              {result.linkedEntityIds.length > 0 && (
                <span className="flex flex-wrap items-center gap-1 text-[10px] text-foreground-muted">
                  Entities:
                  {result.linkedEntityIds.slice(0, 6).map((id) => (
                    <code key={id} className="rounded bg-surface-elevated px-1 py-0.5 font-mono">{id}</code>
                  ))}
                </span>
              )}
              {result.linkedFindingIds.length > 0 && (
                <span className="flex flex-wrap items-center gap-1 text-[10px] text-foreground-muted">
                  Findings:
                  {result.linkedFindingIds.slice(0, 3).map((id) => (
                    <code key={id} className="rounded bg-surface-elevated px-1 py-0.5 font-mono">{id}</code>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
