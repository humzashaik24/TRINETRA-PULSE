import type {
  AIQueryType,
  AIResponse,
  AIStreamingState,
} from '@trinetra-pulse/types';
import type { AIProvider, ProviderRequest } from '../provider';
import { queryAssistant } from '@/lib/api/assistant';

// ============================================================
// PHASE 17.5 — API-MODE AI PROVIDER
// ============================================================
// When the platform is pointed at a real backend (NEXT_PUBLIC_USE_MOCK_API
// =false), the orchestrator routes answers through this provider. It forwards
// the bounded, investigation-scoped context (assembled by the web retrieval
// layer) to /api/v2/ai, which runs the configured provider (server-side mock
// or OpenAI-compatible) and applies the neutrality guard. No API keys exist
// on the client; provider configuration stays server-side.
// ============================================================

const MODEL = 'backend-grounded-v2';

export class ApiInvestigationProvider implements AIProvider {
  readonly name = 'api';
  readonly model = MODEL;
  readonly supportsStreaming = true;

  async generate(req: ProviderRequest): Promise<AIResponse> {
    const scope = req.query.context;
    const response = await queryAssistant({
      text: req.query.text,
      scope: {
        investigation_id: scope.investigationId ?? null,
        organization_id: scope.organizationId ?? null,
        user_id: scope.userId ?? null,
        network_id: scope.networkId ?? null,
        entity_id: scope.entityId ?? null,
        relationship_id: scope.relationshipId ?? null,
        tab: scope.tab ?? null,
      },
      context: req.serializedContext ?? {},
      history: req.history.length
        ? req.history
        : undefined,
    });
    return response;
  }

  async stream(req: ProviderRequest): Promise<{ streamState: AIStreamingState; response: AIResponse }> {
    const response = await this.generate(req);
    if (req.onDelta) {
      const chunks = response.answer.match(/.{1,24}/g) ?? [response.answer];
      for (const chunk of chunks) req.onDelta(chunk);
    }
    return { streamState: response.status === 'complete' ? 'complete' : 'error', response };
  }

  async classify(text: string): Promise<AIQueryType> {
    // Query routing stays a deterministic client-side concern.
    const { classifyType } = await import('../query-router');
    return classifyType(text);
  }

  async summarize(req: ProviderRequest): Promise<AIResponse> {
    return this.generate(req);
  }
}