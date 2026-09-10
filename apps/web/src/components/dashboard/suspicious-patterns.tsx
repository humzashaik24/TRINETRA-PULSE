'use client';

import { motion } from 'framer-motion';
import { Zap, DollarSign, MapPin, Clock, Network, Gauge } from 'lucide-react';
import { ConfidenceIndicator, EmptyState, Badge } from '@trinetra-pulse/ui';
import { staggerChildVariants } from '@trinetra-pulse/ui';
import type { SuspiciousPattern, PatternType } from '@trinetra-pulse/types';
import { presentationPatterns } from '@/mock/patterns';
import { EntityTypeIcon } from '@trinetra-pulse/ui';

const PATTERN_ICON: Record<PatternType, React.ReactNode> = {
  communication_spike: <Zap className="h-3.5 w-3.5" />,
  transaction_anomaly: <DollarSign className="h-3.5 w-3.5" />,
  location_pattern: <MapPin className="h-3.5 w-3.5" />,
  temporal_cluster: <Clock className="h-3.5 w-3.5" />,
  network_burst: <Network className="h-3.5 w-3.5" />,
  velocity_anomaly: <Gauge className="h-3.5 w-3.5" />,
};

const STATUS_BADGE: Record<string, { variant: 'info' | 'success' | 'warning' | 'default'; label: string }> = {
  new: { variant: 'info', label: 'New' },
  reviewing: { variant: 'warning', label: 'Reviewing' },
  dismissed: { variant: 'default', label: 'Dismissed' },
  confirmed: { variant: 'success', label: 'Confirmed' },
};

function PatternCard({ pattern, onSelect }: { pattern: SuspiciousPattern; onSelect?: (p: SuspiciousPattern) => void }) {
  const statusConfig = STATUS_BADGE[pattern.status];

  return (
    <motion.div
      variants={staggerChildVariants}
      className={`group rounded-lg border border-border bg-surface p-3.5 tp-transition hover:bg-surface-hover ${onSelect ? 'cursor-pointer' : ''}`}
      role="button"
      aria-label={`${pattern.title} - ${pattern.typeLabel} - ${pattern.status}`}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(pattern) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(pattern);
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-foreground-muted group-hover:text-foreground-secondary tp-transition">
            {PATTERN_ICON[pattern.type]}
          </span>
          <span className="text-sm font-medium text-foreground">{pattern.title}</span>
        </div>
        <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
      </div>

      <p className="text-[11px] text-foreground-muted mt-1.5 line-clamp-2 leading-relaxed">
        {pattern.description}
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
        {Object.entries(pattern.metrics).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="text-[9px] text-foreground-muted/70 uppercase tracking-wider">{key}:</span>
            <span className="text-[10px] font-mono text-foreground-secondary">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {pattern.entities.slice(0, 3).map((entity) => (
              <EntityTypeIcon key={entity.id} type={entity.type} size="xs" />
            ))}
          </div>
          <span className="text-[10px] text-foreground-muted">{pattern.entityCount} entities</span>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceIndicator value={pattern.confidence} size="sm" showLabel />
          <span className="text-[10px] text-foreground-muted">{pattern.timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function SuspiciousPatterns({ onSelect }: { onSelect?: (pattern: SuspiciousPattern) => void }) {
  if (presentationPatterns.length === 0) {
    return (
      <EmptyState
        icon={<Zap className="h-8 w-8" />}
        title="No suspicious patterns detected"
        description="Pattern detection results will appear here as the intelligence engine identifies anomalies."
      />
    );
  }

  return (
    <div className="space-y-2.5" role="feed" aria-label="Suspicious patterns">
      {presentationPatterns.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} onSelect={onSelect} />
      ))}
    </div>
  );
}
