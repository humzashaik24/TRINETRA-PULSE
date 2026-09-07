'use client';

import { Link2, ArrowRight } from 'lucide-react';
import { useInvestigationOperationsStore } from '@/state/investigation-operations.store';
import type { CrossReference, CrossReferenceNode } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — CROSS REFERENCES PANEL
// ============================================================
// Entity-centric chains: entity ↔ relationship ↔ evidence ↔ finding.
// All nodes reference real canonical ids, so they resolve to the
// intelligence surfaces instead of dangling.
// ============================================================

const NODE_TINT: Record<CrossReferenceNode['type'], string> = {
  entity: 'bg-entity-subtle text-entity',
  relationship: 'bg-network-subtle text-network',
  evidence: 'bg-evidence-subtle text-evidence',
  finding: 'bg-ai-subtle text-ai',
  event: 'bg-anomaly-subtle text-anomaly',
};

function NodeChip({ node }: { node: CrossReferenceNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${NODE_TINT[node.type]}`}>
      {node.label}
      <span className="opacity-60">· {node.id}</span>
    </span>
  );
}

export function InvestigationCrossReferencesPanel() {
  const crossReferences = useInvestigationOperationsStore((s) => s.crossReferences);

  if (crossReferences.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No cross-references for this investigation yet.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="investigation-cross-references">
      {crossReferences.map((ref: CrossReference) => (
        <div key={ref.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-foreground-muted" />
            <span className="text-sm font-medium text-foreground">{ref.entity.label}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground-muted">Relationships</span>
              {ref.relationships.map((node) => (
                <NodeChip key={node.id} node={node} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground-muted">Evidence</span>
              {ref.evidence.map((node) => (
                <NodeChip key={node.id} node={node} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground-muted">Findings</span>
              {ref.findings.map((node) => (
                <NodeChip key={node.id} node={node} />
              ))}
            </div>
            {ref.links.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1 text-foreground-muted">
                {ref.links.slice(0, 6).map((link, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span className="capitalize">{link.fromType}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="capitalize">{link.toType}</span>
                    {i < ref.links.length - 1 && <span>·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
