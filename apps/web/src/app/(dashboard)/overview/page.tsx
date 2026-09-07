'use client';

import { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/state/app.store';
import { useShellStore } from '@/state/shell.store';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import {
  DashboardHeader,
  IntelligenceMetrics,
  NetworkOverview,
  RecentIntelligence,
  ImportantEntities,
  SuspiciousPatterns,
  InvestigationActivityFeed,
  ActiveInvestigations,
  ActiveInvestigationsFooter,
  NetworkStatistics,
  ActivityChart,
} from '@/components/dashboard';
import { ChartCard } from '@trinetra-pulse/ui';
import { resolveDashboardNodeContext } from '@/lib/workspace';
import type { DashboardNetworkNode, RecentIntelligence as RecentFinding, SuspiciousPattern } from '@trinetra-pulse/types';

// Each overview section animates in via the shared Stagger primitive
// (duration 0.2s + 0.05s interval) instead of individually tuned
// delays that could stack to ~1s of idle animation. The whole page
// still gets a single PageTransition from the app shell.

export default function OverviewPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const selectContext = useShellStore((s) => s.selectContext);

  useEffect(() => {
    setContextLabel(null);
    return () => setContextLabel(null);
  }, [setContextLabel]);

  const inspectNode = useCallback(
    (node: DashboardNetworkNode) => {
      selectContext(resolveDashboardNodeContext(node));
    },
    [selectContext]
  );

  const inspectFinding = useCallback(
    (finding: RecentFinding) => {
      selectContext({ type: 'finding', id: finding.id, title: finding.title });
    },
    [selectContext]
  );

  const inspectPattern = useCallback(
    (pattern: SuspiciousPattern) => {
      selectContext({ type: 'finding', id: pattern.id, title: pattern.title });
    },
    [selectContext]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DashboardHeader />

      <Stagger staggerInterval={0.05} triggerOnMount>
        <motion.div variants={staggerChildVariants} className="space-y-6">
          <IntelligenceMetrics />

          {/* Network Overview + Recent Intelligence */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3">
              <NetworkOverview onInspectNode={inspectNode} />
            </div>
            <div className="xl:col-span-2">
              <ChartCard title="Recent Intelligence" subtitle="Latest findings from the intelligence engine">
                <RecentIntelligence onSelect={inspectFinding} />
              </ChartCard>
            </div>
          </div>

          {/* Important Entities */}
          <ChartCard title="Important Entities" subtitle="Ranked by network centrality, connectivity and activity">
            <ImportantEntities />
          </ChartCard>

          {/* Active Investigations */}
          <ChartCard
            title="Active Investigations"
            subtitle="Open cases with review-queue counts — jump straight into lifecycle operations"
          >
            <ActiveInvestigations />
            <ActiveInvestigationsFooter />
          </ChartCard>

          {/* Suspicious Patterns + Investigation Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Suspicious Patterns" subtitle="System-detected anomalies requiring review">
              <SuspiciousPatterns onSelect={inspectPattern} />
            </ChartCard>
            <ChartCard title="Investigation Activity" subtitle="Recent changes across active investigations">
              <InvestigationActivityFeed />
            </ChartCard>
          </div>

          {/* Network Statistics + Activity Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Network Statistics" subtitle="Key intelligence graph metrics">
                <NetworkStatistics />
              </ChartCard>
            </div>
            <div className="lg:col-span-3">
              <ChartCard title="Activity Timeline" subtitle="Events and relationships over the past 7 days">
                <ActivityChart />
              </ChartCard>
            </div>
          </div>
        </motion.div>
      </Stagger>
    </div>
  );
}
