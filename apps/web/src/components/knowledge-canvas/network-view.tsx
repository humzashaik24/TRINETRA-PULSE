'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Boxes, ExternalLink } from 'lucide-react';
import { buttonVariants, ChartCard, EmptyState, ErrorState, LoadingState } from '@trinetra-pulse/ui';
import { useGraphStore } from '@/state/graph.store';
import { NetworkGraph } from '@/components/network/network-graph';
import { journeyHref } from '@/navigation/journey';

// ============================================================
// KNOWLEDGE CANVAS — NETWORK PREVIEW
// ============================================================
// Embeds the primary graph workspace so the expanded CDR/CSV
// projection is visible right inside the canvas. Re-loads the graph
// when the CDR view applies a new expansion (reloadKey changes).
// ============================================================

interface NetworkViewProps {
  networkId: string;
  investigationId: string;
  reloadKey: number;
}

export function NetworkView({ networkId, investigationId, reloadKey }: NetworkViewProps) {
  const loadNetwork = useGraphStore((s) => s.loadNetwork);
  const loadingState = useGraphStore((s) => s.loadingState);
  const error = useGraphStore((s) => s.error);
  const loadedNetworkId = useGraphStore((s) => s.networkId);
  const appliedKey = useRef<number | null>(null);

  useEffect(() => {
    const needsReload =
      loadedNetworkId !== networkId ||
      appliedKey.current !== reloadKey ||
      loadingState === 'idle';
    if (needsReload) {
      appliedKey.current = reloadKey;
      void loadNetwork(networkId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkId, reloadKey]);

  const openInWorkspace = journeyHref(`/networks/${networkId}`, {
    investigation: investigationId,
  });

  return (
    <ChartCard
      title="Network graph"
      subtitle="Live projection of the active network including CDR / CSV expansions"
      action={
        <Link
          href={openInWorkspace}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          Open in Network Workspace <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
        </Link>
      }
    >
      {loadingState === 'loading' || loadingState === 'idle' ? (
        <div className="h-[560px] flex items-center justify-center">
          <LoadingState message="Building network…" />
        </div>
      ) : loadingState === 'error' ? (
        <div className="h-[560px] flex items-center justify-center">
          <ErrorState title="Could not load network" message={error ?? 'Network unavailable'} retry={() => void loadNetwork(networkId)} />
        </div>
      ) : loadedNetworkId !== networkId ? (
        <div className="h-[560px] flex items-center justify-center">
          <EmptyState
            icon={<Boxes className="h-8 w-8" />}
            title="No graph loaded"
            description={`The active network is ${networkId}. Load it to inspect the projection.`}
          />
        </div>
      ) : (
        <div className="h-[560px] rounded-lg border border-border bg-surface overflow-hidden">
          <NetworkGraph />
        </div>
      )}
    </ChartCard>
  );
}