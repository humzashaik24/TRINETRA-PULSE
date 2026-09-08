'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EmptyState, ErrorState } from '@trinetra-pulse/ui';
import { BarChart3 } from 'lucide-react';
import { useAnalyticsStore } from '@/state/analytics.store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@trinetra-pulse/ui';
import { AnalyticsSummary } from './analytics-summary';
import { MetricExplorer } from './metric-explorer';
import { CommunityView } from './community-view';
import { ComponentView } from './component-view';
import { BridgeView } from './bridges-view';
import { PatternView } from './patterns-view';
import { TemporalView } from './temporal-view';
import { GraphOverlayLegend } from './graph-overlay-legend';

// ============================================================
// ANALYTICS DASHBOARD — right-hand intelligence panel
// ============================================================

export function AnalyticsDashboard() {
  const bundle = useAnalyticsStore((s) => s.bundle);
  const status = useAnalyticsStore((s) => s.status);
  const error = useAnalyticsStore((s) => s.error);
  const unavailable = new Set(bundle?.metadata?.unavailableSections ?? []);

  if (status === 'failed') {
    return <ErrorState title="Analytics failed" message={error ?? 'Computation error'} className="m-4" />;
  }

  if (!bundle) {
    if (status === 'computing' || status === 'queued') {
      return <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="Computing analytics" description="Running structural analysis over the network…" className="m-4" />;
    }
    return <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="No analytics" description="Open a network to run structural analysis." className="m-4" />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <AnalyticsSummary summary={bundle.summary} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <motion.div
          key={bundle.networkId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Tabs defaultValue="metrics">
            <TabsList>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="communities">Groups</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="bridges">Bridges</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="temporal">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="metrics">
              <MetricExplorer bundle={bundle} unavailable={unavailable.has('influence') && unavailable.has('degree') && unavailable.has('betweenness') && unavailable.has('closeness') && unavailable.has('pagerank')} />
            </TabsContent>
            <TabsContent value="communities">
              <CommunityView communities={bundle.communities} unavailable={unavailable.has('communities')} />
            </TabsContent>
            <TabsContent value="components">
              <ComponentView components={bundle.components} unavailable={unavailable.has('components')} />
            </TabsContent>
            <TabsContent value="bridges">
              <BridgeView bridges={bundle.bridges} relationships={bundle.bridgeRelationships} unavailable={unavailable.has('bridges')} />
            </TabsContent>
            <TabsContent value="patterns">
              <PatternView patterns={bundle.patterns} unavailable={unavailable.has('patterns')} />
            </TabsContent>
            <TabsContent value="temporal">
              <TemporalView temporal={bundle.temporal} unavailable={unavailable.has('temporal')} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2">
        <GraphOverlayLegend />
      </div>
    </div>
  );
}
