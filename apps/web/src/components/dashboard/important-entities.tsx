'use client';

import { motion } from 'framer-motion';
import { Users, ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@trinetra-pulse/ui';
import { staggerChildVariants } from '@trinetra-pulse/ui';
import type { ImportantEntity, ImportanceCategory } from '@trinetra-pulse/types';
import { importantEntities } from '@/mock';
import { EntityTypeIcon } from '@trinetra-pulse/ui';
import { RiskIndicator } from '@trinetra-pulse/ui';

const CATEGORY_COLORS: Record<ImportanceCategory, string> = {
  high_connectivity: 'bg-info-subtle text-info',
  bridge_position: 'bg-network-subtle text-network',
  recent_activity: 'bg-success-subtle text-success',
  pattern_involvement: 'bg-anomaly-subtle text-anomaly',
};

const ACTIVITY_DOT: Record<string, string> = {
  active: 'bg-success',
  recent: 'bg-warning',
  stale: 'bg-anomaly',
  inactive: 'bg-foreground-muted/40',
};

function EntityRow({ entity }: { entity: ImportantEntity }) {
  return (
    <motion.div
      variants={staggerChildVariants}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-md tp-transition hover:bg-surface-hover cursor-pointer"
      role="row"
      tabIndex={0}
      aria-label={`${entity.name}, ${entity.type}, ${entity.connections} connections, ${entity.categoryLabel}`}
    >
      <EntityTypeIcon type={entity.type} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate group-hover:text-brand tp-transition">
            {entity.name}
          </span>
          {entity.isFlagged && (
            <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" aria-label="Flagged entity" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium ${CATEGORY_COLORS[entity.category]}`}>
            {entity.categoryLabel}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-xs font-mono text-foreground-secondary">{entity.connections}</span>
        <span className="text-[9px] text-foreground-muted">connections</span>
      </div>

      <div className="hidden md:flex items-center gap-1 shrink-0">
        <span className={`h-1.5 w-1.5 rounded-full ${ACTIVITY_DOT[entity.activityStatus]}`} aria-hidden="true" />
        <span className="text-[10px] text-foreground-muted">{entity.activityLabel}</span>
      </div>

      {entity.riskScore !== undefined && (
        <div className="hidden lg:block shrink-0">
          <RiskIndicator score={entity.riskScore} size="sm" showLabel={false} />
        </div>
      )}

      <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted/0 group-hover:text-foreground-muted tp-transition shrink-0" />
    </motion.div>
  );
}

export function ImportantEntities() {
  if (importantEntities.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="No important entities identified"
        description="Entity importance rankings will appear as the intelligence engine analyzes network data."
      />
    );
  }

  return (
    <div className="divide-y divide-border/50" role="table" aria-label="Important entities">
      {importantEntities.map((entity) => (
        <EntityRow key={entity.id} entity={entity} />
      ))}
    </div>
  );
}
