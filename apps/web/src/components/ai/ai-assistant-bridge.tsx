'use client';

import React, { useEffect } from 'react';
import type { AIAction, AIContextScope, AISourceReference } from '@trinetra-pulse/types';
import {
  useShellStore,
  type InspectorContext,
} from '@/state/shell.store';
import { useGraphStore } from '@/state/graph.store';
import { useAIStore, registerAIActionListener, unregisterAIActionListener } from '@/state/ai.store';
import { useAIScope } from '@/hooks/use-ai-scope';
import { useInvestigationStore } from '@/state/investigation.store';
import { AIAssistantPanel } from './ai-assistant-panel';

// ============================================================
// PHASE 10 — AI ASSISTANT BRIDGE
// ============================================================
// Wires the AI panel to the shared workspace shell:
//   - derives the current investigation/network/entity scope
//   - maps AI source chips -> Context Inspector selections
//   - translates user-initiated AI navigation actions into
//     read-only shell/graph selections (never data mutation)
// The panel coexists with the Context Inspector; this component
// itself renders nothing visible beyond the panel when open.
// ============================================================

/** Active investigation id from the store, without a re-render hook
 *  (safe to call inside event handlers / subscriptions). */
function currentInvestigationId(): string | undefined {
  return useInvestigationStore.getState().investigationId ?? undefined;
}

export function AIAssistantBridge() {
  const open = useAIStore((s) => s.open);
  const scope = useAIScope();
  const setScope = useAIStore((s) => s.setScope);

  // Keep the conversation memory scoped to the active investigation.
  useEffect(() => {
    setScope(scope.investigationId ?? null);
  }, [scope.investigationId, setScope]);

  // Register the shell bridge for read-only navigation actions.
  useEffect(() => {
    registerAIActionListener(handleAction);
    return () => {
      unregisterAIActionListener();
    };
  }, []);

  if (!open) return null;

  return (
    <AIAssistantPanel
      scope={scope}
      onSourceClick={onSourceClick}
      onAction={handleAction}
    />
  );
}

// ------------------------------------------------------------
// Source chip -> Context Inspector
// ------------------------------------------------------------

function onSourceClick(source: AISourceReference) {
  const ctx = contextForSource(source);
  if (!ctx) return;
  useShellStore.getState().selectContext(ctx);
}

function contextForSource(source: AISourceReference): InspectorContext | null {
  const investigationId = currentInvestigationId();
  switch (source.sourceType) {
    case 'Entity':
      return { type: 'entity', id: source.sourceId, name: source.label };
    case 'Relationship':
      return { type: 'relationship', id: source.sourceId };
    case 'Evidence':
      return { type: 'evidence', id: source.sourceId, title: source.label, investigationId };
    case 'Finding':
      return { type: 'finding', id: source.sourceId, title: source.label, investigationId };
    case 'Network':
      return { type: 'network', id: source.sourceId, label: source.label };
    case 'Analytics':
      return { type: 'network', id: source.sourceId, label: 'Analytics' };
    case 'Investigation':
      return { type: 'investigation', id: source.sourceId, label: source.label };
    case 'Timeline':
    case 'Event':
      return { type: 'event', id: source.sourceId, title: source.label };
    default:
      return null;
  }
}

// ------------------------------------------------------------
// Read-only navigation actions (user-initiated)
// ------------------------------------------------------------

function handleAction(action: AIAction) {
  const shell = useShellStore.getState();
  const graph = useGraphStore.getState();
  const target = action.target ?? {};

  switch (action.type) {
    case 'OPEN_ENTITY': {
      const entityId = asString(target.entityId);
      if (entityId) {
        shell.selectContext({ type: 'entity', id: entityId });
        if (graph.selectedNodeId !== entityId) graph.selectNode(entityId);
      }
      break;
    }
    case 'OPEN_RELATIONSHIP': {
      const id = asString(target.relationshipId);
      if (id) shell.selectContext({ type: 'relationship', id });
      break;
    }
    case 'OPEN_EVIDENCE': {
      const id = asString(target.evidenceId);
      if (id) {
        const investigationId = currentInvestigationId();
        shell.selectContext({ type: 'evidence', id, investigationId });
      }
      break;
    }
    case 'OPEN_FINDING': {
      const id = asString(target.findingId);
      if (id) {
        const investigationId = currentInvestigationId();
        shell.selectContext({ type: 'finding', id, investigationId });
      }
      break;
    }
    case 'SHOW_ON_GRAPH': {
      const networkId = asString(target.networkId) ?? graph.networkId;
      shell.selectContext(networkId ? { type: 'network', id: networkId, label: 'Network' } : { type: 'case', id: 'graph', label: 'Graph' });
      shell.openInspector();
      break;
    }
    case 'OPEN_TIMELINE':
    case 'OPEN_ANALYTICS':
    case 'FOCUS_COMMUNITY':
    case 'FOCUS_COMPONENT':
      shell.openInspector();
      break;
    default:
      break;
  }

  // The action is user-initiated navigation, not a mutation.
  useAIStore.getState().resolveAction(action.type);
}

function asString(v: string | number | boolean | null | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
