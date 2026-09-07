'use client';

import type { EntitySourceRef } from '@/services/entity.service';
import { EmptyState, SourceBadge } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { Database, FileText } from 'lucide-react';
import { formatCount } from '@/lib/format';

// ============================================================
// ENTITY SOURCES
// ============================================================

export function EntitySources({ sources }: { sources: EntitySourceRef[] }) {
  if (sources.length === 0) {
    return (
      <EmptyState
        icon={<Database className="h-8 w-8" />}
        title="No source records"
        description="Source datasets and records supporting this entity will appear here."
      />
    );
  }

  return (
    <Stagger staggerInterval={0.05}>
      <div className="space-y-2">
        {sources.map((src) => (
          <motion.div
            key={src.datasetId ?? src.source}
            variants={staggerChildVariants}
            className="rounded-lg border border-border bg-surface p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{src.datasetName}</span>
                  <SourceBadge source={src.source} size="sm" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {src.recordRefs.map((ref, i) => (
                    <span
                      key={`${ref}-${i}`}
                      className="inline-flex items-center gap-1 rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted"
                    >
                      <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-subheading text-foreground">{formatCount(src.evidenceCount)}</span>
                <span className="text-caption text-foreground-muted ml-1">refs</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Stagger>
  );
}