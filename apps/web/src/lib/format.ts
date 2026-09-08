import type { EntityType, ExtractionMethod, ResolutionState, EvidenceType, EvidenceStatus } from '@trinetra-pulse/types';

// ============================================================
// DOMAIN FORMATTING HELPERS
// ============================================================

/** 0.94 -> "94%" */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 12_345 -> "12,345" */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/** ISO date -> "25 Aug 2026, 14:30" */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ISO date -> "25 Aug 2026" */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ISO timestamp -> "2h ago" style relative time. */
export function formatRelativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';
  const diff = Math.max(0, now - time);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/** Duration string for jobs, e.g. "1m 12s". */
export function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso) return '—';
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: 'Person',
  phone: 'Phone',
  vehicle: 'Vehicle',
  location: 'Location',
  organization: 'Organization',
  account: 'Account',
  transaction: 'Transaction',
  event: 'Event',
  case: 'Case',
  document: 'Document',
  evidence: 'Evidence',
};

export const RESOLUTION_STATE_LABELS: Record<ResolutionState, string> = {
  CONFIRMED: 'Confirmed',
  PROBABLE: 'Probable',
  POSSIBLE: 'Possible',
  REJECTED: 'Rejected',
  NEEDS_REVIEW: 'Needs review',
};

export const EXTRACTION_METHOD_LABELS: Record<ExtractionMethod, string> = {
  RULE_BASED: 'Rule based',
  STRUCTURED_MAPPING: 'Structured mapping',
  REGEX: 'Regex',
  NLP: 'NLP',
  ML: 'ML model',
  LLM: 'LLM',
  MANUAL: 'Manual',
  ANALYTICAL: 'Analytical',
  DATABASE_IMPORT: 'Database import',
  DOCUMENT_PARSE: 'Document parse',
  AI_NLP: 'AI / NLP',
  AI_CV: 'AI / computer vision',
  AI_AUDIO: 'AI / audio',
  NETWORK_ANALYSIS: 'Network analysis',
  OTHER: 'Other',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  DOCUMENT: 'Document',
  FIR: 'FIR',
  REPORT: 'Report',
  COMMUNICATION: 'Communication',
  TRANSACTION: 'Transaction',
  VEHICLE: 'Vehicle',
  LOCATION: 'Location',
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  RECORD: 'Record',
  OTHER: 'Other',
};

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  AVAILABLE: 'Available',
  PROCESSING: 'Processing',
  REQUIRES_REVIEW: 'Requires review',
  VERIFIED: 'Verified',
  UNVERIFIED: 'Unverified',
  ARCHIVED: 'Archived',
};

export const EVIDENCE_STATUS_VARIANT: Record<EvidenceStatus, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  AVAILABLE: 'info',
  PROCESSING: 'info',
  REQUIRES_REVIEW: 'warning',
  VERIFIED: 'success',
  UNVERIFIED: 'default',
  ARCHIVED: 'default',
};

export const COVERAGE_LEVEL_LABELS: Record<string, string> = {
  SUPPORTED: 'Supported',
  PARTIALLY_SUPPORTED: 'Partially supported',
  UNSUPPORTED: 'Unsupported',
};