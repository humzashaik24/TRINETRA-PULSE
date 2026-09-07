'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import type { EvidenceSource } from '@trinetra-pulse/types';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_STATUS_LABELS, formatDateTime } from '@/lib/format';
import { EVIDENCE_TYPE_ICON, EVIDENCE_TYPE_VARIANT, EVIDENCE_STATUS_VARIANT } from './evidence-domain';

// ============================================================
// EVIDENCE LIST ROW
// ============================================================

interface EvidenceListRowProps {
  evidence: EvidenceSource;
  selected: boolean;
  onSelect: (id: string) => void;
  onInspect?: (id: string) => void;
}

export function EvidenceListRow({ evidence, selected, onSelect, onInspect }: EvidenceListRowProps) {
  const TypeIcon = EVIDENCE_TYPE_ICON[evidence.evidenceType] ?? FileText;
  const hasLinks = evidence.entityIds.length + evidence.findingIds.length + evidence.eventIds.length > 0;

  return (
    <button
      onClick={() => onSelect(evidence.id)}
      data-testid={`evidence-row-${evidence.id}`}
      className={cn(
        'group w-full rounded-lg border p-3 text-left tp-transition',
        selected
          ? 'border-evidence/50 bg-evidence-subtle/40'
          : 'border-border bg-surface hover:bg-surface-hover'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 rounded-md border p-1.5 tp-transition',
            selected
              ? 'border-evidence/40 bg-evidence-subtle text-evidence'
              : 'border-border text-foreground-muted'
          )}
        >
          <TypeIcon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="truncate text-sm font-medium text-foreground group-hover:text-foreground-primary">
              {evidence.title}
            </h4>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge size="sm" variant={EVIDENCE_TYPE_VARIANT[evidence.evidenceType]}>
              {EVIDENCE_TYPE_LABELS[evidence.evidenceType]}
            </Badge>
            <Badge size="sm" variant={EVIDENCE_STATUS_VARIANT[evidence.status]}>
              {EVIDENCE_STATUS_LABELS[evidence.status]}
            </Badge>
          </div>

          {evidence.snippet?.text && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground-secondary">
              {evidence.snippet.text}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-foreground-muted">
            <span>{evidence.sourceName}</span>
            <span>{formatDateTime(evidence.observedAt)}</span>
            {hasLinks && (
              <span>
                {evidence.entityIds.length} entity · {evidence.findingIds.length} finding · {evidence.eventIds.length} event
              </span>
            )}
            {evidence.isDemoData && <span className="text-warning">DEMO</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
