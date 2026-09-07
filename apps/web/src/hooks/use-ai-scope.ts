'use client';

import { useInvestigationStore } from '@/state/investigation.store';
import { useGraphStore } from '@/state/graph.store';
import type { AIContextScope } from '@trinetra-pulse/types';

// ============================================================
// PHASE 10 — derive the current AI context scope
// ============================================================
// Reads the active investigation, open network and selected graph
// node from the existing workspace stores. The AI assistant never
// guesses scope — it uses exactly what the investigator currently
// has open/selected. This is the source of truth fed to the panel.
// ============================================================

export function useAIScope(): AIContextScope {
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const networkId = useGraphStore((s) => s.networkId);
  const entityId = useGraphStore((s) => s.selectedNodeId);

  return {
    investigationId: investigationId ?? undefined,
    networkId: networkId ?? null,
    entityId: entityId ?? null,
  };
}
