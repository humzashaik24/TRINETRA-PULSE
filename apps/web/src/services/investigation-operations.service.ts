import type {
  Investigation,
  InvestigationCreate,
  InvestigationReadiness,
  InvestigationHealth,
  InvestigationPipeline,
  ReviewItem,
  InvestigationActivityLog,
  SavedInvestigationView,
  SaveViewInput,
  GraphBookmark,
  SaveGraphBookmarkInput,
  TimelineBookmark,
  SaveTimelineBookmarkInput,
  CrossReference,
  ProvenanceChain,
  InvestigationSearchResult,
  InvestigationSearchKind,
} from '@trinetra-pulse/types';
import {
  mockReadinessByInvestigation,
  mockHealthByInvestigation,
  mockPipelineByInvestigation,
  mockReviewByInvestigation,
  mockActivityByInvestigation,
  mockSavedViewsByInvestigation,
  mockGraphBookmarksByInvestigation,
  mockTimelineBookmarksByInvestigation,
  mockCrossReferencesByInvestigation,
  mockProvenanceByInvestigation,
  mockSearchByInvestigation,
} from '@/mock/investigation-operations';
import { mockInvestigationRecords, mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 11 — INVESTIGATION OPERATIONS SERVICE (mock-backed)
// ============================================================
// The operational shell around the existing investigation service:
// readiness, health, pipeline, review queue, activity log, saved
// (non-mutating) views, graph/timeline bookmarks, cross-references and
// provenance chains. Every function is scoped to an investigation id.
//
// Like the Phase 9 service, values are deterministic mock data and go
// through a small latency window so they can be swapped for the REST
// endpoints (GET /investigations/:id/...) without UI changes.
//
// Data linking: the mock data references the REAL canonical mock ids
// (ent-*, rel-*, ev-*) and the Phase 9 investigation record, so the
// operations surface never exposes unrelated investigations.
// ============================================================

const LATENCY = 120;
const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const now = () => new Date().toISOString();

const requireInvestigation = (id: string) => {
  const rec = mockInvestigationById.get(id);
  if (!rec) throw new Error(`Investigation not found: ${id}`);
  return rec;
};

// Deterministic session store for investigator-created saved views /
// bookmarks (resets to the seeded mock set on reload).
const seededSavedViews = new Map<string, SavedInvestigationView[]>(
  Object.entries(mockSavedViewsByInvestigation)
);
const seededGraphBookmarks = new Map<string, GraphBookmark[]>(
  Object.entries(mockGraphBookmarksByInvestigation)
);
const seededTimelineBookmarks = new Map<string, TimelineBookmark[]>(
  Object.entries(mockTimelineBookmarksByInvestigation)
);

// ------------------------------------------------------------
// Demo mode awareness
// ------------------------------------------------------------
// The web build is sealed as demo: every investigation record carries
// is_mock provenance on linked evidence and the seeded operations data
// is deterministic mock. `isDemoMode()` describes the environment so
// the UI can show a subtle "DEMO DATA" indicator without pretending
// the data is live.

export function isDemoMode(): boolean {
  return true;
}

// ------------------------------------------------------------
// Readiness
// ------------------------------------------------------------

export async function getReadiness(investigationId: string): Promise<InvestigationReadiness> {
  await delay(80);
  requireInvestigation(investigationId);
  return mockReadinessByInvestigation[investigationId] ?? fallbackReadiness(investigationId);
}

const fallbackReadiness = (investigationId: string): InvestigationReadiness => ({
  investigationId,
  overall: 'not_started',
  nextRecommendedAction: null,
  items: [
    { key: 'data', label: 'Data', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'datasets', label: 'Datasets', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'entities', label: 'Entities', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'relationships', label: 'Relationships', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'evidence', label: 'Evidence', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'findings', label: 'Findings', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'network', label: 'Network', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'analytics', label: 'Analytics', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'timeline', label: 'Timeline', level: 'not_started', detail: null, warningCount: 0 },
    { key: 'ai', label: 'AI', level: 'not_started', detail: null, warningCount: 0 },
  ],
});

// ------------------------------------------------------------
// Health
// ------------------------------------------------------------

export async function getHealth(investigationId: string): Promise<InvestigationHealth> {
  await delay(80);
  requireInvestigation(investigationId);
  const health =
    mockHealthByInvestigation[investigationId] ??
    ({
      investigationId,
      computedAt: now(),
      openReviewCount: 0,
      metrics: [],
    } satisfies InvestigationHealth);
  return health;
}

// ------------------------------------------------------------
// Pipeline
// ------------------------------------------------------------

export async function getPipeline(investigationId: string): Promise<InvestigationPipeline> {
  await delay(80);
  requireInvestigation(investigationId);
  return (
    mockPipelineByInvestigation[investigationId] ??
    fallbackPipeline(investigationId)
  );
}

const fallbackPipeline = (investigationId: string): InvestigationPipeline => ({
  investigationId,
  currentStage: 'data',
  progress: 0,
  completedStages: [],
  needReview: [],
  nextRecommendedAction: null,
  stages: [
    { stage: 'data', label: 'Data', description: 'Ingest and validate datasets', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/data-intelligence' },
    { stage: 'extraction', label: 'Extraction', description: 'Extract entities from sources', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
    { stage: 'resolution', label: 'Resolution', description: 'Resolve duplicate entities', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/entity-intelligence' },
    { stage: 'relationships', label: 'Relationships', description: 'Build relationship links', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/networks' },
    { stage: 'network', label: 'Network', description: 'Generate the network graph', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/networks' },
    { stage: 'analytics', label: 'Analytics', description: 'Compute network analytics', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/analytics' },
    { stage: 'evidence', label: 'Evidence', description: 'Link evidence items', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/evidence' },
    { stage: 'findings', label: 'Findings', description: 'Record analytical findings', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/findings' },
    { stage: 'timeline', label: 'Timeline', description: 'Aggregate the event timeline', status: 'NOT_STARTED', startedAt: null, completedAt: null, count: null, warningCount: 0, errorCount: 0, targetWorkspace: '/timeline' },
  ],
});

// ------------------------------------------------------------
// Review queue
// ------------------------------------------------------------

export async function getReviewQueue(investigationId: string): Promise<ReviewItem[]> {
  await delay(80);
  requireInvestigation(investigationId);
  return mockReviewByInvestigation[investigationId] ?? [];
}

// ------------------------------------------------------------
// Activity log
// ------------------------------------------------------------

export async function getActivity(
  investigationId: string
): Promise<InvestigationActivityLog[]> {
  await delay(80);
  requireInvestigation(investigationId);
  const items = mockActivityByInvestigation[investigationId] ?? [];
  return [...items].sort((a, b) => (a.at < b.at ? 1 : -1));
}

// ------------------------------------------------------------
// Saved views (non-mutating workspace views)
// ------------------------------------------------------------

export async function getSavedViews(
  investigationId: string
): Promise<SavedInvestigationView[]> {
  await delay(60);
  return [...(seededSavedViews.get(investigationId) ?? [])];
}

export async function saveView(
  investigationId: string,
  input: SaveViewInput
): Promise<SavedInvestigationView> {
  await delay();
  const view: SavedInvestigationView = {
    id: `sav-${investigationId}-${Date.now()}`,
    investigationId,
    name: input.name,
    description: input.description ?? null,
    networkFilters: input.networkFilters ?? {},
    timelineRange: input.timelineRange ?? { from: null, to: null },
    selectedEntities: input.selectedEntities ?? [],
    analyticsScope: input.analyticsScope ?? {},
    createdAt: now(),
  };
  const list = seededSavedViews.get(investigationId) ?? [];
  list.unshift(view);
  seededSavedViews.set(investigationId, list);
  return view;
}

export async function deleteView(
  investigationId: string,
  viewId: string
): Promise<void> {
  await delay(60);
  const list = seededSavedViews.get(investigationId) ?? [];
  seededSavedViews.set(
    investigationId,
    list.filter((v) => v.id !== viewId)
  );
}

// ------------------------------------------------------------
// Bookmarks
// ------------------------------------------------------------

export async function getGraphBookmarks(
  investigationId: string
): Promise<GraphBookmark[]> {
  await delay(60);
  return [...(seededGraphBookmarks.get(investigationId) ?? [])];
}

export async function saveGraphBookmark(
  investigationId: string,
  input: SaveGraphBookmarkInput
): Promise<GraphBookmark> {
  await delay();
  const bookmark: GraphBookmark = {
    id: `gbm-${investigationId}-${Date.now()}`,
    investigationId,
    networkId: input.networkId,
    label: input.label,
    entityIds: input.entityIds,
    relationshipIds: input.relationshipIds,
    createdAt: now(),
  };
  const list = seededGraphBookmarks.get(investigationId) ?? [];
  list.unshift(bookmark);
  seededGraphBookmarks.set(investigationId, list);
  return bookmark;
}

export async function deleteGraphBookmark(
  investigationId: string,
  bookmarkId: string
): Promise<void> {
  await delay(60);
  const list = seededGraphBookmarks.get(investigationId) ?? [];
  seededGraphBookmarks.set(
    investigationId,
    list.filter((b) => b.id !== bookmarkId)
  );
}

export async function getTimelineBookmarks(
  investigationId: string
): Promise<TimelineBookmark[]> {
  await delay(60);
  return [...(seededTimelineBookmarks.get(investigationId) ?? [])];
}

export async function saveTimelineBookmark(
  investigationId: string,
  input: SaveTimelineBookmarkInput
): Promise<TimelineBookmark> {
  await delay();
  const bookmark: TimelineBookmark = {
    id: `tbm-${investigationId}-${Date.now()}`,
    investigationId,
    label: input.label,
    start: input.start ?? null,
    end: input.end ?? null,
    filters: input.filters ?? {},
    createdAt: now(),
  };
  const list = seededTimelineBookmarks.get(investigationId) ?? [];
  list.unshift(bookmark);
  seededTimelineBookmarks.set(investigationId, list);
  return bookmark;
}

export async function deleteTimelineBookmark(
  investigationId: string,
  bookmarkId: string
): Promise<void> {
  await delay(60);
  const list = seededTimelineBookmarks.get(investigationId) ?? [];
  seededTimelineBookmarks.set(
    investigationId,
    list.filter((b) => b.id !== bookmarkId)
  );
}

// ------------------------------------------------------------
// Cross references & provenance
// ------------------------------------------------------------

export async function getCrossReferences(
  investigationId: string,
  entityId?: string
): Promise<CrossReference[]> {
  await delay(80);
  requireInvestigation(investigationId);
  const refs = mockCrossReferencesByInvestigation[investigationId] ?? [];
  if (entityId) {
    return refs.filter((r) => r.entity.id === entityId);
  }
  return refs;
}

export async function getProvenance(
  investigationId: string,
  targetId?: string
): Promise<ProvenanceChain[]> {
  await delay(80);
  requireInvestigation(investigationId);
  const chains = mockProvenanceByInvestigation[investigationId] ?? [];
  if (targetId) {
    return chains.filter((c) => c.targetId === targetId || c.nodes.some((n) => n.id === targetId));
  }
  return chains;
}

// ------------------------------------------------------------
// Investigation-scoped search
// ------------------------------------------------------------

export async function searchInvestigation(
  investigationId: string,
  query: string
): Promise<InvestigationSearchResult[]> {
  await delay(60);
  requireInvestigation(investigationId);
  const pool = mockSearchByInvestigation[investigationId] ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter(
    (r) =>
      r.label.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.kind.toLowerCase().includes(q)
  );
}

export async function searchAcross(
  query: string,
  kind?: InvestigationSearchKind
): Promise<InvestigationSearchResult[]> {
  await delay(60);
  const q = query.trim().toLowerCase();
  const all = Object.values(mockSearchByInvestigation).flat();
  let results = all;
  if (kind) results = results.filter((r) => r.kind === kind);
  if (q) {
    results = results.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }
  return results;
}

// ------------------------------------------------------------
// Investigation creation (delegates to Phase 9 create flow)
// ------------------------------------------------------------

export async function createInvestigationFromSetup(
  input: {
    title: string;
    description?: string;
    referenceNumber?: string;
    priority?: Investigation['priority'];
    status?: Investigation['status'];
    startDate?: string;
    tags?: string[];
    jurisdiction?: string;
    investigator?: string;
    department?: string;
  }
): Promise<Investigation> {
  await delay();
  const { createInvestigation } = await import('@/services/investigation.service');
  const created = await createInvestigation({
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: input.status,
    lead_investigator: input.investigator,
    assigned: input.investigator ? [input.investigator] : [],
    tags: input.tags,
  });
  logSessionActivity(created.id, input.investigator ?? 'Unassigned');
  return created;
}

// Session-scoped activity append (non-destructive to the seeded set).
let sessionActivity: Record<string, InvestigationActivityLog[]> = {};

function logSessionActivity(investigationId: string, actor: string) {
  const entry: InvestigationActivityLog = {
    id: `fact-${investigationId}-${Date.now()}`,
    investigationId,
    action: 'created_investigation',
    label: 'Created investigation',
    detail: 'Investigation created from the setup flow.',
    at: now(),
    actor,
  };
  sessionActivity[investigationId] = [...(sessionActivity[investigationId] ?? []), entry];
}

export { mockInvestigationRecords };
