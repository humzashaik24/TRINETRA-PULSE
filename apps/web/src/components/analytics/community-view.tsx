'use client';

import React, { useMemo } from 'react';
import type { Community } from '@trinetra-pulse/types';
import { Badge, Button } from '@trinetra-pulse/ui';
import { Eye } from 'lucide-react';
import { useAnalyticsStore } from '@/state/analytics.store';
import { DistributionBar } from './viz';
import { inspectCommunity } from './analytics-graph-integration';

// ============================================================
// COMMUNITY / CONNECTED GROUP VIEW
// ============================================================

const HUE_PALETTE = [210, 160, 30, 285, 340, 100, 12, 195, 60, 250, 320, 140];

function colorForIndex(i: number): string {
  return `hsl(${HUE_PALETTE[i % HUE_PALETTE.length]}, 70%, 55%)`;
}

export function CommunityView({ communities, unavailable = false }: { communities: Community[]; unavailable?: boolean }) {
  const overlay = useAnalyticsStore((s) => s.overlay);
  const setOverlay = useAnalyticsStore((s) => s.setOverlay);
  const selectedCommunityId = useAnalyticsStore((s) => s.selectedCommunityId);
  const selectCommunity = useAnalyticsStore((s) => s.selectCommunity);

  const sorted = useMemo(
    () => [...communities].sort((a, b) => b.size - a.size),
    [communities]
  );

  const segments = sorted.map((c, i) => ({
    key: c.id,
    label: `Group ${i + 1}`,
    value: c.size,
    color: colorForIndex(i),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-muted">
          {communities.length} connected groups detected from observed relationships.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOverlay(overlay === 'community' ? 'none' : 'community')}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          {overlay === 'community' ? 'Clear overlay' : 'Color groups on graph'}
        </Button>
      </div>

      <DistributionBar segments={segments} />

      {unavailable ? (
        <p className="py-6 text-center text-xs text-foreground-muted">Group analysis is unavailable from the API for this network.</p>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-foreground-muted">No communities detected.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((c, i) => {
            const selected = selectedCommunityId === c.id;
            const dotColor = colorForIndex(i);
            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    selectCommunity(c.id);
                    inspectCommunity(c.id);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selected ? 'border-foreground/40 bg-surface' : 'border-border bg-surface/40 hover:bg-surface'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                      <span className="text-sm font-medium text-foreground">Group {i + 1}</span>
                    </div>
                    <Badge size="sm" variant="secondary">{c.size} entities</Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-foreground-muted">
                    {c.internalEdgeCount} internal ties · density {Math.round(c.density * 100)}% · cohesion {Math.round(c.cohesion * 100)}%
                  </p>
                  {c.representativeEntities.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.representativeEntities.map((e) => (
                        <span key={e} className="rounded bg-surface border border-border px-1.5 py-0.5 text-[10px] text-foreground">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
