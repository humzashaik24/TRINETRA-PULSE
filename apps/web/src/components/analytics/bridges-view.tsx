'use client';

import React from 'react';
import type { BridgeEntity, BridgeRelationship } from '@trinetra-pulse/types';
import { Badge, Button } from '@trinetra-pulse/ui';
import { Eye, Link2 } from 'lucide-react';
import { useAnalyticsStore } from '@/state/analytics.store';
import { RankingTable, type RankingRow } from './ranking-table';
import { inspectCentrality, inspectEntity, showOnGraph } from './analytics-graph-integration';

// ============================================================
// BRIDGE ENTITY & RELATIONSHIP VIEW
// ============================================================
// "Bridge entity" / "connector": an entity linking otherwise
// separated parts of the network. Analytical, not accusatory.
// ============================================================

export function BridgeView({
  bridges,
  relationships,
  unavailable = false,
}: {
  bridges: BridgeEntity[];
  relationships: BridgeRelationship[];
  unavailable?: boolean;
}) {
  const overlay = useAnalyticsStore((s) => s.overlay);
  const setOverlay = useAnalyticsStore((s) => s.setOverlay);
  const selectedBridgeId = useAnalyticsStore((s) => s.selectedBridgeId);
  const selectBridge = useAnalyticsStore((s) => s.selectBridge);
  const selectEntity = useAnalyticsStore((s) => s.selectEntity);

  const rows: RankingRow[] = bridges.map((b) => ({
    entityId: b.entityId,
    label: b.entityId,
    value: b.bridgeScore,
    secondary: `#${b.rank}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-foreground-muted">
          Bridge entities are highly connected to otherwise-separate parts of the network.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setOverlay(overlay === 'bridge' ? 'none' : 'bridge')}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          {overlay === 'bridge' ? 'Clear overlay' : 'Highlight bridges'}
        </Button>
      </div>

      <section className="space-y-2">
        <h4 className="tp-data-label">Bridge entities</h4>
        {unavailable ? (
          <p className="py-4 text-center text-xs text-foreground-muted">Bridge analysis is unavailable from the API for this network.</p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-foreground-muted">No bridge entities detected.</p>
        ) : (
          <RankingTable
            rows={rows}
            valueFormatter={(r) => Math.round(r.value * 100) + '%'}
            onSelect={(row) => {
              selectBridge(row.entityId);
              inspectCentrality(row.entityId, 'betweenness', row.label);
              showOnGraph(row.entityId);
            }}
            selectedId={selectedBridgeId}
          />
        )}
      </section>

      <section className="space-y-2">
        <h4 className="tp-data-label">Bridge relationships</h4>
        {unavailable ? null : relationships.length === 0 ? (
          <p className="py-4 text-center text-xs text-foreground-muted">No bridge relationships detected.</p>
        ) : (
          <ul className="space-y-1.5">
            {relationships.slice(0, 8).map((r) => (
              <li key={`${r.relationshipId}-${r.sourceEntityId}-${r.targetEntityId}`} className="flex items-center gap-2 rounded border border-border bg-surface/40 px-2.5 py-1.5">
                <Link2 className="h-3 w-3 shrink-0 text-foreground-muted" />
                <button
                  onClick={() => {
                    selectEntity(r.sourceEntityId);
                    inspectEntity(r.sourceEntityId, r.sourceEntityId);
                  }}
                  className="truncate text-xs font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  {r.sourceEntityId}
                </button>
                <span className="text-[11px] text-foreground-muted">↔</span>
                <button
                  onClick={() => {
                    selectEntity(r.targetEntityId);
                    inspectEntity(r.targetEntityId, r.targetEntityId);
                  }}
                  className="truncate text-xs font-medium text-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                >
                  {r.targetEntityId}
                </button>
                <Badge size="sm" variant="warning" className="ml-auto shrink-0">{Math.round(r.bridgeScore * 100)}%</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
