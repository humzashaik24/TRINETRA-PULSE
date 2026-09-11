'use client';

import { motion } from 'framer-motion';
import {
  ArrowRightLeft, GitBranch, MapPin, Radar, AlertCircle, FileSearch,
} from 'lucide-react';
import { ConfidenceIndicator, EmptyState } from '@trinetra-pulse/ui';
import { staggerChildVariants } from '@trinetra-pulse/ui';
import type { RecentIntelligence, IntelligenceType } from '@trinetra-pulse/types';
import { presentationRecentIntelligenceFindings } from '@/mock';
import { EntityTypeIcon } from '@trinetra-pulse/ui';

const TYPE_ICON_MAP: Record<IntelligenceType, React.ReactNode> = {
  relationship: <ArrowRightLeft className="h-3.5 w-3.5" />,
  pattern: <MapPin className="h-3.5 w-3.5" />,
  entity: <Radar className="h-3.5 w-3.5" />,
  network: <GitBranch className="h-3.5 w-3.5" />,
  anomaly: <AlertCircle className="h-3.5 w-3.5" />,
  evidence: <FileSearch className="h-3.5 w-3.5" />,
};

const SEVERITY_CLASSES: Record<string, string> = {
  info: 'border-l-info',
  low: 'border-l-foreground-muted/30',
  medium: 'border-l-warning',
  high: 'border-l-anomaly',
  critical: 'border-l-danger',
};

const SEVERITY_DOT: Record<string, string> = {
  info: 'bg-info',
  low: 'bg-foreground-muted',
  medium: 'bg-warning',
  high: 'bg-anomaly',
  critical: 'bg-danger',
};

function FindingCard({ finding, onSelect }: { finding: RecentIntelligence; onSelect?: (f: RecentIntelligence) => void }) {
  return (
    <motion.div
      variants={staggerChildVariants}
      className={`group rounded-md border border-border/50 border-l-2 ${SEVERITY_CLASSES[finding.severity]} bg-surface p-3 tp-transition hover:bg-surface-hover hover:border-border ${onSelect ? 'cursor-pointer' : ''}`}
      role="button"
      aria-label={`${finding.title} - ${finding.severity} severity`}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(finding) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(finding);
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEVERITY_DOT[finding.severity]}`} aria-hidden="true" />
          <span className="text-foreground-muted group-hover:text-foreground-secondary tp-transition">
            {TYPE_ICON_MAP[finding.type]}
          </span>
          <span className="text-sm font-medium text-foreground truncate">{finding.title}</span>
        </div>
        <ConfidenceIndicator value={finding.confidence} size="sm" showValue showLabel={false} />
      </div>

      <p className="text-[11px] text-foreground-muted mt-1.5 line-clamp-2 leading-relaxed">
        {finding.description}
      </p>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 min-w-0">
          {finding.entities.slice(0, 3).map((entity) => (
            <EntityTypeIcon key={entity.id} type={entity.type} size="xs" />
          ))}
          {finding.entities.length > 3 && (
            <span className="text-[9px] text-foreground-muted">+{finding.entities.length - 3}</span>
          )}
          <span className="text-[10px] text-foreground-muted truncate ml-1">
            {finding.entities.map((e) => e.name).join(', ')}
          </span>
        </div>
        <span className="text-[10px] text-foreground-muted shrink-0 ml-2">{finding.timeAgo}</span>
      </div>

      {finding.source && (
        <div className="flex items-center gap-1 mt-1.5 text-[9px] text-foreground-muted/70">
          <span className="h-1 w-1 rounded-full bg-foreground-muted/30" aria-hidden="true" />
          {finding.source}
        </div>
      )}
    </motion.div>
  );
}

export function RecentIntelligence({ onSelect }: { onSelect?: (finding: RecentIntelligence) => void }) {
  if (presentationRecentIntelligenceFindings.length === 0) {
    return (
      <EmptyState
        icon={<Radar className="h-8 w-8" />}
        title="No intelligence findings yet"
        description="Once the intelligence engine processes new data, important findings will appear here."
      />
    );
  }

  return (
    <div className="space-y-2" role="feed" aria-label="Recent intelligence findings">
      {presentationRecentIntelligenceFindings.map((finding) => (
        <FindingCard key={finding.id} finding={finding} onSelect={onSelect} />
      ))}
    </div>
  );
}
