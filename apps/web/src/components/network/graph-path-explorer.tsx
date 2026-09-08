'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Route, X, Loader2, Search as SearchIcon } from 'lucide-react';
import { useGraphStore } from '@/state/graph.store';
import { IconButton } from '@trinetra-pulse/ui';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ============================================================
// GRAPH PATH EXPLORER
// ============================================================
// Finds the shortest relationship path between two entities and
// highlights it in the graph. The result names each hop neutrally
// ("A → B → C") with a path-level confidence, and can be cleared
// to remove the highlight.
// ============================================================

export function GraphPathExplorer() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const path = useGraphStore((s) => s.path);
  const pathLoading = useGraphStore((s) => s.pathLoading);
  const findPath = useGraphStore((s) => s.findPath);
  const clearPath = useGraphStore((s) => s.clearPath);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const pathNames = useMemo(() => {
    if (!path) return [];
    return path.nodeIds.map((id) => nodeById.get(id)?.label ?? id);
  }, [path, nodeById]);

  const canRun = fromId && toId && fromId !== toId;

  const run = () => {
    if (!canRun) return;
    void findPath(fromId, toId);
  };

  return (
    <div className="relative" data-testid="graph-path-explorer">
      <IconButton
        size="sm"
        variant={path ? 'filled' : 'ghost'}
        aria-label="Find path between entities"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && path) clearPath();
        }}
      >
        <Route className="h-4 w-4" />
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
              <span className="text-sm font-medium text-foreground">Path explorer</span>
              <IconButton size="sm" variant="ghost" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </div>

            <div className="space-y-2 text-sm">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-foreground-muted">From</span>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                >
                  <option value="">Select entity…</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-foreground-muted">To</span>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-foreground"
                >
                  <option value="">Select entity…</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={run}
                disabled={!canRun || pathLoading}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-2 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {pathLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SearchIcon className="h-3.5 w-3.5" />}
                Find path
              </button>

              {path && (
                <div className="mt-2 rounded-md border border-border bg-surface-elevated p-2">
                  {pathNames.length > 0 && (
                    <p className="mb-1 flex flex-wrap items-center gap-1 text-xs text-foreground">
                      {pathNames.map((name, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-foreground-muted">→</span>}
                          <span>{name}</span>
                        </span>
                      ))}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-foreground-muted">
                      {path.length} hop{path.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      {path.confidence === null
                        ? 'Confidence unavailable'
                        : `${(path.confidence * 100).toFixed(0)}% confidence`}
                    </span>
                  </div>
                  <button
                    onClick={() => void clearPath()}
                    className="mt-1.5 text-[11px] text-foreground-muted hover:text-foreground"
                  >
                    Clear highlight
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
