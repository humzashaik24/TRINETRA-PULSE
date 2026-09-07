'use client';

import React from 'react';
import { Link2, ArrowRight } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { useEvidenceStore } from '@/state/evidence.store';
import { COVERAGE_LEVEL_LABELS, formatCount } from '@/lib/format';
import { SUPPORT_LEVEL_VARIANT } from '@/components/evidence/evidence-domain';
import { mockEvidenceById } from '@/mock';

// ============================================================
// RELATIONSHIP EVIDENCE SUPPORT (Phase 12)
// ============================================================
// Which links are backed by evidence, direct vs contextual.
// "unsupported" = no linked evidence currently available.

const DEMO_RELATIONSHIP_LABELS: Record<string, string> = {
  'rel-001': 'USES device',
  'rel-002': 'OWNS vehicle',
  'rel-003': 'KNOWS',
  'rel-005': 'AFFILIATED_WITH',
  'rel-008': 'PARTY_TO transaction',
};

export function RelationshipEvidenceSupportList({
  onSelectEvidence,
}: {
  onSelectEvidence?: (id: string) => void;
}) {
  const relationshipSupport = useEvidenceStore((s) => s.relationshipSupport);
  const selectItem = useEvidenceStore((s) => s.selectItem);
  const handleSelect = onSelectEvidence ?? selectItem;

  if (relationshipSupport.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground-muted">
        No relationship evidence support data available.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="relationship-evidence-support">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Relationship evidence support</h3>
        <p className="text-xs text-foreground-muted">
          How each link in the network is grounded in evidence. Direct evidence references the link itself;
          contextual evidence supports the linked entities.
        </p>
      </div>

      {relationshipSupport.map((r) => {
        const variant = SUPPORT_LEVEL_VARIANT[r.supportLevel];
        return (
          <div key={r.relationshipId} className="rounded-lg border border-border bg-surface p-3" data-testid={`relationship-support-${r.relationshipId}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-4 w-4 shrink-0 text-evidence" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {DEMO_RELATIONSHIP_LABELS[r.relationshipId] ?? r.relationshipId}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-foreground-muted">
                    <span className="font-mono">{r.sourceEntityId}</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                    <span className="font-mono">{r.targetEntityId}</span>
                  </p>
                </div>
              </div>
              <Badge size="sm" variant={variant}>
                {COVERAGE_LEVEL_LABELS[r.supportLevel]}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-foreground-muted">
              <span>{formatCount(r.directEvidenceCount)} direct</span>
              <span>{formatCount(r.contextualEvidenceCount)} contextual</span>
              <span>{formatCount(r.evidenceIds.length)} total</span>
            </div>

            {r.evidenceIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.evidenceIds.map((id) => {
                  const item = mockEvidenceById.get(id);
                  return (
                    <button
                      key={id}
                      onClick={() => handleSelect(id)}
                      className={cn(
                        'max-w-[240px] truncate rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px]',
                        'text-foreground-secondary hover:border-evidence/50 hover:text-evidence tp-transition'
                      )}
                    >
                      {item?.title ?? id}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
