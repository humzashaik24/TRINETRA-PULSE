import type { ActivitySeries } from '@trinetra-pulse/types';

// ============================================================
// MOCK — ACTIVITY SERIES (Nexus-derived)
// ============================================================
// Deterministic 7-day timeline anchored to the Operation Trinetra
// Nexus investigation updatedAt (2026-09-08).  Events and
// relationships are placed on realistic days that correspond to
// Nexus evidence timestamps; totals equal the actual dataset.
// ============================================================

const RELATIONSHIP_DAILY = [8, 7, 12, 9, 10, 6, 8];
const EVENT_DAILY = [1, 0, 0, 1, 0, 0, 0];
const COMMUNICATION_DAILY = [1, 2, 3, 2, 1, 1, 2];
const PATTERNS_DAILY = [1, 0, 0, 1, 1, 0, 1];
const DAY_LABELS = ['Sep 2', 'Sep 3', 'Sep 4', 'Sep 5', 'Sep 6', 'Sep 7', 'Sep 8'];

export const activitySeries: ActivitySeries = {
  data: DAY_LABELS.map((label, i) => ({
    label,
    events: EVENT_DAILY[i],
    relationships: RELATIONSHIP_DAILY[i],
    communications: COMMUNICATION_DAILY[i],
    patterns: PATTERNS_DAILY[i],
  })),
  totalEvents: 2,
  totalRelationships: 60,
  period: 'Sep 2–8, 2026',
};
