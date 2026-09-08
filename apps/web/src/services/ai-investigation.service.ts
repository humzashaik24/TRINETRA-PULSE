import type {
  AIQuery,
  AIResponse,
  AIContextScope,
  AIContext,
} from '@trinetra-pulse/types';
import { buildRegistry, validateResponse, sourceIsValid } from '@/ai/validation';
import { routeQuery } from '@/ai/query-router';
import { createProvider, type AIProvider } from '@/ai/provider';
import { buildInvestigationContext, type ContextSourceBundle } from '@/ai/context-builder';
import type { SerializedContextBundle } from '@/lib/api/assistant';
import {
  getInvestigation,
  getInvestigationEvidence,
  getInvestigationFindings,
  getInvestigationTimeline,
  getInvestigationEntities,
  getInvestigationRelationships,
} from '@/services/investigation.service';
import { getNetworkSummary, getNetwork } from '@/services/network.service';
import { getSummary as getAnalyticsSummary } from '@/services/network-analytics.service';
import { fetchEntity } from '@/services/entity.service';
import { registerProvider } from '@/ai/provider';
import { MockAIProvider } from '@/ai/providers/mock-provider';
import { ApiInvestigationProvider } from '@/ai/providers/api-provider';
import { retrieveInvestigationContext } from '@/ai/retrieval';
import { isMockData } from '@/lib/api/config';

// ============================================================
// PHASE 10 — AI ORCHESTRATOR (ai-investigation.service)
// ============================================================
// The AI investigation assistant orchestrator:
//   receive query → build context → route query → call tools →
//   construct grounded context → invoke provider → validate →
//   attach source references → return typed AIResponse.
//
// It NEVER bypasses the data service layers and NEVER mutates
// data (read-only default). Source references are validated
// against the investigation scope before being surfaced.
//
// PHASE 17.5 — grounded on persisted data:
//   When the platform points at a real backend (NEXT_PUBLIC_USE_MOCK_API
//   =false) the orchestrator retrieves the bounded investigation context
//   from the /api/v2 endpoints and routes the answer through the 'api'
//   provider (server-side provider + neutrality guard). Mock mode keeps
//   the deterministic in-memory provider. Nothing on the client holds an
//   API key; provider configuration is server-side only.
// ============================================================

registerProvider('mock', () => new MockAIProvider());
registerProvider('api', () => new ApiInvestigationProvider());

export interface AIOrchestratorOptions {
  provider?: AIProvider;
  /** Access-control preparation: even though full RBAC is not
   *  implemented, retrieval is scoped to these ids. */
  organizationId?: string;
  userId?: string;
  providerName?: string;
}

const defaultProviderName = () => (isMockData() ? 'mock' : 'api');

export class AIInvestigationOrchestrator {
  private readonly provider: AIProvider;

  constructor(options: AIOrchestratorOptions = {}) {
    this.provider =
      options.provider ??
      createProvider(options.providerName ?? defaultProviderName());
  }

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  async answer(input: {
    text: string;
    scope: AIContextScope;
    history?: { role: 'user' | 'assistant'; content: string }[];
    userId?: string;
    organizationId?: string;
  }): Promise<AIResponse> {
    const routing = routeQuery({ text: input.text, scope: input.scope });
    const query: AIQuery = {
      id: `query-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: routing.type,
      text: input.text,
      investigationId: input.scope.investigationId,
      userId: input.userId ?? input.scope.userId,
      organizationId: input.organizationId,
      context: input.scope,
    };

    const { bundle, serialized } = await this.prepareContext(input.scope);
    const context = buildInvestigationContext(input.scope, { bundle });

    const raw = await this.provider.generate({
      query,
      context,
      history: input.history ?? [],
      serializedContext: serialized,
    });

    return validateResponse(raw, context).response;
  }

  async explain(input: {
    entityId?: string;
    relationshipId?: string;
    communityId?: string;
    scope: AIContextScope;
  }): Promise<AIResponse> {
    const text = input.relationshipId
      ? 'Explain this relationship'
      : input.communityId
        ? 'Explain this community'
        : 'Summarize this entity';
    return this.answer({
      text,
      scope: {
        ...input.scope,
        entityId: input.entityId,
        relationshipId: input.relationshipId,
      },
    });
  }

  async summarize(input: { scope: AIContextScope }): Promise<AIResponse> {
    return this.answer({
      text: 'Summarize the investigation',
      scope: input.scope,
    });
  }

  async compare(input: {
    entityIdA?: string;
    entityIdB?: string;
    scope: AIContextScope;
  }): Promise<AIResponse> {
    return this.answer({
      text: `Compare entity ${input.entityIdA ?? 'A'} and entity ${input.entityIdB ?? 'B'}`,
      scope: { ...input.scope, entityId: input.entityIdA },
    });
  }

  // ------------------------------------------------------------
  // Context assembly — retrieve ONLY what the scope needs
  // ------------------------------------------------------------

  async assembleContext(scope: AIContextScope): Promise<ContextSourceBundle> {
    const { bundle } = await this.prepareContext(scope);
    return bundle;
  }

  private async prepareContext(
    scope: AIContextScope,
  ): Promise<{ bundle: ContextSourceBundle; serialized?: SerializedContextBundle }> {
    if (!isMockData()) {
      const retrieval = await retrieveInvestigationContext(scope);
      return {
        bundle: retrieval?.bundle ?? {},
        serialized: retrieval?.serialized,
      };
    }
    return { bundle: await this.assembleMockContext(scope) };
  }

  /** Mock-mode context assembly from the in-memory demo services. */
  private async assembleMockContext(scope: AIContextScope): Promise<ContextSourceBundle> {
    const bundle: ContextSourceBundle = {};

    // Investigation + its nested, bounded data
    if (scope.investigationId) {
      const [investigation, entities, relationships, evidence, findings, timeline] =
        await Promise.all([
          getInvestigation(scope.investigationId),
          getInvestigationEntities(scope.investigationId),
          getInvestigationRelationships(scope.investigationId),
          getInvestigationEvidence(scope.investigationId),
          getInvestigationFindings(scope.investigationId),
          getInvestigationTimeline(scope.investigationId),
        ]);

      bundle.investigation = {
        id: investigation.id,
        title: investigation.title,
        status: investigation.status,
        priority: investigation.priority,
        description: investigation.description,
        entityCount: investigation.entity_count,
        relationshipCount: investigation.relationship_count,
        evidenceCount: investigation.evidence_count,
      };

      bundle.relationships = relationships.map((r) => ({
        id: r.relationship_id,
        sourceName: r.source_entity_name,
        targetName: r.target_entity_name,
        type: r.type,
        confidence: r.confidence,
        sourceEntityId: r.source_entity_id,
        targetEntityId: r.target_entity_id,
      }));

      bundle.evidence = evidence.map((e) => ({
        id: e.evidence_id,
        title: e.title,
        summary: e.summary,
        evidenceType: e.evidence_type,
      }));

      bundle.findings = findings.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category,
        confidence: f.confidence,
      }));

      bundle.timeline = timeline.map((t) => ({
        id: t.id,
        timestamp: t.timestamp,
        title: t.title,
        description: t.description,
        category: t.category,
      }));
    }

    // Selected entity
    if (scope.entityId) {
      try {
        const entity = await fetchEntity(scope.entityId);
        bundle.entity = {
          id: entity.id,
          name: entity.name,
          entityType: entity.entityType,
          description: entity.description,
          resolutionState: entity.resolutionState,
          confidence: entity.confidence,
          connectionsCount: entity.connectionsCount,
        };
      } catch {
        // entity unavailable — leave out of context
      }
    }

    // Network + analytics summary
    if (scope.networkId) {
      try {
        const [summary, graph] = await Promise.all([
          getNetworkSummary(scope.networkId),
          getNetwork(scope.networkId),
        ]);
        bundle.network = {
          id: summary.id,
          name: summary.name,
          nodeCount: summary.nodeCount,
          relationshipCount: summary.relationshipCount,
          clusterCount: summary.clusterCount,
        };
        try {
          const analytics = await getAnalyticsSummary(scope.networkId);
          bundle.analytics = {
            nodes: analytics?.nodes ?? graph.nodes.length,
            relationships: analytics?.relationships ?? graph.edges.length,
            communityCount: analytics?.communityCount ?? 0,
            connectedComponents: analytics?.connectedComponents ?? 0,
            topConnectedEntity: analytics?.topConnectedEntity ?? null,
            averageDegree: analytics?.averageDegree ?? 0,
            density: analytics?.density ?? 0,
            bridgeEntityCount: analytics?.bridgeEntityCount ?? 0,
          };
        } catch {
          bundle.analytics = {
            nodes: graph.nodes.length,
            relationships: graph.edges.length,
            communityCount: graph.clusters.length,
            connectedComponents: 0,
            topConnectedEntity: null,
            averageDegree: 0,
            density: 0,
            bridgeEntityCount: 0,
          };
        }
      } catch {
        // network unavailable
      }
    }

    return bundle;
  }

  // ------------------------------------------------------------
  // Validation helpers (exposed for tests)
  // ------------------------------------------------------------

  validate(context: AIContext, raw: AIResponse) {
    return validateResponse(raw, context);
  }

  registry(context: AIContext) {
    return buildRegistry(context);
  }
}

export const aiInvestigationService = new AIInvestigationOrchestrator();

export { sourceIsValid };