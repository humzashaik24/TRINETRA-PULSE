'use client';

import { RELATIONSHIP_KIND_LABELS } from '@/lib/entity-domain';
import type { GraphEdge } from '@trinetra-pulse/types';

// ============================================================
// GRAPH RELATIONSHIP LIST
// ============================================================
// Flat, scrollable list of visible relationships. Each row names
// the source and target and tags the relationship as observed
// (extracted from source data) or inferred (model-derived), with
// confidence. Selecting a row selects the matching edge.
// ============================================================

export interface GraphRelationshipListProps {
  edges: GraphEdge[];
  nodeLabelById: Map<string, string>;
  selectedId: string | null;
  onSelect: (edgeId: string) => void;
}

// Inferred = derived by a model rather than observed directly in
// source material. Never implies certainty about criminality.
const INFERRED_METHODS: ReadonlySet<string> = new Set(['ML', 'LLM', 'NLP']);

export function isInferredRelationship(edge: GraphEdge): boolean {
  return INFERRED_METHODS.has(edge.extractionMethod);
}

export function GraphRelationshipList({
  edges,
  nodeLabelById,
  selectedId,
  onSelect,
}: GraphRelationshipListProps) {
  return (
    <ul className="divide-y divide-border" data-testid="graph-relationship-list">
      {edges.map((e) => {
        const active = e.id === selectedId;
        const inferred = isInferredRelationship(e);
        const sourceName = nodeLabelById.get(e.source) ?? e.source;
        const targetName = nodeLabelById.get(e.target) ?? e.target;
        return (
          <li key={e.id}>
            <button
              onClick={() => onSelect(e.id)}
              aria-pressed={active}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                active ? 'bg-surface-hover' : 'hover:bg-surface-hover/60'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">
                  {sourceName}
                  <span className="mx-1 text-foreground-muted">→</span>
                  {targetName}
                </span>
                <span className="block truncate text-[10px] uppercase tracking-wide text-foreground-muted">
                  {RELATIONSHIP_KIND_LABELS[e.type]} · {(e.confidence * 100).toFixed(0)}%
                </span>
              </span>
              <span className="shrink-0">
                {inferred ? (
                  <span className="rounded border border-dashed border-foreground-muted px-1.5 py-0.5 text-[9px] uppercase text-foreground-muted">
                    Inferred
                  </span>
                ) : (
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[9px] uppercase text-foreground-muted">
                    Observed
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
