'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertCircle, Loader2, XCircle, Clock, User,
} from 'lucide-react';
import { Badge, EmptyState } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import type { IngestionJob, IngestionStatus } from '@trinetra-pulse/types';
import { listAllIngestionJobs } from '@/lib/api/investigations';
import { isMockData } from '@/lib/api/config';
import { mockIngestionJobs } from '@/mock';

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<IngestionStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; icon: React.ReactNode; label: string }> = {
  completed: { variant: 'success', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Completed' },
  processing: { variant: 'info', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Processing' },
  validating: { variant: 'warning', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Validating' },
  queued: { variant: 'default', icon: <Clock className="h-3 w-3" />, label: 'Queued' },
  failed: { variant: 'danger', icon: <XCircle className="h-3 w-3" />, label: 'Failed' },
  cancelled: { variant: 'default', icon: <AlertCircle className="h-3 w-3" />, label: 'Cancelled' },
};

function JobRow({ job }: { job: IngestionJob }) {
  const config = STATUS_CONFIG[job.status];

  return (
    <motion.div
      variants={staggerChildVariants}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface-hover tp-transition"
    >
      <span className="shrink-0">
        <Badge variant={config.variant} size="sm">
          <span className="flex items-center gap-1">{config.icon} {config.label}</span>
        </Badge>
      </span>

      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground truncate">{job.datasetName}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-foreground-muted font-mono">{job.source}</span>
          {job.user && (
            <>
              <span className="text-[10px] text-foreground-muted/40" aria-hidden="true">|</span>
              <span className="flex items-center gap-0.5 text-[10px] text-foreground-muted">
                <User className="h-2.5 w-2.5" /> {job.user}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-4 shrink-0 text-[10px] text-foreground-muted">
        <div className="text-right">
          <span className="font-mono text-foreground-secondary">{job.recordsProcessed.toLocaleString()}</span>
          <span className="ml-1">records</span>
        </div>
        {job.warnings > 0 && <span className="text-warning">{job.warnings}W</span>}
        {job.errors > 0 && <span className="text-danger">{job.errors}E</span>}
        <span className="font-mono w-14 text-right">{formatDuration(job.startedAt, job.completedAt)}</span>
        <span className="w-28 text-right">{formatTime(job.startedAt)}</span>
      </div>
    </motion.div>
  );
}

export function IngestionHistory({ refreshKey }: { refreshKey?: number }) {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (isMockData()) {
      setJobs(mockIngestionJobs);
      return;
    }
    setLoading(true);
    try {
      const items = await listAllIngestionJobs();
      setJobs(items.map((j) => ({
        id: j.id,
        datasetId: j.dataset_id,
        datasetName: (j.metadata?.file_name as string) ?? j.dataset_id,
        status: j.status as IngestionStatus,
        startedAt: j.started_at ?? j.created_at,
        completedAt: j.completed_at ?? undefined,
        progress: j.progress,
        recordsProcessed: j.records_processed,
        recordsAccepted: j.records_processed - (j.warnings?.length ?? 0),
        recordsRejected: j.warnings?.length ?? 0,
        warnings: j.warnings?.length ?? 0,
        errors: j.errors?.length ?? 0,
        source: (j.metadata?.file_name as string) ?? '',
        user: j.created_by ?? undefined,
      })));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs, refreshKey]);

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-8 w-8" />}
        title={loading ? 'Loading history...' : 'No ingestion history'}
        description={loading ? 'Fetching ingestion jobs.' : 'Ingestion jobs will appear here after data is processed.'}
      />
    );
  }

  return (
    <div>
      <div className="hidden sm:flex items-center gap-4 px-3 py-1.5 border-b border-border/50 text-[10px] text-foreground-muted uppercase tracking-wider font-medium">
        <span className="w-20">Status</span>
        <span className="flex-1">Dataset</span>
        <span className="w-20 text-right">Records</span>
        <span className="w-8 text-right">Issues</span>
        <span className="w-14 text-right">Duration</span>
        <span className="w-28 text-right">Started</span>
      </div>

      <Stagger staggerInterval={0.04} className="space-y-0.5">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </Stagger>
    </div>
  );
}
