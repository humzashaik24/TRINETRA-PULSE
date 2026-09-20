'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '../canvas-store';
import { useInvestigationStore } from '@/state/investigation.store';
import { getSummary, getCommunities, getPatterns } from '@/services/network-analytics.service';
import type {
  NetworkAnalyticsSummary,
  Community,
  StructuralPattern,
} from '@trinetra-pulse/types';

// ============================================================
// KNOWLEDGE CANVAS — NETWORK OVERVIEW (read-only analytics)
// ============================================================
// Reuses the SHARED Trinetra network analytics service — the same
// backend/mock the Networks feature uses. The Canvas never reimplements
// network intelligence and never re-renders the Networks feature: it
// consumes metrics and presents them inline for the analyst.
// ============================================================

function useAnalytics(networkId: string | null) {
  const [summary, setSummary] = useState<NetworkAnalyticsSummary | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [patterns, setPatterns] = useState<StructuralPattern[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!networkId) return;
    const id: string = networkId;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sum, comms, pats] = await Promise.allSettled([
          getSummary(id),
          getCommunities(id),
          getPatterns(id),
        ]);
        if (cancelled) return;
        setSummary(sum.status === 'fulfilled' ? sum.value : null);
        setCommunities(comms.status === 'fulfilled' ? comms.value : []);
        setPatterns(pats.status === 'fulfilled' ? pats.value : []);
      } catch {
        if (!cancelled) setError('Network analytics unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  return { summary, communities, patterns, error, loading };
}

export function NetworkView() {
  const networkId = useCanvasStore((s) => s.networkId);
  const investigationId = useCanvasStore((s) => s.investigationId);
  const investigation = useInvestigationStore((s) => s.data.investigation);
  const { summary, communities, patterns, error, loading } = useAnalytics(networkId);

  const stat = (label: string, value: string | number | null | undefined) => (
    <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
      <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">
        {label}
      </p>
      <p className="font-mono text-subheading text-foreground">{value ?? '—'}</p>
    </div>
  );

  return (
    <div data-testid="canvas-network-view" className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-heading text-foreground">Network overview</h2>
        <p className="text-caption text-foreground-muted">
          Metrics computed by the shared Trinetra network analytics service for{' '}
          <span className="font-mono">{networkId ?? '…'}</span> (investigation{' '}
          {investigationId ?? '…'}).
        </p>
      </div>

      {loading && <p className="text-caption text-foreground-muted" aria-busy="true">Computing analytics…</p>}
      {error && <p className="text-caption text-danger">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stat('Entities', summary.nodes)}
          {stat('Relationships', summary.relationships)}
          {stat('Components', summary.connectedComponents)}
          {stat('Communities', summary.communityCount)}
          {stat('Avg degree', summary.averageDegree)}
          {stat('Density', typeof summary.density === 'number' ? summary.density.toFixed(3) : '—')}
          {stat('Avg path', summary.averagePathLength)}
          {stat('Diameter', summary.diameter)}
        </div>
      )}

      {summary && (summary.topConnectedEntity || summary.networkInfluenceLeader) && (
        <div className="space-y-2">
          <h3 className="text-subheading text-foreground">Centrality</h3>
          <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
            <dl className="space-y-1 font-mono text-caption text-foreground-secondary">
              <div className="flex justify-between gap-4">
                <dt>Top connected entity</dt>
                <dd className="truncate text-foreground">{summary.topConnectedEntity ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Network influence leader</dt>
                <dd className="truncate text-foreground">{summary.networkInfluenceLeader ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Strongest bridge</dt>
                <dd className="truncate text-foreground">{summary.topBridgeEntity ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Bridge entities / links</dt>
                <dd className="text-foreground">
                  {summary.bridgeEntityCount} / {summary.bridgeRelationshipCount}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {communities.length > 0 && (
        <div>
          <h3 className="text-subheading text-foreground">Communities</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {communities.slice(0, 8).map((c) => (
              <div key={c.id} className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
                <p className="text-label text-foreground">{c.label}</p>
                <p className="font-mono text-caption text-foreground-muted">
                  {c.size} entities · cohesion {c.cohesion.toFixed(2)} · bridge{' '}
                  {c.bridgeEntityIds.length}
                </p>
                <p className="mt-1 truncate font-mono text-caption text-foreground-secondary">
                  {c.representativeEntities.slice(0, 3).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {patterns.length > 0 && (
        <div>
          <h3 className="text-subheading text-foreground">Structural patterns</h3>
          <div className="mt-2 space-y-2">
            {patterns.slice(0, 6).map((p) => (
              <div key={p.id} className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-label text-foreground">{p.title}</p>
                  <span className="font-mono text-overline uppercase text-warning">
                    {p.severity}
                  </span>
                </div>
                <p className="mt-1 text-caption text-foreground-muted">{p.description}</p>
                <p className="mt-1 font-mono text-caption text-foreground-secondary">
                  confidence {Math.round(p.confidence * 100)}% · {p.affectedEntities.length}{' '}
                  affected entities
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {investigation && (
        <p className="text-caption text-foreground-muted">
          Investigation: <span className="text-foreground">{investigation.title}</span>
        </p>
      )}
    </div>
  );
}