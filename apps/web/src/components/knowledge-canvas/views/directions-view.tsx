'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '../canvas-store';
import { getInvestigationDirections } from '@/lib/api/directions';
import type { InvestigationDirectionsResponse } from '@trinetra-pulse/types';
import { DIRECTION_PRIORITY_LABELS, DIRECTION_TYPE_LABELS } from '@/lib/directions-labels';

// ============================================================
// KNOWLEDGE CANVAS — INVESTIGATION DIRECTIONS
// ============================================================
// Read-only analytical next-step leads computed by the Trinetra backend
// (deterministically mirrored in mock mode). Directions are leads, not
// judgements — they suggest where to look next, never guilt.
// ============================================================

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function DirectionsView() {
  const investigationId = useCanvasStore((s) => s.investigationId);
  const [result, setResult] = useState<InvestigationDirectionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!investigationId) return;
    const invId: string = investigationId;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getInvestigationDirections(invId);
        if (!cancelled) setResult(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Directions unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [investigationId]);

  const directions = [...(result?.directions ?? [])].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
      b.confidence - a.confidence,
  );

  return (
    <div data-testid="canvas-directions-view" className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-heading text-foreground">Investigation directions</h2>
        <p className="text-caption text-foreground-muted">
          Prioritized analytical leads for <span className="font-mono">{investigationId ?? '…'}</span>.
          Generated from recorded data — never free-text AI.
        </p>
      </div>

      {loading && <p className="text-caption text-foreground-muted" aria-busy="true">Computing directions…</p>}
      {error && <p className="text-caption text-danger">{error}</p>}

      {directions.length === 0 && !loading && !error && (
        <p className="text-caption text-foreground-muted">No directions suggested yet.</p>
      )}

      <div className="space-y-3">
        {directions.map((d) => (
          <article key={d.id} className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-label text-foreground">{d.title}</h3>
              <span className="font-mono text-overline uppercase tracking-wider text-foreground-secondary">
                {DIRECTION_TYPE_LABELS?.[d.direction_type] ?? d.direction_type}
              </span>
            </div>
            <p className="mt-1 text-body-sm text-foreground-muted">{d.summary}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-caption text-foreground-secondary">
              <span>
                priority:{' '}
                <span
                  className={
                    d.priority === 'critical' || d.priority === 'high'
                      ? 'text-warning'
                      : 'text-foreground'
                  }
                >
                  {DIRECTION_PRIORITY_LABELS?.[d.priority] ?? d.priority}
                </span>
              </span>
              <span>confidence {Math.round(d.confidence * 100)}%</span>
              <span>{d.supporting_facts.length} supporting facts</span>
              <span>{d.related_entity_ids.length} entities</span>
            </div>
            {d.supporting_facts.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-border-subtle pt-2">
                {d.supporting_facts.slice(0, 4).map((fact, i) => (
                  <li key={i} className="text-caption text-foreground-muted">
                    · {fact.description}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}