'use client';

import React, { useMemo } from 'react';
import { Network, FileText, Link2, ArrowRight } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { useEvidenceStore } from '@/state/evidence.store';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_STATUS_LABELS, formatCount, EVIDENCE_STATUS_VARIANT } from '@/lib/format';
import { EVIDENCE_TYPE_VARIANT } from '@/components/evidence/evidence-domain';
import { mockRelationshipEvidenceSupport } from '@/mock';
import type { EvidenceSource } from '@trinetra-pulse/types';

// ============================================================
// NETWORK EVIDENCE MODE (Phase 12)
// ============================================================
// Evidence projected onto the network: for each node (entity) the
// attached evidence, and for each edge (relationship) its support.
// Every item references canonical IDs only (invariant).

const DEMO_ENTITY_LABELS: Record<string, string> = {
  'ent-person-001': 'Rahul Kumar',
  'ent-person-003': 'Vikram Patel',
  'ent-org-001': 'Meridian Imports Pvt Ltd',
};

const DEMO_RELATIONSHIP_LABELS: Record<string, string> = {
  'rel-001': 'USES device',
  'rel-002': 'OWNS vehicle',
  'rel-003': 'KNOWS',
  'rel-005': 'AFFILIATED_WITH',
  'rel-008': 'PARTY_TO transaction',
};

export function NetworkEvidenceMode({
  onSelectEvidence,
}: {
  onSelectEvidence?: (id: string) => void;
}) {
  const items = useEvidenceStore((s) => s.items);
  const selectItem = useEvidenceStore((s) => s.selectItem);
  const handleSelect = onSelectEvidence ?? selectItem;

  const byEntity = useMemo(() => {
    const map = new Map<string, EvidenceSource[]>();
    for (const e of items) {
      for (const id of e.entityIds) {
        const arr = map.get(id) ?? [];
        if (!arr.some((x) => x.id === e.id)) arr.push(e);
        map.set(id, arr);
      }
    }
    return Array.from(map.entries());
  }, [items]);

  const totalAttached = byEntity.reduce((acc, [, list]) => acc + list.length, 0);

  return (
    <div className="space-y-5" data-testid="network-evidence-mode">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3">
        <Network className="h-4 w-4 text-evidence" />
        <p className="text-xs text-foreground-muted">
          <span className="font-medium text-foreground">{formatCount(byEntity.length)} nodes</span> in the network have attached evidence, covering{' '}
          <span className="font-medium text-foreground">{formatCount(totalAttached)} evidence item{totalAttached === 1 ? '' : 's'}</span>. Evidence
          shown is sourced from canonical records (DEMO-labelled).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {byEntity.map(([entityId, list]) => (
          <div key={entityId} className="rounded-xl border border-border bg-surface p-3" data-testid={`network-node-${entityId}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {DEMO_ENTITY_LABELS[entityId] ?? entityId}
                </p>
                <p className="font-mono text-[11px] text-foreground-muted">{entityId}</p>
              </div>
              <Badge size="sm" variant="network">
                {list.length} evidence
              </Badge>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {list.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleSelect(e.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-elevated/40 px-2.5 py-2 text-left hover:border-evidence/50 tp-transition"
                  data-testid={`network-evidence-${e.id}`}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground">
                      <FileText className="h-3 w-3 shrink-0 text-foreground-muted" />
                      {e.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge size="sm" variant={EVIDENCE_TYPE_VARIANT[e.evidenceType]}>
                        {EVIDENCE_TYPE_LABELS[e.evidenceType]}
                      </Badge>
                      <Badge size="sm" variant={EVIDENCE_STATUS_VARIANT[e.status]}>
                        {EVIDENCE_STATUS_LABELS[e.status]}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-foreground-muted">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-3" data-testid="network-edge-support">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-evidence" />
          <h4 className="text-sm font-semibold text-foreground">Edge evidence support</h4>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {mockRelationshipEvidenceSupport.map((r) => (
            <div key={r.relationshipId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-elevated/40 px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {DEMO_RELATIONSHIP_LABELS[r.relationshipId] ?? r.relationshipId}
                </p>
                <p className="font-mono text-[10px] text-foreground-muted">{r.relationshipId}</p>
              </div>
              <Badge size="sm" variant="info">
                {formatCount(r.evidenceIds.length)} items
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
