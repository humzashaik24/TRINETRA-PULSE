import type { ActivitySeries } from '@trinetra-pulse/types';

export const activitySeries: ActivitySeries = {
  data: [
    { label: 'Mon', events: 42, relationships: 18, communications: 65, patterns: 3 },
    { label: 'Tue', events: 58, relationships: 24, communications: 78, patterns: 5 },
    { label: 'Wed', events: 35, relationships: 12, communications: 52, patterns: 2 },
    { label: 'Thu', events: 67, relationships: 31, communications: 89, patterns: 7 },
    { label: 'Fri', events: 48, relationships: 22, communications: 71, patterns: 4 },
    { label: 'Sat', events: 23, relationships: 8, communications: 34, patterns: 1 },
    { label: 'Sun', events: 15, relationships: 5, communications: 22, patterns: 1 },
  ],
  totalEvents: 288,
  totalRelationships: 120,
  period: 'Last 7 days',
};
