'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarRange, X } from 'lucide-react';
import { useGraphStore } from '@/state/graph.store';
import { IconButton } from '@trinetra-pulse/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ============================================================
// GRAPH TIMELINE
// ============================================================
// Filters the visible graph to a date window using relationship
// timestamps. "All time" clears the range. Dates are derived from
// the loaded edges so bounds reflect the actual network.
// ============================================================

export function GraphTimeline() {
  const edges = useGraphStore((s) => s.edges);
  const timeline = useGraphStore((s) => s.timeline);
  const setTimeline = useGraphStore((s) => s.setTimeline);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  const active = timeline.from !== null || timeline.to !== null;

  const { minDate, maxDate } = useMemo(() => {
    const times = edges
      .map((e) => e.timestamp)
      .filter((t): t is string => typeof t === 'string')
      .map((t) => new Date(t).getTime())
      .filter((t) => !Number.isNaN(t));
    if (times.length === 0) return { minDate: undefined, maxDate: undefined };
    return { minDate: new Date(Math.min(...times)), maxDate: new Date(Math.max(...times)) };
  }, [edges]);

  const toInput = (d: Date | string | null | undefined) => {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 10);
  };

  const clear = () => setTimeline({ from: null, to: null });

  return (
    <div className="relative" data-testid="graph-timeline">
      <IconButton
        size="sm"
        variant={active ? 'filled' : 'ghost'}
        aria-label="Filter by date range"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarRange className="h-4 w-4" />
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-border bg-surface p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Timeline</span>
              <IconButton size="sm" variant="ghost" aria-label="Close timeline" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </div>

            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-foreground-muted">From</span>
                <input
                  type="date"
                  min={minDate ? toInput(minDate) : undefined}
                  max={maxDate ? toInput(maxDate) : undefined}
                  value={toInput(timeline.from)}
                  onChange={(e) => setTimeline({ from: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-foreground-muted">To</span>
                <input
                  type="date"
                  min={minDate ? toInput(minDate) : undefined}
                  max={maxDate ? toInput(maxDate) : undefined}
                  value={toInput(timeline.to)}
                  onChange={(e) => setTimeline({ to: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                />
              </label>

              {minDate && maxDate && (
                <p className="text-[10px] text-foreground-muted">
                  Network spans {toInput(minDate)} — {toInput(maxDate)}
                </p>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={clear}
                  className="text-[11px] text-foreground-muted hover:text-foreground"
                >
                  All time
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-surface-elevated px-2 py-1 text-[11px] text-foreground-secondary hover:bg-surface-hover"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
