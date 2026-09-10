'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/state/app.store';
import { useShellStore } from '@/state/shell.store';
import { presentationPatterns } from '@/mock/patterns';
import type { SuspiciousPattern, IntelligenceSeverity } from '@trinetra-pulse/types';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { ChartCard } from '@trinetra-pulse/ui';
import { Badge } from '@trinetra-pulse/ui';
import { Button } from '@trinetra-pulse/ui';
import { EmptyState } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Users,
  FileText,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function severityVariant(s: IntelligenceSeverity) {
  switch (s) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    case 'info':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function statusVariant(status: SuspiciousPattern['status']) {
  switch (status) {
    case 'new':
      return 'info';
    case 'reviewing':
      return 'warning';
    case 'confirmed':
      return 'danger';
    case 'dismissed':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function statusLabel(status: SuspiciousPattern['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function confidencePercent(c: number) {
  return Math.round(c * 100);
}

// ──────────────────────────────────────────────────────────────
// Confidence bar
// ──────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = confidencePercent(value);
  const color =
    pct >= 80
      ? 'bg-danger'
      : pct >= 60
        ? 'bg-warning'
        : 'bg-info';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className={`h-full rounded-full ${color} tp-transition`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground-secondary tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Summary strip
// ──────────────────────────────────────────────────────────────

function SummaryStrip({
  patterns,
  loading,
}: {
  patterns: SuspiciousPattern[];
  loading: boolean;
}) {
  const total = patterns.length;
  const high = patterns.filter((p) => p.severity === 'high' || p.severity === 'critical').length;
  const reviewing = patterns.filter((p) => p.status === 'reviewing').length;
  const newCount = patterns.filter((p) => p.status === 'new').length;

  const items = [
    { label: 'Total Patterns', value: total, icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { label: 'High / Critical', value: high, icon: <ShieldAlert className="h-3.5 w-3.5 text-danger" /> },
    { label: 'Under Review', value: reviewing, icon: <Clock className="h-3.5 w-3.5 text-warning" /> },
    { label: 'New', value: newCount, icon: <Sparkles className="h-3.5 w-3.5 text-info" /> },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center gap-3"
        >
          <div className="rounded-md bg-surface-elevated p-2 text-foreground-muted">
            {item.icon}
          </div>
          <div>
            <div className="tp-data-label text-foreground-muted">{item.label}</div>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              {loading ? '—' : item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Pattern card
// ──────────────────────────────────────────────────────────────

function PatternCard({
  pattern,
  onSelect,
}: {
  pattern: SuspiciousPattern;
  onSelect: (p: SuspiciousPattern) => void;
}) {
  const handleClick = useCallback(() => onSelect(pattern), [onSelect, pattern]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-lg border border-border bg-surface p-4 tp-transition hover:border-brand/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 cursor-pointer group"
    >
      {/* Top row: badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge variant={severityVariant(pattern.severity)} size="sm" dot>
          {pattern.severity.toUpperCase()}
        </Badge>
        <Badge variant={statusVariant(pattern.status)} size="sm">
          {statusLabel(pattern.status)}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1 group-hover:text-brand transition-colors">
        {pattern.title}
      </h3>

      {/* Type label */}
      <p className="text-xs text-foreground-muted mb-2">{pattern.typeLabel}</p>

      {/* Description */}
      <p className="text-xs text-foreground-secondary leading-relaxed mb-3 line-clamp-2">
        {pattern.description}
      </p>

      {/* Confidence */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">
          Confidence
        </div>
        <ConfidenceBar value={pattern.confidence} />
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted mb-3">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {pattern.entityCount} entities
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {Object.keys(pattern.metrics).length} metrics
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {pattern.timeAgo}
        </span>
      </div>

      {/* Entity chips */}
      {pattern.entities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {pattern.entities.slice(0, 3).map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary"
            >
              {e.name}
            </span>
          ))}
          {pattern.entities.length > 3 && (
            <span className="inline-flex items-center rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
              +{pattern.entities.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Metrics detail */}
      <div className="rounded-md bg-surface-elevated p-2.5">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(pattern.metrics).map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] text-foreground-muted leading-tight">{k}</div>
              <div className="text-xs font-medium text-foreground-secondary">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Open arrow */}
      <div className="flex justify-end mt-2">
        <ChevronRight className="h-4 w-4 text-foreground-muted group-hover:text-brand tp-transition" />
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Filter chips
// ──────────────────────────────────────────────────────────────

type SeverityFilter = IntelligenceSeverity | 'all';

const SEVERITY_OPTIONS: SeverityFilter[] = ['all', 'critical', 'high', 'medium', 'low', 'info'];

function FilterBar({
  active,
  onChange,
}: {
  active: SeverityFilter;
  onChange: (f: SeverityFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Filter className="h-3.5 w-3.5 text-foreground-muted mr-1" />
      {SEVERITY_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tp-transition ${
            active === opt
              ? 'bg-brand text-brand-fg'
              : 'bg-surface-elevated text-foreground-secondary hover:bg-surface-active'
          }`}
        >
          {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function PatternsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const selectContext = useShellStore((s) => s.selectContext);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  useEffect(() => {
    setContextLabel('Patterns');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  const filtered = useMemo(() => {
    if (severityFilter === 'all') return presentationPatterns;
    return presentationPatterns.filter((p) => p.severity === severityFilter);
  }, [severityFilter]);

  const handleSelect = useCallback(
    (pattern: SuspiciousPattern) => {
      selectContext({
        type: 'pattern',
        id: pattern.id,
        title: pattern.title,
        patternType: pattern.type,
        entities: pattern.entities.map((e) => e.id),
      });
    },
    [selectContext]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Patterns"
        description="Detect and analyze behavioral and network patterns"
        actions={
          <Button variant="secondary" size="sm" aria-label="Refresh patterns">
            <Sparkles className="h-3.5 w-3.5" />
            Scan
          </Button>
        }
      />

      <SummaryStrip patterns={presentationPatterns} loading={false} />

      {presentationPatterns.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="No patterns detected"
          description="Pattern detection will surface anomalies across communication, financial, and movement data as it is processed."
        />
      ) : (
        <ChartCard
          title="Detected Patterns"
          subtitle={`${filtered.length} pattern${filtered.length !== 1 ? 's' : ''} ${severityFilter !== 'all' ? `(${severityFilter} severity)` : ''}`}
          action={<FilterBar active={severityFilter} onChange={setSeverityFilter} />}
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="No matching patterns"
              description="Try a different severity filter."
            />
          ) : (
            <Stagger staggerInterval={0.06}>
              {filtered.map((pattern) => (
                <motion.div key={pattern.id} variants={staggerChildVariants}>
                  <PatternCard pattern={pattern} onSelect={handleSelect} />
                </motion.div>
              ))}
            </Stagger>
          )}
        </ChartCard>
      )}
    </div>
  );
}
