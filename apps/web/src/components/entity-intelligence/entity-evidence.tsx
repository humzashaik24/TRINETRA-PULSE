'use client';

import { type EntityEvidenceItem } from '@trinetra-pulse/types';
import { ConfidenceIndicator, EmptyState, SourceBadge } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { FolderOpen, Paperclip } from 'lucide-react';
import { formatDateTime, formatPercent } from '@/lib/format';
import { MethodBadge } from './badges';

// ============================================================
// ENTITY EVIDENCE
// ============================================================

export function EntityEvidence({ evidence }: { evidence: EntityEvidenceItem[] }) {
  if (evidence.length === 0) {
    return (
      <EmptyState
        icon={<Paperclip className="h-8 w-8" />}
        title="No linked evidence"
        description="Evidence items supporting this entity's profile will appear here."
      />
    );
  }

  return (
    <Stagger staggerInterval={0.05}>
      <div className="space-y-2">
        {evidence.map((item) => (
          <motion.div
            key={item.id}
            variants={staggerChildVariants}
            className="rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  {item.documentId && (
                    <span className="inline-flex items-center gap-1 text-caption text-foreground-muted">
                      <FolderOpen className="h-3 w-3" aria-hidden="true" />
                      doc {item.documentId}
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-foreground-muted mt-0.5">{item.summary}</p>
              </div>
              <ConfidenceIndicator value={item.confidence} size="sm" showValue />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <SourceBadge source={item.sourceName} size="sm" />
              <MethodBadge method={item.extractionMethod} size="sm" />
              {item.sourceRecord && (
                <span className="text-caption text-foreground-muted font-mono">{item.sourceRecord}</span>
              )}
              <span className="text-caption text-foreground-muted">{formatDateTime(item.timestamp)}</span>
              <span className="text-caption text-foreground-muted">{formatPercent(item.confidence)} confidence</span>
            </div>
          </motion.div>
        ))}
      </div>
    </Stagger>
  );
}