'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/app.store';
import { EntityDetail, EntityDetailHeader } from '@/components/entity-intelligence';
import {
  confirmEntityResolutions,
  evaluateInvestigationResolutions,
  fetchEntityDetailBundle,
  rejectEntityResolutions,
} from '@/services/entity.service';
import { ErrorState, LoadingState, Panel } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';

interface EntityDetailPageProps {
  params: { id: string };
}

const INV_006 = '6c887c98-939a-50ce-ac27-f58376941de2';
const ACTOR = 'analyst@trinetra.local';

export default function EntityDetailPage({ params }: EntityDetailPageProps) {
  const id = params.id;
  const router = useRouter();
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof fetchEntityDetailBundle>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchEntityDetailBundle(id)
      .then(setBundle)
      .catch((e) => {
        setError(e instanceof Error && e.message === 'Entity not found' ? 'Entity not found' : 'Failed to load entity');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setContextLabel('Entity Detail');
    load();
    return () => setContextLabel(null);
  }, [setContextLabel, load]);

  const handleConfirm = useCallback(async (entityId: string, reason: string) => {
    await confirmEntityResolutions(entityId, ACTOR, reason);
    await fetchEntityDetailBundle(entityId).then(setBundle as never);
  }, []);

  const handleReject = useCallback(async (entityId: string, reason: string) => {
    await rejectEntityResolutions(entityId, ACTOR, reason);
    await fetchEntityDetailBundle(entityId).then(setBundle as never);
  }, []);

  const handleEvaluate = useCallback(async () => {
    await evaluateInvestigationResolutions(INV_006, ACTOR);
    await fetchEntityDetailBundle(id).then(setBundle as never);
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <LoadingState message="Loading entity…" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState title={error === 'Entity not found' ? 'Entity not found' : 'Could not load entity'} message={error ?? 'Unknown error'} retry={load} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EntityDetailHeader
        entity={bundle.entity}
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
            resolutions={bundle.resolutions}
            onNavigate={(entityId) => router.push(`/entities/${entityId}`)}
            onConfirmResolution={handleConfirm}
            onRejectResolution={handleReject}
            onEvaluateResolutions={handleEvaluate}
          />
        </Panel>
      </motion.div>
    </div>
  );
}