import type { InvestigationActivity, ActivityAction } from '@trinetra-pulse/types';
import { nexusInvestigationRecord } from './nexus-dataset';

// ============================================================
// MOCK — INVESTIGATION ACTIVITY FEED (Nexus-derived)
// ============================================================
// Mapped deterministically from the Operation Trinetra Nexus
// investigation activity log. Time-ago labels are derived from
// the fixed investigation updatedAt (2026-09-08), never random.
// ============================================================

type ActivityLogItem = (typeof nexusInvestigationRecord.activity)[number];

const ACTION_MAP: Record<string, { action: ActivityAction; actionLabel: string }> = {
  created: { action: 'created', actionLabel: 'Case Created' },
  entity_linked: { action: 'entity_reviewed', actionLabel: 'Entity Reviewed' },
  network_linked: { action: 'network_expanded', actionLabel: 'Network Expanded' },
  evidence_linked: { action: 'evidence_added', actionLabel: 'Evidence Added' },
  finding_created: { action: 'pattern_detected', actionLabel: 'Pattern Detected' },
};

function referenceFor(entry: ActivityLogItem): InvestigationActivity['reference'] {
  switch (entry.type) {
    case 'entity_linked':
      return { type: 'entity', id: 'ent-nexus-person-001', label: 'Arjun Kapoor' };
    case 'network_linked':
      return { type: 'network', id: 'NET-004', label: 'NET-004' };
    case 'evidence_linked':
      return { type: 'evidence', id: 'inev-nexus-02', label: 'CDR extract — Harness Cell' };
    case 'finding_created':
      return { type: 'pattern', id: 'inf-nexus-1', label: 'Hub entity identified' };
    default:
      return { type: 'case', id: 'inv-demo-nexus', label: 'INV-DEMO-NEXUS' };
  }
}

const LANDMARK = new Date(nexusInvestigationRecord.investigation.updated_at).getTime();
const HOUR = 3_600_000;
const DAY = 86_400_000;

function timeAgoFor(iso: string): string {
  const ageMs = Math.max(0, LANDMARK - new Date(iso).getTime());
  if (ageMs < HOUR) return 'less than an hour ago';
  if (ageMs < DAY) return `${Math.round(ageMs / HOUR)} hour${ageMs >= 2 * HOUR ? 's' : ''} ago`;
  return `${Math.round(ageMs / DAY)} day${ageMs >= 2 * DAY ? 's' : ''} ago`;
}

export const investigationActivity: InvestigationActivity[] =
  nexusInvestigationRecord.activity.map((entry) => {
    const mapped = ACTION_MAP[entry.type] ?? { action: 'updated' as ActivityAction, actionLabel: 'Investigation Updated' };
    return {
      id: entry.id,
      action: mapped.action,
      actionLabel: mapped.actionLabel,
      title: entry.title,
      subtitle: entry.detail ?? '',
      reference: referenceFor(entry),
      timestamp: entry.at,
      timeAgo: timeAgoFor(entry.at),
      user: entry.actor ?? undefined,
    };
  });