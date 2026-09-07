'use client';

import React from 'react';
import { useAnalyticsStore, type AnalyticsOverlay } from '@/state/analytics.store';
import { cn } from '@/lib/utils';

// ============================================================
// GRAPH OVERLAY LEGEND — explains the active analytical overlay
// ============================================================

const OVERLAY_NOTES: Partial<Record<AnalyticsOverlay, { title: string; items: { color?: string; ring?: boolean; text: string }[] }>> = {
  degree: {
    title: 'Connectedness',
    items: [
      { color: 'hsl(210,80%,55%)', text: 'Size reflects number of direct ties' },
      { ring: true, text: 'Ring highlights the most connected' },
    ],
  },
  betweenness: {
    title: 'Bridge potential',
    items: [
      { color: 'hsl(210,80%,55%)', text: 'Size reflects shortest-path traffic' },
      { ring: true, text: 'Ring highlights strong connectors' },
    ],
  },
  closeness: {
    title: 'Reach',
    items: [
      { color: 'hsl(210,80%,55%)', text: 'Size reflects how quickly an entity reaches others' },
    ],
  },
  pagerank: {
    title: 'Network influence',
    items: [
      { color: 'hsl(210,80%,55%)', text: 'Size reflects influence from who connects to whom' },
    ],
  },
  influence: {
    title: 'Network influence',
    items: [
      { color: 'hsl(160,70%,50%)', text: 'Size reflects composite structural importance' },
    ],
  },
  community: {
    title: 'Connected groups',
    items: [
      { color: 'hsl(210,70%,55%)', text: 'Each colour is one connected group' },
    ],
  },
  component: {
    title: 'Components',
    items: [
      { color: 'hsl(285,65%,50%)', text: 'Each colour is one disconnected component' },
    ],
  },
  bridge: {
    title: 'Bridge entities',
    items: [
      { color: 'hsl(12,85%,55%)', text: 'Coloured + ringed entities link separated parts' },
      { text: 'Dimmed entities are not connectors' },
    ],
  },
};

export function GraphOverlayLegend() {
  const overlay = useAnalyticsStore((s) => s.overlay);
  const note = OVERLAY_NOTES[overlay];
  if (!note) {
    return <p className="text-[10px] text-foreground-muted">Analytical comparison is structural — sizing/colour encode connectivity, never guilt.</p>;
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: note.items.find((i) => i.color)?.color }} />
        <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">{note.title}</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {note.items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-1.5 text-[10px] text-foreground-muted">
            {i.ring ? (
              <span className="inline-block h-2 w-2 rounded-full ring-1 ring-[hsl(12,85%,55%)]" />
            ) : i.color ? (
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: i.color }} />
            ) : (
              <span className={cn('inline-block h-2 w-2 rounded-sm')} />
            )}
            {i.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
