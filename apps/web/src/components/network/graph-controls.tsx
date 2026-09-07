'use client';

import { motion } from 'framer-motion';
import { useGraphStore, type GraphLayoutMode } from '@/state/graph.store';
import { IconButton } from '@trinetra-pulse/ui';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Layout,
  Map as MapIcon,
  Crosshair,
  RotateCcw,
} from 'lucide-react';

// ============================================================
// GRAPH CONTROLS
// ============================================================
// Compact floating control cluster for the graph workspace:
// zoom in/out, fit view, reset layout, cycle layout mode,
// fullscreen toggle and minimap toggle.
// ============================================================

const LAYOUT_CYCLE: GraphLayoutMode[] = ['force', 'hierarchical', 'radial'];

export function GraphControls() {
  const zoomIn = useGraphStore((s) => s.zoomIn);
  const zoomOut = useGraphStore((s) => s.zoomOut);
  const fitView = useGraphStore((s) => s.fitView);
  const layout = useGraphStore((s) => s.layout);
  const setLayout = useGraphStore((s) => s.setLayout);
  const fullscreen = useGraphStore((s) => s.fullscreen);
  const setFullscreen = useGraphStore((s) => s.setFullscreen);
  const minimapVisible = useGraphStore((s) => s.minimapVisible);
  const toggleMinimap = useGraphStore((s) => s.toggleMinimap);

  const cycleLayout = () => {
    const idx = LAYOUT_CYCLE.indexOf(layout);
    const next = LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length];
    setLayout(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 rounded-lg border border-border bg-surface/90 p-1 backdrop-blur-sm"
      data-testid="graph-controls"
    >
      <IconButton size="sm" variant="ghost" aria-label="Zoom in" onClick={zoomIn}>
        <ZoomIn className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" variant="ghost" aria-label="Zoom out" onClick={zoomOut}>
        <ZoomOut className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" variant="ghost" aria-label="Fit view" onClick={fitView}>
        <Crosshair className="h-4 w-4" />
      </IconButton>
      <div className="my-0.5 h-px bg-border" />
      <IconButton size="sm" variant="ghost" aria-label={`Layout: ${layout}`} onClick={cycleLayout}>
        <Layout className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" variant="ghost" aria-label="Reset layout" onClick={fitView}>
        <RotateCcw className="h-4 w-4" />
      </IconButton>
      <div className="my-0.5 h-px bg-border" />
      <IconButton
        size="sm"
        variant={minimapVisible ? 'filled' : 'ghost'}
        aria-label={`${minimapVisible ? 'Hide' : 'Show'} minimap`}
        onClick={toggleMinimap}
      >
        <MapIcon className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="sm"
        variant={fullscreen ? 'filled' : 'ghost'}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        onClick={() => setFullscreen(!fullscreen)}
      >
        {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </IconButton>
    </motion.div>
  );
}
