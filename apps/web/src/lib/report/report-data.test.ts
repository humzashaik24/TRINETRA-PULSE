import {
  loadInvestigationReport,
  REPORT_EVIDENCE_DISPLAY_LIMIT,
} from '@/lib/report/report-data';
import { mockEvidenceItems, mockInvestigationById } from '@/mock';

// ============================================================
// TIER 1.2 — INVESTIGATION REPORT DATA (mock branch)
// ============================================================
// Deterministic assembly assertions: ledger aggregates, bounded
// display rows, findings mapping and the centrality summary.
// ============================================================

const FIXED_NOW = new Date('2026-09-10T10:00:00Z');

describe('loadInvestigationReport (mock mode)', () => {
  it('assembles the Operation Meridian report deterministically', async () => {
    const report = await loadInvestigationReport({
      investigationId: 'inv-006',
      networkId: 'NET-001',
      now: FIXED_NOW,
    });

    expect(report.investigationId).toBe('inv-006');
    expect(report.investigationTitle).toBe('Operation Meridian');
    expect(report.networkId).toBe('NET-001');
    expect(report.generatedAt).toBe('2026-09-10T10:00:00.000Z');
    expect(report.dataSource).toBe('demo');

    const itemIds = mockEvidenceItems
      .filter((e) => e.investigationId === 'inv-006')
      .map((e) => e.id);

    expect(report.totalEvidence).toBe(itemIds.length);
    expect(report.displayedEvidence).toBe(
      Math.min(itemIds.length, REPORT_EVIDENCE_DISPLAY_LIMIT)
    );
    expect(report.rows).toHaveLength(report.displayedEvidence);

    const verified = itemIds.length
      ? itemIds.filter((id) => {
          const item = mockEvidenceItems.find((e) => e.id === id);
          return (
            item?.status === 'VERIFIED' || item?.integrity?.status === 'VERIFIED'
          );
        }).length
      : 0;
    expect(report.integrity.verified).toBe(verified);
    expect(report.verifiedPercent).toBe(
      Math.round((verified / report.totalEvidence) * 100)
    );
  });

  it('maps findings with numeric confidence and evidence counts', async () => {
    const report = await loadInvestigationReport({
      investigationId: 'inv-006',
      networkId: 'NET-001',
      now: FIXED_NOW,
    });

    const invFindings =
      mockInvestigationById.get('inv-006')?.findings ?? [];
    expect(report.findings).toHaveLength(invFindings.length);
    for (const f of report.findings) {
      expect(f.confidence).toBeGreaterThanOrEqual(0.4);
      expect(f.confidence).toBeLessThanOrEqual(0.9);
      expect(f.evidenceCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns an empty report for an unknown investigation', async () => {
    const report = await loadInvestigationReport({
      investigationId: 'inv-does-not-exist',
      networkId: 'NET-001',
      now: FIXED_NOW,
    });

    expect(report.totalEvidence).toBe(0);
    expect(report.integrity).toEqual({
      verified: 0,
      requiresReview: 0,
      unverified: 0,
      other: 0,
    });
    expect(report.verifiedPercent).toBe(0);
    expect(report.findings).toHaveLength(0);
  });

  it('surfaces a rolling hash marker for demo evidence when recorded', async () => {
    const report = await loadInvestigationReport({
      investigationId: 'inv-006',
      networkId: 'NET-001',
      now: FIXED_NOW,
    });

    const withHash = report.rows.filter((r) => r.provenanceHash);
    const fromMock = mockEvidenceItems.filter((e) => e.provenance.hash);
    expect(withHash.length).toBeGreaterThanOrEqual(0);
    expect(withHash.length).toBe(
      Math.min(
        fromMock.filter((e) => e.investigationId === 'inv-006').length,
        REPORT_EVIDENCE_DISPLAY_LIMIT
      )
    );
    if (withHash.length > 0) {
      expect(withHash[0].provenanceHash).toMatch(/^sha256:/);
    }
  });
});