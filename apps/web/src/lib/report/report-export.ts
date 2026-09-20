import type { InvestigationReport } from '@/lib/report/report-data';

export function reportToMarkdown(report: InvestigationReport): string {
  const lines: string[] = [`# ${report.investigationTitle}`, ''];
  lines.push(`- Investigation: ${report.investigationId}`);
  lines.push(`- Network: ${report.networkId}`);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Source: ${report.dataSource}`);
  lines.push(`- Evidence: ${report.displayedEvidence} shown of ${report.totalEvidence}`);
  lines.push('');
  lines.push('## Evidence integrity');
  lines.push('');
  lines.push(`| Status | Count |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Verified | ${report.integrity.verified} |`);
  lines.push(`| Requires review | ${report.integrity.requiresReview} |`);
  lines.push(`| Unverified | ${report.integrity.unverified} |`);
  lines.push(`| Other | ${report.integrity.other} |`);
  lines.push('');
  if (report.rows.length === 0) {
    lines.push('_No evidence rows were available._');
  } else {
    lines.push('## Evidence ledger');
    lines.push('');
    for (const row of report.rows) {
      const ref = row.recordIdentifier ? ` · ref ${row.recordIdentifier}` : '';
      lines.push(`- \`${row.evidenceId}\` **${row.title}** — ${row.evidenceType}, ${row.status}, ${row.sourceName}${ref}`);
    }
    lines.push('');
  }
  if (report.findings.length === 0) {
    lines.push('_No findings were surfaced._');
  } else {
    lines.push('## Findings');
    lines.push('');
    for (const f of report.findings) {
      lines.push(`- **${f.title}** — ${f.category}, ${Math.round(f.confidence * 100)}% confidence, ${f.evidenceCount} ev, ${f.source}`);
    }
    lines.push('');
  }
  if (report.networkSummary) {
    lines.push('## Network summary');
    lines.push('');
    lines.push(`- Nodes: ${report.networkSummary.nodes}`);
    lines.push(`- Relationships: ${report.networkSummary.relationships}`);
    lines.push(`- Average degree: ${report.networkSummary.averageDegree}`);
  }
  return lines.join('\n');
}

export function reportToJson(report: InvestigationReport): string {
  return JSON.stringify({
    investigationId: report.investigationId,
    investigationTitle: report.investigationTitle,
    networkId: report.networkId,
    generatedAt: report.generatedAt,
    dataSource: report.dataSource,
    totalEvidence: report.totalEvidence,
    displayedEvidence: report.displayedEvidence,
    verifiedPercent: report.verifiedPercent,
    integrity: {
      verified: report.integrity.verified,
      requiresReview: report.integrity.requiresReview,
      unverified: report.integrity.unverified,
      other: report.integrity.other,
    },
    rows: report.rows.map((r) => ({
      evidenceId: r.evidenceId,
      title: r.title,
      evidenceType: r.evidenceType,
      status: r.status,
      sourceName: r.sourceName,
      recordIdentifier: r.recordIdentifier ?? null,
      provenanceHash: r.provenanceHash ?? null,
      observedAt: r.observedAt,
    })),
    findings: report.findings.map((f) => ({
      findingId: f.findingId,
      title: f.title,
      category: f.category,
      confidence: f.confidence,
      evidenceCount: f.evidenceCount,
      source: f.source,
      createdAt: f.createdAt,
    })),
    networkSummary: report.networkSummary
      ? {
          nodes: report.networkSummary.nodes,
          relationships: report.networkSummary.relationships,
          averageDegree: report.networkSummary.averageDegree,
        }
      : null,
  }, null, 2);
}

export function reportExportBlob(report: InvestigationReport): { blob: Blob; mime: string; filename: string } {
  const markdown = reportToMarkdown(report);
  return {
    blob: new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
    mime: 'text/markdown',
    filename: `investigation-report-${report.investigationId}.md`,
  };
}