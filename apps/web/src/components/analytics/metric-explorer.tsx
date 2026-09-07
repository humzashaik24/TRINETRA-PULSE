'use client';

import React, { useMemo } from 'react';
import type { NetworkAnalytics, CentralityType, CentralityResultSet, InfluenceResult } from '@trinetra-pulse/types';
import { Badge, Button } from '@trinetra-pulse/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@trinetra-pulse/ui';
import { Eye } from 'lucide-react';
import { useAnalyticsStore } from '@/state/analytics.store';
import { RankingTable, type RankingRow } from './ranking-table';
import { inspectCentrality, showOnGraph } from './analytics-graph-integration';

// ============================================================
// METRIC EXPLORER — centrality & influence ranking
// ============================================================

type MetricTab = CentralityType | 'influence';

const METRIC_META: Record<MetricTab, { label: string; definition: string }> = {
  degree: { label: 'Connectedness', definition: 'Direct observed relationship count (in + out) per entity.' },
  betweenness: { label: 'Bridge potential', definition: 'How often an entity sits on shortest paths between others — a connector signal.' },
  closeness: { label: 'Reach', definition: 'How quickly an entity can reach the rest of the observed network.' },
  pagerank: { label: 'Influence', definition: 'Network influence from who connects to whom.' },
  influence: { label: 'Network influence', definition: 'Composite 0-100 structural importance blending degree, betweenness, closeness and pagerank.' },
};

function toRows(results: CentralityResultSet['results'] | InfluenceResult[], kind: MetricTab): RankingRow[] {
  if (kind === 'influence') {
    return (results as InfluenceResult[]).map((r) => ({
      entityId: r.entityId,
      label: r.entityId,
      value: r.importance,
      suffix: '',
      secondary: `#${r.rank}`,
    }));
  }
  return (results as CentralityResultSet['results']).map((r) => ({
    entityId: r.entityId,
    label: r.entityId,
    value: r.normalizedScore,
    prefix: '',
    secondary: `#${r.rank}`,
  }));
}

export function MetricExplorer({ bundle }: { bundle: NetworkAnalytics }) {
  const selectedMetric = useAnalyticsStore((s) => s.selectedMetric);
  const overlay = useAnalyticsStore((s) => s.overlay);
  const setSelectedMetric = useAnalyticsStore((s) => s.setSelectedMetric);
  const selectedEntityId = useAnalyticsStore((s) => s.selectedEntityId);

  const sets: Record<MetricTab, { results: CentralityResultSet['results'] | InfluenceResult[]; definition: string }> =
    useMemo(
      () => ({
        degree: { results: bundle.degree?.results ?? [], definition: METRIC_META.degree.definition },
        betweenness: { results: bundle.betweenness?.results ?? [], definition: METRIC_META.betweenness.definition },
        closeness: { results: bundle.closeness?.results ?? [], definition: METRIC_META.closeness.definition },
        pagerank: { results: bundle.pagerank?.results ?? [], definition: METRIC_META.pagerank.definition },
        influence: { results: bundle.influence ?? [], definition: METRIC_META.influence.definition },
      }),
      [bundle]
    );

  const activeTab: MetricTab = selectedMetric ?? 'influence';

  const visualizeTab = (t: MetricTab) => {
    if (t === 'influence') {
      const s = useAnalyticsStore.getState();
      s.setSelectedMetric(null);
      s.setOverlay('influence');
    } else {
      setSelectedMetric(t as CentralityType);
    }
  };

  const onTabChange = (t: string) => {
    if (t === 'influence') {
      const s = useAnalyticsStore.getState();
      s.setSelectedMetric(null);
      s.setOverlay('influence');
    } else {
      setSelectedMetric(t as CentralityType);
    }
  };

  const valueFormatter = (row: RankingRow) =>
    activeTab === 'influence'
      ? row.value.toFixed(1)
      : Math.round(row.value * 100) + '%';

  const onSelectRow = (row: RankingRow) => {
    inspectCentrality(row.entityId, activeTab, row.label);
    showOnGraph(row.entityId);
  };

  return (
    <div>
      <Tabs defaultValue="influence" value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          {(Object.keys(METRIC_META) as MetricTab[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {METRIC_META[t].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(METRIC_META) as MetricTab[]).map((t) => (
          <TabsContent key={t} value={t}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge size="sm" variant="network">
                  Ranked by {METRIC_META[t].label.toLowerCase()}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => visualizeTab(t)}
                disabled={overlay === t}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                {overlay === t ? 'Visualizing' : 'Visualize on graph'}
              </Button>
            </div>
            <p className="mb-3 text-xs text-foreground-muted">{sets[t].definition}</p>
            <RankingTable
              rows={toRows(sets[t].results, t)}
              valueFormatter={valueFormatter}
              onSelect={onSelectRow}
              selectedId={selectedEntityId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
