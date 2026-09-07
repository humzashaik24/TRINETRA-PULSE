'use client';

import React, { useMemo } from 'react';
import type { NetworkComponent } from '@trinetra-pulse/types';
import { Badge, Button } from '@trinetra-pulse/ui';
import { Eye } from 'lucide-react';
import { useAnalyticsStore } from '@/state/analytics.store';
import { DistributionBar } from './viz';
import { inspectComponent } from './analytics-graph-integration';

// ============================================================
// CONNECTED COMPONENT VIEW
// ============================================================

const HUE_PALETTE = [210, 285, 160, 12, 340, 30, 100, 195];

function colorForIndex(i: number): string {
  return `hsl(${HUE_PALETTE[i % HUE_PALETTE.length]}, 65%, 50%)`;
}

export function ComponentView({ components }: { components: NetworkComponent[] }) {
  const overlay = useAnalyticsStore((s) => s.overlay);
  const setOverlay = useAnalyticsStore((s) => s.setOverlay);
  const selectedComponentId = useAnalyticsStore((s) => s.selectedComponentId);
  const selectComponent = useAnalyticsStore((s) => s.selectComponent);

  const sorted = useMemo(
    () => [...components].sort((a, b) => b.nodeCount - a.nodeCount),
    [components]
  );

  const segments = sorted.map((c, i) => ({
    key: c.componentId,
    label: `Component ${i + 1}`,
    value: c.nodeCount,
    color: colorForIndex(i),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-muted">
          {components.length} disconnected parts of the observed network.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOverlay(overlay === 'component' ? 'none' : 'component')}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          {overlay === 'component' ? 'Clear overlay' : 'Color on graph'}
        </Button>
      </div>

      <DistributionBar segments={segments} />

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-foreground-muted">No components detected.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((c, i) => {
            const selected = selectedComponentId === c.componentId;
            return (
              <li key={c.componentId}>
                <button
                  onClick={() => {
                    selectComponent(c.componentId);
                    inspectComponent(c.componentId);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selected ? 'border-foreground/40 bg-surface' : 'border-border bg-surface/40 hover:bg-surface'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Component {i + 1}</span>
                    <Badge size="sm" variant="secondary">{c.nodeCount} entities</Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-foreground-muted">
                    {c.edgeCount} ties · density {Math.round(c.density * 100)}%
                  </p>
                  {c.representativeNode && (
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      Representative: <span className="font-medium text-foreground">{c.representativeNode}</span>
                    </p>
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
