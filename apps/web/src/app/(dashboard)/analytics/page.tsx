'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChartCard,
  EmptyState,
  ErrorState,
  Badge,
  Button,
} from '@trinetra-pulse/ui';
import {
  BarChart3,
  Users,
  Network,
  Link2,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/state/app.store';
import { useGraphStore } from '@/state/graph.store';
import { useAnalyticsStore } from '@/state/analytics.store';
import { DEMO_NETWORK_ID } from '@/navigation/journey';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { StatCard } from '@/components/analytics/viz';
import { MetricExplorer } from '@/components/analytics/metric-explorer';
import { CommunityView } from '@/components/analytics/community-view';
import { BridgeView } from '@/components/analytics/bridges-view';
import { formatSummaryValue } from '@/components/analytics/analytics-summary';

const HUE_PALETTE = [210, 160, 30, 285, 340, 100, 12, 195, 60, 250, 320, 140];

function communityColor(i: number) {
  return `hsl(${HUE_PALETTE[i % HUE_PALETTE.length]}, 70%, 55%)`;
}

export default function AnalyticsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  const networkId = useGraphStore((s) => s.networkId);
  const graphNodes = useGraphStore((s) => s.nodes);
  const graphEdges = useGraphStore((s) => s.edges);

  const bundle = useAnalyticsStore((s) => s.bundle);
  const status = useAnalyticsStore((s) => s.status);
  const error = useAnalyticsStore((s) => s.error);
  const loadAnalytics = useAnalyticsStore((s) => s.loadAnalytics);

  useEffect(() => {
    setContextLabel('Analytics');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  useEffect(() => {
    if (networkId && graphNodes.length > 0) {
      void loadAnalytics(networkId);
    }
  }, [networkId, graphNodes.length, loadAnalytics]);

  const autoLoadAttempted = useRef(false);
  const loadNetwork = useGraphStore((s) => s.loadNetwork);
  const graphLoadingState = useGraphStore((s) => s.loadingState);

  useEffect(() => {
    if (autoLoadAttempted.current) return;
    if (networkId && graphNodes.length === 0 && graphLoadingState === 'idle') {
      autoLoadAttempted.current = true;
      void loadNetwork(networkId).catch(() => void loadNetwork(DEMO_NETWORK_ID));
    } else if (!networkId && !autoLoadAttempted.current) {
      autoLoadAttempted.current = true;
      void loadNetwork(DEMO_NETWORK_ID);
    }
  }, [networkId, graphNodes.length, graphLoadingState, loadNetwork]);

  const isComputing = status === 'computing' || status === 'queued';
  const loading = !bundle;
  const unavailable = useMemo(
    () => new Set(bundle?.metadata?.unavailableSections ?? []),
    [bundle]
  );

  const summaryValues = useMemo(
    () => formatSummaryValue(bundle?.summary ?? null),
    [bundle]
  );

  if (!networkId || graphNodes.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <WorkspaceHeader
          eyebrow="WORKSPACE"
          title="Analytics"
          description="Structural analysis and intelligence metrics for active networks"
        />
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No network loaded"
          description="Open an investigation to run structural network analytics."
        />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <WorkspaceHeader
          eyebrow="WORKSPACE"
          title="Analytics"
          description="Structural analysis and intelligence metrics for active networks"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadAnalytics(networkId)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          }
        />
        <ErrorState
          title="Analytics computation failed"
          message={error ?? 'An unexpected error occurred during analysis.'}
          retry={() => void loadAnalytics(networkId)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <WorkspaceHeader
          eyebrow="WORKSPACE"
          title="Analytics"
          description="Structural analysis and intelligence metrics for active networks"
        />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative h-8 w-8 mb-3">
            <div className="absolute inset-0 rounded-full border-2 border-surface-active" />
            <div className="absolute inset-0 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-foreground-muted">
            {isComputing ? 'Computing network analytics…' : 'Loading network analytics…'}
          </p>
        </div>
      </div>
    );
  }

  const summary = bundle?.summary;
  const communities = bundle?.communities ?? [];
  const bridges = bundle?.bridges ?? [];
  const bridgeRelationships = bundle?.bridgeRelationships ?? [];
  const density = bundle?.density;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Analytics"
        description={`Structural analysis for network ${networkId}`}
        actions={
          <div className="flex items-center gap-2">
            {bundle?.metadata?.computedAt && (
              <span className="text-xs text-foreground-muted">
                Computed {new Date(bundle.metadata.computedAt).toLocaleTimeString()}
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadAnalytics(networkId)}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Recompute
            </Button>
          </div>
        }
      />

      {/* ── Summary stats ── */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChartCard title="Network Overview" subtitle="Key structural statistics">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                label="Entities"
                value={summaryValues.nodes ?? '—'}
                accent="hsl(210,80%,55%)"
                hint={`${summary.nodes} nodes in network`}
              />
              <StatCard
                label="Observed Ties"
                value={summaryValues.relationships ?? '—'}
                accent="hsl(160,70%,45%)"
                hint={`${summary.relationships} relationships`}
              />
              <StatCard
                label="Communities"
                value={summaryValues.communities ?? '—'}
                accent="hsl(30,80%,55%)"
              />
              <StatCard
                label="Components"
                value={summaryValues.components ?? '—'}
                accent="hsl(285,70%,55%)"
              />
              <StatCard
                label="Density"
                value={summaryValues.density ?? '—'}
                accent="hsl(340,70%,55%)"
                hint={density?.interpretation}
              />
              <StatCard
                label="Bridge Entities"
                value={summaryValues.bridges ?? '—'}
                accent="hsl(12,80%,55%)"
              />
            </div>
          </ChartCard>
        </motion.div>
      )}

      {/* ── Supplementary stats row ── */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <ChartCard title="Detailed Statistics" subtitle="Extended network metrics">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Avg Degree"
                value={summaryValues.averageDegree ?? '—'}
                hint="Average direct ties per entity"
              />
              <StatCard
                label="Avg Path Length"
                value={summaryValues.averagePath ?? '—'}
                hint={summary.averagePathLength !== null ? 'Mean shortest path' : 'Not computed'}
              />
              <StatCard
                label="Diameter"
                value={summary.diameter !== null ? String(summary.diameter) : '—'}
                hint="Longest shortest path"
              />
              <StatCard
                label="Largest Component"
                value={summary.largestComponentSize ? String(summary.largestComponentSize) : '—'}
                hint="Nodes in the biggest connected subgraph"
              />
              <StatCard
                label="Isolated Entities"
                value={summary.isolatedEntityCount !== undefined ? String(summary.isolatedEntityCount) : '—'}
                hint="Entities with no observed ties"
              />
            </div>
            {density && (
              <p className="mt-3 text-xs text-foreground-muted">{density.interpretation}</p>
            )}
          </ChartCard>
        </motion.div>
      )}

      {/* ── Centrality & Influence Rankings ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <ChartCard
          title="Centrality & Influence Rankings"
          subtitle="Top entities by structural importance metrics"
          action={
            !unavailable.has('influence') ? (
              <Badge size="sm" variant="network">
                {bundle?.influence?.length ?? 0} ranked entities
              </Badge>
            ) : undefined
          }
        >
          <MetricExplorer
            bundle={bundle}
            unavailable={
              unavailable.has('influence') &&
              unavailable.has('degree') &&
              unavailable.has('betweenness') &&
              unavailable.has('closeness') &&
              unavailable.has('pagerank')
            }
          />
        </ChartCard>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Communities ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <ChartCard
            title="Community Detection"
            subtitle="Clusters of densely connected entities"
            action={
              communities.length > 0 ? (
                <Badge size="sm" variant="info">
                  {communities.length} groups
                </Badge>
              ) : undefined
            }
          >
            <CommunityView
              communities={communities}
              unavailable={unavailable.has('communities')}
            />
          </ChartCard>
        </motion.div>

        {/* ── Bridge Entities ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          <ChartCard
            title="Bridge Entities"
            subtitle="Connectors between otherwise separate parts of the network"
            action={
              bridges.length > 0 ? (
                <Badge size="sm" variant="warning">
                  {bridges.length} bridges
                </Badge>
              ) : undefined
            }
          >
            <BridgeView
              bridges={bridges}
              relationships={bridgeRelationships}
              unavailable={unavailable.has('bridges')}
            />
          </ChartCard>
        </motion.div>
      </div>

      {/* ── Connected Components ── */}
      {bundle?.components && bundle.components.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.25 }}
        >
          <ChartCard
            title="Connected Components"
            subtitle="Disconnected subgraphs within the network"
          >
            {unavailable.has('components') ? (
              <p className="py-6 text-center text-xs text-foreground-muted">
                Component analysis is unavailable from the API for this network.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {bundle.components.map((comp) => (
                  <div
                    key={comp.componentId}
                    className="rounded-lg border border-border bg-surface/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {comp.componentId}
                      </span>
                      <Badge size="sm" variant="secondary">
                        {comp.nodeCount} entities
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-foreground-muted">
                      <span>{comp.edgeCount} ties</span>
                      <span>density {Math.round(comp.density * 100)}%</span>
                    </div>
                    {comp.representativeNode && (
                      <p className="mt-1.5 text-[11px] text-foreground-muted">
                        Representative: <span className="font-medium text-foreground">{comp.representativeNode}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </motion.div>
      )}

      {/* ── Network Density Visualisation ── */}
      {density && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          <ChartCard
            title="Network Density"
            subtitle="Ratio of observed ties to possible ties"
          >
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full" aria-label={`Density: ${Math.round(density.density * 100)}%`}>
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="hsl(210,80%,55%)"
                    strokeWidth="3"
                    strokeDasharray={`${density.density * 100} ${100 - density.density * 100}`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-foreground">
                    {Math.round(density.density * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Observed ties</span>
                  <span className="font-mono text-foreground">{density.actualEdges}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Possible ties</span>
                  <span className="font-mono text-foreground">{density.possibleEdges}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Density</span>
                  <span className="font-mono text-foreground">{density.density.toFixed(4)}</span>
                </div>
                <p className="pt-1 text-[11px] text-foreground-muted">{density.interpretation}</p>
              </div>
            </div>
          </ChartCard>
        </motion.div>
      )}

      {/* ── Metadata footer ── */}
      {bundle?.metadata && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.35 }}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
            <span>Algorithm: {bundle.metadata.algorithm}</span>
            <span>Version: {bundle.metadata.version}</span>
            <span>Scope: {bundle.metadata.scope}</span>
            <span>Nodes analysed: {bundle.metadata.nodeCount}</span>
            {bundle.metadata.timeRange.from && (
              <span>
                From {bundle.metadata.timeRange.from}
                {bundle.metadata.timeRange.to ? ` → ${bundle.metadata.timeRange.to}` : ''}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
