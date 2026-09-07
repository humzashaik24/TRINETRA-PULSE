'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, RefreshCw, Trash2, MoreHorizontal, CheckCircle2, AlertCircle,
  Loader2, Archive, ArrowUpDown, FileText,
} from 'lucide-react';
import { Button, Badge, EmptyState, Dropdown } from '@trinetra-pulse/ui';
import { staggerChildVariants, Stagger } from '@trinetra-pulse/ui';
import type { Dataset, DatasetStatus } from '@trinetra-pulse/types';
import { listDatasets } from '@/lib/api/investigations';
import { isMockData } from '@/lib/api/config';
import { mockDatasets } from '@/mock';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecordCount(n: number): string {
  return n.toLocaleString('en-US');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<DatasetStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; icon: React.ReactNode; label: string }> = {
  ready: { variant: 'success', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Ready' },
  processing: { variant: 'info', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Processing' },
  validating: { variant: 'warning', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Validating' },
  uploading: { variant: 'info', icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Uploading' },
  failed: { variant: 'danger', icon: <AlertCircle className="h-3 w-3" />, label: 'Failed' },
  archived: { variant: 'default', icon: <Archive className="h-3 w-3" />, label: 'Archived' },
};

const QUALITY_COLORS: Record<string, string> = {
  excellent: 'text-success',
  good: 'text-info',
  needs_review: 'text-warning',
  poor: 'text-danger',
};

interface DatasetRowProps {
  dataset: Dataset;
  onView: (id: string) => void;
  onPreview: (id: string) => void;
}

function DatasetRow({ dataset, onView, onPreview }: DatasetRowProps) {
  const statusConfig = STATUS_CONFIG[dataset.status];

  return (
    <motion.div
      variants={staggerChildVariants}
      className="group flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 tp-transition hover:bg-surface-hover"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{dataset.name}</span>
          <Badge variant={statusConfig.variant} size="sm">
            <span className="flex items-center gap-1">{statusConfig.icon} {statusConfig.label}</span>
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-foreground-muted">{dataset.sourceName}</span>
          <span className="text-[10px] text-foreground-muted/40" aria-hidden="true">|</span>
          <span className="text-[10px] text-foreground-muted font-mono uppercase">{dataset.format.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6 shrink-0">
        <div className="text-right">
          <span className="text-xs font-mono text-foreground-secondary">{formatRecordCount(dataset.recordCount)}</span>
          <span className="text-[10px] text-foreground-muted ml-1">records</span>
        </div>

        <div className="text-right w-16">
          {dataset.status !== 'failed' && dataset.recordCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-12 rounded-full bg-surface-active overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${dataset.qualityScore * 100}%` }}
                />
              </div>
              <span className={`text-[10px] font-mono ${QUALITY_COLORS[dataset.qualityLevel]}`}>
                {Math.round(dataset.qualityScore * 100)}%
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-foreground-muted">--</span>
          )}
        </div>

        <div className="text-right w-24">
          {(dataset.warnings > 0 || dataset.errors > 0) && (
            <div className="flex items-center gap-2">
              {dataset.warnings > 0 && (
                <span className="text-[10px] text-warning">{dataset.warnings}W</span>
              )}
              {dataset.errors > 0 && (
                <span className="text-[10px] text-danger">{dataset.errors}E</span>
              )}
            </div>
          )}
        </div>

        <span className="text-[10px] text-foreground-muted w-28 text-right">{formatDate(dataset.updatedAt)}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => onView(dataset.id)} aria-label={`View ${dataset.name}`}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onPreview(dataset.id)} aria-label={`Preview ${dataset.name}`}>
          <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

interface DatasetTableProps {
  investigationId?: string;
  onView?: (id: string) => void;
  onPreview?: (id: string) => void;
  refreshKey?: number;
}

export function DatasetTable({ investigationId, onView, onPreview, refreshKey }: DatasetTableProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDatasets = useCallback(async () => {
    if (isMockData()) {
      setDatasets(mockDatasets);
      return;
    }
    setLoading(true);
    try {
      const items = await listDatasets(investigationId);
      setDatasets(items.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? '',
        sourceId: d.data_source_id ?? '',
        sourceName: d.source_name ?? '',
        format: d.format as Dataset['format'],
        category: (d.category as Dataset['category']) ?? 'structured',
        status: d.status as DatasetStatus,
        recordCount: d.record_count,
        fileSize: d.file_size,
        fileName: d.file_name ?? '',
        qualityScore: d.quality_score,
        qualityLevel: d.quality_score >= 0.9 ? 'excellent' : d.quality_score >= 0.7 ? 'good' : d.quality_score >= 0.5 ? 'needs_review' : 'poor',
        warnings: d.warnings,
        errors: d.errors,
        duplicates: d.duplicates,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        lastIngestionId: d.last_ingestion_id ?? undefined,
      })));
    } catch {
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    void fetchDatasets();
  }, [fetchDatasets, refreshKey]);

  const handleView = onView || (() => {});
  const handlePreview = onPreview || (() => {});

  if (datasets.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8" />}
        title={loading ? 'Loading datasets...' : 'No datasets yet'}
        description={loading ? 'Fetching datasets from the server.' : 'Upload your first dataset to begin the intelligence pipeline.'}
      />
    );
  }

  return (
    <div>
      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-6 px-4 py-2 border-b border-border text-[10px] text-foreground-muted uppercase tracking-wider font-medium">
        <span className="flex-1">Dataset</span>
        <span className="w-20 text-right">Records</span>
        <span className="w-16 text-right">Quality</span>
        <span className="w-24 text-right">Issues</span>
        <span className="w-28 text-right">Updated</span>
        <span className="w-16"></span>
      </div>

      <Stagger staggerInterval={0.04}>
        {datasets.map((dataset) => (
          <DatasetRow
            key={dataset.id}
            dataset={dataset}
            onView={handleView}
            onPreview={handlePreview}
          />
        ))}
      </Stagger>
    </div>
  );
}
