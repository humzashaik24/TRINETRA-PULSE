'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  DEMO_INVESTIGATION_ID,
  useEntityStore,
} from '@/state/entity.store';
import { apiEntityOverviewSummary } from '@/lib/api/entities';
import { isMockData } from '@/lib/api/config';
import * as entityService from '@/services/entity.service';
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

  const {
    all,
    loading,
    error,
    setInvestigationId,
    fetchEntities,
  } = useEntityStore();

  const [mockCounts, setMockCounts] = useState<EntitySummaryCounts | null>(null);

  const refreshMockCounts = useCallback(async () => {
    const s = await entityService.fetchEntityOverviewSummary();
    setMockCounts({
      entities: s.totalEntities,
      candidates: s.totalCandidates,
      pendingResolutions: s.pendingResolutions,
      jobsRunning: s.jobsRunning,
    });
  }, []);

  // Phase 17.7 — API mode reads the persisted investigation-scoped entities
  // through the typed store; mock mode keeps the deterministic universe.
  useEffect(() => {
    setContextLabel('Entities');
    setInvestigationId(DEMO_INVESTIGATION_ID);
    if (isMockData()) {
      void refreshMockCounts();
    } else {
      setMockCounts(null);
    }
    return () => {
      setContextLabel(null);
      setInvestigationId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setContextLabel, setInvestigationId]);

  const load = useCallback(() => {
    if (isMockData()) void refreshMockCounts();
    void fetchEntities();
  }, [fetchEntities, refreshMockCounts]);

  const counts: EntitySummaryCounts | null = useMemo(() => {
    if (isMockData()) return mockCounts;
    // API mode: only the persisted entity count is real; candidates /
    // resolutions / jobs are pipeline surfaces without relational endpoints.
    return apiEntityOverviewSummary(all.length);
  }, [all, mockCounts]);

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
        investigationId: DEMO_INVESTIGATION_ID,
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
              entities={all}
              loading={loading && all.length === 0}
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