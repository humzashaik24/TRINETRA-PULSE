import type { EntityType } from './entity';
import type { RelationshipKind, ExtractionMethod } from './entity-intelligence';
import type { AISemanticState } from './ai-investigation';

// ============================================================
// PHASE 12 — EVIDENCE INTELLIGENCE
// ============================================================
// Evidence is the foundation of grounded intelligence. Every
// evidence item preserves provenance and links to entities,
// relationships, findings, and events without collapsing
// inference into observation.
// ============================================================

// ------------------------------------------------------------
// Evidence types & status
// ------------------------------------------------------------

export type EvidenceType =
  | 'DOCUMENT'
  | 'FIR'
  | 'REPORT'
  | 'COMMUNICATION'
  | 'TRANSACTION'
  | 'VEHICLE'
  | 'LOCATION'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'RECORD'
  | 'OTHER';

export const EVIDENCE_TYPES: readonly EvidenceType[] = [
  'DOCUMENT',
  'FIR',
  'REPORT',
  'COMMUNICATION',
  'TRANSACTION',
  'VEHICLE',
  'LOCATION',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'RECORD',
  'OTHER',
];

export type EvidenceStatus =
  | 'AVAILABLE'
  | 'PROCESSING'
  | 'REQUIRES_REVIEW'
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'ARCHIVED';

export const EVIDENCE_STATUSES: readonly EvidenceStatus[] = [
  'AVAILABLE',
  'PROCESSING',
  'REQUIRES_REVIEW',
  'VERIFIED',
  'UNVERIFIED',
  'ARCHIVED',
];

// ------------------------------------------------------------
// Evidence provenance (never invent missing metadata)
// ------------------------------------------------------------

export interface EvidenceProvenance {
  /** Origin system / dataset / collection. */
  source: string;
  /** Source record identifier (row, doc id, file name). */
  sourceId: string;
  /** Dataset id when evidence comes from a managed dataset. */
  datasetId?: string;
  /** Ingestion job id when evidence was loaded via pipeline. */
  ingestionJobId?: string;
  /** When the evidence was created in the source system. */
  observedAt?: string;
  /** When the evidence was ingested into Trinetra. */
  createdAt: string;
  /** Geographic location if available. */
  location?: string;
  /** Page / section / range for document-like evidence. */
  pageSection?: string;
  /** Record identifier (e.g., FIR number, case number). */
  recordIdentifier?: string;
  /** Hash / checksum for integrity verification. */
  hash?: string;
  /** Version for evidence that can be updated. */
  version: number;
  /** Review state of the evidence itself. */
  reviewState: EvidenceReviewState;
}

export type EvidenceReviewState =
  | 'PENDING'
  | 'REVIEWED'
  | 'FLAGGED'
  | 'EXCLUDED';

// ------------------------------------------------------------
// Evidence metadata (structured, type-specific)
// ------------------------------------------------------------

export interface EvidenceMetadata {
  /** MIME type for binary media. */
  mimeType?: string;
  /** File size in bytes. */
  fileSize?: number;
  /** Page count for documents. */
  pageCount?: number;
  /** Duration in seconds for audio/video. */
  durationSeconds?: number;
  /** Dimensions for images/video. */
  dimensions?: { width: number; height: number };
  /** Participants for communications. */
  participants?: Array<{
    role: 'sender' | 'recipient' | 'party';
    identifier: string;
    name?: string;
  }>;
  /** Financial fields for transactions. */
  financial?: {
    amount?: number;
    currency?: string;
    senderAccount?: string;
    receiverAccount?: string;
    reference?: string;
  };
  /** Geographic fields for location. */
  geographic?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    area?: string;
  };
  /** Vehicle-specific fields. */
  vehicle?: {
    registrationNumber?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
  };
  /** Document-specific fields. */
  document?: {
    documentType?: string;
    author?: string;
    issuer?: string;
    classification?: string;
  };
  /** Free-form additional metadata. */
  custom?: Record<string, unknown>;
}

// ------------------------------------------------------------
// Evidence snippet (bounded, never fabricated)
// ------------------------------------------------------------

export interface EvidenceSnippet {
  /** The text snippet itself. */
  text: string;
  /** Character offset in the source document. */
  offset?: number;
  /** Length of the snippet. */
  length?: number;
  /** Whether this snippet was truncated for display. */
  truncated: boolean;
  /** Demarcation for demo/generated content. */
  isDemoContent?: boolean;
}

// ------------------------------------------------------------
// Evidence links (typed, with confidence & provenance)
// ------------------------------------------------------------

export type EvidenceRelationType =
  | 'MENTIONS'
  | 'IDENTIFIES'
  | 'REFERENCES'
  | 'ASSOCIATES'
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'CONTEXTUAL';

export interface EvidenceLink {
  /** Target canonical id (entity, relationship, finding, event, evidence). */
  targetId: string;
  /** Type of target object. */
  targetType: 'entity' | 'relationship' | 'finding' | 'event' | 'evidence';
  /** Nature of the link. */
  relationType: EvidenceRelationType;
  /** Confidence in this specific link (0-1). */
  confidence: number;
  /** How the link was established. */
  extractionMethod: ExtractionMethod;
  /** When the link was created/observed. */
  timestamp: string;
  /** Provenance of the link. */
  provenance: EvidenceProvenance;
  /** Optional contextual note. */
  note?: string;
}

// ------------------------------------------------------------
// Evidence version (for audit trail)
// ------------------------------------------------------------

export interface EvidenceVersion {
  version: number;
  title: string;
  description: string;
  metadata: EvidenceMetadata;
  status: EvidenceStatus;
  updatedAt: string;
  updatedBy: string;
  changeSummary: string;
}

// ------------------------------------------------------------
// Evidence timeline event (chronological)
// ------------------------------------------------------------

export interface EvidenceTimelineEvent {
  id: string;
  evidenceId: string;
  eventType: 'created' | 'linked' | 'unlinked' | 'updated' | 'reviewed' | 'status_changed' | 'versioned';
  title: string;
  description?: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ------------------------------------------------------------
// Evidence support (how evidence supports an analytical object)
// ------------------------------------------------------------

export interface EvidenceSupport {
  /** The analytical object being supported. */
  targetId: string;
  /** Type of target. */
  targetType: 'finding' | 'relationship' | 'event' | 'entity';
  /** Overall support level. */
  supportLevel: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED';
  /** Evidence items providing support. */
  evidenceIds: string[];
  /** Count breakdown. */
  counts: {
    total: number;
    direct: number;
    contextual: number;
  };
  /** When this support assessment was made. */
  assessedAt: string;
  /** By whom. */
  assessedBy: string;
}

// ------------------------------------------------------------
// Evidence coverage (for coverage model)
// ------------------------------------------------------------

export type EvidenceCoverageLevel = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED';

export interface EvidenceCoverage {
  /** What is being assessed. */
  targetId: string;
  targetType: 'entity' | 'relationship' | 'finding' | 'event' | 'network';
  /** Coverage level. */
  level: EvidenceCoverageLevel;
  /** Evidence ids linked. */
  evidenceIds: string[];
  /** Breakdown. */
  breakdown: {
    direct: number;
    contextual: number;
    total: number;
  };
  /** Gap description for UNSUPPORTED/PARTIALLY_SUPPORTED. */
  gap?: string;
  /** Assessment metadata. */
  assessedAt: string;
  assessedBy: string;
}

// ------------------------------------------------------------
// Core Evidence Item
// ------------------------------------------------------------

export interface EvidenceItem {
  id: string;
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Evidence type. */
  evidenceType: EvidenceType;
  /** Operational status. */
  status: EvidenceStatus;
  /** Which investigation this belongs to (for scoping). */
  investigationId?: string;
  /** Dataset reference. */
  datasetId?: string;
  /** Dataset name for display. */
  datasetName?: string;
  /** Document reference if applicable. */
  documentId?: string;
  /** Source record reference. */
  sourceRecord?: string;
  /** Source system name. */
  sourceName: string;
  /** Extraction method. */
  extractionMethod: ExtractionMethod;
  /** Confidence in the extraction/identification (0-1). */
  extractionConfidence: number;
  /** When the evidence was observed/recorded. */
  observedAt: string;
  /** When ingested into Trinetra. */
  createdAt: string;
  /** When last updated. */
  updatedAt: string;
  /** Provenance chain. */
  provenance: EvidenceProvenance;
  /** Structured metadata. */
  metadata: EvidenceMetadata;
  /** Bounded snippet for search/preview. */
  snippet?: EvidenceSnippet;
  /** Links to entities, relationships, findings, events. */
  links: EvidenceLink[];
  /** Version history. */
  versions: EvidenceVersion[];
  /** Timeline of actions on this evidence. */
  timeline: EvidenceTimelineEvent[];
  /** Whether this is demo/mock data. */
  isDemoData: boolean;
  /** Tags for filtering. */
  tags: string[];
}

// ------------------------------------------------------------
// Evidence Source (lightweight reference for search results)
// ------------------------------------------------------------

export interface EvidenceSource {
  id: string;
  title: string;
  evidenceType: EvidenceType;
  status: EvidenceStatus;
  sourceName: string;
  observedAt: string;
  investigationId?: string;
  entityIds: string[];
  findingIds: string[];
  eventIds: string[];
  snippet?: EvidenceSnippet;
  isDemoData: boolean;
}

// ------------------------------------------------------------
// Evidence Collection (grouped evidence)
// ------------------------------------------------------------

export interface EvidenceCollection {
  id: string;
  name: string;
  description?: string;
  investigationId: string;
  evidenceIds: string[];
  createdAt: string;
  createdBy: string;
  tags: string[];
}

// ------------------------------------------------------------
// Evidence Search
// ------------------------------------------------------------

export interface EvidenceSearchFilters {
  query?: string;
  evidenceTypes?: EvidenceType[];
  statuses?: EvidenceStatus[];
  entityIds?: string[];
  findingIds?: string[];
  eventIds?: string[];
  sourceNames?: string[];
  datasetIds?: string[];
  dateRange?: { from: string; to: string };
  extractionMethods?: ExtractionMethod[];
  confidenceMin?: number;
  confidenceMax?: number;
  tags?: string[];
  investigationId?: string;
}

export interface EvidenceSearchResult {
  items: EvidenceSource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    evidenceTypes: Record<EvidenceType, number>;
    statuses: Record<EvidenceStatus, number>;
    sources: Record<string, number>;
    entities: Record<string, number>;
  };
}

export interface EvidenceSearchParams extends EvidenceSearchFilters {
  page?: number;
  pageSize?: number;
  sortBy?: 'observedAt' | 'createdAt' | 'title' | 'evidenceType' | 'sourceName' | 'confidence';
  sortOrder?: 'asc' | 'desc';
}

// ------------------------------------------------------------
// Evidence Retrieval (for grounded AI)
// ------------------------------------------------------------

export interface EvidenceRetrievalResult {
  evidence: EvidenceSource[];
  entities: string[];
  relationships: string[];
  findings: string[];
  events: string[];
  truncated: boolean;
  retrievalBudget: {
    maxEvidenceItems: number;
    maxSnippetLength: number;
    maxLinkedEntities: number;
    maxLinkedFindings: number;
  };
}

export interface EvidenceRetrievalParams {
  query: string;
  investigationId: string;
  scope: {
    entityIds?: string[];
    relationshipIds?: string[];
    findingIds?: string[];
    eventIds?: string[];
    networkId?: string | null;
  };
  budget?: Partial<EvidenceRetrievalResult['retrievalBudget']>;
  semanticFilter?: AISemanticState[];
}

// ------------------------------------------------------------
// Evidence Context (for Context Inspector)
// ------------------------------------------------------------

export interface EvidenceContext {
  type: 'evidence';
  id: string;
  title?: string;
  evidenceType?: EvidenceType;
  status?: EvidenceStatus;
  investigationId?: string;
  entityIds?: string[];
  findingIds?: string[];
  eventIds?: string[];
  snippet?: EvidenceSnippet;
}

// ------------------------------------------------------------
// Relationship evidence support (for network evidence mode)
// ------------------------------------------------------------

export interface RelationshipEvidenceSupport {
  relationshipId: string;
  sourceEntityId: string;
  targetEntityId: string;
  evidenceIds: string[];
  supportLevel: EvidenceCoverageLevel;
  directEvidenceCount: number;
  contextualEvidenceCount: number;
}

// ------------------------------------------------------------
// Finding evidence support (for finding support view)
// ------------------------------------------------------------

export interface FindingEvidenceSupport {
  findingId: string;
  evidenceIds: string[];
  supportLevel: EvidenceCoverageLevel;
  evidenceItems: Array<{
    evidenceId: string;
    title: string;
    evidenceType: EvidenceType;
    relevance: number;
    provenance: EvidenceProvenance;
  }>;
}

// ------------------------------------------------------------
// Event evidence support (for timeline evidence mode)
// ------------------------------------------------------------

export interface EventEvidenceSupport {
  eventId: string;
  evidenceIds: string[];
  supportLevel: EvidenceCoverageLevel;
  evidenceItems: Array<{
    evidenceId: string;
    title: string;
    evidenceType: EvidenceType;
    relevance: number;
  }>;
}

// ------------------------------------------------------------
// Entity evidence summary (for entity → evidence links)
// ------------------------------------------------------------

export interface EntityEvidenceSummary {
  entityId: string;
  evidenceCount: number;
  byType: Record<EvidenceType, number>;
  byStatus: Record<EvidenceStatus, number>;
  latestEvidence?: EvidenceSource;
  linkedFindingIds: string[];
  linkedRelationshipIds: string[];
  linkedEventIds: string[];
}