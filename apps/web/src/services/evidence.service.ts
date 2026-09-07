import type {
  EvidenceItem,
  EvidenceSearchFilters,
  EvidenceSearchParams,
  EvidenceSearchResult,
  EvidenceSource,
  EvidenceCoverage,
  EvidenceCollection,
  EvidenceRetrievalResult,
  EvidenceRetrievalParams,
  RelationshipEvidenceSupport,
  FindingEvidenceSupport,
  EventEvidenceSupport,
  EntityEvidenceSummary,
  EvidenceType,
  EvidenceStatus,
} from '@trinetra-pulse/types';
import {
  mockEvidenceItems,
  mockEvidenceById,
  mockEvidenceByEntityId,
  mockEvidenceByFindingId,
  mockEvidenceByEventId,
  mockEvidenceByType,
  mockEvidenceByRelationshipId,
  mockEvidenceCollections,
  mockEvidenceSearchResult,
  mockEvidenceCoverage,
  mockRelationshipEvidenceSupport,
  mockFindingEvidenceSupport,
  mockEventEvidenceSupport,
  mockEntityEvidenceSummaries,
  mockEvidenceRetrievalBudget,
} from '@/mock';

// ============================================================
// EVIDENCE SERVICE (mock-backed)
// ============================================================
// Investigation-scoped evidence intelligence layer.
// All queries return deterministic results from the mock universe.
// Mutations are in-memory and reset on page reload.
// ============================================================

const LATENCY = 150;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// ---- mutable stores ------------------------------------------------------

let evidenceItems: EvidenceItem[] = [...mockEvidenceItems];
let evidenceById: Map<string, EvidenceItem> = new Map(mockEvidenceById);
let collections: EvidenceCollection[] = [...mockEvidenceCollections];

// ---- helpers --------------------------------------------------------------

const toSource = (e: EvidenceItem): EvidenceSource => ({
  id: e.id,
  title: e.title,
  evidenceType: e.evidenceType,
  status: e.status,
  sourceName: e.sourceName,
  observedAt: e.observedAt,
  investigationId: e.investigationId,
  entityIds: e.links.filter((l) => l.targetType === 'entity').map((l) => l.targetId),
  findingIds: e.links.filter((l) => l.targetType === 'finding').map((l) => l.targetId),
  eventIds: e.links.filter((l) => l.targetType === 'event').map((l) => l.targetId),
  snippet: e.snippet,
  isDemoData: e.isDemoData,
});

const matchesFilters = (e: EvidenceItem, filters: EvidenceSearchFilters): boolean => {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = [e.title, e.description, e.sourceName, e.datasetName ?? '', e.provenance.recordIdentifier ?? '']
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(q)) return false;
  }
  if (filters.evidenceTypes?.length && !filters.evidenceTypes.includes(e.evidenceType)) return false;
  if (filters.statuses?.length && !filters.statuses.includes(e.status)) return false;
  if (filters.sourceNames?.length && !filters.sourceNames.includes(e.sourceName)) return false;
  if (filters.datasetIds?.length && !filters.datasetIds.includes(e.datasetId ?? '')) return false;
  if (filters.investigationId && e.investigationId !== filters.investigationId) return false;
  if (filters.extractionMethods?.length && !filters.extractionMethods.includes(e.extractionMethod)) return false;
  if (filters.confidenceMin !== undefined && e.extractionConfidence < filters.confidenceMin) return false;
  if (filters.confidenceMax !== undefined && e.extractionConfidence > filters.confidenceMax) return false;
  if (filters.tags?.length && !filters.tags.some((t) => e.tags.includes(t))) return false;
  if (filters.dateRange) {
    const from = new Date(filters.dateRange.from).getTime();
    const to = new Date(filters.dateRange.to).getTime();
    const observed = new Date(e.observedAt).getTime();
    if (observed < from || observed > to) return false;
  }
  if (filters.entityIds?.length) {
    const eIds = e.links.filter((l) => l.targetType === 'entity').map((l) => l.targetId);
    if (!filters.entityIds.some((id) => eIds.includes(id))) return false;
  }
  if (filters.findingIds?.length) {
    const fIds = e.links.filter((l) => l.targetType === 'finding').map((l) => l.targetId);
    if (!filters.findingIds.some((id) => fIds.includes(id))) return false;
  }
  if (filters.eventIds?.length) {
    const evIds = e.links.filter((l) => l.targetType === 'event').map((l) => l.targetId);
    if (!filters.eventIds.some((id) => evIds.includes(id))) return false;
  }
  return true;
};

const sortItems = (
  items: EvidenceSource[],
  sortBy?: EvidenceSearchParams['sortBy'],
  sortOrder?: EvidenceSearchParams['sortOrder']
): EvidenceSource[] => {
  if (!sortBy) return items;
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'observedAt':
        return dir * (new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'evidenceType':
        return dir * a.evidenceType.localeCompare(b.evidenceType);
      case 'sourceName':
        return dir * a.sourceName.localeCompare(b.sourceName);
      default:
        return 0;
    }
  });
};

const buildFacets = (items: EvidenceSource[]) => {
  const evidenceTypes: Record<EvidenceType, number> = {
    DOCUMENT: 0, FIR: 0, REPORT: 0, COMMUNICATION: 0, TRANSACTION: 0,
    VEHICLE: 0, LOCATION: 0, IMAGE: 0, VIDEO: 0, AUDIO: 0, RECORD: 0, OTHER: 0,
  };
  const statuses: Record<EvidenceStatus, number> = {
    AVAILABLE: 0, PROCESSING: 0, REQUIRES_REVIEW: 0, VERIFIED: 0, UNVERIFIED: 0, ARCHIVED: 0,
  };
  const sources: Record<string, number> = {};
  const entities: Record<string, number> = {};
  for (const item of items) {
    evidenceTypes[item.evidenceType] += 1;
    statuses[item.status] += 1;
    sources[item.sourceName] = (sources[item.sourceName] ?? 0) + 1;
    for (const eid of item.entityIds) {
      entities[eid] = (entities[eid] ?? 0) + 1;
    }
  }
  return { evidenceTypes, statuses, sources, entities };
};

// ---- public API ----------------------------------------------------------

/** List evidence items with filtering, search, sorting and pagination. */
export async function listEvidence(params: EvidenceSearchParams = {}): Promise<EvidenceSearchResult> {
  await delay(140);
  const filtered = evidenceItems.filter((e) => matchesFilters(e, params));
  let sources = filtered.map(toSource);
  sources = sortItems(sources, params.sortBy, params.sortOrder);

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const total = sources.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = sources.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    totalPages,
    facets: buildFacets(sources),
  };
}

/** Get a single evidence item by ID. */
export async function getEvidence(id: string): Promise<EvidenceItem> {
  await delay(100);
  const item = evidenceById.get(id);
  if (!item) throw new Error(`Evidence not found: ${id}`);
  return item;
}

/** Get evidence items linked to a specific entity. */
export async function getEvidenceForEntity(entityId: string): Promise<EvidenceItem[]> {
  await delay(100);
  return (mockEvidenceByEntityId.get(entityId) ?? [])
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}

/** Get evidence items linked to a specific relationship. */
export async function getEvidenceForRelationship(relationshipId: string): Promise<EvidenceItem[]> {
  await delay(100);
  const support = mockEvidenceByRelationshipId.get(relationshipId);
  if (!support) return [];
  return support.evidenceIds
    .map((id) => evidenceById.get(id))
    .filter((e): e is EvidenceItem => e !== undefined);
}

/** Get evidence items linked to a specific finding. */
export async function getEvidenceForFinding(findingId: string): Promise<EvidenceItem[]> {
  await delay(100);
  return (mockEvidenceByFindingId.get(findingId) ?? [])
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}

/** Get evidence items linked to a specific event. */
export async function getEvidenceForEvent(eventId: string): Promise<EvidenceItem[]> {
  await delay(100);
  return (mockEvidenceByEventId.get(eventId) ?? [])
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}

/** Get evidence provenance chain for an item. */
export async function getEvidenceProvenance(id: string): Promise<EvidenceItem['provenance']> {
  await delay(80);
  const item = evidenceById.get(id);
  if (!item) throw new Error(`Evidence not found: ${id}`);
  return item.provenance;
}

/** Get evidence coverage for a target (entity, relationship, finding, event, network). */
export async function getEvidenceCoverage(targetId: string): Promise<EvidenceCoverage | undefined> {
  await delay(100);
  return mockEvidenceCoverage.find((c) => c.targetId === targetId);
}

/** Get all evidence coverage for an investigation. */
export async function getInvestigationEvidenceCoverage(investigationId: string): Promise<EvidenceCoverage[]> {
  await delay(120);
  const invEvidence = evidenceItems.filter((e) => e.investigationId === investigationId);
  const targetIds = new Set<string>();
  for (const e of invEvidence) {
    for (const l of e.links) {
      if (l.targetType === 'entity' || l.targetType === 'finding' || l.targetType === 'event') {
        targetIds.add(l.targetId);
      }
    }
  }
  return mockEvidenceCoverage.filter((c) => targetIds.has(c.targetId));
}

/** Get relationship evidence support. */
export async function getRelationshipEvidenceSupport(relationshipId: string): Promise<RelationshipEvidenceSupport | undefined> {
  await delay(80);
  return mockEvidenceByRelationshipId.get(relationshipId);
}

/** Get all relationship evidence support for an investigation. */
export async function getAllRelationshipEvidenceSupport(investigationId: string): Promise<RelationshipEvidenceSupport[]> {
  await delay(120);
  const invItemIds = new Set(
    evidenceItems.filter((e) => e.investigationId === investigationId).map((e) => e.id)
  );
  return mockRelationshipEvidenceSupport.filter((r) =>
    r.evidenceIds.some((id) => invItemIds.has(id))
  );
}

/** Get finding evidence support. */
export async function getFindingEvidenceSupport(findingId: string): Promise<FindingEvidenceSupport | undefined> {
  await delay(80);
  return mockFindingEvidenceSupport.find((f) => f.findingId === findingId);
}

/** Get all finding evidence support for an investigation. */
export async function getAllFindingEvidenceSupport(investigationId: string): Promise<FindingEvidenceSupport[]> {
  await delay(120);
  return mockFindingEvidenceSupport;
}

/** Get event evidence support. */
export async function getEventEvidenceSupport(eventId: string): Promise<EventEvidenceSupport | undefined> {
  await delay(80);
  return mockEventEvidenceSupport.find((e) => e.eventId === eventId);
}

/** Get entity evidence summary. */
export async function getEntityEvidenceSummary(entityId: string): Promise<EntityEvidenceSummary | undefined> {
  await delay(80);
  return mockEntityEvidenceSummaries.find((s) => s.entityId === entityId);
}

/** Get evidence collections for an investigation. */
export async function getEvidenceCollections(investigationId: string): Promise<EvidenceCollection[]> {
  await delay(100);
  return collections.filter((c) => c.investigationId === investigationId);
}

/** Search evidence across an investigation (deterministic mock). */
export async function searchEvidence(params: EvidenceSearchParams = {}): Promise<EvidenceSearchResult> {
  return listEvidence(params);
}

/** Grounded evidence retrieval for AI context. */
export async function retrieveEvidence(params: EvidenceRetrievalParams): Promise<EvidenceRetrievalResult> {
  await delay(200);
  const budget = {
    ...mockEvidenceRetrievalBudget,
    ...params.budget,
  };

  const filtered = evidenceItems.filter((e) => {
    if (e.investigationId !== params.investigationId) return false;
    if (params.query) {
      const q = params.query.toLowerCase();
      const searchable = [e.title, e.description, e.sourceName, ...e.tags].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  let sources = filtered.map(toSource);

  if (params.scope.entityIds?.length) {
    sources = sources.filter((s) =>
      s.entityIds.some((id) => params.scope.entityIds!.includes(id))
    );
  }
  if (params.scope.findingIds?.length) {
    sources = sources.filter((s) =>
      s.findingIds.some((id) => params.scope.findingIds!.includes(id))
    );
  }
  if (params.scope.eventIds?.length) {
    sources = sources.filter((s) =>
      s.eventIds.some((id) => params.scope.eventIds!.includes(id))
    );
  }

  const truncated = sources.length > budget.maxEvidenceItems;
  const items = sources.slice(0, budget.maxEvidenceItems);

  const entityIds = new Set<string>();
  const findingIds = new Set<string>();
  const eventIds = new Set<string>();
  const relationshipIds = new Set<string>();

  for (const item of items) {
    for (const id of item.entityIds) entityIds.add(id);
    for (const id of item.findingIds) findingIds.add(id);
    for (const id of item.eventIds) eventIds.add(id);
  }

  const fullItems = items
    .map((s) => evidenceById.get(s.id))
    .filter((e): e is EvidenceItem => e !== undefined);
  for (const e of fullItems) {
    for (const l of e.links) {
      if (l.targetType === 'relationship') relationshipIds.add(l.targetId);
    }
  }

  return {
    evidence: items,
    entities: Array.from(entityIds).slice(0, budget.maxLinkedEntities),
    relationships: Array.from(relationshipIds),
    findings: Array.from(findingIds).slice(0, budget.maxLinkedFindings),
    events: Array.from(eventIds),
    truncated,
    retrievalBudget: budget,
  };
}

export type {
  EvidenceItem,
  EvidenceSearchResult,
  EvidenceSearchParams,
  EvidenceSearchFilters,
  EvidenceSource,
  EvidenceCollection,
  EvidenceCoverage,
  RelationshipEvidenceSupport,
  FindingEvidenceSupport,
  EventEvidenceSupport,
  EntityEvidenceSummary,
  EvidenceRetrievalResult,
  EvidenceRetrievalParams,
};
