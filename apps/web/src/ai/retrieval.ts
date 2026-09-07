import type {
  AIContextScope,
  AISourceReference,
} from '@trinetra-pulse/types';
import type { ContextSourceBundle } from './context-builder';
import { CONTEXT_BUDGETS } from './context-builder';
import type { SerializedContextBundle } from '@/lib/api/assistant';
import {
  getInvestigationSummary,
  getInvestigation,
  listEntitiesForInvestigation,
  listRelationshipsForInvestigation,
  listEvidenceForInvestigation,
  listFindingsForInvestigation,
  getTimeline,
  getNetworkGraph,
  getNetworkAnalytics,
  getEntity,
} from '@/lib/api/investigations';

// ============================================================
// PHASE 17.5 — INVESTIGATION-SCOPED REAL RETRIEVAL
// ============================================================
// Retrieves ONLY what the current scope needs from the persisted
// /api/v2 endpoints and maps it into the ContextSourceBundle the
// context-builder consumes. This is the API-mode counterpart to the
// mock in-memory services. It is strictly read-only and always bound
// to the investigation in the scope — it never loads global data.
// ============================================================

/** Resolve the effective network scope: the graph is investigation-scoped,
 *  so when a network id is present it must equal the investigation id. */
function effectiveNetworkId(scope: AIContextScope, investigationId: string): string | null {
  if (scope.networkId === investigationId) return investigationId;
  // The graph workspace stores the investigation UUID as the network id in
  // API mode. If a different network id is present, we still ground on the
  // investigation's graph rather than an out-of-scope network.
  return investigationId;
}

export interface RetrievalResult {
  bundle: ContextSourceBundle;
  serialized: SerializedContextBundle;
  /** Source references derived strictly from the bounded context. */
  sources: AISourceReference[];
  /** Whether the bounded context exceeded a budget. */
  truncated: boolean;
}

/**
 * Retrieve a bounded, investigation-scoped context from the persisted API.
 *
 * @returns a RetrievalResult, or null when there is no usable investigation
 * scope (the caller produces a safe not-found response).
 */
export async function retrieveInvestigationContext(
  scope: AIContextScope,
): Promise<RetrievalResult | null> {
  const investigationId = scope.investigationId;
  if (!investigationId) {
    return null;
  }

  try {
    const [
      summary,
      investigation,
      entities,
      relationships,
      evidence,
      findings,
      timeline,
    ] = await Promise.all([
      getInvestigationSummary(investigationId),
      getInvestigation(investigationId).catch(() => null),
      listEntitiesForInvestigation(investigationId).catch(() => []),
      listRelationshipsForInvestigation(investigationId).catch(() => []),
      listEvidenceForInvestigation(investigationId).catch(() => []),
      listFindingsForInvestigation(investigationId).catch(() => []),
      getTimeline(investigationId).catch(() => null),
    ]);

    const nameById = new Map(entities.map((e) => [e.id, e.name]));

    const relationshipItems = relationships.map((r) => ({
      id: r.id,
      sourceName: nameById.get(r.source_entity_id) ?? r.source_entity_id,
      targetName: nameById.get(r.target_entity_id) ?? r.target_entity_id,
      type: r.relationship_type,
      confidence: r.confidence ?? 0,
      sourceEntityId: r.source_entity_id,
      targetEntityId: r.target_entity_id,
    }));
    const evidenceItems = evidence.map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.description ?? '',
      evidenceType: e.evidence_type,
    }));
    const findingItems = findings.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description ?? '',
      category: (f.severity ?? 'info').toLowerCase(),
      confidence: f.confidence,
    }));
    const timelineItems = (timeline?.entries ?? [])
      .filter((t) => t.kind !== 'finding') // mock-parity: findings come from their own slice
      .map((t, i) => ({
        id: t.ref_id ? `tl-${t.ref_id}` : `tl-${i}`,
        timestamp: t.at ? new Date(t.at).toISOString() : new Date().toISOString(),
        title: t.title ?? 'Event',
        description: t.description,
        category: t.kind,
      }));

    const bundle: ContextSourceBundle = {
      investigation: {
        id: investigationId,
        title: summary.title,
        status: summary.status,
        priority: summary.priority,
        description: investigation?.description ?? null,
        entityCount: summary.entity_count,
        relationshipCount: summary.relationship_count,
        evidenceCount: summary.evidence_count,
      },
      relationships: relationshipItems,
      evidence: evidenceItems,
      findings: findingItems,
      timeline: timelineItems,
    };

    // Selected entity (scoped to this investigation's entities).
    if (scope.entityId) {
      const entity = await getEntity(scope.entityId).catch(() => null);
      if (entity && entity.investigation_id === investigationId) {
        const connections = relationshipItems.filter(
          (r) => r.sourceEntityId === entity.id || r.targetEntityId === entity.id,
        ).length;
        bundle.entity = {
          id: entity.id,
          name: entity.name,
          entityType: entity.entity_type,
          description: entity.description ?? undefined,
          resolutionState: entity.is_flagged ? 'flagged' : entity.is_verified ? 'resolved' : 'unknown',
          confidence: entity.confidence ?? 0,
          connectionsCount: connections,
        };
      }
    }

    // Network + analytics (investigation-scoped).
    const networkId = effectiveNetworkId(scope, investigationId);
    if (networkId) {
      const [graph, analytics] = await Promise.all([
        getNetworkGraph(networkId).catch(() => null),
        getNetworkAnalytics(networkId).catch(() => null),
      ]);
      if (graph) {
        bundle.network = {
          id: investigationId,
          name: `Investigation ${investigationId.slice(0, 8)}`,
          nodeCount: graph.nodes.length,
          relationshipCount: graph.edges.length,
          clusterCount: 0,
        };
      }
      if (analytics) {
        const degree = new Map<string, number>();
        for (const r of relationshipItems) {
          degree.set(r.sourceEntityId, (degree.get(r.sourceEntityId) ?? 0) + 1);
          degree.set(r.targetEntityId, (degree.get(r.targetEntityId) ?? 0) + 1);
        }
        let topId: string | null = null;
        let topDegree = 0;
        for (const [id, d] of degree) {
          if (d > topDegree) {
            topId = id;
            topDegree = d;
          }
        }
        bundle.analytics = {
          nodes: analytics.entity_count,
          relationships: analytics.relationship_count,
          communityCount: 0,
          connectedComponents: analytics.connected_components,
          topConnectedEntity: topId ? nameById.get(topId) ?? topId : null,
          averageDegree: analytics.average_degree,
          density: 0,
          bridgeEntityCount: 0,
        };
      }
    }

    // Detect truncation at the bundle level for the serialized payload.
    const truncated =
      relationshipItems.length > CONTEXT_BUDGETS.relationships ||
      evidenceItems.length > CONTEXT_BUDGETS.evidence ||
      findingItems.length > CONTEXT_BUDGETS.findings ||
      timelineItems.length > CONTEXT_BUDGETS.timeline;

    const serialized = serializeBundle(bundle, truncated);
    const sources = sourcesFromBundle(bundle);

    return { bundle, serialized, sources, truncated };
  } catch {
    // Any retrieval failure degrades safely: no grounded answer is possible.
    return null;
  }
}

/** Serialize the bounded bundle into the backend DATA payload. */
export function serializeBundle(
  bundle: ContextSourceBundle,
  truncated = false,
): SerializedContextBundle {
  const relationships = bundle.relationships ?? [];
  const evidence = bundle.evidence ?? [];
  const findings = bundle.findings ?? [];
  return {
    investigation: bundle.investigation
      ? {
          sourceId: bundle.investigation.id,
          title: bundle.investigation.title,
          status: bundle.investigation.status,
          priority: bundle.investigation.priority,
          entityCount: bundle.investigation.entityCount,
          relationshipCount: bundle.investigation.relationshipCount,
          evidenceCount: bundle.investigation.evidenceCount,
        }
      : null,
    entity: bundle.entity
      ? {
          sourceId: bundle.entity.id,
          label: bundle.entity.name,
          type: bundle.entity.entityType,
          connections: bundle.entity.connectionsCount,
        }
      : null,
    relationships: relationships.slice(0, CONTEXT_BUDGETS.relationships).map((r) => ({
      sourceId: r.id,
      label: `${r.sourceName} — ${r.type} — ${r.targetName}`,
      confidence: r.confidence,
    })),
    evidence: evidence.slice(0, CONTEXT_BUDGETS.evidence).map((e) => ({
      sourceId: e.id,
      label: e.title,
      summary: e.summary,
    })),
    findings: findings.slice(0, CONTEXT_BUDGETS.findings).map((f) => ({
      sourceId: f.id,
      label: f.title,
      summary: f.description,
    })),
    timeline: (bundle.timeline ?? []).slice(0, CONTEXT_BUDGETS.timeline).map((t) => ({
      sourceId: t.id,
      timestamp: t.timestamp,
      label: t.title,
      summary: t.description ?? '',
    })),
    truncated,
  };
}

/** Source references derived strictly from the bounded bundle, so that
 *  chips only ever point at data actually present in the retrieved context. */
export function sourcesFromBundle(bundle: ContextSourceBundle): AISourceReference[] {
  const refs: AISourceReference[] = [];
  if (bundle.investigation) {
    refs.push({
      id: `Investigation:${bundle.investigation.id}`,
      sourceType: 'Investigation',
      sourceId: bundle.investigation.id,
      label: bundle.investigation.title,
      relevance: 0.95,
    });
  }
  if (bundle.entity) {
    refs.push({
      id: `Entity:${bundle.entity.id}`,
      sourceType: 'Entity',
      sourceId: bundle.entity.id,
      label: bundle.entity.name,
      relevance: 1,
    });
  }
  for (const r of bundle.relationships ?? []) {
    refs.push({
      id: `Relationship:${r.id}`,
      sourceType: 'Relationship',
      sourceId: r.id,
      label: `${r.sourceName} — ${r.type} — ${r.targetName}`,
      relevance: 0.5,
    });
  }
  for (const e of bundle.evidence ?? []) {
    refs.push({
      id: `Evidence:${e.id}`,
      sourceType: 'Evidence',
      sourceId: e.id,
      label: e.title,
      relevance: 0.6,
    });
  }
  for (const f of bundle.findings ?? []) {
    refs.push({
      id: `Finding:${f.id}`,
      sourceType: 'Finding',
      sourceId: f.id,
      label: f.title,
      relevance: 0.55,
    });
  }
  return refs;
}
