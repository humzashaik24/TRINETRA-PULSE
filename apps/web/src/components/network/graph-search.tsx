'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { useGraphStore } from '@/state/graph.store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { NetworkSearchResult } from '@trinetra-pulse/types';

// ============================================================
// GRAPH SEARCH
// ============================================================
// Debounced search across entities, relationships and identifiers
// in the active network. Selecting a result centres, highlights and
// inspects the matching node/edge. Debounce keeps typing smooth.
// ============================================================

export function GraphSearch() {
  const query = useGraphStore((s) => s.searchQuery);
  const results = useGraphStore((s) => s.searchResults);
  const searching = useGraphStore((s) => s.searching);
  const performSearch = useGraphStore((s) => s.performSearch);
  const applySearchResult = useGraphStore((s) => s.applySearchResult);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => {
      if (debounced !== query) {
        void performSearch(debounced);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [debounced, performSearch, query]);

  const handleClear = () => {
    setDebounced('');
    void performSearch('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-xs" data-testid="graph-search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
        <input
          ref={inputRef}
          value={debounced}
          onChange={(e) => {
            setDebounced(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search network…"
          aria-label="Search network"
          className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-8 text-sm text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {searching && (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground-muted" />
        )}
        {debounced && !searching && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && debounced && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg"
          >
            <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
              {results.length === 0 && !searching && (
                <li className="px-3 py-2 text-xs text-foreground-muted">No matching entities or relationships</li>
              )}
              {results.map((r) => (
                <SearchResultRow
                  key={r.id}
                  result={r}
                  onSelect={() => {
                    applySearchResult(r.id);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchResultRow({
  result,
  onSelect,
}: {
  result: NetworkSearchResult;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        role="option"
        aria-selected="false"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{result.label}</span>
          <span className="block text-[10px] uppercase tracking-wide text-foreground-muted">
            {result.kind === 'node' ? result.type : 'relationship'}
          </span>
        </span>
        <span className="shrink-0 text-[10px] font-medium text-foreground-muted">
          {(result.confidence * 100).toFixed(0)}%
        </span>
      </button>
    </li>
  );
}
