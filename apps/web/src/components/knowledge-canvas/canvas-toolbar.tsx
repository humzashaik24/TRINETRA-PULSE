'use client';

import Link from 'next/link';
import { Button, buttonVariants } from '@trinetra-pulse/ui';
import { useCanvasStore } from './canvas-store';
import { CANVAS_TABS, type CanvasTab } from './canvas-types';
import { journeyHref } from '@/navigation/journey';
import { useState, useEffect } from 'react';


const TAB_LABELS: Record<CanvasTab, string> = {
  graph: 'Canvas',
  network: 'Network',
  directions: 'Directions / Leads',
  report: 'Report',
  legal: 'Legal Research',
  visualization: 'Visualization',
  audit: 'Audit Log',
  settings: 'Settings',
};

export function CanvasToolbar({ title }: { title: string }) {
  const tab = useCanvasStore((s) => s.tab);
  const setTab = useCanvasStore((s) => s.setTab);
  const investigationId = useCanvasStore((s) => s.investigationId);
  const minimap = useCanvasStore((s) => s.minimap);
  const setMinimap = useCanvasStore((s) => s.setMinimap);
  const showLabels = useCanvasStore((s) => s.showLabels);
  const setShowLabels = useCanvasStore((s) => s.setShowLabels);
  const requestFit = useCanvasStore((s) => s.requestFit);
  const setImportOpen = useCanvasStore((s) => s.setImportOpen);
  const setSettingsOpen = useCanvasStore((s) => s.setSettingsOpen);
  const setAddEntityOpen = useCanvasStore((s) => s.setAddEntityOpen);
  const setAddEvidenceOpen = useCanvasStore((s) => s.setAddEvidenceOpen);
  const setAddNoteOpen = useCanvasStore((s) => s.setAddNoteOpen);

  const exitHref = journeyHref('/knowledge-canvas', {
    investigation: investigationId,
  });

// Search handling
const [searchTerm, setSearchTerm] = useState('');
useEffect(() => {
  // Sync local search term to global store
  useCanvasStore.getState().setSearchTerm(searchTerm);
}, [searchTerm]);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-elevated font-mono text-overline text-foreground-secondary">
          KC
        </span>
        <div className="flex flex-col">
          <span className="text-subheading text-foreground">Knowledge Canvas</span>
          <span className="font-mono text-caption text-foreground-muted">
            {investigationId?.toUpperCase() ?? '...'} · {title}
          </span>
        </div>
      </div>

      {/* Search box */}
      <input
        type="text"
        placeholder="Search nodes..."
        className="flex-1 min-w-0 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-label text-foreground placeholder:text-foreground-muted"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="canvas-search"
      />

      {/* Action buttons – compact with tooltips */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          data-testid="canvas-add-entity"
          title="Add Entity (Ctrl+E)"
          onClick={() => setAddEntityOpen(true)}
        >
          + Entity
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-testid="canvas-add-note"
          title="Add Note (Ctrl+N)"
          onClick={() => setAddNoteOpen(true)}
        >
          + Note
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-testid="canvas-add-evidence"
          title="Add Evidence / File (Ctrl+I)"
          onClick={() => setAddEvidenceOpen(true)}
        >
          + Evidence
        </Button>
      </div>

      <nav
        aria-label="Canvas views"
        className="order-last flex w-full flex-wrap gap-1 lg:order-none lg:ml-6 lg:w-auto"
      >
        {CANVAS_TABS.map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`canvas-tab-${value}`}
            onClick={() => setTab(value)}
            className={
              tab === value
                ? 'rounded-md bg-surface-active px-2.5 py-1 text-label text-foreground'
                : 'rounded-md px-2.5 py-1 text-label text-foreground-secondary hover:bg-surface-hover'
            }
          >
            {TAB_LABELS[value]}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" data-testid="canvas-import" onClick={() => setImportOpen(true)}>
          Ingest
        </Button>
        <Button variant="ghost" size="sm" data-testid="canvas-settings" onClick={() => setSettingsOpen(true)}>
          Settings
        </Button>
        <span className="hidden h-6 w-px bg-border-subtle sm:block" />
        <Button variant="ghost" size="sm" data-testid="canvas-fit" onClick={requestFit}>
          Fit
        </Button>
        <Button variant="ghost" size="sm" data-testid="canvas-minimap" onClick={() => setMinimap(!minimap)}>
          {minimap ? 'Map: on' : 'Map: off'}
        </Button>
        <Button variant="ghost" size="sm" data-testid="canvas-labels" onClick={() => setShowLabels(!showLabels)}>
          Labels: {showLabels ? 'on' : 'off'}
        </Button>
        <Link href={exitHref} data-testid="exit-canvas" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          ← Exit Canvas
        </Link>
      </div>
    </header>
  );
}
