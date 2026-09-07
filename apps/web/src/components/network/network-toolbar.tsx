'use client';

import { GraphSearch } from './graph-search';
import { DepthControl } from './depth-control';
import { GraphFilters } from './graph-filters';
import { GraphTimeline } from './graph-timeline';
import { GraphPathExplorer } from './graph-path-explorer';

// ============================================================
// NETWORK TOOLBAR
// ============================================================
// Top action bar for the network workspace: search, neighbourhood
// depth, filters, timeline and path exploration.
// ============================================================

export function NetworkToolbar() {
  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-border bg-surface/40 px-4 py-2"
      data-testid="network-toolbar"
    >
      <GraphSearch />
      <div className="flex items-center gap-1.5">
        <DepthControl />
        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <GraphTimeline />
        <GraphFilters />
        <GraphPathExplorer />
      </div>
    </div>
  );
}
