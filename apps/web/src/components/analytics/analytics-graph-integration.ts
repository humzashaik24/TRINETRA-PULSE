import { useGraphStore } from '@/state/graph.store';
import { useAnalyticsStore } from '@/state/analytics.store';
import { useShellStore } from '@/state/shell.store';

// ============================================================
// ANALYTICS GRAPH INTEGRATION
// ============================================================
// Bridges the analytics panels to the graph canvas and the shell
// inspector: show a result on the graph (center + focus) and open
// the inspector for an entity. Designed to be called from event
// handlers; reads stores imperatively so it works anywhere.
// ============================================================

export function findGraphNodeId(entityId: string): string | null {
  const nodes = useGraphStore.getState().nodes;
  const node = nodes.find((n) => n.entityId === entityId) ?? nodes.find((n) => n.id === entityId);
  return node ? node.id : null;
}

/** Center the graph canvas on an entity's node and select it. */
export function showOnGraph(entityId: string): void {
  const nodeId = findGraphNodeId(entityId);
  if (!nodeId) return;
  const graph = useGraphStore.getState();
  graph.centerOnNode(nodeId);
  graph.focusNode(nodeId);
  graph.selectNode(nodeId);
}

/** Open the shell inspector for an entity from an analytics result. */
export function inspectEntity(entityId: string, name?: string): void {
  useAnalyticsStore.getState().selectEntity(entityId);
  const node = useGraphStore.getState().nodes.find((n) => n.entityId === entityId);
  useShellStore.getState().selectContext({
    type: 'entity',
    id: entityId,
    name: name ?? node?.label ?? entityId,
    entityType: node?.type,
    confidence: node?.confidence,
    connections: node?.connections,
    sources: node?.sources,
    activityAt: node?.activityAt,
    status: node?.status,
  });
}

/** Inspect a centrality/metric result (centrality context). */
export function inspectCentrality(entityId: string, metric: string, name?: string): void {
  useAnalyticsStore.getState().selectEntity(entityId);
  const node = useGraphStore.getState().nodes.find((n) => n.entityId === entityId);
  useShellStore.getState().selectContext({
    type: 'centrality',
    id: `${metric}:${entityId}`,
    metric,
    entityId,
    entityName: name ?? node?.label ?? entityId,
  });
}

/** Inspect a connected group (community) — outlines via overlay + inspector. */
export function inspectCommunity(communityId: string): void {
  const store = useAnalyticsStore.getState();
  store.selectCommunity(communityId);
  store.setOverlay('community');
  useShellStore.getState().selectContext({
    type: 'community',
    id: communityId,
  });
}

/** Inspect a connected component. */
export function inspectComponent(componentId: string): void {
  const store = useAnalyticsStore.getState();
  store.selectComponent(componentId);
  store.setOverlay('component');
  useShellStore.getState().selectContext({
    type: 'component',
    id: componentId,
  });
}

/** Inspect a structural pattern. */
export function inspectPattern(patternId: string, title?: string): void {
  useAnalyticsStore.getState().selectPattern(patternId);
  useShellStore.getState().selectContext({
    type: 'pattern',
    id: patternId,
    title,
  });
}
