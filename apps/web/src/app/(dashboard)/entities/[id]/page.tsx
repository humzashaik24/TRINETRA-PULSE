'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/app.store';
import { EntityDetail, EntityDetailHeader } from '@/components/entity-intelligence';
import { fetchEntityDetailBundle } from '@/services/entity.service';
import { loadEntityDetailBundle } from '@/lib/api/entities';
import { isMockData } from '@/lib/api/config';
import { DEMO_INVESTIGATION_ID } from '@/state/entity.store';
import { ErrorState, LoadingState, Panel } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { Button } from '@trinetra-pulse/ui';
import { Network } from 'lucide-react';
import { journeyHref, DEMO_NETWORK_ID } from '@/navigation/journey';

interface EntityDetailPageProps {
  params: { id: string };
}

export default function EntityDetailPage({ params }: EntityDetailPageProps) {
  const id = params.id;
  const router = useRouter();
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mockBundle, setMockBundle] = useState<Awaited<
    ReturnType<typeof fetchEntityDetailBundle>
  > | null>(null);
  const [apiBundle, setApiBundle] = useState<Awaited<
    ReturnType<typeof loadEntityDetailBundle>
  > | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    if (isMockData()) {
      fetchEntityDetailBundle(id)
        .then(setMockBundle)
        .catch((e) => {
          setError(
            e instanceof Error && e.message === 'Entity not found'
              ? 'Entity not found'
              : 'Failed to load entity'
          );
        })
        .finally(() => setLoading(false));
    } else {
      // Phase 17.7/17.8 API path: the persisted entity row is real, and the
      // Relations tab reads real investigation-scoped relationship rows with
      // resolved entity names. Evidence / event / activity / source /
      // resolution-history slices are later-phase domains and stay honestly
      // empty. No silent mock fallback.
      // The read is investigation-scoped so cross-investigation ids 404.
      loadEntityDetailBundle(id, isMockData() ? undefined : DEMO_INVESTIGATION_ID)
        .then(setApiBundle)
        .catch((e) => {
          setError(
            e instanceof Error && e.message === 'Entity not found'
              ? 'Entity not found'
              : 'Failed to load entity'
          );
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    setContextLabel('Entity Detail');
    load();
    return () => setContextLabel(null);
  }, [setContextLabel, load]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingState message="Loading entity…" />
      </div>
    );
  }

  const bundle = isMockData() ? mockBundle : apiBundle;

  if (error || !bundle) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState
          title={error === 'Entity not found' ? 'Entity not found' : 'Could not load entity'}
          message={error ?? 'Unknown error'}
          retry={load}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EntityDetailHeader
        entity={bundle.entity}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              router.push(
                journeyHref(`/networks/${DEMO_NETWORK_ID}`, {
                  investigation: DEMO_INVESTIGATION_ID,
                  focus: bundle.entity.id,
                }),
              )
            }
          >
            <Network className="h-3.5 w-3.5" />
            Open in network
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Panel noPadding>
          <EntityDetail
            entity={bundle.entity}
            summary={bundle.summary}
            relationships={bundle.relationships}
            related={bundle.related}
            evidence={bundle.evidence}
            events={bundle.events}
            activity={bundle.activity}
            sources={bundle.sources}
            resolutionHistory={bundle.resolutionHistory}
            onNavigate={(entityId) => router.push(`/entities/${entityId}`)}
          />
        </Panel>
      </motion.div>
    </div>
  );
}