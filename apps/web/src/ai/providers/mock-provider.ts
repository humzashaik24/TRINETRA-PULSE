import type {
  AIQueryType,
  AIResponse,
  AIStreamingState,
} from '@trinetra-pulse/types';
import type { AIProvider, ProviderRequest } from '../provider';
import { buildAnsweredResponse } from '../grounding';
import { classifyType } from '../query-router';

// ============================================================
// PHASE 10 — DETERMINISTIC MOCK PROVIDER
// ============================================================
// Development/test provider. It does NOT use a real LLM; instead it
// answers known query categories using the ACTUAL investigation and
// analytics data already gathered into the context model. This keeps
// output deterministic and grounded (no random, no hallucinated
// numbers) while exercising the full orchestrator + validation path.
// ============================================================

const MODEL = 'trinetra-deterministic-local-v0';

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = MODEL;
  readonly supportsStreaming = true;

  async generate(req: ProviderRequest): Promise<AIResponse> {
    await delay(60);
    return buildAnsweredResponse({
      queryId: req.query.id,
      type: req.query.type,
      context: req.context,
      refs: { entityIds: req.context.entity ? [req.context.entity.sourceId] : [], networkId: req.context.network?.sourceId ?? null },
    });
  }

  async stream(req: ProviderRequest): Promise<{ streamState: AIStreamingState; response: AIResponse }> {
    const response = await this.generate(req);
    // Simulated incremental delivery for UI/streaming architecture.
    if (req.onDelta) {
      const chunks = response.answer.match(/.{1,24}/g) ?? [response.answer];
      for (const chunk of chunks) req.onDelta(chunk);
    }
    return { streamState: response.status === 'complete' ? 'complete' : 'error', response };
  }

  async classify(text: string): Promise<AIQueryType> {
    return classifyType(text);
  }

  async summarize(req: ProviderRequest): Promise<AIResponse> {
    return this.generate(req);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
