'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  FileSearch,
  Layers,
  Network as NetworkIcon,
  Scale,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Badge,
  Button,
  ChartCard,
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from '@trinetra-pulse/ui';
import {
  loadInvestigationReport,
  type InvestigationReport,
} from '@/lib/report/report-data';
import { journeyHref } from '@/navigation/journey';

// ============================================================
// KNOWLEDGE CANVAS — REPORT VIEW (Tier 1.2)
// ============================================================
// Compiles the investigation report: an evidence integrity ledger,
// the network profile / centrality summary from the shared analytics
// engine, and the key findings. The ledger reuses the existing
// evidence data surface (no parallel engine) and only ever shows
// SHA-256 checksums sourced from the persisted API.
// ============================================================

interface ReportViewProps {
  investigationId: string;
  networkId: string;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  VERIFIED: 'success',
  REQUIRES_REVIEW: 'warning',
  UNVERIFIED: 'warning',
  ARCHIVED: 'default',
  AVAILABLE: 'info',
  PROCESSING: 'info',
};

function shortHash(hash: string): string {
  const prefix = hash.includes(':') ? hash.split(':')[1] : hash;
  if (prefix.length <= 12) return hash;
  return `${prefix.slice(0, 12)}…`;
}

function formatDensity(density: number | undefined): string {
  if (density === undefined || density === null) return '—';
  return `${(density * 100).toFixed(1)}%`;
}

export function ReportView({ investigationId, networkId }: ReportViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<InvestigationReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadInvestigationReport({ investigationId, networkId })
      .then((result) => {
        if (!cancelled) setReport(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Report generation failed.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [investigationId, networkId]);

  const downloadReport = () => {
    if (!report || typeof URL === 'undefined') return;
    const payload = {
      report: 'TRINETRA PULSE — INVESTIGATION REPORT',
      investigation: { id: report.investigationId, title: report.investigationTitle },
      network: { id: report.networkId },
      generatedAt: report.generatedAt,
      dataSource: report.dataSource,
      evidenceIntegrityLedger: {
        total: report.totalEvidence,
        shown: report.displayedEvidence,
        verified: report.integrity.verified,
        requiresReview: report.integrity.requiresReview,
        unverified: report.integrity.unverified,
        other: report.integrity.other,
        rows: report.rows,
      },
      keyFindings: report.findings,
      networkSummary: report.networkSummary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.investigationId}.report.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 flex items-center justify-center min-h-[320px]">
        <LoadingState message="Compiling investigation report…" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 flex items-center justify-center min-h-[320px]">
        <ErrorState
          title="Could not compile the report"
          message={error ?? 'No report data available'}
          retry={() => {
            setLoading(true);
            setError(null);
            void loadInvestigationReport({ investigationId, networkId })
              .then(setReport)
              .catch((err) =>
                setError(err instanceof Error ? err.message : 'Report generation failed.')
              )
              .finally(() => setLoading(false));
          }}
        />
      </div>
    );
  }

  const integrity = report.integrity;
  const summary = report.networkSummary;
  const evidenceHref = journeyHref('/evidence', { investigation: investigationId });
  const analyticsHref = journeyHref('/analytics', { investigation: investigationId, focus: networkId });

  return (
    <div className="space-y-6">
      {/* Header */}
      <ChartCard
        title="Investigation report"
        subtitle={`${report.investigationTitle} · network ${report.networkId}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={report.dataSource === 'demo' ? 'info' : 'success'} size="sm">
              {report.dataSource === 'demo' ? 'Demo data source' : 'Persisted data source'}
            </Badge>
            <Button variant="secondary" size="sm" onClick={downloadReport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download JSON
            </Button>
          </div>
        }
      >
        <p className="text-caption text-foreground-muted">
          Compiled at {new Date(report.generatedAt).toLocaleString()} for{' '}
          <span className="font-mono font-medium text-foreground">{report.investigationId.toUpperCase()}</span>.
        </p>
      </ChartCard>

      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Evidence items" value={report.totalEvidence} icon={<FileSearch className="h-4 w-4" />} />
        <StatCard
          label="Verified"
          value={`${report.verifiedPercent}%`}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard label="Findings" value={report.findings.length} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard
          label="Network relationships"
          value={summary?.relationships ?? '—'}
          icon={<NetworkIcon className="h-4 w-4" />}
        />
      </div>

      {/* Evidence integrity ledger */}
      <ChartCard
        title="Evidence integrity ledger"
        subtitle={`${integrity.verified} verified · ${integrity.requiresReview} require review · ${integrity.unverified} unverified · ${integrity.other} other`}
        action={
          <Link href={evidenceHref} className="text-caption font-medium text-brand hover:underline">
            Open evidence workspace
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <StatCard label="Verified items" value={integrity.verified} icon={<ShieldCheck className="h-4 w-4" />} />
          <StatCard label="Require review" value={integrity.requiresReview} icon={<BarChart3 className="h-4 w-4" />} />
          <StatCard label="Unverified" value={integrity.unverified} icon={<BarChart3 className="h-4 w-4" />} />
          <StatCard label="Other statuses" value={integrity.other} icon={<Layers className="h-4 w-4" />} />
        </div>

        {report.rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" />}
            title="No evidence rows"
            description="This investigation has no linked evidence records yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-caption text-foreground-muted uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-medium">Evidence</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Record ref</th>
                  <th className="pb-2 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody className="text-body-sm">
                {report.rows.map((row) => (
                  <tr key={row.evidenceId} className="border-t border-border">
                    <td className="py-2 pr-4">
                      <p className="font-medium text-foreground">{row.title}</p>
                      <p className="text-caption text-foreground-muted font-mono">
                        {row.evidenceId} · {row.evidenceType}
                      </p>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} size="sm">
                        {row.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-foreground-secondary">{row.sourceName}</td>
                    <td className="py-2 pr-4 font-mono text-foreground-secondary">
                      {row.recordIdentifier ?? '—'}
                    </td>
                    <td className="py-2 font-mono text-foreground-muted">
                      {row.provenanceHash ? shortHash(row.provenanceHash) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.displayedEvidence < report.totalEvidence && (
          <p className="text-caption text-foreground-muted mt-2">
            Showing {report.displayedEvidence} of {report.totalEvidence} evidence rows. Full totals are above.
          </p>
        )}
        <p className="text-caption text-foreground-muted mt-3">
          SHA-256 hashes are shown only when recorded by the persisted backend; demo rows carry the
          simulated marker. Every row is clearly labelled as demo data where applicable.
        </p>
      </ChartCard>

      {/* Network profile / centrality */}
      <ChartCard
        title="Network profile & centrality"
        subtitle={`Structural summary over network ${report.networkId} from the shared analytics engine`}
        action={
          <Link href={analyticsHref} className="text-caption font-medium text-brand hover:underline">
            Open analytics workspace
          </Link>
        }
      >
        {!summary ? (
          <EmptyState
            icon={<NetworkIcon className="h-8 w-8" />}
            title="No network summary"
            description={`Network ${report.networkId} is not present in the analytics engine.`}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Nodes" value={summary.nodes} icon={<NetworkIcon className="h-4 w-4" />} />
              <StatCard label="Relationships" value={summary.relationships} icon={<Layers className="h-4 w-4" />} />
              <StatCard label="Connected components" value={summary.connectedComponents} icon={<Scale className="h-4 w-4" />} />
              <StatCard label="Communities" value={summary.communityCount} icon={<BarChart3 className="h-4 w-4" />} />
              <StatCard label="Average degree" value={summary.averageDegree.toFixed(1)} icon={<TrendingUp className="h-4 w-4" />} />
              <StatCard label="Density" value={formatDensity(summary.density)} icon={<BarChart3 className="h-4 w-4" />} />
              <StatCard
                label="Avg path length"
                value={summary.averagePathLength !== null ? summary.averagePathLength.toFixed(2) : '—'}
                icon={<Layers className="h-4 w-4" />}
              />
              <StatCard
                label="Diameter"
                value={summary.diameter !== null ? String(summary.diameter) : '—'}
                icon={<Scale className="h-4 w-4" />}
              />
            </div>
            <p className="text-caption text-foreground-muted">
              {summary.topConnectedEntity
                ? `Most connected entity: ${summary.topConnectedEntity.toLowerCase()}.`
                : 'No connected-entity signal.'}{' '}
              {summary.topBridgeEntity
                ? ` Top bridge: ${summary.topBridgeEntity.toLowerCase()}.`
                : ''}
              {summary.networkInfluenceLeader
                ? ` Influence leader: ${summary.networkInfluenceLeader.toLowerCase()}.`
                : ''}
              Centrality concepts describe structure — they are not guilt scores.
            </p>
          </div>
        )}
      </ChartCard>

      {/* Key findings */}
      <ChartCard
        title="Key findings"
        subtitle="Analytical findings with the evidence each statement references"
      >
        {report.findings.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="h-8 w-8" />}
            title="No findings recorded"
            description="This investigation has no recorded findings yet."
          />
        ) : (
          <ul className="divide-y divide-border">
            {report.findings.map((f) => (
              <li key={f.findingId} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{f.title}</p>
                  <p className="text-caption text-foreground-muted mt-0.5 font-mono">
                    {f.findingId} · {f.source}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="default" size="sm">
                    {f.category.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="info" size="sm">
                    confidence {Math.round(f.confidence * 100)}%
                  </Badge>
                  <span className="text-caption text-foreground-muted whitespace-nowrap">
                    {f.evidenceCount} evidence
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}