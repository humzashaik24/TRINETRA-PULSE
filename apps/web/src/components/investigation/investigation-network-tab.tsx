'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Network as NetworkIcon, BarChart3, ExternalLink } from 'lucide-react';
import { Badge, IconButton, Tooltip } from '@trinetra-pulse/ui';
import { useInvestigationStore } from '@/state/investigation.store';
import { useGraphStore } from '@/state/graph.store';
import { NetworkGraph } from '@/components/network/network-graph';

// ============================================================
// INVESTIGATION — NETWORK TAB
// ============================================================
// Reuses the Phase 7 knowledge-graph workspace (NO engine fork).
// Loads the investigation's primary linked network into the graph
// store and renders the shared <NetworkGraph/>. An investigation-
// scoped header surfaces the linked network and links to the full
// analytics workspace for that network.
// ============================================================

export function InvestigationNetworkTab() {
  const networks = useInvestigationStore((s) => s.data.networks);
  const loadNetwork = useGraphStore((s) => s.loadNetwork);
  const clearNetwork = useGraphStore((s) => s.clearNetwork);
  const networkId = useGraphStore((s) => s.networkId);
  const loadingState = useGraphStore((s) => s.loadingState);

  const primary = useMemo(() => networks[0] ?? null, [networks]);

  useEffect(() => {
    if (primary) {
      void loadNetwork(primary.network_id);
    } else {
      clearNetwork();
    }
    return () => clearNetwork();
  }, [primary, loadNetwork, clearNetwork]);

  if (!primary) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center" data-testid="investigation-network-empty">
        <NetworkIcon className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
        <p className="text-sm font-medium text-foreground">No linked network</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-foreground-muted">
          Link a canonical network to this investigation to visualize its connected entities and relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="investigation-network-tab">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="network" size="sm">
            <NetworkIcon className="mr-1 h-3 w-3" />
            Linked network
          </Badge>
          <span className="text-sm font-medium text-foreground">{primary.name}</span>
          <span className="font-mono text-xs text-foreground-muted">{primary.network_id}</span>
        </div>
        <Tooltip content="Open Network Analytics">
          <Link href={`/networks/${primary.network_id}/analytics`} aria-label="Open Network Analytics" data-testid="network-analyze-link">
            <IconButton size="sm" variant="ghost" aria-label="Analytics">
              <BarChart3 className="h-4 w-4" />
            </IconButton>
          </Link>
        </Tooltip>
      </div>

      {loadingState === 'loading' || loadingState === 'idle' ? (
        <div className="flex h-[420px] items-center justify-center rounded-xl border border-border bg-surface">
          <p className="text-sm text-foreground-muted">Building network…</p>
        </div>
      ) : loadingState === 'error' || !networkId ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-xl border border-border bg-surface">
          <p className="text-sm text-foreground">Could not load network</p>
          <Link
            href={`/networks/${primary.network_id}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            Open full network workspace <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="h-[480px] overflow-hidden rounded-xl border border-border bg-surface">
          <NetworkGraph />
        </div>
      )}
    </div>
  );
}
