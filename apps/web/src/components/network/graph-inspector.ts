import type { EntityContext, RelationshipContext } from '@/state/shell.store';
import type { GraphEdge, GraphNode } from '@trinetra-pulse/types';

// ============================================================
// GRAPH → INSPECTOR CONTEXT
// ============================================================
// Maps a knowledge-graph node/edge to the shell inspector context.
// Graph nodes reference canonical entity ids so Phase 6 entity data
// is used when available; graph-supplied hints (confidence, sources,
// evidence) let the inspector render even without a canonical profile.
// ============================================================

export function graphNodeToContext(node: GraphNode, investigationId?: string): EntityContext {
  return {
    type: 'entity',
    id: node.entityId,
    name: node.label,
    entityType: node.type,
    confidence: node.confidence,
    connections: node.connections,
    sources: node.sources,
    activityAt: node.activityAt,
    status: node.status,
    investigationId,
  };
}

export function graphEdgeToContext(
  edge: GraphEdge,
  nodeLabelById: Map<string, { name: string; type: string }>,
  investigationId?: string,
): RelationshipContext {
  const source = nodeLabelById.get(edge.source);
  const target = nodeLabelById.get(edge.target);

  return {
    type: 'relationship',
    id: edge.relationshipId || edge.id,
    relationshipType: edge.type,
    sourceEntityName: source?.name ?? edge.source,
    sourceEntityType: source?.type as RelationshipContext['sourceEntityType'],
    targetEntityName: target?.name ?? edge.target,
    targetEntityType: target?.type as RelationshipContext['targetEntityType'],
    sourceEntityId: edge.source,
    targetEntityId: edge.target,
    confidence: edge.confidence,
    source: edge.sourceRecordLabel,
    evidence: edge.evidence,
    timestamp: edge.timestamp,
    direction: edge.direction,
    extractionMethod: edge.extractionMethod,
    verificationStatus: edge.status,
    investigationId,
  };
}
