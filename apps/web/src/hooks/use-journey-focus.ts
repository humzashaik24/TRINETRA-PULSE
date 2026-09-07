'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseJourneyPayload, type JourneyPayload } from '@/navigation/journey';
import { useInvestigationStore } from '@/state/investigation.store';
import { useGraphStore } from '@/state/graph.store';

// ============================================================
// PHASE 13 — JOURNEY FOCUS (deep-link context preservation)
// ============================================================
// Applies the cross-module navigation contract to workspace pages:
//   - seeds the active investigation from the ?i= param so the AI
//     scope + inspector stay grounded through the whole journey
//   - after a graph loads, selects + centers the entity carried by
//     ?focus= so "Open in network" from an entity arrives focused
//   - in analytics, remembers network+focused entity for the
//     "back to network graph" link
// ============================================================

/** Read + apply the journey payload. Seeds investigation scope once. */
export function useJourneyFocus(): {
  payload: JourneyPayload;
  focus: string | null;
} {
  const searchParams = useSearchParams();

  const payload = useMemo(
    () => parseJourneyPayload(searchParams.toString()),
    [searchParams]
  );
  const focus = payload.focus ?? null;

  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (!payload.investigation) {
      seededRef.current = null;
      return;
    }
    if (seededRef.current === payload.investigation) return;
    seededRef.current = payload.investigation;
    useInvestigationStore.getState().seedInvestigation(payload.investigation);
  }, [payload.investigation]);

  return { payload, focus };
}

/** Wait for a network graph to finish loading, then select + center
 *  the node referenced by the journey focus (if present). Applied
 *  once per focus value so subsequent graph re-renders do not
 *  re-trigger the selection. */
export function useGraphJourneyFocus() {
  const searchParams = useSearchParams();
  const payload = useMemo(
    () => parseJourneyPayload(searchParams.toString()),
    [searchParams]
  );

  const nodes = useGraphStore((s) => s.nodes);
  const loadingState = useGraphStore((s) => s.loadingState);
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadingState !== 'ready') return;
    const focus = payload.focus;
    if (!focus) return;
    if (appliedRef.current === focus) return;

    const graph = useGraphStore.getState();
    const node = nodes.find((n) => n.entityId === focus) ?? nodes.find((n) => n.id === focus);
    if (!node) return;

    appliedRef.current = focus;
    // Select (opens the inspector) and focus the deep-linked entity.
    graph.selectNode(node.id);
    graph.focusNode(node.id);
    graph.setDepth(2);
    graph.expandNode(node.id);
    const center = graph.engine?.viewport;
    if (center?.centerOn && typeof center.centerOn === 'function') {
      center.centerOn(node.id);
    }
  }, [loadingState, nodes, payload.focus]);
}