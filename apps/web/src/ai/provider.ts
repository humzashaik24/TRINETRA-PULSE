import type {
  AIQuery,
  AIQueryType,
  AIResponse,
  AIContext,
  AIStreamingState,
} from '@trinetra-pulse/types';
import type { SerializedContextBundle } from '@/lib/api/assistant';

// ============================================================
// PHASE 10 — AI PROVIDER ABSTRACTION
// ============================================================
// The application depends on this interface, not on a specific
// model vendor. Providers are bound by name so OpenAI-compatible
// or enterprise-hosted models can be added later. The UI never
// depends on a provider — it always talks to the orchestrator.
// ============================================================

export interface ProviderRequest {
  query: AIQuery;
  context: AIContext;
  /** Conversation history (role + content) for multi-turn grounding. */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** For streaming-capable providers. */
  onDelta?: (text: string) => void;
  /** Bounded, investigation-scoped context for the backend (API provider). */
  serializedContext?: SerializedContextBundle;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsStreaming: boolean;

  generate(req: ProviderRequest): Promise<AIResponse>;
  /** Streaming-capable generate; falls back to complete responses. */
  stream(req: ProviderRequest): Promise<{ streamState: AIStreamingState; response: AIResponse }>;
  classify(text: string): Promise<AIQueryType>;
  summarize(req: ProviderRequest): Promise<AIResponse>;
}

// ------------------------------------------------------------
// Registry
// ------------------------------------------------------------

const registry = new Map<string, () => AIProvider>();

export function registerProvider(name: string, factory: () => AIProvider): void {
  registry.set(name, factory);
}

export function createProvider(name = 'mock'): AIProvider {
  const factory = registry.get(name);
  if (!factory) throw new Error(`Unknown AI provider: ${name}`);
  return factory();
}
