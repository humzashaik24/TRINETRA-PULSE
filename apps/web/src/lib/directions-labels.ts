import type {
  InvestigationDirectionPriority,
  InvestigationDirectionType,
  SupportingFactType,
} from '@trinetra-pulse/types';

// ============================================================
// DIRECTION INTELLIGENCE — SHARED LABELS (Phase 26 / Phase 27)
// ============================================================
// Human-readable labels and badge variants used by the directions
// tab, the direction detail panel and the overview key-figures.
// Labels describe analytical leads only — never judgements.
// ============================================================

export const DIRECTION_TYPE_LABELS: Record<InvestigationDirectionType, string> = {
  high_connectivity_entity: 'High connectivity entity',
  bridge_entity: 'Bridge entity',
  unresolved_connection: 'Unresolved connection',
  suspicious_pattern: 'Suspicious pattern',
  evidence_gap: 'Evidence gap',
  relationship_verification: 'Relationship verification',
  entity_resolution: 'Entity resolution',
  timeline_gap: 'Timeline gap',
  follow_up_evidence: 'Follow-up evidence',
};

export const DIRECTION_PRIORITY_LABELS: Record<InvestigationDirectionPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DIRECTION_PRIORITY_VARIANT: Record<
  InvestigationDirectionPriority,
  'danger' | 'warning' | 'info' | 'default'
> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

export const FACT_TYPE_LABELS: Record<SupportingFactType, string> = {
  degree_observed: 'Degree observed',
  articulation_point: 'Articulation point',
  unresolved_pair: 'Unresolved pair',
  shared_evidence: 'Shared evidence',
  pattern_detected: 'Pattern detected',
  relationship_without_evidence: 'Relationship without evidence',
  verification_pending: 'Verification pending',
  resolution_pending: 'Resolution pending',
  timestamp_missing: 'Timestamp missing',
  timeline_gap: 'Timeline gap',
  dangling_evidence_reference: 'Dangling evidence reference',
};

/** Direction types whose lead is best explored inside the network graph. */
const NETWORK_ANCHORED_TYPES: ReadonlySet<InvestigationDirectionType> = new Set([
  'high_connectivity_entity',
  'bridge_entity',
  'unresolved_connection',
  'relationship_verification',
]);

/** Direction types whose lead is best explored inside the timeline. */
const TIMELINE_ANCHORED_TYPES: ReadonlySet<InvestigationDirectionType> = new Set([
  'timeline_gap',
]);

export function networkAnchorForDirection(type: InvestigationDirectionType): boolean {
  return NETWORK_ANCHORED_TYPES.has(type);
}

export function timelineAnchorForDirection(type: InvestigationDirectionType): boolean {
  return TIMELINE_ANCHORED_TYPES.has(type);
}

/** Stable sort for "top leads": priority (critical > high > …) then confidence. */
const PRIORITY_ORDER: Record<InvestigationDirectionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function comparePriority(a: InvestigationDirectionPriority, b: InvestigationDirectionPriority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}