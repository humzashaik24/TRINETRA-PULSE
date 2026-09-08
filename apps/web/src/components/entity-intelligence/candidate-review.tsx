'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  type CandidateStatus,
  type EntityCandidate,
  type EntityType,
} from '@trinetra-pulse/types';
import {
  Badge,
  Button,
  ConfidenceIndicator,
  EmptyState,
  EntityTypeIcon,
  ErrorState,
  LoadingState,
  Search,
  Select,
} from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { CheckCircle2, Fingerprint, XCircle } from 'lucide-react';
import { ENTITY_TYPE_LABELS, formatRelativeTime } from '@/lib/format';
import { fetchCandidates, reviewCandidate } from '@/services/entity.service';
import { useAuthStore } from '@/state/auth.store';
import { MethodBadge, ResolutionStateBadge } from './badges';

// ============================================================
// CANDIDATE REVIEW
// ============================================================

const STATUS_LABELS: Record<CandidateStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVIEWED: 'Reviewed',
};

function CandidateCard({ candidate, onReviewed }: { candidate: EntityCandidate; onReviewed: () => void }) {
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const reviewer = useAuthStore((s) => s.currentUser()?.id ?? 'unknown-user');

  const review = async (decision: 'accept' | 'reject') => {
    setBusy(decision);
    try {
      await reviewCandidate(candidate.id, decision, reviewer);
      onReviewed();
    } finally {
      setBusy(null);
    }
  };

  const actionable = candidate.status === 'PENDING' || candidate.status === 'REVIEWED';

  return (
    <motion.div
      variants={staggerChildVariants}
      className="rounded-lg border border-border bg-surface p-3"
    >
      <div className="flex items-start gap-3">
        <EntityTypeIcon type={candidate.entityType} size="md" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{candidate.displayValue}</span>
            <Badge variant="secondary" size="sm" className="font-mono">{candidate.rawValue}</Badge>
            <MethodBadge method={candidate.extractionMethod} size="sm" />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-caption text-foreground-muted capitalize">{ENTITY_TYPE_LABELS[candidate.entityType]}</span>
            <span className="text-caption text-foreground-muted">{candidate.source}</span>
            <span className="text-caption text-foreground-muted font-mono">{candidate.sourceRecord}</span>
            <span className="text-caption text-foreground-muted">{formatRelativeTime(candidate.createdAt)}</span>
          </div>

          {Object.keys(candidate.attributes ?? {}).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(candidate.attributes ?? {}).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted"
                >
                  <span className="text-foreground-muted/70">{k.replace(/_/g, ' ')}:</span> {String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ConfidenceIndicator value={candidate.confidence} size="sm" showValue />
          <Badge variant="secondary" size="sm">{STATUS_LABELS[candidate.status]}</Badge>
          {candidate.resolutionState && candidate.resolutionState !== 'REJECTED' && (
            <ResolutionStateBadge state={candidate.resolutionState} size="sm" />
          )}
        </div>
      </div>

      {actionable && (
        <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2">
          <Button
            size="sm"
            variant="danger-ghost"
            onClick={() => review('reject')}
            loading={busy === 'reject'}
            disabled={busy === 'accept'}
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => review('accept')}
            loading={busy === 'accept'}
            disabled={busy === 'reject'}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Accept
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export function CandidateReview() {
  const [candidates, setCandidates] = useState<EntityCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CandidateStatus | 'all'>('all');
  const [entityType, setEntityType] = useState<EntityType | 'all'>('all');

  const load = async () => {
    try {
      setError(null);
      setCandidates(await fetchCandidates());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load candidates');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const types = useMemo(() => {
    const seen = new Set<string>();
    candidates?.forEach((c) => seen.add(c.entityType));
    return Array.from(seen);
  }, [candidates]);

  const visible = useMemo(() => {
    if (!candidates) return [];
    let list = candidates;
    if (status !== 'all') list = list.filter((c) => c.status === status);
    if (entityType !== 'all') list = list.filter((c) => c.entityType === entityType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.displayValue.toLowerCase().includes(q) ||
          c.rawValue.toLowerCase().includes(q) ||
          c.source.toLowerCase().includes(q)
      );
    }
    return list;
  }, [candidates, status, entityType, search]);

  if (running) return <LoadingState message="Loading candidates…" />;
  if (error) return <ErrorState title="Could not load candidates" message={error} retry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-caption text-foreground-muted">
          {visible.length} candidates · extracted mentions awaiting resolution
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Search
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search candidates…"
            size="sm"
            className="w-full md:w-52"
            aria-label="Search candidates"
          />
          <Select
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as CandidateStatus | 'all')}
            options={[
              { value: 'all', label: 'All statuses' },
              ...(Object.keys(STATUS_LABELS) as CandidateStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              })),
            ]}
            aria-label="Filter by candidate status"
            className="w-[130px]"
          />
          <Select
            size="sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType | 'all')}
            options={[
              { value: 'all', label: 'All types' },
              ...types.map((t) => ({ value: t, label: ENTITY_TYPE_LABELS[t as EntityType] })),
            ]}
            aria-label="Filter by entity type"
            className="w-[130px]"
          />
        </div>
      </div>

      {!candidates || candidates.length === 0 ? (
        <EmptyState
          icon={<Fingerprint className="h-8 w-8" />}
          title="No candidates"
          description="Extracted entity candidates will appear here for review."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Fingerprint className="h-8 w-8" />}
          title="No candidates match"
          description="Try adjusting your filters."
        />
      ) : (
        <Stagger staggerInterval={0.04}>
          <div className="space-y-2">
            {visible.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} onReviewed={load} />
            ))}
          </div>
        </Stagger>
      )}
    </div>
  );
}