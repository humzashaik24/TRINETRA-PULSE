'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { ErrorState, LoadingState, IconButton, Tooltip } from '@trinetra-pulse/ui';
import { useGraphStore } from '@/state/graph.store';
import { useAnalyticsStore } from '@/state/analytics.store';
import { useAppStore } from '@/state/app.store';
import { journeyHref } from '@/navigation/journey';
import { useJourneyFocus, useGraphJourneyFocus } from '@/hooks/use-journey-focus';
import { NetworkGraph } from '@/components/network/network-graph';
import { AnalyticsToolbar } from '@/components/analytics/analytics-toolbar';
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

// ============================================================
// NETWORK ANALYTICS — structural intelligence workspace
// ============================================================
// Phase 8: loads the network graph, runs the analytics engine
// (via the analytics store) and presents the analytical dashboard
// alongside the live graph canvas. Graph overlays / selections
// are driven by the analytics store so the analyst can compare
// connectivity visually. Analytical, never accusatory.
// ============================================================

interface AnalyticsPageProps {
  params: { id: string };
}

export default function NetworkAnalyticsPage({ params }: AnalyticsPageProps) {
  const id = params.id;
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const loadNetwork = useGraphStore((s) => s.loadNetwork);
  const clearNetwork = useGraphStore((s) => s.clearNetwork);
  const loadAnalytics = useAnalyticsStore((s) => s.loadAnalytics);
  const clearAnalytics = useAnalyticsStore((s) => s.clear);
  const networkId = useGraphStore((s) => s.networkId);
  const loadingState = useGraphStore((s) => s.loadingState);
  const error = useGraphStore((s) => s.error);
  const networkName = useGraphStore((s) => s.summary?.name);

  useJourneyFocus();
  useGraphJourneyFocus();
  const journeyPayload = useJourneyFocus().payload;

  useEffect(() => {
    setContextLabel('Analytics');
    void loadNetwork(id);
    void loadAnalytics(id);
    return () => {
      setContextLabel(null);
      clearNetwork();
      clearAnalytics();
    };
  }, [id, setContextLabel, loadNetwork, clearNetwork, loadAnalytics, clearAnalytics]);

  if (loadingState === 'loading' || loadingState === 'idle') {
    return (
      <div className="p-6 lg:p-8">
        <LoadingState message="Preparing analytics…" />
      </div>
    );
  }

  if (loadingState === 'error' || !networkId) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState title="Could not load network" message={error ?? 'Network unavailable'} retry={() => void loadNetwork(id)} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="analytics-workspace">
      <div className="flex items-center gap-1 px-2 pt-1">
        <Tooltip content="Back to network workspace">
          <Link
            href={journeyHref(`/networks/${id}`, {
              investigation: journeyPayload.investigation ?? undefined,
              focus: journeyPayload.focus ?? undefined,
            })}
            aria-label="Back to network workspace"
          >
            <IconButton size="sm" variant="ghost" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </IconButton>
          </Link>
        </Tooltip>
        <span className="tp-data-label flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5" />
          Network Analytics
        </span>
      </div>

      <AnalyticsToolbar networkName={networkName ?? id} />

      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <NetworkGraph />
        </div>
        <div className="w-[380px] shrink-0 border-l border-border bg-surface/40" data-testid="analytics-dashboard">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}
