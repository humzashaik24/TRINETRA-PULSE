'use client';

import React from 'react';
import type { NetworkAnalyticsSummary } from '@trinetra-pulse/types';
import { StatCard } from './viz';

// ============================================================
// ANALYTICS SUMMARY — network-level structural statistics
// ============================================================

export function formatSummaryValue(summary: NetworkAnalyticsSummary | null): Record<string, string> {
  if (!summary) return {};
  return {
    nodes: String(summary.nodes),
    relationships: String(summary.relationships),
    components: String(summary.connectedComponents),
    communities: String(summary.communityCount),
    averageDegree: summary.averageDegree.toFixed(2),
    density: (summary.density * 100).toFixed(1) + '%',
    bridges: String(summary.bridgeEntityCount),
    averagePath: summary.averagePathLength !== null ? summary.averagePathLength.toFixed(2) : '—',
  };
}

export function AnalyticsSummary({ summary }: { summary: NetworkAnalyticsSummary | null }) {
  const v = formatSummaryValue(summary);
  return (
    <div className="grid grid-cols-3 gap-2 overflow-hidden lg:grid-cols-6">
      <StatCard label="Entities" value={v.nodes ?? '—'} />
      <StatCard label="Observed ties" value={v.relationships ?? '—'} />
      <StatCard label="Communities" value={v.communities ?? '—'} />
      <StatCard label="Components" value={v.components ?? '—'} />
      <StatCard label="Density" value={v.density ?? '—'} />
      <StatCard label="Bridge entities" value={v.bridges ?? '—'} />
    </div>
  );
}
