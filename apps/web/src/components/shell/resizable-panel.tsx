'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { transitions, useReducedMotion } from '@trinetra-pulse/ui';
import { useShellStore, INSPECTOR_MIN_WIDTH } from '@/state/shell.store';

// ============================================================
// PHASE 3.5 — RESIZABLE PANEL
// ============================================================
// Reusable horizontal split container. The primary slot flexes to
// fill the remaining width; the panel slot is a fixed-width
// resizable column on the requested edge.
//
// Reusable for: Network, Timeline, Evidence, Entity, Investigation.
// ============================================================

export interface ResizablePanelProps {
  id: string;
  side?: 'left' | 'right';
  /** Controlled panel width in px. Pass 0 to fully collapse the panel. */
  panelWidth: number;
  onPanelWidthChange: (width: number) => void;
  onResizeEnd?: (width: number) => void;
  minPanelWidth?: number;
  /** Max panel width as a fraction (0-1) of the container. */
  maxPanelRatio?: number;
  /** Secondary panel content. */
  panel: React.ReactNode;
  dividerLabel?: string;
  className?: string;
  children: React.ReactNode;
}

const ARROW_STEP = 24;
const SHIFT_STEP = 96;

export function ResizablePanel({
  id,
  side = 'right',
  panelWidth,
  onPanelWidthChange,
  onResizeEnd,
  minPanelWidth = INSPECTOR_MIN_WIDTH,
  maxPanelRatio = 0.45,
  panel,
  dividerLabel = 'Resize panel',
  className,
  children,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const reduced = useReducedMotion();
  const viewport = useShellStore((s) => s.viewport);

  const computeWidth = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return minPanelWidth;
      const rect = container.getBoundingClientRect();
      const maxWidth =
        Math.max(minPanelWidth, rect.width * maxPanelRatio) || minPanelWidth;
      const raw =
        side === 'right'
          ? rect.right - clientX
          : clientX - rect.left;
      return Math.max(minPanelWidth, Math.min(maxWidth, raw));
    },
    [side, minPanelWidth, maxPanelRatio]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      draggingRef.current = true;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      onPanelWidthChange(computeWidth(e.clientX));
    },
    [onPanelWidthChange, computeWidth]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      onResizeEnd?.(computeWidth(e.clientX));
    },
    [onResizeEnd, computeWidth]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = e.shiftKey ? SHIFT_STEP : ARROW_STEP;
      // ArrowRight grows the panel regardless of which edge it is on.
      const delta = e.key === 'ArrowRight' ? step : -step;
      // Route through the same clamp used by pointer drag.
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maxWidth =
        Math.max(minPanelWidth, rect.width * maxPanelRatio) || minPanelWidth;
      const next = Math.max(minPanelWidth, Math.min(maxWidth, panelWidth + delta));
      onPanelWidthChange(next);
    },
    [minPanelWidth, maxPanelRatio, panelWidth, onPanelWidthChange]
  );

  useEffect(() => {
    // Cancel any in-flight drag if the panel collapses.
    return () => {
      draggingRef.current = false;
    };
  }, []);

  const panelMounted = React.Children.count(panel) > 0 && panelWidth > 0;
  const isDesktop = viewport === 'desktop';

  return (
    <div
      ref={containerRef}
      className={cn('relative flex min-w-0 h-full', className)}
      data-resizable-panel={id}
    >
      {/* Primary (workspace) content */}
      <div className="flex-1 min-w-0 h-full">{children}</div>

      {/* Divider */}
      {isDesktop && panelMounted && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={dividerLabel}
          aria-valuenow={Math.round(panelWidth)}
          aria-valuemin={minPanelWidth}
          aria-valuemax={Math.round((containerRef.current?.getBoundingClientRect().width ?? 1) * maxPanelRatio)}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className={cn(
            'group relative z-10 w-1.5 shrink-0 cursor-col-resize',
            'before:absolute before:inset-y-0 before:left-1/2 before:-translate-x-1/2 before:w-px before:bg-border',
            'hover:before:w-[2px] hover:before:bg-border-strong',
            'focus-visible:before:w-[3px] focus-visible:before:bg-ring',
            'tp-transition',
            side === 'right' ? 'order-1' : 'order-0'
          )}
        >
          <span className="sr-only">{dividerLabel}. Use arrow keys to resize.</span>
        </div>
      )}

      {/* Panel */}
      <motion.div
        layout={false}
        initial={false}
        animate={{ width: panelMounted ? panelWidth : 0 }}
        transition={reduced ? { duration: 0 } : transitions.panel}
        className={cn(
          'shrink-0 h-full overflow-hidden',
          side === 'right' ? 'order-2 border-l border-border' : 'order-0 border-r border-border'
        )}
        style={{ width: panelMounted ? panelWidth : 0, minWidth: 0 }}
        aria-hidden={!panelMounted}
      >
        <div
          className="h-full overflow-hidden"
          style={{ width: panelWidth }}
        >
          <AnimatePresence>
            {panelMounted && (
              <motion.div
                key={`${id}-panel-content`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduced ? { duration: 0 } : transitions.fadeFast}
                className="h-full"
              >
                {panel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}