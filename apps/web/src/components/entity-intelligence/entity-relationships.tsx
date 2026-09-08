'use client';

import { type EntityRelationship } from '@trinetra-pulse/types';
import {
  Button,
  ConfidenceIndicator,
  EmptyState,
  EntityBadge,
  SourceBadge,
} from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { ArrowRight, GitFork } from 'lucide-react';
import { RELATIONSHIP_KIND_LABELS } from '@/lib/entity-domain';
import { RelationshipStatusBadge, MethodBadge } from './badges';
import { formatDateTime } from '@/lib/format';

// ============================================================
// ENTITY RELATIONSHIPS
// ============================================================

interface EntityRelationshipsProps {
  relationships: EntityRelationship[];
  focusEntityId: string;
  onNavigate?: (entityId: string) => void;
}

export function EntityRelationships({ relationships, focusEntityId, onNavigate }: EntityRelationshipsProps) {
  if (relationships.length === 0) {
    return (
      <EmptyState
        icon={<GitFork className="h-8 w-8" />}
        title="No relationships yet"
        description="Related entities will appear here as relationships are extracted and verified."
      />
    );
  }

  return (
    <Stagger staggerInterval={0.04}>
      <div className="space-y-2">
        {relationships.map((rel) => {
          const isSource = rel.sourceEntityId === focusEntityId;
          const other = isSource
            ? { id: rel.targetEntityId, name: rel.targetEntityName, type: rel.targetEntityType }
            : { id: rel.sourceEntityId, name: rel.sourceEntityName, type: rel.sourceEntityType };

          return (
            <motion.div
              key={rel.id}
              variants={staggerChildVariants}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 min-w-0 items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-foreground-muted shrink-0">
                  {RELATIONSHIP_KIND_LABELS[rel.type]}
                </span>
                <span className="hidden sm:block text-foreground-muted" aria-hidden="true">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <EntityBadge
                  name={other.name}
                  type={other.type}
                  size="sm"
                  className="shrink-0"
                  onClick={onNavigate ? () => onNavigate(other.id) : undefined}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <RelationshipStatusBadge status={rel.verificationStatus} size="sm" />
                <MethodBadge method={rel.extractionMethod} size="sm" />
                <ConfidenceIndicator value={rel.confidence} size="sm" showValue />
                <SourceBadge source={rel.source} method={undefined} size="sm" />
                {rel.timestamp && (
                  <span className="text-caption text-foreground-muted">{formatDateTime(rel.timestamp)}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Stagger>
  );
}