import type {
  Investigation,
  InvestigationCreate,
  InvestigationUpdate,
  InvestigationEntity,
  InvestigationRelationship,
  InvestigationEvidence,
  InvestigationEvent,
  InvestigationFinding,
  InvestigationNote,
  InvestigationTimelineItem,
  InvestigationActivityEntry,
  InvestigationMember,
  InvestigationNetwork,
  InvestigationAnalyticsSnapshot,
  EvidenceContextKind,
  FindingConfidenceLevel,
} from '@trinetra-pulse/types';
import {
  mockInvestigationById,
  mockInvestigationRecords,
} from '@/mock/investigations';

// ============================================================
// INVESTIGATION SERVICE (mock-backed)
// ============================================================
// The investigation query/mutation surface. Each function mirrors an
// eventual REST endpoint under /investigations and its nested
// resource routes (/entities, /relationships, /evidence, /findings,
// /notes, /timeline, /activity). The implementation is backed by
// deterministic mock data and returns through a small latency window
// so it can be swapped for a remote API without UI changes.
//
// Identity model: linked objects reference canonical intelligence
// ids and carry provenance (sourceType / sourceId / linkedBy / at).
// ============================================================

const LATENCY = 140;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const now = () => new Date().toISOString();

const requireRecord = (id: string) => {
  const rec = mockInvestigationById.get(id);
  if (!rec) throw new Error(`Investigation not found: ${id}`);
  return rec;
};

// ------------------------------------------------------------
// Investigations
// ------------------------------------------------------------

export async function getInvestigations(): Promise<Investigation[]> {
  await delay();
  return mockInvestigationRecords.map((r) => r.investigation);
}

export async function getInvestigation(id: string): Promise<Investigation> {
  await delay();
  return requireRecord(id).investigation;
}

export async function createInvestigation(
  input: InvestigationCreate
): Promise<Investigation> {
  await delay();
  const ts = now();
  const id = `inv-${String(mockInvestigationRecords.length + 1).padStart(3, '0')}`;
  return {
    id,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'draft',
    priority: input.priority ?? 'normal',
    lead_investigator: input.lead_investigator ?? 'Unassigned',
    assigned: input.assigned ?? [],
    tags: input.tags ?? [],
    case_id: input.case_id ?? null,
    entity_count: 0,
    evidence_count: 0,
    relationship_count: 0,
    created_at: ts,
    updated_at: ts,
    last_activity_at: ts,
  };
}

export async function updateInvestigation(
  id: string,
  input: InvestigationUpdate
): Promise<Investigation> {
  await delay();
  const rec = requireRecord(id);
  const inv = rec.investigation;
  return { ...inv, ...input, updated_at: now() };
}

// ------------------------------------------------------------
// Entities
// ------------------------------------------------------------

export async function getInvestigationEntities(
  investigationId: string
): Promise<InvestigationEntity[]> {
  await delay(80);
  return requireRecord(investigationId).entities;
}

export async function addEntityToInvestigation(
  investigationId: string,
  entity: Omit<InvestigationEntity, 'investigation_id'>
): Promise<InvestigationEntity> {
  await delay(80);
  const rec = requireRecord(investigationId);
  const linked: InvestigationEntity = {
    ...entity,
    investigation_id: investigationId,
  };
  rec.entities.unshift(linked);
  rec.investigation.entity_count = rec.entities.length;
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
  return linked;
}

export async function removeEntityFromInvestigation(
  investigationId: string,
  refId: string
): Promise<void> {
  await delay(80);
  const rec = requireRecord(investigationId);
  rec.entities = rec.entities.filter((e) => e.id !== refId);
  rec.investigation.entity_count = rec.entities.length;
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
}

// ------------------------------------------------------------
// Relationships
// ------------------------------------------------------------

export async function getInvestigationRelationships(
  investigationId: string
): Promise<InvestigationRelationship[]> {
  await delay(80);
  return requireRecord(investigationId).relationships;
}

export async function addRelationshipToInvestigation(
  investigationId: string,
  rel: Omit<InvestigationRelationship, 'investigation_id'>
): Promise<InvestigationRelationship> {
  await delay(80);
  const rec = requireRecord(investigationId);
  const linked: InvestigationRelationship = { ...rel, investigation_id: investigationId };
  rec.relationships.unshift(linked);
  rec.investigation.relationship_count = rec.relationships.length;
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
  return linked;
}

export async function removeRelationshipFromInvestigation(
  investigationId: string,
  refId: string
): Promise<void> {
  await delay(80);
  const rec = requireRecord(investigationId);
  rec.relationships = rec.relationships.filter((r) => r.id !== refId);
  rec.investigation.relationship_count = rec.relationships.length;
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
}

// ------------------------------------------------------------
// Evidence
// ------------------------------------------------------------

export async function getInvestigationEvidence(
  investigationId: string
): Promise<InvestigationEvidence[]> {
  await delay(80);
  return requireRecord(investigationId).evidence;
}

export interface AddEvidenceInput {
  evidence_id: string;
  title: string;
  evidence_type: EvidenceContextKind;
  summary: string;
  linked_by: string;
  linked_at?: string;
}

export async function addEvidenceToInvestigation(
  investigationId: string,
  input: AddEvidenceInput,
  isMock: boolean
): Promise<InvestigationEvidence> {
  await delay(80);
  const rec = requireRecord(investigationId);
  const linked: InvestigationEvidence = {
    id: `inev-${investigationId}-${rec.evidence.length + 1}`,
    investigation_id: investigationId,
    evidence_id: input.evidence_id,
    title: input.title,
    evidence_type: input.evidence_type,
    summary: input.summary,
    linked_by: input.linked_by,
    linked_at: input.linked_at ?? now(),
    collected_at: null,
    metadata: { is_mock: isMock },
  };
  rec.evidence.unshift(linked);
  rec.investigation.evidence_count = rec.evidence.length;
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
  return linked;
}

export async function removeEvidenceFromInvestigation(
  investigationId: string,
  refId: string
): Promise<void> {
  await delay(80);
  const rec = requireRecord(investigationId);
  rec.evidence = rec.evidence.filter((e) => e.id !== refId);
  rec.investigation.evidence_count = rec.evidence.length;
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
}

// ------------------------------------------------------------
// Findings
// ------------------------------------------------------------

export async function getInvestigationFindings(
  investigationId: string
): Promise<InvestigationFinding[]> {
  await delay(80);
  return requireRecord(investigationId).findings;
}

export interface CreateFindingInput {
  /** Client-supplied canonical id (used so optimistic edits stay in sync). */
  id?: string;
  title: string;
  description: string;
  category: string;
  confidence: FindingConfidenceLevel;
  created_by: string;
  entity_ids?: string[];
  evidence_ids?: string[];
  tags?: string[];
}

export async function createFinding(
  investigationId: string,
  input: CreateFindingInput
): Promise<InvestigationFinding> {
  await delay(80);
  const rec = requireRecord(investigationId);
  const ts = now();
  const finding: InvestigationFinding = {
    id: input.id ?? `inf-${investigationId}-${rec.findings.length + 1}`,
    investigation_id: investigationId,
    title: input.title,
    description: input.description,
    category: input.category,
    confidence: input.confidence,
    source: input.created_by,
    source_type: 'manual',
    created_by: input.created_by,
    created_at: ts,
    updated_at: ts,
    entity_ids: input.entity_ids ?? [],
    evidence_ids: input.evidence_ids ?? [],
    tags: input.tags ?? [],
  };
  rec.findings.unshift(finding);
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
  return finding;
}

export async function updateFinding(
  investigationId: string,
  id: string,
  patch: Partial<Pick<InvestigationFinding, 'title' | 'description' | 'category' | 'confidence' | 'tags'>>
): Promise<InvestigationFinding> {
  await delay(80);
  const rec = requireRecord(investigationId);
  const idx = rec.findings.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error(`Finding not found: ${id}`);
  const updated = { ...rec.findings[idx], ...patch, updated_at: now() };
  rec.findings[idx] = updated;
  rec.investigation.updated_at = now();
  return updated;
}

// ------------------------------------------------------------
// Notes
// ------------------------------------------------------------

export async function getInvestigationNotes(
  investigationId: string
): Promise<InvestigationNote[]> {
  await delay(80);
  return requireRecord(investigationId).notes;
}

export async function createNote(
  investigationId: string,
  input: { id?: string; author: string; body: string; category?: string | null }
): Promise<InvestigationNote> {
  await delay();
  const rec = requireRecord(investigationId);
  const ts = now();
  const note: InvestigationNote = {
    id: input.id ?? `inn-${investigationId}-${rec.notes.length + 1}`,
    investigation_id: investigationId,
    author: input.author,
    body: input.body,
    category: input.category ?? null,
    created_at: ts,
    updated_at: ts,
  };
  rec.notes.unshift(note);
  rec.investigation.updated_at = now();
  rec.investigation.last_activity_at = now();
  return note;
}

export async function updateNote(
  investigationId: string,
  id: string,
  patch: { body?: string; category?: string | null }
): Promise<InvestigationNote> {
  await delay();
  const rec = requireRecord(investigationId);
  const idx = rec.notes.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error(`Note not found: ${id}`);
  const updated = { ...rec.notes[idx], ...patch, updated_at: now() };
  rec.notes[idx] = updated;
  rec.investigation.updated_at = now();
  return updated;
}

export async function deleteNote(
  investigationId: string,
  id: string
): Promise<void> {
  await delay();
  const rec = requireRecord(investigationId);
  rec.notes = rec.notes.filter((n) => n.id !== id);
  rec.investigation.updated_at = now();
}

// ------------------------------------------------------------
// Timeline & activity
// ------------------------------------------------------------

export async function getInvestigationTimeline(
  investigationId: string
): Promise<InvestigationTimelineItem[]> {
  await delay(80);
  const rec = requireRecord(investigationId);
  return [...rec.timeline].sort((a, b) => {
    const aAt = a.timestamp ? new Date(a.timestamp).valueOf() : -Infinity;
    const bAt = b.timestamp ? new Date(b.timestamp).valueOf() : -Infinity;
    return bAt - aAt;
  });
}

export async function getInvestigationEvents(
  investigationId: string
): Promise<InvestigationEvent[]> {
  await delay(80);
  return requireRecord(investigationId).events ?? [];
}

export async function getInvestigationActivity(
  investigationId: string
): Promise<InvestigationActivityEntry[]> {
  await delay(80);
  const rec = requireRecord(investigationId);
  return [...rec.activity].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function getInvestigationMembers(
  investigationId: string
): Promise<InvestigationMember[]> {
  await delay(80);
  return requireRecord(investigationId).members;
}

// ------------------------------------------------------------
// Networks & analytics snapshots
// ------------------------------------------------------------

export async function getInvestigationNetworks(
  investigationId: string
): Promise<InvestigationNetwork[]> {
  await delay(80);
  return requireRecord(investigationId).networks;
}

export async function getInvestigationAnalyticsSnapshots(
  investigationId: string
): Promise<InvestigationAnalyticsSnapshot[]> {
  await delay(80);
  return requireRecord(investigationId).analyticsSnapshots;
}

// ------------------------------------------------------------
// Cross-entity candidate catalog (for link flows)
// ------------------------------------------------------------

export interface EntityOption {
  id: string;
  name: string;
  entityType: InvestigationEntity['entity_type'];
  confidence: number;
  alreadyLinked: boolean;
}

export function getEntityLinkCandidates(
  investigationId: string
): EntityOption[] {
  const rec = mockInvestigationById.get(investigationId);
  const linked = rec ? new Set(rec.entities.map((e) => e.entity_id)) : new Set<string>();
  return mockEntityOptions.map((o) => ({ ...o, alreadyLinked: linked.has(o.id) }));
}

const mockEntityOptions: EntityOption[] = [
  { id: 'ent-person-001', name: 'Rahul Kumar', entityType: 'person', confidence: 0.95, alreadyLinked: false },
  { id: 'ent-person-002', name: 'Priya Sharma', entityType: 'person', confidence: 0.6, alreadyLinked: false },
  { id: 'ent-person-003', name: 'Vikram Patel', entityType: 'person', confidence: 0.7, alreadyLinked: false },
  { id: 'ent-person-004', name: 'Amit Singh', entityType: 'person', confidence: 0.55, alreadyLinked: false },
  { id: 'ent-person-005', name: 'Meera Reddy', entityType: 'person', confidence: 0.5, alreadyLinked: false },
  { id: 'ent-phone-001', name: '+91 98765 43210', entityType: 'phone', confidence: 0.9, alreadyLinked: false },
  { id: 'ent-phone-002', name: '+91 90210 11345', entityType: 'phone', confidence: 0.6, alreadyLinked: false },
  { id: 'ent-vehicle-001', name: 'MH 14 BX 2231', entityType: 'vehicle', confidence: 0.82, alreadyLinked: false },
  { id: 'ent-vehicle-002', name: 'MH 12 KU 8820', entityType: 'vehicle', confidence: 0.6, alreadyLinked: false },
  { id: 'ent-location-001', name: 'Chennai', entityType: 'location', confidence: 0.5, alreadyLinked: false },
  { id: 'ent-location-002', name: 'Pune', entityType: 'location', confidence: 0.5, alreadyLinked: false },
  { id: 'ent-location-003', name: 'Mumbai', entityType: 'location', confidence: 0.5, alreadyLinked: false },
  { id: 'ent-org-001', name: 'Mumbai Trading Corp', entityType: 'organization', confidence: 0.8, alreadyLinked: false },
  { id: 'ent-org-002', name: 'Global Imports Ltd', entityType: 'organization', confidence: 0.66, alreadyLinked: false },
  { id: 'ent-account-001', name: '7731 0029 4567', entityType: 'account', confidence: 0.86, alreadyLinked: false },
  { id: 'ent-account-002', name: '8845 1190 0221', entityType: 'account', confidence: 0.62, alreadyLinked: false },
  { id: 'ent-txn-001', name: 'TXN-2026-0482', entityType: 'transaction', confidence: 0.88, alreadyLinked: false },
  { id: 'ent-txn-002', name: 'TXN-2026-0774', entityType: 'transaction', confidence: 0.7, alreadyLinked: false },
];
