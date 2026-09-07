'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { useGraphStore } from '@/state/graph.store';
import { IconButton } from '@trinetra-pulse/ui';
import { ENTITY_TYPE_LABELS } from '@/lib/format';
import { RELATIONSHIP_KIND_LABELS } from '@/lib/entity-domain';
import { nodeColorFor } from '@/graph/transform';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type {
  EntityType,
  RelationshipIntelligenceStatus,
  RelationshipKind,
} from '@trinetra-pulse/types';
import { RELATIONSHIP_INTELLIGENCE_STATUSES } from '@trinetra-pulse/types';

// ============================================================
// GRAPH FILTERS
// ============================================================
// Filters the visible graph by entity type, relationship type and
// minimum confidence. Filtering updates the graph smoothly without
// destroying the underlying store state.
// ============================================================

const ALL_ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS) as EntityType[];
const ALL_RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_KIND_LABELS) as RelationshipKind[];

const INTELLIGENCE_STATUS_LABELS: Record<RelationshipIntelligenceStatus, string> = {
  NEEDS_REVIEW: 'Needs review',
  REVIEWED: 'Reviewed',
  DISCARDED: 'Discarded',
};

export function GraphFilters() {
  const filters = useGraphStore((s) => s.filters);
  const setFilters = useGraphStore((s) => s.setFilters);
  const edges = useGraphStore((s) => s.edges);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);

  const presentRelationshipTypes = useMemo(() => {
    const set = new Set(edges.map((e) => e.type));
    return ALL_RELATIONSHIP_TYPES.filter((t) => set.has(t));
  }, [edges]);

  const activeFilterCount =
    filters.entityTypes.length +
    filters.relationshipTypes.length +
    filters.intelligenceStatuses.length +
    (filters.minConfidence > 0 ? 1 : 0);

  const toggleEntity = (t: EntityType) => {
    const has = filters.entityTypes.includes(t);
    setFilters({
      entityTypes: has
        ? filters.entityTypes.filter((x) => x !== t)
        : [...filters.entityTypes, t],
    });
  };

  const toggleRelationship = (t: RelationshipKind) => {
    const has = filters.relationshipTypes.includes(t);
    setFilters({
      relationshipTypes: has
        ? filters.relationshipTypes.filter((x) => x !== t)
        : [...filters.relationshipTypes, t],
    });
  };

  const toggleIntelligenceStatus = (s: RelationshipIntelligenceStatus) => {
    const has = filters.intelligenceStatuses.includes(s);
    setFilters({
      intelligenceStatuses: has
        ? filters.intelligenceStatuses.filter((x) => x !== s)
        : [...filters.intelligenceStatuses, s],
    });
  };

  const reset = () =>
    setFilters({ entityTypes: [], relationshipTypes: [], intelligenceStatuses: [], minConfidence: 0 });

  return (
    <div className="relative" data-testid="graph-filters">
      <IconButton
        size="sm"
        variant={activeFilterCount > 0 ? 'filled' : 'ghost'}
        aria-label="Filter graph"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeFilterCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white">
            {activeFilterCount}
          </span>
        )}
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
              <span className="text-sm font-medium text-foreground">Filters</span>
              <div className="flex items-center gap-1">
                {activeFilterCount > 0 && (
                  <button
                    onClick={reset}
                    className="text-[10px] text-foreground-muted hover:text-foreground"
                  >
                    Reset
                  </button>
                )}
                <IconButton size="sm" variant="ghost" aria-label="Close filters" onClick={() => setOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <section aria-label="Entity types">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-foreground-muted">Entity type</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ENTITY_TYPES.map((t) => {
                    const active = filters.entityTypes.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => toggleEntity(t)}
                        aria-pressed={active}
                        className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors"
                        style={
                          active
                            ? { borderColor: nodeColorFor(t), color: nodeColorFor(t) }
                            : undefined
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: nodeColorFor(t) }}
                          aria-hidden="true"
                        />
                        {ENTITY_TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </section>

              {presentRelationshipTypes.length > 0 && (
                <section aria-label="Relationship types">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-foreground-muted">Relationship</p>
                  <div className="flex flex-wrap gap-1.5">
                    {presentRelationshipTypes.map((t) => {
                      const active = filters.relationshipTypes.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleRelationship(t)}
                          aria-pressed={active}
                          className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            active
                              ? 'border-brand bg-brand-subtle text-brand'
                              : 'border-border text-foreground-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {RELATIONSHIP_KIND_LABELS[t]}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section aria-label="Correlation status">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-foreground-muted">Correlation</p>
                <div className="flex flex-wrap gap-1.5">
                  {RELATIONSHIP_INTELLIGENCE_STATUSES.map((s) => {
                    const active = filters.intelligenceStatuses.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleIntelligenceStatus(s)}
                        aria-pressed={active}
                        className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                          active
                            ? 'border-brand bg-brand-subtle text-brand'
                            : 'border-border text-foreground-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {INTELLIGENCE_STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section aria-label="Confidence">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-foreground-muted">Min confidence</p>
                  <span className="text-xs tabular-nums text-foreground">
                    {filters.minConfidence > 0 ? `${(filters.minConfidence * 100).toFixed(0)}%` : 'All'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.95}
                  step={0.05}
                  value={filters.minConfidence}
                  onChange={(e) => setFilters({ minConfidence: Number(e.target.value) })}
                  className="w-full accent-brand"
                  aria-label="Minimum confidence"
                />
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
