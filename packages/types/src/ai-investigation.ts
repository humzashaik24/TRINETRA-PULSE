import type { EntityType } from './entity';
import type { RelationshipKind } from './entity-intelligence';

// ============================================================
// PHASE 10 — AI INVESTIGATION ASSISTANT
// ============================================================
// Domain contracts for the grounded AI investigation copilot.
//
// The assistant is CONTEXT-AWARE, EVIDENCE-GROUNDED, EXPLAINABLE
// and TRACEABLE. It operates on top of existing Trinetra Pulse
// intelligence (entities, relationships, networks, analytics,
// evidence, timeline, findings) and NEVER bypasses the data
// service layer.
//
// Semantic states: every statement is OBSERVED (directly in the
// system), INFERRED (reasonable interpretation), ANALYTICAL
// (from network/metric calculations) or UNKNOWN (not supported).
// Language is intentionally neutral — the assistant describes
// structure, connectivity and evidence, never criminality.
// ============================================================

// ------------------------------------------------------------
// Roles & conversation
// ------------------------------------------------------------

export type AIMessageRole = 'user' | 'assistant' | 'system';

export type AIConversationStatus =
  | 'active'
  | 'archived'
  | 'error';

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  /** Human-readable content (user query or assistant answer). */
  content: string;
  /** Optional structured response metadata on assistant messages. */
  response?: AIResponse;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  investigationId: string;
  userId: string;
  title: string;
  status: AIConversationStatus;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export type AIQueryType =
  | 'ENTITY_LOOKUP'
  | 'ENTITY_SUMMARY'
  | 'RELATIONSHIP_EXPLANATION'
  | 'NETWORK_EXPLORATION'
  | 'NETWORK_ANALYSIS'
  | 'COMMUNITY_EXPLANATION'
  | 'BRIDGE_EXPLANATION'
  | 'TIMELINE_QUERY'
  | 'EVIDENCE_SUMMARY'
  | 'FINDING_SUMMARY'
  | 'COMPARISON'
  | 'INVESTIGATION_SUMMARY'
  | 'SOURCE_LOOKUP'
  | 'RELATIONSHIP_INTELLIGENCE'
  | 'BLOCKCHAIN_ANCHOR'
  | 'GENERAL_CONTEXTUAL_QUERY';

export interface AIQuery {
  id: string;
  type: AIQueryType;
  text: string;
  investigationId?: string;
  userId?: string;
  organizationId?: string;
  context: AIContextScope;
}

/** Structured recommendation(s) about what the user is asking for. */
export interface AIRoutableRefs {
  entityIds?: string[];
  relationshipIds?: string[];
  networkId?: string | null;
  evidenceIds?: string[];
  findingIds?: string[];
  communityId?: string | null;
  componentId?: string | null;
  timelineRange?: { from: string | null; to: string | null };
}

// ------------------------------------------------------------
// Responses
// ------------------------------------------------------------

export type AIResponseStatus = 'complete' | 'partial' | 'error' | 'not_found';

export interface AIResponse {
  id: string;
  queryId: string;
  status: AIResponseStatus;
  /** Direct answer with structured formatting hints. */
  answer: string;
  keyPoints?: string[];
  /** Product-native source references (not academic citations). */
  sources: AISourceReference[];
  confidence: AIConfidence;
  limitations?: string[];
  suggestedActions: AIAction[];
  suggestedQuestions?: string[];
  /** Signals whether the response could be fully grounded. */
  incomplete: boolean;
  createdAt: string;
}

// ------------------------------------------------------------
// Confidence — type-specific, NOT a single generic number.
// ------------------------------------------------------------

export interface AIConfidence {
  /** Confidence answer is grounded in retrieved context (0-1). */
  answerGrounding: number;
  /** Confidence in underlying evidence (provided by upstream). */
  evidence?: number;
  /** Confidence in entity identification/resolution. */
  extraction?: number;
  /** Confidence in entity resolution decisions. */
  resolution?: number;
  /** Confidence in a relationship extraction. */
  relationship?: number;
  /** Confidence in an analytics metric. */
  analytics?: number;
}

// ------------------------------------------------------------
// Semantic states
// ------------------------------------------------------------

export type AISemanticState = 'OBSERVED' | 'INFERRED' | 'ANALYTICAL' | 'UNKNOWN';

// ------------------------------------------------------------
// Source references
// ------------------------------------------------------------

export type AISourceType =
  | 'Entity'
  | 'Relationship'
  | 'Evidence'
  | 'Document'
  | 'Event'
  | 'Finding'
  | 'Network'
  | 'Analytics'
  | 'Timeline'
  | 'Investigation'
  | 'Note';

export interface AISourceReference {
  id: string;
  sourceType: AISourceType;
  /** Canonical id of the referenced object (Entity.id, etc.). */
  sourceId: string;
  /** Human label shown in the source chip. */
  label: string;
  /** Relative relevance for ordering (0-1). */
  relevance: number;
  /** Optional structured payload consumed by the Context Inspector. */
  payload?: Record<string, string | number | boolean | null>;
}

export interface AIEntityReference {
  entityId: string;
  name: string;
  entityType: EntityType;
  semanticState: AISemanticState;
}

export interface AIRelationshipReference {
  relationshipId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: RelationshipKind;
  semanticState: AISemanticState;
  confidence?: number;
}

export interface AIEvidenceReference {
  evidenceId: string;
  title: string;
  linkedEntities?: string[];
}

export interface AINetworkReference {
  networkId: string;
  name: string;
}

export interface AIAnalyticsReference {
  networkId: string;
  metric: string;
  entityId?: string;
  score?: number;
  rank?: number;
}

export interface AITimelineReference {
  from?: string | null;
  to?: string | null;
  eventCount?: number;
}

export interface AIExplanation {
  /** Optional now-explained fragments for the selected object. */
  items?: string[];
}

// ------------------------------------------------------------
// Context model
// ------------------------------------------------------------

/** Scope metadata the assistant uses to decide what to retrieve. */
export interface AIContextScope {
  investigationId?: string;
  organizationId?: string;
  userId?: string;
  networkId?: string | null;
  entityId?: string | null;
  relationshipId?: string | null;
  /** Active tab within the investigation workspace, if any. */
  tab?: string | null;
  timelineRange?: { from: string | null; to: string | null };
  /** Active graph/analytics filters as display strings. */
  activeFilters?: string[];
  selectedEvidenceIds?: string[];
  selectedFindingIds?: string[];
}

/** Retrieved, prioritized context to send the model. */
export interface AIContext {
  scope: AIContextScope;
  investigation?: AIContextSource | null;
  entity?: AIContextSource | null;
  relationships?: AIContextSource[];
  network?: AIContextSource | null;
  analytics?: AIContextSource | null;
  evidence?: AIContextSource[];
  findings?: AIContextSource[];
  timeline?: AIContextSource | null;
  /** Whether the budget was truncated. */
  truncated: boolean;
  /** Human note shown when context is incomplete. */
  note?: string;
}

/** A single bounded unit of retrieved context. */
export interface AIContextSource {
  type: AISourceType;
  sourceId: string;
  label: string;
  /** Compact, data-minimized payload for the prompt. */
  summary: string;
  references: AISourceReference[];
}

// ------------------------------------------------------------
// Actions
// ------------------------------------------------------------

export type AIActionType =
  | 'SHOW_ON_GRAPH'
  | 'OPEN_ENTITY'
  | 'OPEN_RELATIONSHIP'
  | 'OPEN_EVIDENCE'
  | 'OPEN_FINDING'
  | 'OPEN_ANALYTICS'
  | 'OPEN_TIMELINE'
  | 'FOCUS_COMMUNITY'
  | 'FOCUS_COMPONENT';

export type AIActionStatus = 'available' | 'executing' | 'completed' | 'error';

export interface AIAction {
  id: string;
  type: AIActionType;
  label: string;
  /** Read-only navigation/focus target — the user must initiate it. */
  target?: Record<string, string | number | boolean | null>;
  status: AIActionStatus;
}

// ------------------------------------------------------------
// Insights & streaming
// ------------------------------------------------------------

export interface AIInsight {
  id: string;
  messageId: string;
  semanticState: AISemanticState;
  summary: string;
  sources: AISourceReference[];
}

export type AIStreamingState =
  | 'idle'
  | 'streaming'
  | 'complete'
  | 'error';

// ------------------------------------------------------------
// Audit record (observability — no sensitive prompt by default)
// ------------------------------------------------------------

export interface AIInteractionRecord {
  id: string;
  userId: string;
  organizationId?: string;
  investigationId?: string;
  conversationId: string;
  queryType: AIQueryType;
  createdAt: string;
  contextScope: AIContextScope;
  sourceCount: number;
  provider: string;
  model: string;
  latencyMs: number;
}
