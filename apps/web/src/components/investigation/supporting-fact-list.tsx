'use client';

import { Link2 } from 'lucide-react';
import type { InvestigationSupportingFact } from '@trinetra-pulse/types';
import { useShellStore } from '@/state/shell.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { FACT_TYPE_LABELS } from '@/lib/directions-labels';

// ============================================================
// INVESTIGATION — SUPPORTING FACT LIST (Phase 27)
// ============================================================
// Presents the grounding facts behind an investigation direction.
// Every fact is read straight from the computed payload: only the
// references that exist on the fact (entity_id / relationship_id /
// evidence_id) become navigation affordances. The list never
// invents or fabricates references — if a Ref is absent it is not
// rendered.
// ============================================================

export interface SupportingFactListProps {
  facts: InvestigationSupportingFact[];
  /** Investigation scope used when opening objects in the context panel. */
  investigationId: string;
}

export function SupportingFactList({ facts, investigationId }: SupportingFactListProps) {
  if (facts.length === 0) {
    return (
      <p className="text-xs text-foreground-muted" data-testid="supporting-facts-empty">
        No supporting facts recorded for this direction.
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="supporting-fact-list">
      {facts.map((fact, index) => (
        <SupportingFactRow key={`${fact.fact_type}-${index}`} fact={fact} investigationId={investigationId} />
      ))}
    </ul>
  );
}

function SupportingFactRow({
  fact,
  investigationId,
}: {
  fact: InvestigationSupportingFact;
  investigationId: string;
}) {
  const open = useShellStore((s) => s.selectContext);

  const openEntity = (id: string) => {
    const match = useInvestigationStore
      .getState()
      .data.entities.find((e) => e.entity_id === id);
    open({
      type: 'entity',
      id,
      name: match?.name ?? id,
      entityType: match?.entity_type,
      investigationId,
    });
  };

  const openRelationship = (id: string) => {
    const match = useInvestigationStore.getState().data.relationships.find((r) => r.relationship_id === id);
    open({
      type: 'relationship',
      id,
      sourceEntityId: match?.source_entity_id,
      targetEntityId: match?.target_entity_id,
      sourceEntityName: match?.source_entity_name,
      targetEntityName: match?.target_entity_name,
      relationshipType: match?.type,
      confidence: match?.confidence,
      investigationId,
    });
  };

  const openEvidence = (id: string) => {
    const match = useInvestigationStore.getState().data.evidence.find((e) => e.evidence_id === id);
    open({
      type: 'evidence',
      id,
      title: match?.title,
      investigationId,
    });
  };

  return (
    <li className="rounded-lg border border-border bg-surface p-3" data-testid="supporting-fact-row">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">
          {FACT_TYPE_LABELS[fact.fact_type] ?? fact.fact_type}
        </p>
        <span className="font-mono text-[10px] text-foreground-muted" data-testid="supporting-fact-type">
          {fact.fact_type}
        </span>
      </div>

      <p className="mt-1 text-xs text-foreground-secondary">{fact.description}</p>

      {typeof fact.value === 'number' || typeof fact.value === 'string' ? (
        <p className="mt-1 text-sm font-medium tabular-nums text-foreground" data-testid="supporting-fact-value">
          {fact.value}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="supporting-fact-refs">
        {fact.entity_id ? (
          <button
            type="button"
            onClick={() => openEntity(fact.entity_id as string)}
            data-testid={`fact-entity-${fact.entity_id}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            <Link2 className="h-3 w-3" />
            Entity
          </button>
        ) : null}
        {fact.relationship_id ? (
          <button
            type="button"
            onClick={() => openRelationship(fact.relationship_id as string)}
            data-testid={`fact-relationship-${fact.relationship_id}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            <Link2 className="h-3 w-3" />
            Relationship
          </button>
        ) : null}
        {fact.evidence_id ? (
          <button
            type="button"
            onClick={() => openEvidence(fact.evidence_id as string)}
            data-testid={`fact-evidence-${fact.evidence_id}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
          >
            <Link2 className="h-3 w-3" />
            Evidence
          </button>
        ) : null}
      </div>
    </li>
  );
}