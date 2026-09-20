'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '../canvas-store';
import { loadInvestigationReport, type InvestigationReport } from '@/lib/report/report-data';

// ============================================================
// KNOWLEDGE CANVAS — REPORT
// ============================================================
// Deterministic report of the investigation: evidence integrity ledger,
// network profile and key findings, assembled by the shared report-data
// module (demo mirror or persisted backend, never fabricated hashes).
// ============================================================

export function ReportView() {
  const investigationId = useCanvasStore((s) => s.investigationId);
  const networkId = useCanvasStore((s) => s.networkId);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!investigationId) return;
    const invId: string = investigationId;
    let cancelled = false;
    async function load() {
      setReport(null);
      setError(null);
      try {
        const r = await loadInvestigationReport({
          investigationId: invId,
          networkId: networkId ?? invId,
        });
        if (!cancelled) setReport(r);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Report unavailable');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [investigationId, networkId]);

  if (error) return <p className="text-caption text-danger">{error}</p>;
  if (!report) {
    return (
      <p className="text-caption text-foreground-muted" aria-busy="true">
        Assembling report…
      </p>
    );
  }

  return (
    <div data-testid="canvas-report-view" className="mx-auto max-w-4xl space-y-6">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-heading text-foreground">{report.investigationTitle}</h2>
        <p className="mt-1 font-mono text-caption text-foreground-muted">
          {report.investigationId.toUpperCase()} · network {report.networkId.toUpperCase()} ·{' '}
          {new Date(report.generatedAt).toLocaleString()} · source {report.dataSource}
        </p>
      </div>

      <section>
        <h3 className="text-subheading text-foreground">Evidence integrity</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total evidence" value={report.totalEvidence} />
          <Stat label="Verified" value={report.integrity.verified} />
          <Stat label="Needs review" value={report.integrity.requiresReview} />
          <Stat label="Verified %" value={`${report.verifiedPercent}%`} />
        </div>
        {report.rows.length === 0 ? (
          <p className="mt-3 text-caption text-foreground-muted">No evidence rows recorded.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle">
            {report.rows.map((row) => (
              <li
                key={`${row.evidenceId}-${row.title}`}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-label text-foreground">{row.title}</p>
                  <p className="truncate font-mono text-overline text-foreground-muted">
                    {row.evidenceId} · {row.sourceName} · {row.evidenceType}
                  </p>
                </div>
                <span
                  className={
                    row.status === 'VERIFIED'
                      ? 'rounded bg-success/10 px-1.5 py-0.5 font-mono text-overline text-success'
                      : 'rounded bg-warning/10 px-1.5 py-0.5 font-mono text-overline text-warning'
                  }
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-caption text-foreground-muted">
          Showing {report.displayedEvidence} of {report.totalEvidence} rows.
        </p>
      </section>

      {report.findings.length > 0 && (
        <section>
          <h3 className="text-subheading text-foreground">Key findings</h3>
          <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle">
            {report.findings.map((f) => (
              <li key={`${f.findingId}-${f.title}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-label text-foreground">{f.title}</p>
                  <p className="font-mono text-overline text-foreground-muted">
                    {f.category} · {f.evidenceCount} linked evidence · {f.source}
                  </p>
                </div>
                <span className="font-mono text-caption text-foreground-secondary">
                  {Math.round(f.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.networkSummary && (
        <section>
          <h3 className="text-subheading text-foreground">Network profile</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Entities" value={report.networkSummary.nodes} />
            <Stat label="Relationships" value={report.networkSummary.relationships} />
            <Stat label="Avg degree" value={report.networkSummary.averageDegree} />
            <Stat label="Density" value={report.networkSummary.density.toFixed(3)} />
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
      <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">
        {label}
      </p>
      <p className="font-mono text-subheading text-foreground">{value}</p>
    </div>
  );
}