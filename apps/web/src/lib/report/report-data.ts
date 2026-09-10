// ============================================================
// KNOWLEDGE CANVAS — REPORT DATA (Tier 1.2)
// ============================================================
// Deterministic assembly of the investigation report payload:
//   - evidence integrity ledger (status + provenance + recorded
//     hash when present; SHA-256 only ever from the persisted API)
//   - network profile / centrality summary (shared analytics engine)
//   - key findings with their evidence counts
// Branches on ``isMockData()`` exactly like every other data surface
// and never fabricates hashes or statuses.
// ============================================================

import type {
  EvidenceItem,
  EvidenceStatus,
  NetworkAnalyticsSummary,
} from '@trinetra-pulse/types';
import { mockEvidenceItems, mockInvestigationById } from '@/mock';
import { isMockData, API_BASE_URL } from '@/lib/api/config';
import { apiFetch } from '@/lib/api/client';
import { mapEvidenceItem, type RealEvidence } from '@/lib/api/evidence';
import {
  getInvestigation,
  listFindingsForInvestigation,
} from '@/lib/api/investigations';
import {
  findingCategoryFrom,
  findingConfidenceFrom,
  findingEvidenceIdsFrom,
  findingSourceFrom,
} from '@/lib/api/findings';
import { getSummary } from '@/services/network-analytics.service';

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

/** Rows surfaced in the UI ledger (full totals still reported). */
export const REPORT_EVIDENCE_DISPLAY_LIMIT = 12;

/** investigation-finding confidence level → numeric confidence. */
const FINDING_CONFIDENCE: Record<string, number> = {
  low: 0.4,
  medium: 0.7,
  high: 0.9,
};

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface ReportEvidenceRow {
  evidenceId: string;
  title: string;
  evidenceType: EvidenceItem['evidenceType'];
  status: EvidenceStatus;
  sourceName: string;
  recordIdentifier?: string;
  /** Recorded hash — demo rows carry the simulated SHA-256 marker,
   *  persisted rows carry the real backend checksum. */
  provenanceHash?: string;
  observedAt: string;
  isDemoData: boolean;
}

export interface ReportFindingRow {
  findingId: string;
  title: string;
  category: string;
  confidence: number;
  evidenceCount: number;
  source: string;
  createdAt: string;
}

export interface EvidenceIntegrityStats {
  verified: number;
  requiresReview: number;
  unverified: number;
  other: number;
}

export interface InvestigationReport {
  investigationId: string;
  investigationTitle: string;
  networkId: string;
  generatedAt: string;
  dataSource: 'demo' | 'persisted';
  totalEvidence: number;
  displayedEvidence: number;
  integrity: EvidenceIntegrityStats;
  verifiedPercent: number;
  rows: ReportEvidenceRow[];
  findings: ReportFindingRow[];
  networkSummary: NetworkAnalyticsSummary | null;
}

export interface LoadReportInput {
  investigationId: string;
  networkId: string;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

// ------------------------------------------------------------
// Aggregations
// ------------------------------------------------------------

const isVerified = (item: EvidenceItem): boolean =>
  item.status === 'VERIFIED' || item.integrity?.status === 'VERIFIED';

function integrityStats(items: EvidenceItem[]): EvidenceIntegrityStats {
  let verified = 0;
  let requiresReview = 0;
  let unverified = 0;
  let other = 0;
  for (const item of items) {
    if (isVerified(item)) verified += 1;
    else if (item.status === 'REQUIRES_REVIEW') requiresReview += 1;
    else if (
      item.status === 'UNVERIFIED' ||
      item.integrity?.status === 'UNVERIFIED'
    )
      unverified += 1;
    else other += 1;
  }
  return { verified, requiresReview, unverified, other };
}

function toReportRow(item: EvidenceItem): ReportEvidenceRow {
  return {
    evidenceId: item.id,
    title: item.title,
    evidenceType: item.evidenceType,
    status: item.status,
    sourceName: item.sourceName,
    recordIdentifier: item.provenance.recordIdentifier ?? item.sourceRecord,
    provenanceHash: item.provenance.hash ?? item.integrity?.checksum ?? undefined,
    observedAt: item.observedAt,
    isDemoData: item.isDemoData,
  };
}

// ------------------------------------------------------------
// Mode branches
// ------------------------------------------------------------

async function loadEvidenceForReport(
  investigationId: string
): Promise<{ rows: ReportEvidenceRow[]; integrity: EvidenceIntegrityStats }> {
  let items: EvidenceItem[];
  if (isMockData()) {
    items = mockEvidenceItems.filter(
      (e) => e.investigationId === investigationId
    );
  } else {
    const rows = await apiFetch<RealEvidence[]>(
      API_BASE_URL,
      `/investigations/${investigationId}/evidence`
    );
    items = rows.map(mapEvidenceItem);
  }
  return { rows: items.map(toReportRow), integrity: integrityStats(items) };
}

async function loadFindingsForReport(
  investigationId: string
): Promise<ReportFindingRow[]> {
  if (isMockData()) {
    const record = mockInvestigationById.get(investigationId);
    if (!record) return [];
    return record.findings.map((f) => ({
      findingId: f.id,
      title: f.title,
      category: (f.category ?? 'info').toLowerCase(),
      confidence: FINDING_CONFIDENCE[f.confidence] ?? 0.5,
      evidenceCount: f.evidence_ids.length,
      source: f.source,
      createdAt: f.created_at,
    }));
  }
  const rows = await listFindingsForInvestigation(investigationId);
  return rows.map((f) => ({
    findingId: f.id,
    title: f.title,
    category: findingCategoryFrom(f.severity),
    confidence: findingConfidenceFrom(f.confidence),
    evidenceCount: findingEvidenceIdsFrom(f).length,
    source: findingSourceFrom(f),
    createdAt: f.created_at,
  }));
}

async function loadSummary(
  networkId: string
): Promise<NetworkAnalyticsSummary | null> {
  try {
    return await getSummary(networkId);
  } catch {
    return null;
  }
}

async function loadInvestigationTitle(investigationId: string): Promise<string> {
  if (isMockData()) {
    const record = mockInvestigationById.get(investigationId);
    return record?.investigation.title ?? investigationId.toUpperCase();
  }
  try {
    const inv = await getInvestigation(investigationId);
    return inv.title;
  } catch {
    return investigationId.toUpperCase();
  }
}

// ------------------------------------------------------------
// Public loader
// ------------------------------------------------------------

export async function loadInvestigationReport(
  input: LoadReportInput
): Promise<InvestigationReport> {
  const { investigationId, networkId, now } = input;

  const [evidence, findings, networkSummary, investigationTitle] =
    await Promise.all([
      loadEvidenceForReport(investigationId),
      loadFindingsForReport(investigationId),
      loadSummary(networkId),
      loadInvestigationTitle(investigationId),
    ]);

  const integrity = evidence.integrity;
  const rows = evidence.rows;
  const verifiedPercent =
    rows.length > 0
      ? Math.round((integrity.verified / rows.length) * 100)
      : 0;

  const displayLimit = REPORT_EVIDENCE_DISPLAY_LIMIT;
  const displayedEvidence = Math.min(rows.length, displayLimit);

  return {
    investigationId,
    investigationTitle,
    networkId,
    generatedAt: (now ?? new Date()).toISOString(),
    dataSource: isMockData() ? 'demo' : 'persisted',
    totalEvidence: rows.length,
    displayedEvidence,
    integrity,
    verifiedPercent,
    rows: rows.slice(0, displayLimit),
    findings,
    networkSummary,
  };
}

export type {
  EvidenceItem,
  NetworkAnalyticsSummary,
}