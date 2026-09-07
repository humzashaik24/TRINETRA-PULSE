'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Share2, List, Network as NetworkIcon, X, BarChart3, Database } from 'lucide-react';
import { useAppStore } from '@/state/app.store';
import { useGraphStore } from '@/state/graph.store';
import { useShellStore } from '@/state/shell.store';
import { journeyHref } from '@/navigation/journey';
import { useJourneyFocus, useGraphJourneyFocus } from '@/hooks/use-journey-focus';
import { Button, EmptyState, ErrorState, LoadingState, IconButton, Tooltip } from '@trinetra-pulse/ui';
import { NetworkSummary } from '@/components/network/network-summary';
import { NetworkToolbar } from '@/components/network/network-toolbar';
import { NetworkGraph } from '@/components/network/network-graph';
import { NetworkListView } from '@/components/network/network-list-view';
import { GraphLegend } from '@/components/network/graph-legend';

// ============================================================
// NETWORK WORKSPACE — PRIMARY GRAPH
// ============================================================
// Loads a network into the graph store and hosts its interactive
// workspace: chrome (summary + toolbar) above and either the graph
// canvas or the list view below, with a togglable legend. Node and
// edge selection opens the shell inspector automatically.
// ============================================================

interface NetworkPageProps {
  params: { id: string };
}

export default function NetworkPage({ params }: NetworkPageProps) {
  const id = params.id;
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const loadNetwork = useGraphStore((s) => s.loadNetwork);
  const clearNetwork = useGraphStore((s) => s.clearNetwork);
  const networkId = useGraphStore((s) => s.networkId);
  const loadingState = useGraphStore((s) => s.loadingState);
  const error = useGraphStore((s) => s.error);
  const nodes = useGraphStore((s) => s.nodes);
  const clearContext = useShellStore((s) => s.clearContext);

  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [legendOpen, setLegendOpen] = useState(false);

  const { payload } = useJourneyFocus();
  useGraphJourneyFocus();

  useEffect(() => {
    setContextLabel('Network');
    void loadNetwork(id);
    return () => {
      setContextLabel(null);
      clearNetwork();
      clearContext();
    };
  }, [id, setContextLabel, loadNetwork, clearNetwork, clearContext]);

  const load = () => void loadNetwork(id);

  if (loadingState === 'loading' || loadingState === 'idle') {
    return (
      <div className="p-6 lg:p-8">
        <LoadingState message="Building network…" />
      </div>
    );
  }

  if (loadingState === 'error' || !networkId) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState title="Could not load network" message={error ?? 'Network unavailable'} retry={load} />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <NetworkSummary />
        <EmptyState
          icon={<Database className="h-8 w-8" />}
          title="No investigation data yet"
          description="Upload a CSV or ingest investigation data to begin building the intelligence network."
          action={
            <Link href="/data-intelligence">
              <Button variant="primary" size="sm">Ingest Data</Button>
            </Link>
          }
          className="rounded-lg border border-border bg-surface"
        />
      </div>
    );
  }

  const analyticsHref = journeyHref(`/networks/${id}/analytics`, {
    investigation: payload.investigation ?? undefined,
    focus: payload.focus ?? undefined,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="network-workspace">
      <NetworkSummary />
      <NetworkToolbar />

      <div className="relative flex-1 overflow-hidden">
        {view === 'graph' ? (
          <NetworkGraph />
        ) : (
          <div className="absolute inset-0">
            <NetworkListView />
          </div>
        )}

        <div className="absolute right-4 top-3 z-20 flex items-center gap-1.5">
          <Tooltip content="Open Network Analytics">
            <Link href={analyticsHref} aria-label="Open Network Analytics">
              <IconButton size="sm" variant="ghost" aria-label="Analytics">
                <BarChart3 className="h-4 w-4" />
              </IconButton>
            </Link>
          </Tooltip>
          <div
            className="flex items-center rounded-md border border-border bg-surface p-0.5"
            role="group"
            aria-label="Workspace view"
          >
            <IconButton
              size="sm"
              variant={view === 'graph' ? 'filled' : 'ghost'}
              aria-label="Graph view"
              onClick={() => setView('graph')}
            >
              <NetworkIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              size="sm"
              variant={view === 'list' ? 'filled' : 'ghost'}
              aria-label="List view"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </IconButton>
            <IconButton
              size="sm"
              variant={legendOpen ? 'filled' : 'ghost'}
              aria-label="Toggle legend"
              onClick={() => setLegendOpen((o) => !o)}
            >
              {legendOpen ? <X className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </IconButton>
          </div>
        </div>

        {legendOpen && view === 'graph' && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute right-4 top-12 z-20 w-56"
          >
            <GraphLegend />
          </motion.div>
        )}
      </div>
    </div>
  );
}
