import type { FindingConfidenceLevel } from '@trinetra-pulse/types';

// ============================================================
// FINDING & EVIDENCE INTELLIGENCE — SHARED LABELS (Phase 28)
// ============================================================
// Human-readable labels and badge variants for the findings
// tab and the finding detail panel. A finding's ``category`` is
// the persisted severity (info / low / medium / high / critical)
// in API mode or a semantic category (e.g. "association") in the
// mock universe, so severity styling only applies to known
// severity values and falls back to a neutral badge otherwise.
// Confidence is finding confidence (analytical), never guilt.
// ============================================================

export const FINDING_CONFIDENCE_VARIANT: Record<
  FindingConfidenceLevel,
  'success' | 'warning' | 'info' | 'danger' | 'default'
> = {
  high: 'success',
  medium: 'warning',
  low: 'info',
};

const SEVERITY_VARIANT: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  info: 'info',
};

/** Badge variant for a finding category / severity value. */
export function findingSeverityVariant(
  category: string,
): 'danger' | 'warning' | 'info' | 'default' {
  return SEVERITY_VARIANT[category.toLowerCase()] ?? 'default';
}

/** Human label for a finding category / severity value. */
export function findingSeverityLabel(category: string): string {
  const key = category.toLowerCase();
  if (key in SEVERITY_VARIANT) return key.charAt(0).toUpperCase() + key.slice(1);
  return category || 'Finding';
}

/** Source-type badge variant for a persisted finding. */
export function findingSourceVariant(
  sourceType: 'analysis' | 'manual' | 'system',
): 'info' | 'default' | 'ai' {
  if (sourceType === 'analysis') return 'info';
  if (sourceType === 'system') return 'ai';
  return 'default';
}