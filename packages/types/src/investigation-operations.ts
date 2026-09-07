// ============================================================
// PHASE 11 — INVESTIGATION OPERATIONS
// ============================================================
// CASE LIFECYCLE & INTELLIGENCE OPERATIONS.
//
// These types model the operational shell around the existing
// Investigation workspace (Phase 9): pipeline/readiness/health,
// the review queue, cross-references and provenance chaining, the
// investigator activity log, saved (non-mutating) views, and graph
// and timeline bookmarks. Everything is scoped to an investigation id
// so the UI can answer "which investigation am I viewing?".
//
// Language is neutral operational terminology. Statuses describe
// workflow state, never criminality. Priorities are review priorities
// (LOW / MEDIUM / HIGH), never "danger"/"guilt".
//
// Where possible the types reuse existing contracts instead of
// duplicating them (Investigation, Dataset, IngestionJob, Evidence,
// Finding, timeline, network, analytics).
// ============================================================

// ------------------------------------------------------------
// Investigation statuses (neutral operational terms)
// ------------------------------------------------------------
// The workspace already models InvestigationStatus as
// 'draft' | 'active' | 'under_review' | 'suspended' | 'closed' |
// 'archived'. Phase 11 renames the set to the canonical operational
// terms below while remaining fully compatible with the existing
// Investigation.status field so no data migration is required.
//
// We keep this as a documented alias rather than a new disjoint type
// so existing services and stores continue to work unchanged.

export type CaseLifecycleStatus = 'draft' | 'active' | 'on_hold' | 'review' | 'closed';

// ------------------------------------------------------------
// Pipeline
// ------------------------------------------------------------

export type InvestigationStage =
  | 'data'
  | 'extraction'
  | 'resolution'
  | 'relationships'
  | 'network'
  | 'analytics'
  | 'evidence'
  | 'findings'
  | 'timeline';

export type PipelineStageStatus =
  | 'NOT_STARTED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_REVIEW';

export interface InvestigationPipelineStage {
  stage: InvestigationStage;
  label: string;
  description: string;
  status: PipelineStageStatus;
  startedAt: string | null;
  completedAt: string | null;
  count: number | null;
  warningCount: number;
  errorCount: number;
  /** Route (existing workspace) this stage opens. */
  targetWorkspace: string;
}

export interface InvestigationPipeline {
  investigationId: string;
  currentStage: InvestigationStage;
  progress: number; // 0-100
  completedStages: InvestigationStage[];
  stages: InvestigationPipelineStage[];
  needReview: InvestigationStage[];
  nextRecommendedAction: string | null;
}

// ------------------------------------------------------------
// Readiness
// ------------------------------------------------------------

export type ReadinessLevel = 'ready' | 'in_progress' | 'not_started' | 'needs_attention';

export interface ReadinessItem {
  key:
    | 'data'
    | 'datasets'
    | 'entities'
    | 'relationships'
    | 'evidence'
    | 'findings'
    | 'network'
    | 'analytics'
    | 'timeline'
    | 'ai';
  label: string;
  level: ReadinessLevel;
  /** Short human summary, e.g. "4 datasets". */
  detail: string | null;
  warningCount: number;
}

export interface InvestigationReadiness {
  investigationId: string;
  items: ReadinessItem[];
  /** Overall readiness label. */
  overall: ReadinessLevel;
  nextRecommendedAction: string | null;
}

// ------------------------------------------------------------
// Health (neutral assessment — coverage, not reliability)
// ------------------------------------------------------------

export interface HealthMetric {
  key:
    | 'data_completeness'
    | 'entity_resolution_coverage'
    | 'relationship_coverage'
    | 'evidence_coverage'
    | 'network_readiness'
    | 'analytics_readiness'
    | 'open_review_items';
  label: string;
  /** 0-100 coverage percentage (neutral: "resolution coverage", not reliability). */
  value: number;
  total: number | null;
  detail: string;
  hasIssues: boolean;
}

export interface InvestigationHealth {
  investigationId: string;
  metrics: HealthMetric[];
  openReviewCount: number;
  computedAt: string;
}

// ------------------------------------------------------------
// Review queue
// ------------------------------------------------------------

export type ReviewPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ReviewItemKind =
  | 'data_validation'
  | 'unresolved_entity'
  | 'low_confidence_extraction'
  | 'relationship_review'
  | 'evidence_missing_metadata'
  | 'finding_missing_support'
  | 'normalization_issue'
  | 'duplicate_record';

export interface ReviewItem {
  id: string;
  investigationId: string;
  kind: ReviewItemKind;
  priority: ReviewPriority;
  title: string;
  description: string;
  /** Reference to the underlying object when available. */
  refType: string | null;
  refId: string | null;
  createdAt: string;
  /** Neutral: the investigator decides what to do. */
  resolved: boolean;
}

// ------------------------------------------------------------
// Activity log (investigator actions)
// ------------------------------------------------------------

export type InvestigationActivityAction =
  | 'opened_investigation'
  | 'opened_entity'
  | 'viewed_evidence'
  | 'opened_network'
  | 'changed_filters'
  | 'ran_analytics'
  | 'asked_ai'
  | 'created_note'
  | 'created_finding'
  | 'changed_status'
  | 'added_dataset'
  | 'created_investigation';

export interface InvestigationActivityLog {
  id: string;
  investigationId: string;
  action: InvestigationActivityAction;
  label: string;
  /** Neutral detail text (no sensitive content). */
  detail: string | null;
  at: string;
  actor: string;
}

// ------------------------------------------------------------
// Saved views (non-mutating workspace views)
// ------------------------------------------------------------

export interface SavedInvestigationView {
  id: string;
  investigationId: string;
  name: string;
  description: string | null;
  networkFilters: Record<string, unknown>;
  timelineRange: { from: string | null; to: string | null };
  selectedEntities: string[];
  analyticsScope: Record<string, unknown>;
  createdAt: string;
}

export interface SaveViewInput {
  name: string;
  description?: string | null;
  networkFilters?: Record<string, unknown>;
  timelineRange?: { from: string | null; to: string | null };
  selectedEntities?: string[];
  analyticsScope?: Record<string, unknown>;
}

// ------------------------------------------------------------
// Bookmarks (graph + timeline)
// ------------------------------------------------------------

export interface GraphBookmark {
  id: string;
  investigationId: string;
  networkId: string;
  label: string;
  entityIds: string[];
  relationshipIds: string[];
  createdAt: string;
}

export interface SaveGraphBookmarkInput {
  networkId: string;
  label: string;
  entityIds: string[];
  relationshipIds: string[];
}

export interface TimelineBookmark {
  id: string;
  investigationId: string;
  label: string;
  start: string | null;
  end: string | null;
  filters: Record<string, unknown>;
  createdAt: string;
}

export interface SaveTimelineBookmarkInput {
  label: string;
  start?: string | null;
  end?: string | null;
  filters?: Record<string, unknown>;
}

// ------------------------------------------------------------
// Cross references
// ------------------------------------------------------------

/** One hop in a cross-reference chain: Entity ↔ Relationship ↔ Evidence ↔ Finding ↔ Event. */
export interface CrossReferenceNode {
  type: 'entity' | 'relationship' | 'evidence' | 'finding' | 'event';
  id: string;
  label: string;
}

export interface CrossReferenceLink {
  fromType: CrossReferenceNode['type'];
  toType: CrossReferenceNode['type'];
}

export interface CrossReference {
  id: string;
  investigationId: string;
  /** Root entity the cross-reference is built around. */
  entity: CrossReferenceNode;
  /** Direct relationships from the entity. */
  relationships: CrossReferenceNode[];
  /** Evidence referenced by relationships / findings. */
  evidence: CrossReferenceNode[];
  /** Findings referencing the entity. */
  findings: CrossReferenceNode[];
  links: CrossReferenceLink[];
}

// ------------------------------------------------------------
// Provenance chain
// ------------------------------------------------------------

export type ProvenanceNodeType = 'source' | 'dataset' | 'record' | 'entity' | 'relationship' | 'finding';

export interface ProvenanceChainNode {
  type: ProvenanceNodeType;
  id: string;
  label: string;
  detail: string | null;
  timestamp: string | null;
}

export interface ProvenanceChain {
  id: string;
  investigationId: string;
  /** Target object the provenance explains. */
  targetType: ProvenanceNodeType;
  targetId: string;
  nodes: ProvenanceChainNode[];
  timestamp: string | null;
}

// ------------------------------------------------------------
// Investigation-scoped search result
// ------------------------------------------------------------

export type InvestigationSearchKind = 'entity' | 'relationship' | 'evidence' | 'finding' | 'dataset' | 'note';

export interface InvestigationSearchResult {
  id: string;
  investigationId: string;
  kind: InvestigationSearchKind;
  label: string;
  description: string | null;
  refId: string | null;
  score: number;
}
