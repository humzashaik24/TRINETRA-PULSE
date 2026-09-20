'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  loadInvestigationReport,
  type InvestigationReport,
} from '@/lib/report/report-data';
import {
  reportToMarkdown,
  reportToJson,
  reportExportBlob,
} from '@/lib/report/report-export';
import { useAppStore } from '@/state/app.store';
import { Button } from '@trinetra-pulse/ui';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { DEMO_NETWORK_ID } from '@/navigation/journey';

const DEMO_INVESTIGATION_ID = 'inv-demo-nexus';

export default function ReportsPage() {
  const label = useAppStore((s) => s.setContextLabel);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadInvestigationReport({
          investigationId: DEMO_INVESTIGATION_ID,
          networkId: DEMO_NETWORK_ID,
        });
        if (cancelled) return;
        setReport(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Report load failed.');
      }
    })();
    return () => { cancelled = true; label?.(null); };
  }, [label]);

  const runExport = async () => {
    if (!report) return;
    const { blob, mime, filename } = reportExportBlob(report);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 4000);
  };

  const integrityTiles = report ? [
    { label: 'Verified', value: report.integrity.verified },
    { label: 'Requires review', value: report.integrity.requiresReview },
    { label: 'Unverified', value: report.integrity.unverified },
    { label: 'Other', value: report.integrity.other },
  ] : [];

  return (
    <div data-testid="reports-workspace" className="space-y-6">
      <WorkspaceHeader
        title="Reports"
        description="Investigation-scoped report — grounded in verified evidence, no fabricated content"
      />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-xl border border-border-subtle bg-surface p-5">
        {error && (
          <div role="alert" className="rounded-lg border border-danger/30 p-4">
            <p className="text-caption text-danger">{error}</p>
          </div>
        )}
        {!error && !report && (
          <div data-testid="reports-loading" className="flex items-center justify-center gap-3 py-12" aria-busy="true">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-caption text-foreground-muted">Assembling report…</p>
          </div>
        )}
        {!error && report && (
          <div className="space-y-8" data-testid="reports-loaded">
            <div className="border-b border-border-subtle pb-4">
              <h2 className="text-heading text-foreground">{report.investigationTitle}</h2>
              <p className="mt-1 font-mono text-caption text-foreground-muted">
                {report.investigationId.toUpperCase()} · network{' '}
                {report.networkId.toUpperCase()} ·{' '}
                {new Date(report.generatedAt).toLocaleString()} · source{' '}
                {report.dataSource}
              </p>
              <p className="mt-1 font-mono text-overline text-foreground-muted">
                Verified share: {report.verifiedPercent}%
              </p>
            </div>
            <section aria-label="Evidence integrity">
              <h3 className="text-subheading text-foreground">Evidence integrity</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {integrityTiles.map((tile) => (
                  <div key={tile.label} data-testid="reports-integrity-tile" className="rounded-lg border border-border-subtle bg-surface-raised p-3">
                    <dt className="text-caption text-foreground-muted">{tile.label}</dt>
                    <dd className={`mt-1 font-mono text-heading text-foreground ${tile.label === 'Verified' ? 'text-success' : ''}`}>{tile.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section aria-label="Evidence ledger">
              <h3 className="text-subheading text-foreground">Evidence ledger</h3>
              {report.rows.length === 0 ? (
                <p className="mt-3 text-caption text-foreground-muted">
                  No evidence rows were available for this investigation.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle" data-testid="reports-evidence-rows">
                  {report.rows.map((row) => (
                    <li key={`${row.evidenceId}-${row.title}`} className="px-3 py-2">
                      <p className="text-label text-foreground">
                        <span className="font-mono text-foreground-muted">{row.evidenceId}</span> {row.title}
                      </p>
                      <p className="mt-0.5 text-caption text-foreground-muted">
                        {row.evidenceType} · {row.status} · {row.sourceName}
                        {row.recordIdentifier ? ` · ref ${row.recordIdentifier}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="Findings">
              <h3 className="text-subheading text-foreground">Findings</h3>
              {report.findings.length === 0 ? (
                <p className="mt-3 text-caption text-foreground-muted">
                  No findings were surfaced from the verified ledger.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle" data-testid="reports-findings">
                  {report.findings.map((f) => (
                    <li key={f.findingId} className="px-3 py-2">
                      <p className="text-label text-foreground">{f.title}</p>
                      <p className="mt-0.5 font-mono text-caption text-foreground-muted">
                        {f.category} · {Math.round(f.confidence * 100)}% confidence · {f.evidenceCount} ev · {f.source}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {report.networkSummary && (
              <section aria-label="Network summary">
                <h3 className="text-subheading text-foreground">Network summary</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                  <li className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2">
                    <span className="text-caption text-foreground-muted">Nodes</span>
                    <p className="font-mono text-subheading text-foreground">{report.networkSummary.nodes}</p>
                  </li>
                  <li className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2">
                    <span className="text-caption text-foreground-muted">Relationships</span>
                    <p className="font-mono text-subheading text-foreground">{report.networkSummary.relationships}</p>
                  </li>
                  <li className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2">
                    <span className="text-caption text-foreground-muted">Avg degree</span>
                    <p className="font-mono text-subheading text-foreground">{report.networkSummary.averageDegree}</p>
                  </li>
                </ul>
              </section>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={runExport} disabled={exported} data-testid="reports-export-md">
                {exported ? 'Exported' : 'Export Markdown'}
              </Button>
              <p className="text-caption text-foreground-muted">
                Deterministic, grounded export — same report in, same bytes out.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}