'use client';

import { GitBranch, ChevronRight } from 'lucide-react';
import { useInvestigationOperationsStore } from '@/state/investigation-operations.store';
import type { ProvenanceChain, ProvenanceChainNode } from '@trinetra-pulse/types';

// ============================================================
// OPERATIONS — PROVENANCE CHAINS PANEL
// ============================================================
// Source → dataset → record → entity → relationship → finding.
// Reproducible lineage so every analytical conclusion can be traced.
// ============================================================

const NODE_TINT: Record<ProvenanceChainNode['type'], string> = {
  source: 'bg-surface-elevated text-foreground-secondary',
  dataset: 'bg-info-subtle text-info',
  record: 'bg-surface-elevated text-foreground-secondary',
  entity: 'bg-entity-subtle text-entity',
  relationship: 'bg-network-subtle text-network',
  finding: 'bg-ai-subtle text-ai',
};

export function InvestigationProvenancePanel() {
  const provenance = useInvestigationOperationsStore((s) => s.provenance);

  if (provenance.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-foreground-muted">
        No provenance chains for this investigation yet.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="investigation-provenance">
      {provenance.map((chain: ProvenanceChain) => (
        <div key={chain.id} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <GitBranch className="h-4 w-4 text-foreground-muted" />
              {chain.targetType}: {chain.targetId}
            </span>
            {chain.timestamp && (
              <span className="text-[11px] text-foreground-muted">
                {new Date(chain.timestamp).toLocaleString()}
              </span>
            )}
          </div>
          <ol className="flex flex-wrap items-center gap-1.5">
            {chain.nodes.map((node, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium ${NODE_TINT[node.type]}`}
                  title={node.detail ?? undefined}
                >
                  {node.label}
                </span>
                {i < chain.nodes.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-foreground-muted" />
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
