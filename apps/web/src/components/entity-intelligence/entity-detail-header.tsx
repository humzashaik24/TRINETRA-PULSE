'use client';

import Link from 'next/link';
import { type EntityIntelligence } from '@trinetra-pulse/types';
import { Badge, ConfidenceIndicator, EntityTypeIcon } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { duration, easing } from '@trinetra-pulse/ui';
import { ArrowLeft } from 'lucide-react';
import { ENTITY_TYPE_LABELS, formatDate, formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ResolutionStateBadge } from './badges';

// ============================================================
// ENTITY DETAIL HEADER
// ============================================================

interface EntityDetailHeaderProps {
  entity: EntityIntelligence;
  actions?: React.ReactNode;
}

export function EntityDetailHeader({ entity, actions }: EntityDetailHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.normal, ease: easing.emphasized }}
    >
      <Link
        href="/entities"
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground tp-transition mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All entities
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', 'bg-entity-subtle')}>
            <EntityTypeIcon type={entity.entityType} size="md" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-display-sm font-bold text-foreground">{entity.displayName}</h1>
              <ResolutionStateBadge state={entity.resolutionState} />
            </div>
            <p className="text-body-sm text-foreground-muted mt-1">
              {ENTITY_TYPE_LABELS[entity.entityType]}
              {entity.canonicalName && <span className="font-mono"> · {entity.canonicalName}</span>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {entity.isVerified && <Badge variant="success" size="sm">Verified</Badge>}
              {entity.isFlagged && <Badge variant="danger" size="sm">Flagged for review</Badge>}
              <ConfidenceIndicator value={entity.confidence} size="sm" showValue />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="tp-data-label">Sources</div>
              <div className="text-subheading text-foreground mt-0.5">{formatCount(entity.sourcesCount)}</div>
            </div>
            <div>
              <div className="tp-data-label">Connections</div>
              <div className="text-subheading text-foreground mt-0.5">{formatCount(entity.connectionsCount)}</div>
            </div>
            <div>
              <div className="tp-data-label">Updated</div>
              <div className="text-subheading text-foreground mt-0.5">{formatDate(entity.updatedAt)}</div>
            </div>
          </div>
          {actions}
        </div>
      </div>
    </motion.div>
  );
}