'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge, EmptyState, Button } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import type { DataQualitySummary, DataValidationIssue, QualityLevel } from '@trinetra-pulse/types';
import { mockQualitySummaries } from '@/mock';

const QUALITY_CONFIG: Record<QualityLevel, { label: string; variant: 'success' | 'warning' | 'danger' | 'info'; color: string }> = {
  excellent: { label: 'Excellent', variant: 'success', color: 'text-success' },
  good: { label: 'Good', variant: 'info', color: 'text-info' },
  needs_review: { label: 'Needs Review', variant: 'warning', color: 'text-warning' },
  poor: { label: 'Poor', variant: 'danger', color: 'text-danger' },
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  error: <XCircle className="h-3.5 w-3.5 text-danger" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  info: <Info className="h-3.5 w-3.5 text-info" />,
};

function QualityMetric({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div className="text-center">
      <span className="text-lg font-mono font-medium text-foreground">{value.toLocaleString()}</span>
      <p className="text-[10px] text-foreground-muted mt-0.5">{label}</p>
    </div>
  );
}

function IssueRow({ issue }: { issue: DataValidationIssue }) {
  return (
    <motion.div variants={staggerChildVariants} className="flex items-start gap-2 px-3 py-2 rounded-md hover:bg-surface-hover tp-transition">
      <span className="shrink-0 mt-0.5">{SEVERITY_ICON[issue.severity]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">{issue.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-foreground-muted font-mono">{issue.field}</span>
          {issue.row && <span className="text-[10px] text-foreground-muted">Row {issue.row}</span>}
          {issue.suggestedAction && (
            <span className="text-[10px] text-success">{issue.suggestedAction}</span>
          )}
        </div>
      </div>
      <Badge variant={issue.severity === 'error' ? 'danger' : issue.severity === 'warning' ? 'warning' : 'info'} size="sm">
        {issue.severity}
      </Badge>
    </motion.div>
  );
}

interface DataQualityViewProps {
  datasetId: string;
  datasetName: string;
}

export function DataQualityView({ datasetId, datasetName }: DataQualityViewProps) {
  const [showIssues, setShowIssues] = useState(true);
  const quality = mockQualitySummaries[datasetId];

  if (!quality) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8" />}
        title="Quality analysis pending"
        description="Data quality analysis will appear after the dataset is processed."
      />
    );
  }

  const config = QUALITY_CONFIG[quality.qualityLevel];
  const errors = quality.issues.filter((i) => i.severity === 'error');
  const warnings = quality.issues.filter((i) => i.severity === 'warning');
  const infos = quality.issues.filter((i) => i.severity === 'info');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-foreground">Data Quality</h4>
          <Badge variant={config.variant} size="sm">{config.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 rounded-full bg-surface-active overflow-hidden" role="meter" aria-valuenow={Math.round(quality.qualityScore * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Quality score">
            <div className={`h-full rounded-full ${config.color.replace('text-', 'bg-')}`} style={{ width: `${quality.qualityScore * 100}%` }} />
          </div>
          <span className={`text-xs font-mono font-medium ${config.color}`}>{Math.round(quality.qualityScore * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-surface-elevated/30">
        <QualityMetric label="Valid Records" value={quality.validRecords} />
        <QualityMetric label="Invalid Records" value={quality.invalidRecords} />
        <QualityMetric label="Warnings" value={quality.warnings} />
        <QualityMetric label="Duplicates" value={quality.duplicates} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 p-3 rounded-md bg-surface-elevated/20">
          <span className="text-xs text-foreground-muted">Missing Fields</span>
          <span className="text-sm font-mono text-foreground ml-auto">{quality.missingFields}</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-md bg-surface-elevated/20">
          <span className="text-xs text-foreground-muted">Normalized Fields</span>
          <span className="text-sm font-mono text-foreground ml-auto">{quality.normalizedFields.toLocaleString()}</span>
        </div>
      </div>

      {quality.issues.length > 0 && (
        <div>
          <button
            onClick={() => setShowIssues(!showIssues)}
            className="flex items-center gap-2 w-full text-left"
            aria-expanded={showIssues}
          >
            <span className="text-sm font-medium text-foreground">
              Validation Issues ({quality.issues.length})
            </span>
            <span className="flex items-center gap-1.5">
              {errors.length > 0 && <span className="text-[10px] text-danger">{errors.length} errors</span>}
              {warnings.length > 0 && <span className="text-[10px] text-warning">{warnings.length} warnings</span>}
              {infos.length > 0 && <span className="text-[10px] text-info">{infos.length} info</span>}
            </span>
            <span className="ml-auto text-foreground-muted">
              {showIssues ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          </button>

          {showIssues && (
            <Stagger staggerInterval={0.03} className="mt-2 space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
              {quality.issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </Stagger>
          )}
        </div>
      )}
    </div>
  );
}
