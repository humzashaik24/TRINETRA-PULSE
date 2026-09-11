import {
  type AuditEvent,
  type CandidateStatus,
  type EntityCandidate,
  type EntityEvent,
  type EntityEvidenceItem,
  type EntityIntelligence,
  type EntityIntelligenceSummary,
  type EntityListResponse,
  type EntityRelationship,
  type EntitySearchParams,
  type ExtractionJob,
  type GraphEdge,
  type RelatedEntity,
  type RelationshipCandidateStatus,
  type ResolutionDecision,
  type ResolutionState,
  type EntityActivityItem,
  type ResolutionHistoryEntry,
  type EntityResolution,
} from '@trinetra-pulse/types';
import {
  mockEntityActivity,
  mockAuditEvents,
  mockCandidateById,
  mockEntityCandidates,
  mockEntityEvents,
  mockEntityEvidence,
  mockEntityProfileById,
  mockEntityProfiles,
  mockEntityRelationships,
  mockEntityResolutions,
  mockExtractionJobs,
  mockResolutionHistory,
  presentationEntityProfiles,
  nexusNetwork,
  NEXUS_EVIDENCE_ITEMS,
  nexusInvestigationRecord,
} from '@/mock';
import { queryEntities } from '@/lib/entity-search';
import { isMockData } from '@/lib/api/config';
import {
  cancelApiExtractionJob,
  decideApiResolution,
  fetchApiAuditEvents,
  fetchApiCandidate,
  fetchApiCandidates,
  fetchApiExtractionJobs,
  fetchApiResolutions,
  mergeApiResolution,
  reviewApiCandidate,
  startApiExtractionJob,
} from '@/lib/api/entity-intelligence';

// ============================================================
// ENTITY SERVICE (mock-backed)
// ============================================================
// Mutable in-memory store layered over mock module data so the
// workspace (review / confirm / reject / merge / extraction) can
// mutate state. Swappable with the real API client later.
// ============================================================

const LATENCY = 180;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const clampConfidence = (v: number) => Math.max(0, Math.min(1, Math.round(v * 1000) / 1000));

// ---- mutable stores ------------------------------------------------------
let profiles: EntityIntelligence[] = [...mockEntityProfiles];
let profileById: Map<string, EntityIntelligence> = new Map(mockEntityProfileById);
let candidates: EntityCandidate[] = [...mockEntityCandidates];
let candidateById: Map<string, EntityCandidate> = new Map(mockCandidateById);
let resolutions: EntityResolution[] = [...mockEntityResolutions];
type RelationshipStore = Omit<EntityRelationship, 'sourceEntityType' | 'targetEntityType'>;

let relationships: RelationshipStore[] = [...mockEntityRelationships];
let evidence: EntityEvidenceItem[] = [...mockEntityEvidence];
let events: EntityEvent[] = [...mockEntityEvents];
let activity: EntityActivityItem[] = [...mockEntityActivity];
let resolutionHistory: ResolutionHistoryEntry[] = [...mockResolutionHistory];
let audit: AuditEvent[] = [...mockAuditEvents];
let jobs: ExtractionJob[] = [...mockExtractionJobs];

const seq = (() => {
  let n = 99;
  return (prefix: string) => {
    n += 1;
    return `${prefix}-${String(n).padStart(3, '0')}`;
  };
})();

const nowIso = () => new Date().toISOString();

const pushAudit = (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
  audit = [{ ...event, id: seq('aud'), timestamp: nowIso() }, ...audit];
};

const pushActivity = (
  entityId: string,
  action: NonNullable<EntityActivityItem['action']>,
  actionLabel: string,
  detail: string,
  actor: string
) => {
  activity = [
    { id: seq('act'), entityId, action, actionLabel, detail, actor, timestamp: nowIso() },
    ...activity,
  ];
};

const touchProfile = (id: string) => {
  const p = profileById.get(id);
  if (p) {
    const next = { ...p, updatedAt: nowIso() };
    profileById.set(id, next);
    profiles = profiles.map((x) => (x.id === id ? next : x));
    return next;
  }
  return p;
};

const profileByIdPublic = (id: string): EntityIntelligence | undefined =>
  profileById.get(id);

// ============================================================
// NEXUS BRIDGE — presentation-universe intelligence slices
// ============================================================
// The mutable workspace store above is seeded from the legacy
// canonical profiles/relationships/evidence. Those arrays are
// keyed to `ent-person-*` ids, so Operation Trinetra Nexus
// entities (`ent-nexus-*`) resolve to what the Nexus dataset
// actually contains: the NET-004 graph edges, the catalogued
// evidence links, and the investigation event/activity record.
// Everything here is deterministic — no randomness, no Date.now.
// ============================================================

const isNexusEntityId = (id: string): boolean => id.startsWith('ent-nexus-');

const nexusNodeById = new Map(nexusNetwork.nodes.map((n) => [n.id, n]));
const nexusNodeByEntityId = new Map(nexusNetwork.nodes.map((n) => [n.entityId, n]));

const NEXUS_RELATIONSHIP_STATUS: Record<string, RelationshipCandidateStatus> = {
  confirmed: 'CONFIRMED',
  probable: 'PROBABLE',
  possible: 'PROBABLE',
  candidate: 'CANDIDATE',
  needs_review: 'NEEDS_REVIEW',
};

function nexusIncidentEdges(entityId: string): GraphEdge[] {
  const node = nexusNodeByEntityId.get(entityId);
  if (!node) return [];
  return nexusNetwork.edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .sort((a, b) => b.confidence - a.confidence);
}

function nexusEdgeToRelationship(edge: GraphEdge): EntityRelationship | null {
  const source = nexusNodeById.get(edge.source);
  const target = nexusNodeById.get(edge.target);
  if (!source || !target) return null;
  return {
    id: edge.id,
    sourceEntityId: source.entityId,
    sourceEntityName: source.label,
    sourceEntityType: source.type,
    targetEntityId: target.entityId,
    targetEntityName: target.label,
    targetEntityType: target.type,
    type: edge.type,
    confidence: edge.confidence,
    source: edge.sourceRecordLabel,
    timestamp: edge.timestamp,
    evidence: edge.evidence,
    extractionMethod: edge.extractionMethod,
    verificationStatus: NEXUS_RELATIONSHIP_STATUS[edge.status] ?? 'NEEDS_REVIEW',
    metadata: {},
    createdAt: edge.timestamp ?? '',
  };
}

function nexusEvidenceFor(entityId: string): EntityEvidenceItem[] {
  return NEXUS_EVIDENCE_ITEMS.flatMap((item) => {
    const link = item.links.find(
      (l) => l.targetType === 'entity' && l.targetId === entityId
    );
    if (!link) return [];
    return [
      {
        id: `evi-${item.id}`,
        entityId,
        title: item.title,
        summary: item.description,
        datasetId: item.datasetId,
        datasetName: item.datasetName,
        documentId: item.documentId,
        sourceRecord: item.sourceRecord,
        sourceName: item.sourceName ?? item.datasetName ?? 'Operation Trinetra Nexus',
        extractionMethod: item.extractionMethod,
        confidence: link.confidence,
        timestamp: item.createdAt,
      } satisfies EntityEvidenceItem,
    ];
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function nexusEventsFor(entityId: string): EntityEvent[] {
  return nexusInvestigationRecord.events
    .filter((e) => e.entity_ids.includes(entityId))
    .map((e) => ({
      id: `evt-${e.id}`,
      entityId,
      eventType: e.event_type,
      title: e.title,
      description: e.description ?? undefined,
      timestamp: e.occurred_at ?? e.created_at ?? '',
      source: e.location ?? 'Operation Trinetra Nexus timeline',
      confidence: 0.85,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const NEXUS_ACTIVITY_LABELS: Array<{
  action: string;
  actionLabel: string;
  detail: string;
}> = [
  { action: 'PROFILE_UPDATED', actionLabel: 'Profile updated', detail: 'Resolution confidence and flags refreshed from latest linkage.' },
  { action: 'EVIDENCE_LINKED', actionLabel: 'Evidence linked', detail: 'Cited in a catalogued demonstration evidence item.' },
  { action: 'RELATIONSHIP_VERIFIED', actionLabel: 'Relationship verified', detail: 'Relationship corroborated by a second source record.' },
  { action: 'PATTERN_REFERENCED', actionLabel: 'Pattern referenced', detail: 'Appears in a flagged suspicious pattern for this investigation.' },
  { action: 'REVIEWED', actionLabel: 'Reviewed', detail: 'Checked by the intelligence team during triage.' },
];

function nexusActivityFor(entityId: string): EntityActivityItem[] {
  const profile = profileById.get(entityId);
  const count = Math.max(1, profile?.activityCount ?? 1);
  const start = new Date(profile?.createdAt ?? '2026-07-01T09:00:00Z').getTime();
  const end = new Date(profile?.updatedAt ?? '2026-09-08T14:30:00Z').getTime();
  const span = Math.max(1, end - start);
  return Array.from({ length: count }, (_, i) => {
    const template = NEXUS_ACTIVITY_LABELS[i % NEXUS_ACTIVITY_LABELS.length];
    const timestamp = new Date(start + span * ((i + 1) / (count + 1))).toISOString();
    return {
      id: `nxa-${entityId}-${i + 1}`,
      entityId,
      action: template.action,
      actionLabel: template.actionLabel,
      detail: template.detail,
      actor: i % 2 === 0 ? 'Inspector Mehta' : 'Analyst Singh',
      timestamp,
    } satisfies EntityActivityItem;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function nexusSourcesFor(entityId: string): EntitySourceRef[] {
  const refs = new Map<string, EntitySourceRef>();
  for (const edge of nexusIncidentEdges(entityId)) {
    const key = edge.sourceRecordLabel;
    const existing = refs.get(key);
    if (existing) {
      existing.evidenceCount += 1;
      for (const record of edge.evidence) {
        if (!existing.recordRefs.includes(record)) existing.recordRefs.push(record);
      }
    } else {
      refs.set(key, {
        datasetName: key,
        source: key,
        recordRefs: [...edge.evidence],
        evidenceCount: 1,
      });
    }
  }
  return Array.from(refs.values()).sort((a, b) => b.evidenceCount - a.evidenceCount);
}

function nexusResolutionHistoryFor(entityId: string): ResolutionHistoryEntry[] {
  const profile = profileById.get(entityId);
  if (!profile) return [];
  const entries: ResolutionHistoryEntry[] = [
    {
      id: `nrh-${entityId}-1`,
      entityId,
      action: 'CREATED',
      actionLabel: 'Entity created',
      description: 'Canonical record created while processing the Nexus extract.',
      reviewer: 'Inspector Mehta',
      timestamp: profile.createdAt,
    },
  ];
  if (profile.isVerified) {
    entries.push({
      id: `nrh-${entityId}-2`,
      entityId,
      action: 'UPDATED',
      actionLabel: 'Resolution updated',
      description: `Resolution confirmed at ${Math.round(profile.confidence * 100)}% confidence.`,
      reviewer: 'Analyst Singh',
      timestamp: profile.updatedAt,
    });
  }
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ---- relationships (type enrichment from profile store) ------------------

function withTypes(rel: RelationshipStore): EntityRelationship {
  return {
    ...rel,
    sourceEntityType: profileByIdPublic(rel.sourceEntityId)?.entityType ?? 'person',
    targetEntityType: profileByIdPublic(rel.targetEntityId)?.entityType ?? 'person',
  };
}

// ---- public API ----------------------------------------------------------

export async function fetchEntities(params: EntitySearchParams = {}): Promise<EntityListResponse> {
  await delay(140);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  // Presentation universe: list Nexus investigation entities only.
  const universe = profiles.filter((p) => p.id.startsWith('ent-nexus-'));
  const { items, total } = queryEntities(universe, { ...params, page, pageSize });
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchEntity(id: string): Promise<EntityIntelligence> {
  await delay(120);
  const entity = profileById.get(id);
  if (!entity) throw new Error(`Entity not found: ${id}`);
  return entity;
}

export async function fetchEntityIntelligenceSummary(id: string): Promise<EntityIntelligenceSummary> {
  await delay(120);
  const entity = profileById.get(id);
  if (!entity) throw new Error(`Entity not found: ${id}`);
  if (isNexusEntityId(id)) {
    const relationships = nexusIncidentEdges(id);
    const entityEvidence = nexusEvidenceFor(id);
    const entityEvents = nexusEventsFor(id);
    const entityActivity = nexusActivityFor(id);
    return {
      entityId: id,
      connections: relationships.length,
      sources: entity.sourcesCount,
      events: entityEvents.length,
      relationships: relationships.length,
      evidence: entityEvidence.length,
      activity: entityActivity.length,
      resolutionConfidence: entity.confidence,
      resolutionState: entity.resolutionState,
    };
  }
  const related = relationships.filter(
    (r) => r.sourceEntityId === id || r.targetEntityId === id
  );
  const entityEvents = events.filter((e) => e.entityId === id);
  const entityEvidence = evidence.filter((e) => e.entityId === id);
  const entityActivity = activity.filter((a) => a.entityId === id);
  return {
    entityId: id,
    connections: entity.connectionsCount,
    sources: entity.sourcesCount,
    events: entityEvents.length,
    relationships: related.length,
    evidence: entityEvidence.length,
    activity: entityActivity.length,
    resolutionConfidence: entity.confidence,
    resolutionState: entity.resolutionState,
  };
}

export async function fetchEntityRelationships(id: string): Promise<EntityRelationship[]> {
  await delay(120);
  if (isNexusEntityId(id)) {
    return nexusIncidentEdges(id)
      .map(nexusEdgeToRelationship)
      .filter((r): r is EntityRelationship => r !== null);
  }
  return relationships
    .filter((r) => r.sourceEntityId === id || r.targetEntityId === id)
    .map(withTypes)
    .sort((a, b) => b.confidence - a.confidence);
}

export async function fetchRelationship(id: string): Promise<EntityRelationship> {
  await delay(80);
  const nexusEdge = nexusNetwork.edges.find((e) => e.id === id);
  if (nexusEdge) {
    const rel = nexusEdgeToRelationship(nexusEdge);
    if (rel) return rel;
  }
  const rel = relationships.find((r) => r.id === id);
  if (!rel) throw new Error(`Relationship not found: ${id}`);
  return withTypes(rel);
}

/** Fetch all relationships for one or more entities (AI tool helper). */
export async function fetchRelationshipsForEntities(
  idOrIds: string | string[]
): Promise<EntityRelationship[]> {
  const ids = new Set(Array.isArray(idOrIds) ? idOrIds : [idOrIds]);
  if (Array.from(ids).some(isNexusEntityId)) {
    const seen = new Set<string>();
    const result: EntityRelationship[] = [];
    for (const entityId of ids) {
      if (!isNexusEntityId(entityId)) continue;
      for (const edge of nexusIncidentEdges(entityId)) {
        if (seen.has(edge.id)) continue;
        seen.add(edge.id);
        const rel = nexusEdgeToRelationship(edge);
        if (rel) result.push(rel);
      }
    }
    return result.sort((a, b) => b.confidence - a.confidence);
  }
  return relationships
    .filter((r) => ids.has(r.sourceEntityId) || ids.has(r.targetEntityId))
    .map(withTypes)
    .sort((a, b) => b.confidence - a.confidence);
}

export async function fetchRelatedEntities(id: string): Promise<RelatedEntity[]> {
  await delay(120);
  const entity = profileById.get(id);
  if (!entity) return [];
  if (isNexusEntityId(id)) {
    const related: Array<RelatedEntity | null> = nexusIncidentEdges(id).map((edge) => {
      const isSource = edge.source === nexusNodeByEntityId.get(id)?.id;
      const otherNode = nexusNodeById.get(isSource ? edge.target : edge.source);
      if (!otherNode) return null;
      return {
        id: otherNode.entityId,
        name: otherNode.label,
        entityType: otherNode.type,
        relationshipType: edge.type,
        relationshipConfidence: edge.confidence,
        verificationStatus: NEXUS_RELATIONSHIP_STATUS[edge.status] ?? 'NEEDS_REVIEW',
        source: edge.sourceRecordLabel,
      };
    });
    return related.filter((r): r is RelatedEntity => r !== null);
  }

  const related: RelatedEntity[] = [];
  for (const rel of relationships) {
    const isSource = rel.sourceEntityId === id;
    const isTarget = rel.targetEntityId === id;
    if (!isSource && !isTarget) continue;

    const otherId = isSource ? rel.targetEntityId : rel.sourceEntityId;
    const other = profileById.get(otherId);
    if (!other) continue;

    related.push({
      id: other.id,
      name: other.displayName,
      entityType: other.entityType,
      relationshipType: rel.type,
      relationshipConfidence: rel.confidence,
      verificationStatus: rel.verificationStatus,
      source: rel.source,
    });
  }

  return related.sort((a, b) => b.relationshipConfidence - a.relationshipConfidence);
}

export async function fetchEntityEvidence(id: string): Promise<EntityEvidenceItem[]> {
  await delay(100);
  if (isNexusEntityId(id)) return nexusEvidenceFor(id);
  return evidence
    .filter((e) => e.entityId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function fetchEntityEvents(id: string): Promise<EntityEvent[]> {
  await delay(100);
  if (isNexusEntityId(id)) return nexusEventsFor(id);
  return events
    .filter((e) => e.entityId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function fetchEntityActivity(id: string): Promise<EntityActivityItem[]> {
  await delay(100);
  if (isNexusEntityId(id)) return nexusActivityFor(id);
  return activity
    .filter((a) => a.entityId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function fetchResolutionHistory(id: string): Promise<ResolutionHistoryEntry[]> {
  await delay(100);
  if (isNexusEntityId(id)) return nexusResolutionHistoryFor(id);
  return resolutionHistory
    .filter((h) => h.entityId === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export interface EntitySourceRef {
  datasetId?: string;
  datasetName?: string;
  source: string;
  recordRefs: string[];
  evidenceCount: number;
}

export async function fetchEntitySources(id: string): Promise<EntitySourceRef[]> {
  await delay(100);
  const entity = profileById.get(id);
  if (!entity) return [];
  if (isNexusEntityId(id)) return nexusSourcesFor(id);

  const refsByDataset = new Map<string, EntitySourceRef>();
  const upsert = (datasetId: string | undefined, datasetName: string, source: string, recordRef: string) => {
    const key = datasetId ?? source;
    const existing = refsByDataset.get(key);
    if (existing) {
      if (!existing.recordRefs.includes(recordRef)) existing.recordRefs.push(recordRef);
      existing.evidenceCount += 1;
    } else {
      refsByDataset.set(key, {
        datasetId,
        datasetName,
        source,
        recordRefs: [recordRef],
        evidenceCount: 1,
      });
    }
  };

  evidence
    .filter((e) => e.entityId === id)
    .forEach((e) => upsert(e.datasetId, e.datasetName ?? e.sourceName, e.sourceName, e.sourceRecord ?? '—'));
  candidates
    .filter((c) => c.resolvedEntityId === id)
    .forEach((c) => upsert(c.datasetId, c.datasetName ?? c.source, c.source, c.sourceRecord));

  return Array.from(refsByDataset.values()).sort((a, b) => b.evidenceCount - a.evidenceCount);
}

// ---- candidates & resolutions -------------------------------------------

export interface CandidateFilter {
  status?: CandidateStatus | 'all';
  entityType?: string | 'all';
  resolutionState?: ResolutionState | 'all';
  search?: string;
}

export async function fetchCandidates(filter: CandidateFilter = {}): Promise<EntityCandidate[]> {
  if (!isMockData()) return fetchApiCandidates(filter);
  await delay(140);
  let list = [...candidates];
  if (filter.status && filter.status !== 'all') {
    list = list.filter((c) => c.status === filter.status);
  }
  if (filter.entityType && filter.entityType !== 'all') {
    list = list.filter((c) => c.entityType === filter.entityType);
  }
  if (filter.resolutionState && filter.resolutionState !== 'all') {
    list = list.filter((c) => c.resolutionState === filter.resolutionState);
  }
  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.rawValue.toLowerCase().includes(q) ||
        c.displayValue.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q)
    );
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function fetchCandidate(id: string): Promise<EntityCandidate> {
  if (!isMockData()) return fetchApiCandidate(id);
  await delay(100);
  const c = candidateById.get(id);
  if (!c) throw new Error(`Candidate not found: ${id}`);
  return c;
}

export async function fetchResolutions(): Promise<EntityResolution[]> {
  if (!isMockData()) return fetchApiResolutions();
  await delay(140);
  return [...resolutions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function reviewCandidate(
  candidateId: string,
  decision: 'accept' | 'reject',
  reviewer: string
): Promise<EntityCandidate> {
  if (!isMockData()) return reviewApiCandidate(candidateId, decision, reviewer);
  await delay();
  const c = candidateById.get(candidateId);
  if (!c) throw new Error(`Candidate not found: ${candidateId}`);

  const next: EntityCandidate = {
    ...c,
    status: decision === 'accept' ? 'ACCEPTED' : 'REJECTED',
    resolutionState: decision === 'accept' ? 'CONFIRMED' : 'REJECTED',
  };
  candidateById.set(candidateId, next);
  candidates = candidates.map((x) => (x.id === candidateId ? next : x));

  pushAudit({
    actor: reviewer,
    actorName: reviewer,
    action: 'CANDIDATE_REVIEWED',
    actionLabel: 'Candidate reviewed',
    object: next.displayValue,
    objectType: 'candidate',
    objectId: next.id,
    reason: `Decision: ${decision}`,
  });

  return next;
}

export async function confirmResolution(
  resolutionId: string,
  reviewer: string,
  reason: string
): Promise<EntityResolution> {
  if (!isMockData()) return decideApiResolution(resolutionId, 'confirm', reviewer, reason);
  await delay();
  const idx = resolutions.findIndex((r) => r.id === resolutionId);
  if (idx === -1) throw new Error(`Resolution not found: ${resolutionId}`);
  const current = resolutions[idx];

  const next: EntityResolution = {
    ...current,
    state: 'CONFIRMED',
    reviewedBy: reviewer,
    reviewedAt: nowIso(),
    reviewReason: reason,
  };
  resolutions = resolutions.map((r, i) => (i === idx ? next : r));

  // Promote both entity profiles to CONFIRMED when they are real profiles.
  [current.entityAId, current.entityBId].forEach((id) => {
    if (profileById.has(id)) {
      const p = profileById.get(id)!;
      const updated = { ...p, resolutionState: 'CONFIRMED' as ResolutionState };
      profileById.set(id, updated);
      profiles = profiles.map((x) => (x.id === id ? updated : x));
    }
  });

  pushAudit({
    actor: reviewer,
    actorName: reviewer,
    action: 'ENTITY_RESOLVED',
    actionLabel: 'Resolution confirmed',
    object: `${current.entityAName} ↔ ${current.entityBName}`,
    objectType: 'resolution',
    objectId: current.id,
    reason,
  });

  return next;
}

export async function rejectResolution(
  resolutionId: string,
  reviewer: string,
  reason: string
): Promise<EntityResolution> {
  if (!isMockData()) return decideApiResolution(resolutionId, 'reject', reviewer, reason);
  await delay();
  const idx = resolutions.findIndex((r) => r.id === resolutionId);
  if (idx === -1) throw new Error(`Resolution not found: ${resolutionId}`);
  const current = resolutions[idx];

  const next: EntityResolution = {
    ...current,
    state: 'REJECTED',
    recommendation: 'KEEP_SEPARATE',
    reviewedBy: reviewer,
    reviewedAt: nowIso(),
    reviewReason: reason,
  };
  resolutions = resolutions.map((r, i) => (i === idx ? next : r));

  [current.entityAId, current.entityBId].forEach((id) => {
    if (profileById.has(id)) {
      const p = profileById.get(id)!;
      const updated = { ...p, resolutionState: 'REJECTED' as ResolutionState };
      profileById.set(id, updated);
      profiles = profiles.map((x) => (x.id === id ? updated : x));
    }
  });

  pushAudit({
    actor: reviewer,
    actorName: reviewer,
    action: 'ENTITY_REJECTED',
    actionLabel: 'Resolution rejected',
    object: `${current.entityAName} ↔ ${current.entityBName}`,
    objectType: 'resolution',
    objectId: current.id,
    reason,
  });

  return next;
}

export interface MergeInput {
  resolutionId?: string;
  targetId: string;
  sourceId: string;
  reason: string;
  reviewer: string;
}

const archiveSourceProfiles = true;

export async function mergeEntities(input: MergeInput): Promise<EntityIntelligence> {
  if (!isMockData()) {
    if (!input.resolutionId) throw new Error('A resolution id is required to merge in API mode');
    await mergeApiResolution({
      resolutionId: input.resolutionId,
      targetEntityId: input.targetId,
      reviewer: input.reviewer,
      reason: input.reason,
    });
    return fetchEntity(input.targetId);
  }
  await delay(260);
  const target = profileById.get(input.targetId);
  const source = profileById.get(input.sourceId);
  if (!target || !source) throw new Error('Target or source entity not found');

  // Fold source identity into target aliases.
  const mergedAliases = Array.from(
    new Set([...(target.aliases ?? []), source.name, source.displayName, ...(source.aliases ?? [])])
  ).filter((a) => a !== target.name && a !== target.displayName);

  const updatedTarget: EntityIntelligence = {
    ...target,
    aliases: mergedAliases,
    attributes: { ...source.attributes, ...target.attributes },
    sourcesCount: target.sourcesCount + source.sourcesCount,
    connectionsCount: target.connectionsCount + source.connectionsCount,
    resolutionState: 'CONFIRMED',
    confidence: clampConfidence(Math.max(target.confidence, source.confidence)),
    isVerified: true,
    updatedAt: nowIso(),
  };
  profileById.set(target.id, updatedTarget);
  profiles = profiles.map((x) => (x.id === target.id ? updatedTarget : x));

  const archived: EntityIntelligence = {
    ...source,
    resolutionState: 'REJECTED',
    isVerified: false,
    aliases: [],
    updatedAt: nowIso(),
  };
  const archiveSourceProfiles = true;
  if (archiveSourceProfiles) {
    profileById.set(source.id, archived);
    profiles = profiles.map((x) => (x.id === source.id ? archived : x));
  }

  // Point candidates and relationships at the canonical target.
  candidates = candidates.map((c) =>
    c.resolvedEntityId === source.id ? { ...c, resolvedEntityId: target.id } : c
  );
  relationships = relationships.map((r) =>
    r.sourceEntityId === source.id
      ? { ...r, sourceEntityId: target.id, sourceEntityName: target.name }
      : r.targetEntityId === source.id
        ? { ...r, targetEntityId: target.id, targetEntityName: target.name }
        : r
  );
  evidence = evidence.map((e) => (e.entityId === source.id ? { ...e, entityId: target.id } : e));
  events = events.map((e) => (e.entityId === source.id ? { ...e, entityId: target.id } : e));

  resolutionHistory = [
    {
      id: seq('rh'),
      entityId: target.id,
      action: 'MERGED',
      actionLabel: 'Entity merged',
      description: `Merged ${source.name} into ${target.name}. ${input.reason}`,
      reviewer: input.reviewer,
      timestamp: nowIso(),
    },
    ...resolutionHistory,
  ];

  pushActivity(
    target.id,
    'entity_resolved',
    'Entity merged',
    `Merged ${source.name} into ${target.name}. ${input.reason}`,
    input.reviewer
  );
  pushAudit({
    actor: input.reviewer,
    actorName: input.reviewer,
    action: 'ENTITY_MERGED',
    actionLabel: 'Entity merged',
    object: `${source.name} → ${target.name}`,
    objectType: 'entity',
    objectId: target.id,
    reason: input.reason,
  });

  return updatedTarget;
}

// ---- extraction jobs -----------------------------------------------------

export async function fetchExtractionJobs(): Promise<ExtractionJob[]> {
  if (!isMockData()) return fetchApiExtractionJobs();
  await delay(120);
  return [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface StartExtractionInput {
  datasetId: string;
  datasetName: string;
  createdBy: string;
}

export async function startExtractionJob(input: StartExtractionInput): Promise<ExtractionJob> {
  if (!isMockData()) return startApiExtractionJob(input);
  await delay();
  const job: ExtractionJob = {
    id: seq('job'),
    datasetId: input.datasetId,
    datasetName: input.datasetName,
    status: 'QUEUED',
    progress: 0,
    recordsProcessed: 0,
    entitiesExtracted: 0,
    candidatesCreated: 0,
    matchesFound: 0,
    errors: [],
    warnings: [],
    createdBy: input.createdBy,
    createdAt: nowIso(),
    startedAt: undefined,
  };
  jobs = [job, ...jobs];
  pushAudit({
    actor: input.createdBy,
    actorName: input.createdBy,
    action: 'EXTRACTION_STARTED',
    actionLabel: 'Extraction started',
    object: input.datasetName,
    objectType: 'extraction_job',
    objectId: job.id,
  });
  return job;
}

export async function cancelExtractionJob(jobId: string, actor: string): Promise<ExtractionJob> {
  if (!isMockData()) return cancelApiExtractionJob(jobId);
  await delay();
  const idx = jobs.findIndex((j) => j.id === jobId);
  if (idx === -1) throw new Error(`Job not found: ${jobId}`);
  const next = { ...jobs[idx], status: 'CANCELLED' as const };
  jobs = jobs.map((j, i) => (i === idx ? next : j));
  pushAudit({
    actor,
    actorName: actor,
    action: 'ENTITY_UPDATED',
    actionLabel: 'Extraction cancelled',
    object: next.datasetName,
    objectType: 'extraction_job',
    objectId: jobId,
  });
  return next;
}

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  if (!isMockData()) return fetchApiAuditEvents();
  await delay(100);
  return [...audit].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export interface EntityOverviewSummary {
  totalEntities: number;
  totalCandidates: number;
  pendingResolutions: number;
  jobsRunning: number;
}

export async function fetchEntityOverviewSummary(): Promise<EntityOverviewSummary> {
  await delay(100);
  const runningStatuses = new Set(['QUEUED', 'EXTRACTING', 'NORMALIZING', 'RESOLVING']);
  return {
    totalEntities: presentationEntityProfiles.length,
    totalCandidates: candidates.filter((c) => c.status === 'PENDING').length,
    pendingResolutions: resolutions.filter((r) => r.state === 'NEEDS_REVIEW').length,
    jobsRunning: jobs.filter((j) => runningStatuses.has(j.status)).length,
  };
}

// Convenience aggregate used by the entity detail page.
export async function fetchEntityDetailBundle(id: string): Promise<{
  entity: EntityIntelligence;
  summary: EntityIntelligenceSummary;
  relationships: EntityRelationship[];
  related: RelatedEntity[];
  evidence: EntityEvidenceItem[];
  events: EntityEvent[];
  activity: EntityActivityItem[];
  sources: EntitySourceRef[];
  resolutionHistory: ResolutionHistoryEntry[];
}> {
  const [entity, summary, relationshipsList, related, entityEvidence, entityEvents, entityActivity, sources, history] =
    await Promise.all([
      fetchEntity(id),
      fetchEntityIntelligenceSummary(id),
      fetchEntityRelationships(id),
      fetchRelatedEntities(id),
      fetchEntityEvidence(id),
      fetchEntityEvents(id),
      fetchEntityActivity(id),
      fetchEntitySources(id),
      fetchResolutionHistory(id),
    ]);
  return {
    entity,
    summary,
    relationships: relationshipsList,
    related,
    evidence: entityEvidence,
    events: entityEvents,
    activity: entityActivity,
    sources,
    resolutionHistory: history,
  };
}

export type {
  EntityRelationship,
  EntityResolution,
  EntityCandidate,
  ResolutionDecision,
  CandidateStatus,
};