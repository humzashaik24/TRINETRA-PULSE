'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/state/app.store';
import { useShellStore } from '@/state/shell.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { usePatternsStore } from '@/state/patterns.store';
import type { PatternArtifact, EntityType } from '@trinetra-pulse/types';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { ChartCard } from '@trinetra-pulse/ui';
import { Badge } from '@trinetra-pulse/ui';
import { Button } from '@trinetra-pulse/ui';
import { EmptyState } from '@trinetra-pulse/ui';
import { ErrorState } from '@trinetra-pulse/ui';
import { Skeleton } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { DEMO_INVESTIGATION_ID } from '@/navigation/journey';
import {
  Sparkles,
  Users,
  FileText,
  Clock,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';

// ============================================================
// PATTERNS WORKSPACE (Phase C)
// ============================================================
// Renders the real investigation-scoped pattern artifacts produced by the
// backend detection engine (API mode) or the preserved demo fixtures (mock
// mode). Loading skeletons, an explicit error state and an honest empty
// state replace the former hardcoded Nexus fixture import.
//
// Severity shown is the analytical significance of the detected structure —
// never a statement of guilt.
// ============================================================

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function severityVariant(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'secondary';
  }
}

function statusVariant(status: PatternArtifact['status']) {
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

function statusLabel(status: NonNullable<PatternArtifact['status']>) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function confidencePercent(c: number) {
  return Math.round(c * 100);
}

function severityRange(severity: string): 'high' | 'medium' | 'low' {
  const value = severity.toLowerCase();
  if (value === 'critical' || value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  return 'low';
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
  patterns: PatternArtifact[];
  loading: boolean;
}) {
  const total = patterns.length;
  const high = patterns.filter((p) => severityRange(p.severity) === 'high').length;
  const entities = new Set(patterns.flatMap((p) => p.entity_ids)).size;
  const evidence = new Set(patterns.flatMap((p) => p.evidence_ids)).size;

  const items = [
    { label: 'Total Patterns', value: total, icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { label: 'High / Critical', value: high, icon: <ShieldAlert className="h-3.5 w-3.5 text-danger" /> },
    { label: 'Entities Referenced', value: entities, icon: <Users className="h-3.5 w-3.5 text-warning" /> },
    { label: 'Evidence Referenced', value: evidence, icon: <FileText className="h-3.5 w-3.5 text-info" /> },
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
  onInspectEntity,
  onInspectEvidence,
}: {
  pattern: PatternArtifact;
  onSelect: (p: PatternArtifact) => void;
  onInspectEntity: (ref: { id: string; name: string; type: string }) => void;
  onInspectEvidence: (ref: { id: string; title: string }) => void;
}) {
  const handleClick = useCallback(() => onSelect(pattern), [onSelect, pattern]);

  const contextUnavailable =
    pattern.entity_ids.length > 0 && pattern.entityRefs.length === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${pattern.title} — ${pattern.typeLabel}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="w-full text-left rounded-lg border border-border bg-surface p-4 tp-transition hover:border-brand/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 cursor-pointer group"
    >
      {/* Top row: badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge variant={severityVariant(pattern.severity)} size="sm" dot>
          {pattern.severity.toUpperCase()}
        </Badge>
        {pattern.status ? (
          <Badge variant={statusVariant(pattern.status)} size="sm">
            {statusLabel(pattern.status)}
          </Badge>
        ) : (
          <Badge variant="secondary" size="sm">
            Detected
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1 group-hover:text-brand transition-colors">
        {pattern.title}
      </h3>

      {/* Category — authoritative backend term / preserved fixture label */}
      <p className="text-xs font-mono text-foreground-muted mb-2">{pattern.typeLabel}</p>

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
          {pattern.entity_ids.length} entities
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {pattern.evidence_ids.length} evidence
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {pattern.timeAgo}
        </span>
      </div>

      {/* Entity chips */}
      {pattern.entityRefs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {pattern.entityRefs.slice(0, 3).map((entity) => (
            <button
              key={entity.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onInspectEntity(entity);
              }}
              className="inline-flex items-center rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary hover:text-brand tp-transition"
            >
              {entity.name}
            </button>
          ))}
          {pattern.entityRefs.length > 3 && (
            <span className="inline-flex items-center rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
              +{pattern.entityRefs.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Evidence chips */}
      {pattern.evidenceRefs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {pattern.evidenceRefs.slice(0, 3).map((evidence) => (
            <button
              key={evidence.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onInspectEvidence(evidence);
              }}
              className="inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted hover:text-foreground tp-transition"
            >
              {evidence.title}
            </button>
          ))}
        </div>
      )}

      {/* Honest context note when entity refs could not be resolved */}
      {contextUnavailable && (
        <p className="mb-3 text-[10px] text-foreground-muted italic">
          Supporting entity context is not available for this pattern.
        </p>
      )}

      {/* Metrics detail */}
      {Object.keys(pattern.metrics).length > 0 && (
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
      )}

      {/* Open arrow */}
      <div className="flex justify-end mt-2">
        <ChevronRight className="h-4 w-4 text-foreground-muted group-hover:text-brand tp-transition" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Filter chips
// ──────────────────────────────────────────────────────────────

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info';

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
// Loading skeleton (matches the card layout)
// ──────────────────────────────────────────────────────────────

function PatternCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton width={72} height={18} />
        <Skeleton width={56} height={18} />
      </div>
      <Skeleton width="75%" height={14} />
      <Skeleton width="45%" height={12} />
      <Skeleton width="100%" height={12} lines={2} />
      <Skeleton width={120} height={12} />
      <div className="flex gap-3">
        <Skeleton width={72} height={12} />
        <Skeleton width={72} height={12} />
        <Skeleton width={72} height={12} />
      </div>
      <div className="flex gap-1.5">
        <Skeleton width={64} height={18} />
        <Skeleton width={80} height={18} />
      </div>
      <Skeleton width="100%" height={44} variant="rectangular" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────

export default function PatternsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const selectContext = useShellStore((s) => s.selectContext);
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const { data, loading, error, load, selectPattern } = usePatternsStore();

  const targetId = investigationId ?? DEMO_INVESTIGATION_ID;
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  useEffect(() => {
    setContextLabel('Patterns');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  useEffect(() => {
    void load(targetId);
  }, [load, targetId]);

  const filtered = useMemo(() => {
    const source = data ?? [];
    if (severityFilter === 'all') return source;
    return source.filter((p) => p.severity.toLowerCase() === severityFilter);
  }, [data, severityFilter]);

  const handleSelect = useCallback(
    (pattern: PatternArtifact) => {
      selectPattern(pattern.id);
      selectContext({
        type: 'pattern',
        id: pattern.id,
        title: pattern.title,
        patternType: pattern.pattern_type,
        entities: pattern.entity_ids,
        evidenceIds: pattern.evidence_ids,
        relationshipIds: pattern.relationship_ids,
        investigationId: targetId,
      });
    },
    [selectContext, selectPattern, targetId]
  );

  const handleInspectEntity = useCallback(
    (ref: { id: string; name: string; type: string }) => {
      selectContext({
        type: 'entity',
        id: ref.id,
        name: ref.name,
        entityType: ref.type as EntityType,
        investigationId: targetId,
      });
    },
    [selectContext, targetId]
  );

  const handleInspectEvidence = useCallback(
    (ref: { id: string; title: string }) => {
      selectContext({
        type: 'evidence',
        id: ref.id,
        title: ref.title,
        investigationId: targetId,
      });
    },
    [selectContext, targetId]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Patterns"
        description="Detect and analyze behavioral and network patterns"
        actions={
          <Button
            variant="secondary"
            size="sm"
            aria-label="Refresh patterns"
            onClick={() => void load(targetId)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Scan
          </Button>
        }
      />

      <SummaryStrip patterns={data ?? []} loading={loading} />

      {error && !data && (
        <ErrorState
          title="Could not load patterns"
          message={error}
          retry={() => void load(targetId)}
        />
      )}

      {!error && data && data.length === 0 && (
        <EmptyState
          icon={<Sparkles className="h-10 w-10" />}
          title="No patterns detected"
          description="Pattern detection will surface anomalies across communication, financial, and movement data as it is processed."
        />
      )}

      {!error && (loading || (data && data.length > 0)) && (
        <ChartCard
          title="Detected Patterns"
          subtitle={`${filtered.length} pattern${filtered.length !== 1 ? 's' : ''} ${severityFilter !== 'all' ? `(${severityFilter} severity)` : ''}`}
          action={<FilterBar active={severityFilter} onChange={setSeverityFilter} />}
        >
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <PatternCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="No matching patterns"
              description="Try a different severity filter."
            />
          ) : (
            <Stagger staggerInterval={0.06}>
              {filtered.map((pattern) => (
                <motion.div key={pattern.id} variants={staggerChildVariants}>
                  <PatternCard
                    pattern={pattern}
                    onSelect={handleSelect}
                    onInspectEntity={handleInspectEntity}
                    onInspectEvidence={handleInspectEvidence}
                  />
                </motion.div>
              ))}
            </Stagger>
          )}
        </ChartCard>
      )}
    </div>
  );
}