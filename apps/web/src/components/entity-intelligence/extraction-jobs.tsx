'use client';

import { useEffect, useState } from 'react';
import { type ExtractionJob } from '@trinetra-pulse/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  EmptyState,
  Select,
  LoadingState,
  ErrorState,
  SourceBadge,
} from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import { mockDatasets } from '@/mock';
import { cancelExtractionJob, fetchExtractionJobs, startExtractionJob } from '@/services/entity.service';
import { formatCount, formatDuration, formatRelativeTime } from '@/lib/format';
import { JobStatusBadge } from './badges';
import { useAuthStore } from '@/state/auth.store';
import { isMockData } from '@/lib/api/config';

// ============================================================
// EXTRACTION JOBS
// ============================================================

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = clamped >= 100 ? 'bg-success' : 'bg-info';
  return (
    <div
      className="relative h-1.5 w-24 overflow-hidden rounded-full bg-surface-active"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Job progress"
    >
      <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function JobRow({ job, actor, onCancelled }: { job: ExtractionJob; actor: string; onCancelled?: () => void }) {
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelExtractionJob(job.id, actor);
      onCancelled?.();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <motion.div
      variants={staggerChildVariants}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 md:flex-row md:items-center"
    >
      <div className="flex flex-1 min-w-0 items-center gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{job.datasetName}</span>
            <JobStatusBadge status={job.status} size="sm" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SourceBadge source={job.datasetId} size="sm" />
            <span className="text-caption text-foreground-muted">by {job.createdBy}</span>
            <span className="text-caption text-foreground-muted">{formatRelativeTime(job.createdAt)}</span>
            <span className="text-caption text-foreground-muted font-mono">
              {formatDuration(job.startedAt, job.completedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <ProgressBar value={job.progress} />
          <span className="text-[10px] font-mono text-foreground-muted tabular-nums">{job.progress}%</span>
        </div>

        <div className="hidden sm:grid grid-cols-4 gap-4 text-right">
          <div>
            <div className="tp-data-label">Records</div>
            <div className="text-xs font-mono text-foreground mt-0.5">{formatCount(job.recordsProcessed)}</div>
          </div>
          <div>
            <div className="tp-data-label">Entities</div>
            <div className="text-xs font-mono text-foreground mt-0.5">{formatCount(job.entitiesExtracted)}</div>
          </div>
          <div>
            <div className="tp-data-label">Candidates</div>
            <div className="text-xs font-mono text-foreground mt-0.5">{formatCount(job.candidatesCreated)}</div>
          </div>
          <div>
            <div className="tp-data-label">Matches</div>
            <div className="text-xs font-mono text-foreground mt-0.5">{formatCount(job.matchesFound)}</div>
          </div>
        </div>

        {job.status === 'QUEUED' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={cancel}
            loading={cancelling}
            className="text-danger hover:bg-danger-subtle"
            aria-label={`Cancel extraction ${job.datasetName}`}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {(job.warnings.length > 0 || job.errors.length > 0) && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 md:px-0 md:pb-0 md:pl-3 md:col-span-2">
          {job.warnings.map((w) => (
            <span key={w} className="rounded bg-warning-subtle px-1.5 py-0.5 text-[10px] text-warning">
              {w}
            </span>
          ))}
          {job.errors.map((e) => (
            <span key={e} className="rounded bg-danger-subtle px-1.5 py-0.5 text-[10px] text-danger">
              {e}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface ExtractionJobsProps {
  onCreate?: (job: ExtractionJob) => void;
}

export function ExtractionJobs({ onCreate }: ExtractionJobsProps) {
  const [jobs, setJobs] = useState<ExtractionJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const actor = useAuthStore((s) => s.currentUser()?.id ?? 'unknown-user');

  const load = async () => {
    try {
      setError(null);
      const list = await fetchExtractionJobs();
      setJobs(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load extraction jobs');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStart = async () => {
    if (!selectedDataset) return;
    const dataset = mockDatasets.find((d) => d.id === selectedDataset);
    if (!dataset) return;
    setStarting(true);
    try {
      const job = await startExtractionJob({
        datasetId: dataset.id,
        datasetName: dataset.name,
        createdBy: actor,
      });
      setStartOpen(false);
      setSelectedDataset('');
      await load();
      onCreate?.(job);
    } finally {
      setStarting(false);
    }
  };

  if (running) return <LoadingState message="Loading extraction jobs…" />;
  if (error) return <ErrorState title="Could not load jobs" message={error} retry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-caption text-foreground-muted">
          {jobs?.length ?? 0} jobs · progress reflects current pipeline state
        </p>
        {isMockData() ? (
          <Button size="sm" onClick={() => setStartOpen(true)}>
            <Play className="h-3.5 w-3.5" />
            Start extraction
          </Button>
        ) : (
          <span className="text-caption text-foreground-muted">
            Job creation is managed by the backend ingestion pipeline.
          </span>
        )}
      </div>

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<Play className="h-8 w-8" />}
          title="No extraction jobs"
          description="Start an extraction job on a dataset to begin the entity pipeline."
          action={
            <Button size="sm" onClick={() => setStartOpen(true)}>
              Start extraction
            </Button>
          }
        />
      ) : (
        <Stagger staggerInterval={0.04}>
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} actor={actor} onCancelled={load} />
            ))}
          </div>
        </Stagger>
      )}

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent onClose={() => setStartOpen(false)}>
          <DialogTitle>Start extraction job</DialogTitle>
          <DialogDescription>
            Select a dataset to run entity extraction, normalization and candidate creation.
          </DialogDescription>
          <div className="mt-4">
            <label htmlFor="dataset-select" className="tp-data-label block mb-1.5">
              Dataset
            </label>
            <Select
              id="dataset-select"
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              options={mockDatasets.map((d) => ({
                value: d.id,
                label: d.name,
                disabled: d.status === 'failed' || d.recordCount === 0,
              }))}
              placeholder="Choose a dataset"
              aria-label="Dataset to extract from"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setStartOpen(false)} disabled={starting}>
              Cancel
            </Button>
            <Button onClick={handleStart} loading={starting} disabled={!selectedDataset}>
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}