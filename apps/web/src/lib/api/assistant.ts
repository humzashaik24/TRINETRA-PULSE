/**
 * Typed client for the database-backed (/api/v2) AI investigation assistant.
 *
 * The web orchestrator retrieves bounded, investigation-scoped context and
 * forwards it to the backend, which runs it through the configured provider
 * (mock or OpenAI-compatible) and applies the neutrality guard. API keys are
 * server-side only — this client never holds or sends a key.
 */

import { API_BASE_URL } from './config';
import { apiFetch } from './client';
import type {
  AIResponse,
  AISourceReference,
  AIConfidence,
  AIAction,
  AIResponseStatus,
} from '@trinetra-pulse/types';

// Mirrors app.ai.schemas.InvestigationContextScope
export interface AssistantScope {
  investigation_id?: string | null;
  organization_id?: string | null;
  user_id?: string | null;
  network_id?: string | null;
  entity_id?: string | null;
  relationship_id?: string | null;
  tab?: string | null;
}

/** Bounded, investigation-scoped context serialized for the backend provider. */
export interface SerializedContextBundle {
  investigation?: {
    sourceId: string;
    title?: string;
    status?: string;
    priority?: string;
    entityCount?: number;
    relationshipCount?: number;
    evidenceCount?: number;
  } | null;
  entity?: {
    sourceId: string;
    label?: string;
    type?: string;
    connections?: number;
  } | null;
  relationships?: { sourceId: string; label?: string; confidence?: number }[];
  evidence?: { sourceId: string; label?: string; summary?: string }[];
  findings?: { sourceId: string; label?: string; summary?: string }[];
  timeline?: {
    sourceId?: string;
    timestamp?: string | null;
    label?: string;
    summary?: string;
  }[];
  truncated?: boolean;
}

export interface QueryAssistantRequest {
  text: string;
  scope: AssistantScope;
  context: SerializedContextBundle;
  conversation_id?: string | null;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface BackendAISourceReference {
  id: string;
  source_type: string;
  source_id: string;
  label: string;
  relevance?: number;
  payload?: Record<string, unknown> | null;
}

export interface BackendAIAction {
  id: string;
  type: string;
  label: string;
  target: Record<string, unknown> | null;
  status: string;
}

export interface BackendAIResponse {
  id: string;
  query_id: string;
  status: string;
  answer: string;
  key_points: string[];
  confidence: Record<string, number>;
  limitations: string[];
  suggested_actions: BackendAIAction[];
  sources: BackendAISourceReference[];
  incomplete: boolean;
}

function toSourceType(type: string): AISourceReference['sourceType'] {
  const valid: AISourceReference['sourceType'][] = [
    'Entity',
    'Relationship',
    'Evidence',
    'Document',
    'Event',
    'Finding',
    'Network',
    'Analytics',
    'Timeline',
    'Investigation',
    'Note',
  ];
  return valid.includes(type as AISourceReference['sourceType'])
    ? (type as AISourceReference['sourceType'])
    : 'Document';
}

function toStatus(status: string): AIResponseStatus {
  if (status === 'complete' || status === 'not_found' || status === 'error') {
    return status;
  }
  return 'partial';
}

function toActionType(type: string): AIAction['type'] {
  const allowed: AIAction['type'][] = [
    'SHOW_ON_GRAPH',
    'OPEN_ENTITY',
    'OPEN_RELATIONSHIP',
    'OPEN_EVIDENCE',
    'OPEN_FINDING',
    'OPEN_ANALYTICS',
    'OPEN_TIMELINE',
    'FOCUS_COMMUNITY',
    'FOCUS_COMPONENT',
  ];
  return allowed.includes(type as AIAction['type'])
    ? (type as AIAction['type'])
    : 'OPEN_ENTITY';
}

export function mapBackendAIResponse(raw: BackendAIResponse): AIResponse {
  const sources: AISourceReference[] = (raw.sources ?? []).map((s) => ({
    id: s.id,
    sourceType: toSourceType(s.source_type),
    sourceId: s.source_id,
    label: s.label,
    relevance: s.relevance ?? 0,
    ...(s.payload ? { payload: s.payload as Record<string, string | number | boolean | null> } : {}),
  }));

  const suggestedActions: AIAction[] = (raw.suggested_actions ?? []).map((a) => ({
    id: a.id,
    type: toActionType(a.type),
    label: a.label,
    ...(a.target ? { target: a.target as Record<string, string | number | boolean | null> } : {}),
    status: a.status === 'error' ? 'error' : 'available',
  }));

  return {
    id: raw.id,
    queryId: raw.query_id,
    status: toStatus(raw.status),
    answer: raw.answer ?? '',
    keyPoints: raw.key_points ?? [],
    sources,
    confidence: {
      answerGrounding: raw.confidence?.answerGrounding ?? 0,
    } as AIConfidence,
    limitations: raw.limitations ?? [],
    suggestedActions,
    incomplete: raw.incomplete ?? false,
    createdAt: new Date().toISOString(),
  };
}

export async function queryAssistant(
  request: QueryAssistantRequest,
): Promise<AIResponse> {
  const raw = await apiFetch<BackendAIResponse>(
    API_BASE_URL,
    '/ai/investigation-assistant/query',
    {
      method: 'POST',
      body: {
        text: request.text,
        scope: request.scope,
        conversation_id: request.conversation_id ?? null,
        history: request.history ?? [],
        context: request.context,
      },
    },
  );
  return mapBackendAIResponse(raw);
}
