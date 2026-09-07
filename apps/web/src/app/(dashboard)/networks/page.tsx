'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Network, ArrowRight, Users, GitBranch, Boxes } from 'lucide-react';
import { useAppStore } from '@/state/app.store';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { ErrorState, LoadingState, Badge } from '@trinetra-pulse/ui';
import { getNetworks } from '@/services/network.service';
import type { NetworkSummary } from '@trinetra-pulse/types';

// ============================================================
// NETWORKS — LISTING
// ============================================================
// Index of available investigation networks. Each card links to
// the interactive graph workspace for that network. Counts are
// structural and presented neutrally.
// ============================================================

export default function NetworksPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const [networks, setNetworks] = useState<NetworkSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContextLabel('Networks');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  useEffect(() => {
    getNetworks()
      .then(setNetworks)
      .catch(() => setError('Failed to load networks'))
      .finally(() => {});
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Networks"
        description="Visualize and analyze entity relationship networks"
      />

      {error ? (
        <ErrorState
          title="Could not load networks"
          message={error}
          retry={() => {
            setError(null);
            setNetworks(null);
            getNetworks()
              .then(setNetworks)
              .catch(() => setError('Failed to load networks'));
          }}
        />
      ) : !networks ? (
        <LoadingState message="Loading networks…" />
      ) : networks.length === 0 ? (
        <p className="text-sm text-foreground-muted">No networks available yet.</p>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {networks.map((n) => (
            <motion.div
              key={n.id}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.25 }}
            >
              <Link
                href={`/networks/${n.id}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-network hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="rounded-lg bg-network-subtle p-2 text-network">
                    <Network className="h-4 w-4" />
                  </span>
                  <Badge variant={n.status === 'ready' ? 'success' : n.status === 'building' ? 'info' : 'danger'}>
                    {n.status === 'ready' ? 'Ready' : n.status === 'building' ? 'Building' : 'Error'}
                  </Badge>
                </div>

                <h3 className="mb-0.5 text-sm font-medium text-foreground">{n.name}</h3>
                <p className="mb-4 line-clamp-2 flex-1 text-xs text-foreground-muted">{n.description}</p>

                <div className="flex items-center gap-4 text-[11px] text-foreground-muted">
                  <Metric icon={Users} value={n.nodeCount} label="entities" />
                  <Metric icon={GitBranch} value={n.relationshipCount} label="relationships" />
                  <Metric icon={Boxes} value={n.clusterCount} label="clusters" />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
                  <span className="text-foreground-muted tabular-nums">
                    Updated {new Date(n.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-network transition-transform group-hover:translate-x-0.5">
                    Open graph <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <Icon className="h-3.5 w-3.5 text-foreground-muted" />
      <b className="text-foreground tabular-nums">{value}</b>
      <span>{label}</span>
    </span>
  );
}
