'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/state/app.store';
import type { EntityIntelligence } from '@trinetra-pulse/types';
import { useShellStore } from '@/state/shell.store';
import {
  EntityIntelligenceHeader,
  EntityTable,
  SummaryStrip,
  type EntitySummaryCounts,
} from '@/components/entity-intelligence';
import {
  fetchEntities,
  fetchEntityOverviewSummary,
} from '@/services/entity.service';
import {
  Button,
  Panel,
  Stagger,
  staggerChildVariants,
} from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function EntitiesPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const selectContext = useShellStore((s) => s.selectContext);

  const [entities, setEntities] = useState<Awaited<ReturnType<typeof fetchEntities>>['items']>([]);
  const [counts, setCounts] = useState<EntitySummaryCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchEntities({ pageSize: 200 }), fetchEntityOverviewSummary()])
      .then(([list, summary]) => {
        setEntities(list.items);
        setCounts({
          entities: summary.totalEntities,
          candidates: summary.totalCandidates,
          pendingResolutions: summary.pendingResolutions,
          jobsRunning: summary.jobsRunning,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load entities'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setContextLabel('Entities');
    load();
    return () => setContextLabel(null);
  }, [setContextLabel, load]);

  const handleEntityClick = useCallback(
    (entity: EntityIntelligence) => {
      // Context preservation: open the inspector in place instead of
      // navigating away. Full entity detail is reachable from the
      // inspector's "Open" action.
      selectContext({
        type: 'entity',
        id: entity.id,
        name: entity.displayName,
        entityType: entity.entityType,
      });
    },
    [selectContext]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EntityIntelligenceHeader
        title="Entities"
        description="Canonical records, resolution state, confidence, and linkage for every extracted entity"
        actions={
          <Button variant="secondary" size="sm" onClick={load} loading={loading} aria-label="Refresh entities">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <SummaryStrip
        counts={
          counts ?? { entities: 0, candidates: 0, pendingResolutions: 0, jobsRunning: 0 }
        }
        loading={loading || !counts}
      />

      <Stagger staggerInterval={0.05}>
        <motion.div variants={staggerChildVariants}>
          <Panel
            noPadding
            header={
              <div>
                <div className="text-subheading text-foreground">All entities</div>
                <div className="text-body-sm text-foreground-muted mt-0.5">
                  Filter by type and resolution state, sort by any column.
                </div>
              </div>
            }
          >
            <EntityTable
              entities={entities}
              loading={loading && entities.length === 0}
              error={error}
              onRetry={load}
              onView={handleEntityClick}
            />
          </Panel>
        </motion.div>
      </Stagger>
    </div>
  );
}