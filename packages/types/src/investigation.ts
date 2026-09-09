import type { EntityType } from './entity';
import type { RelationshipKind } from './entity-intelligence';

// ============================================================
// PHASE 9 — INVESTIGATION WORKSPACE
// ============================================================
// Investigation lifecycle contracts for the investigation workspace.
// An Investigation is the investigator's working case: a curated,
// living record that REFERENCES canonical intelligence objects
// (entities, relationships, evidence, networks) rather than
// duplicating them.
//
// Identity model: every object linked into an investigation carries
// a reference to the CANONICAL id plus provenance (sourceType,
// sourceId, linkedAt, linkedBy). System-generated insights always
// keep source / source-type / source-id / timestamp / confidence.
//
// Language is intentionally neutral. Priority is workflow priority
// (Low / Normal / High / Critical), NEVER criminality. Results and
// findings are analytical — the term "finding" is used, not "proof".
// ============================================================

// ------------------------------------------------------------
// Status & priority
// ------------------------------------------------------------

export type InvestigationStatus =
  | 'draft'
  | 'active'
  | 'under_review'
  | 'suspended'
  | 'closed'
  | 'archived';

export type InvestigationPriority = 'low' | 'normal' | 'high' | 'critical';

// ------------------------------------------------------------
// Members
// ------------------------------------------------------------

export interface InvestigationMember {
  id: string;
  investigation_id: string;
  user_id: string;
  name: string;
  role: string;
  added_at: string;
}

// ------------------------------------------------------------
// Provenance for linked objects (identity model)
// ------------------------------------------------------------

/** Describes WHERE a linked object came from (canonical source). */
export type InvestigationSourceType =
  | 'entity'
  | 'relationship'
  | 'evidence'
  | 'document'
  | 'network'
  | 'event'
  | 'finding'
  | 'system';

export interface InvestigationLinkProvenance {
  sourceType: InvestigationSourceType;
  sourceId: string;
  /** When the object was linked into the investigation. */
  linkedAt: string;
  /** Investigator who linked the object. */
  linkedBy: string;
  /** Optional note recorded when the object was linked. */
  note?: string;
}

// ------------------------------------------------------------
// Investigation entity ref
// ------------------------------------------------------------

export interface InvestigationEntity {
  id: string;
  investigation_id: string;
  /** Canonical entity id (Entity.id). */
  entity_id: string;
  name: string;
  entity_type: EntityType;
  /** Confidence in the link / association (not a guilt score). */
  association_confidence: number;
  role: string;
  linked_by: string;
  linked_at: string;
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// Investigation relationship ref
// ------------------------------------------------------------

export interface InvestigationRelationship {
  id: string;
  investigation_id: string;
  /** Canonical relationship id (Relationship.id). */
  relationship_id: string;
  source_entity_id: string;
  target_entity_id: string;
  source_entity_name: string;
  target_entity_name: string;
  type: RelationshipKind;
  confidence: number;
  note?: string;
  linked_by: string;
  linked_at: string;
}

// ------------------------------------------------------------
// Investigation evidence ref
// ------------------------------------------------------------

export type EvidenceContextKind =
  | 'document'
  | 'image'
  | 'communication'
  | 'transaction'
  | 'location_record'
  | 'vehicle_record'
  | 'structured_record'
  | 'other';

export interface InvestigationEvidence {
  id: string;
  investigation_id: string;
  /** Canonical evidence id (Evidence.id). */
  evidence_id: string;
  title: string;
  evidence_type: EvidenceContextKind;
  summary: string;
  linked_by: string;
  linked_at: string;
  /**
   * When the evidence was actually collected (Evidence.collected_at). Null
   * when the record does not carry a real-world collection time — the UI
   * must surface "Time unavailable" rather than substituting linked_at.
   */
  collected_at: string | null;
  metadata: Record<string, unknown>;
}

// ------------------------------------------------------------
// Investigation document ref
// ------------------------------------------------------------

export interface InvestigationDocument {
  id: string;
  investigation_id: string;
  document_id: string;
  title: string;
  document_type: string;
  source: string;
  added_by: string;
  added_at: string;
}

// ------------------------------------------------------------
// Events & timeline
// ------------------------------------------------------------

export type InvestigationEventType =
  | 'observation'
  | 'communication'
  | 'transaction'
  | 'movement'
  | 'evidence'
  | 'related_case'
  | 'other';

export interface InvestigationEvent {
  id: string;
  investigation_id: string;
  title: string;
  description: string | null;
  /** Real-world event time (InvestigationEvent.timestamp). Null when the
   *  event has no recorded time — never substitute created_at. */
  occurred_at: string | null;
  location: string | null;
  event_type: InvestigationEventType;
  /** Canonical events / entities associated. */
  entity_ids: string[];
  created_at: string;
}

export interface InvestigationTimelineItem {
  id: string;
  investigation_id: string;
  /** Real temporal field for the entry kind (event time / evidence
   *  collected_at / finding or note created_at). Null when the record has
   *  no time — the UI must surface "Time unavailable". */
  timestamp: string | null;
  category: 'event' | 'evidence' | 'activity' | 'note' | 'finding' | 'system';
  title: string;
  description: string | null;
  /** Id of the underlying object when the item maps to one. */
  ref_id: string | null;
  ref_type: string | null;
  actor: string | null;
}

// ------------------------------------------------------------
// Findings
// ------------------------------------------------------------

export type FindingConfidenceLevel = 'low' | 'medium' | 'high';

export interface InvestigationFinding {
  id: string;
  investigation_id: string;
  title: string;
  description: string;
  category: string;
  confidence: FindingConfidenceLevel;
  /** System-generated findings keep analytical (not guilt) confidence. */
  source: string;
  source_type: 'analysis' | 'manual' | 'system';
  created_by: string;
  created_at: string;
  updated_at: string;
  entity_ids: string[];
  evidence_ids: string[];
  tags: string[];
}

// ------------------------------------------------------------
// Notes
// ------------------------------------------------------------

export interface InvestigationNote {
  id: string;
  investigation_id: string;
  author: string;
  body: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Network & analytics snapshots
// ------------------------------------------------------------

export interface InvestigationNetwork {
  id: string;
  investigation_id: string;
  /** Canonical network id (NetworkGraph.id). */
  network_id: string;
  name: string;
  linked_by: string;
  linked_at: string;
}

export interface InvestigationAnalyticsSnapshot {
  id: string;
  investigation_id: string;
  network_id: string;
  label: string;
  captured_at: string;
  /** Reference to the analytics bundle id when stored. */
  analytics_bundle_id: string | null;
  summary: {
    nodes: number;
    relationships: number;
    connectedComponents: number;
    communityCount: number;
    topConnectedEntity: string | null;
  };
}

// ------------------------------------------------------------
// Activity
// ------------------------------------------------------------

export type InvestigationActivityType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'entity_linked'
  | 'entity_removed'
  | 'relationship_linked'
  | 'relationship_removed'
  | 'evidence_linked'
  | 'evidence_removed'
  | 'finding_created'
  | 'finding_updated'
  | 'note_created'
  | 'note_updated'
  | 'note_deleted'
  | 'network_linked'
  | 'analytics_captured'
  | 'document_added'
  | 'commented';

export interface InvestigationActivityEntry {
  id: string;
  investigation_id: string;
  type: InvestigationActivityType;
  title: string;
  detail: string | null;
  actor: string;
  at: string;
}

// ------------------------------------------------------------
// Filters
// ------------------------------------------------------------

export interface InvestigationFilters {
  statuses: InvestigationStatus[];
  priorities: InvestigationPriority[];
  assignedTo: string[];
  search: string;
}

// ------------------------------------------------------------
// Workspace state
// ------------------------------------------------------------

export interface InvestigationWorkspaceState {
  investigationId: string;
  activeTab: string;
  pendingChanges: boolean;
  filters: InvestigationFilters;
}

// ------------------------------------------------------------
// Top-level Investigation
// ------------------------------------------------------------

export interface Investigation {
  id: string;
  title: string;
  description: string | null;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  /** Lead investigator (user name / id). */
  lead_investigator: string;
  assigned: string[];
  tags: string[];
  /** Canonical case id when the investigation wraps a case. */
  case_id: string | null;
  /** Count summaries (denormalized for the list view). */
  entity_count: number;
  evidence_count: number;
  relationship_count: number;
  /** Finding count (summaries only). Present when a reliable count is
   *  available (API summary or mock records); otherwise omitted. */
  finding_count?: number;
  /** Timeline-event count (summaries only). Never fabricated. */
  event_count?: number;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface InvestigationCreate {
  title: string;
  description?: string;
  status?: InvestigationStatus;
  priority?: InvestigationPriority;
  lead_investigator?: string;
  assigned?: string[];
  tags?: string[];
  case_id?: string | null;
}

export interface InvestigationUpdate {
  title?: string;
  description?: string;
  status?: InvestigationStatus;
  priority?: InvestigationPriority;
  lead_investigator?: string;
  assigned?: string[];
  tags?: string[];
}
