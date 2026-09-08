import type { EntityType } from './entity';

// ============================================================
// PHASE 6 — ENTITY INTELLIGENCE
// ============================================================
// Structured, searchable, explainable entities.
// Procedures every stage of the pipeline:
//   extraction -> normalization -> candidates -> resolution -> profiles.
// ============================================================

// ============================================================
// EXTRACTION
// ============================================================

/**
 * How an entity/relationship was identified.
 * Honest about the underlying method — never overclaim ML/LLM.
 */
export type ExtractionMethod =
  | 'RULE_BASED'
  | 'STRUCTURED_MAPPING'
  | 'REGEX'
  | 'NLP'
  | 'ML'
  | 'LLM'
  | 'MANUAL'
  | 'ANALYTICAL'
  /** Persisted API vocabulary. Kept explicit so the UI does not overclaim
   * a more specific extraction technique than the server reported. */
  | 'DATABASE_IMPORT'
  | 'DOCUMENT_PARSE'
  | 'AI_NLP'
  | 'AI_CV'
  | 'AI_AUDIO'
  | 'NETWORK_ANALYSIS'
  | 'OTHER';

export const EXTRACTION_METHODS: readonly ExtractionMethod[] = [
  'RULE_BASED',
  'STRUCTURED_MAPPING',
  'REGEX',
  'NLP',
  'ML',
  'LLM',
  'MANUAL',
  'ANALYTICAL',
  'DATABASE_IMPORT',
  'DOCUMENT_PARSE',
  'AI_NLP',
  'AI_CV',
  'AI_AUDIO',
  'NETWORK_ANALYSIS',
  'OTHER',
];

// ============================================================
// RESOLUTION
// ============================================================

/**
 * Resolution state of a candidate/entity pair.
 * Neutral — reflects identification confidence, not guilt/threat.
 */
export type ResolutionState =
  | 'CONFIRMED'
  | 'PROBABLE'
  | 'POSSIBLE'
  | 'REJECTED'
  | 'NEEDS_REVIEW';

export const RESOLUTION_STATES: readonly ResolutionState[] = [
  'CONFIRMED',
  'PROBABLE',
  'POSSIBLE',
  'REJECTED',
  'NEEDS_REVIEW',
];

/**
 * System recommendation for a resolution pair.
 * Never auto-merged — an analyst must confirm.
 */
export type ResolutionDecision = 'MERGE' | 'KEEP_SEPARATE' | 'REVIEW';

export type CandidateStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVIEWED';

// ============================================================
// ENTITY CANDIDATE
// ============================================================

export interface EntityCandidate {
  id: string;
  datasetId?: string;
  datasetName?: string;
  entityType: EntityType;
  /** Original value exactly as extracted from the source. */
  rawValue: string;
  /** Normalized form used for matching. */
  normalizedValue: string;
  /** Human-friendly display value. */
  displayValue: string;
  /** Source label, e.g. FIR-2026-001. */
  source: string;
  /** Source record reference (row/document id). */
  sourceRecord: string;
  sourceDocument?: string;
  /** Confidence in the extraction itself (0-1). */
  confidence: number;
  extractionMethod: ExtractionMethod;
  attributes: Record<string, unknown>;
  status: CandidateStatus;
  resolutionState?: ResolutionState;
  resolvedEntityId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ============================================================
// RESOLUTION SIGNALS & EVIDENCE
// ============================================================

export interface ResolutionSignal {
  id: string;
  /** Canonical signal name, e.g. "Name similarity". */
  signal: string;
  displayLabel: string;
  /** Human-readable value, e.g. "94%", "Exact match", "Yes". */
  value: string;
  /** Weight of this signal in the overall score (0-1). */
  weight: number;
  /** Source/dataset the signal was derived from. */
  source: string;
  /** Whether the signal supports a match. null = inconclusive. */
  match: boolean | null;
  rawValueA?: string;
  rawValueB?: string;
}

export interface EntityResolution {
  id: string;
  entityAId: string;
  entityBId: string;
  entityAName: string;
  entityBName: string;
  entityADisplayValue: string;
  entityBDisplayValue: string;
  entityAType: EntityType;
  entityBType: EntityType;
  /** Backend resolution type, e.g. "person_match". */
  resolutionType?: string;
  /** Structural similarity score (0-1), when the backend provides one. */
  similarity?: number;
  /** Confidence in the resolution decision (0-1). */
  confidence: number;
  state: ResolutionState;
  recommendation: ResolutionDecision;
  signals: ResolutionSignal[];
  /** Human-readable reason summary. */
  summaryReason: string;
  evidence: string[];
  /** Server-provided reasons, without client-side re-matching. */
  reasons?: string[];
  /** Server-provided method (for example "probabilistic"). */
  method?: string;
  /** Explicit contradictions, when supplied by the backend. */
  contradictions?: string[];
  /** Evidence references returned by the resolution pipeline. */
  evidenceRefs?: string[];
  /** Provenance metadata returned by the pipeline. */
  provenance?: Record<string, unknown>;
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// ENTITY INTELLIGENCE (profile summary)
// ============================================================

export interface EntityIntelligence {
  id: string;
  name: string;
  canonicalName?: string;
  displayName: string;
  entityType: EntityType;
  description?: string;
  resolutionState: ResolutionState;
  /** Confidence in entity identification/resolution (0-1). Neutral label. */
  confidence: number;
  sourcesCount: number;
  connectionsCount: number;
  eventsCount: number;
  evidenceCount: number;
  activityCount: number;
  isVerified: boolean;
  isFlagged: boolean;
  aliases: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// RELATED ENTITIES
// ============================================================

export interface RelatedEntity {
  id: string;
  name: string;
  entityType: EntityType;
  relationshipType: string;
  relationshipConfidence: number;
  verificationStatus: string;
  source: string;
}

// ============================================================
// RELATIONSHIP DATA (Phase 0 compatible, camelCase projection)
// ============================================================

export type RelationshipKind =
  | 'USES'
  | 'OWNS'
  | 'KNOWS'
  | 'WORKS_FOR'
  | 'LOCATED_AT'
  | 'OWNS_ACCOUNT'
  | 'SENT_TRANSACTION'
  | 'INVOLVED_IN'
  | 'PART_OF'
  | 'SUPPORTED_BY';

export type RelationshipCandidateStatus =
  | 'CANDIDATE'
  | 'PROBABLE'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'NEEDS_REVIEW';

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  sourceEntityName: string;
  sourceEntityType: EntityType;
  targetEntityId: string;
  targetEntityName: string;
  targetEntityType: EntityType;
  type: RelationshipKind;
  confidence: number;
  source: string;
  timestamp?: string;
  evidence: string[];
  extractionMethod: ExtractionMethod;
  verificationStatus: RelationshipCandidateStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================================
// EVENTS
// ============================================================

export interface EntityEvent {
  id: string;
  entityId: string;
  eventType: string;
  title: string;
  description?: string;
  timestamp: string;
  source: string;
  confidence: number;
}

// ============================================================
// EVIDENCE
// ============================================================

export interface EntityEvidenceItem {
  id: string;
  entityId: string;
  title: string;
  summary: string;
  datasetId?: string;
  datasetName?: string;
  documentId?: string;
  sourceRecord?: string;
  sourceName: string;
  extractionMethod: ExtractionMethod;
  confidence: number;
  timestamp: string;
}

// ============================================================
// ACTIVITY
// ============================================================

export interface EntityActivityItem {
  id: string;
  entityId: string;
  action: string;
  actionLabel: string;
  detail: string;
  actor?: string;
  timestamp: string;
}

// ============================================================
// RESOLUTION HISTORY (per entity)
// ============================================================

export interface ResolutionHistoryEntry {
  id: string;
  entityId: string;
  action: 'CREATED' | 'UPDATED' | 'RESOLVED' | 'REJECTED' | 'MERGED';
  actionLabel: string;
  description: string;
  reviewer?: string;
  timestamp: string;
}

// ============================================================
// EXTRACTION JOB
// ============================================================

export type ExtractionJobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'EXTRACTING'
  | 'NORMALIZING'
  | 'RESOLVING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export const EXTRACTION_JOB_STATUSES: readonly ExtractionJobStatus[] = [
  'QUEUED',
  'RUNNING',
  'EXTRACTING',
  'NORMALIZING',
  'RESOLVING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

export interface ExtractionJob {
  id: string;
  datasetId: string;
  datasetName: string;
  status: ExtractionJobStatus;
  progress: number; // 0-100
  recordsProcessed: number;
  entitiesExtracted: number;
  candidatesCreated: number;
  matchesFound: number;
  startedAt?: string;
  completedAt?: string;
  errors: string[];
  warnings: string[];
  createdBy: string;
  createdAt: string;
}

// ============================================================
// AUDIT TRAIL
// ============================================================

export type AuditAction =
  | 'ENTITY_CREATED'
  | 'ENTITY_UPDATED'
  | 'ENTITY_RESOLVED'
  | 'ENTITY_REJECTED'
  | 'ENTITY_MERGED'
  | 'RELATIONSHIP_CREATED'
  | 'RELATIONSHIP_VERIFIED'
  | 'RELATIONSHIP_REJECTED'
  | 'CANDIDATE_REVIEWED'
  | 'EXTRACTION_STARTED';

export interface AuditEvent {
  id: string;
  actor: string;
  actorName: string;
  action: AuditAction;
  actionLabel: string;
  object: string;
  objectType: string;
  objectId?: string;
  reason?: string;
  timestamp: string;
}

// ============================================================
// ENTITY SEARCH
// ============================================================

export type EntitySearchField =
  | 'name'
  | 'phone'
  | 'vehicle'
  | 'account'
  | 'location'
  | 'organization'
  | 'case'
  | 'event'
  | 'any';

export interface EntitySearchParams {
  query?: string;
  entityType?: EntityType | 'all';
  confidenceMin?: number;
  resolutionState?: ResolutionState | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'type' | 'confidence' | 'sources' | 'connections' | 'activity' | 'resolution' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

export interface EntityListResponse {
  items: EntityIntelligence[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// ENTITY INTELLIGENCE SUMMARY (selected entity)
// ============================================================

export interface EntityIntelligenceSummary {
  entityId: string;
  connections: number;
  sources: number;
  events: number;
  relationships: number;
  evidence: number;
  activity: number;
  resolutionConfidence: number;
  resolutionState: ResolutionState;
}