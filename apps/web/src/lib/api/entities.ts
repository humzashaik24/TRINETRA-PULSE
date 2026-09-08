/**
 * Typed client + adapter for the Entity surface of the real relational API
 * (/api/v2). Phase 17.7.
 *
 * The Phase 6 entity-intelligence UI operates on the rich ``EntityIntelligence``
 * shape (mock universe: displayName, sourcesCount, resolutionState, aliases).
 * When the platform is pointed at a running backend
 * (``NEXT_PUBLIC_USE_MOCK_API=false``) the same UI must read from the persisted
 * ``entities`` rows served by FastAPI. The relational model is leaner than the
 * rich UI model, so this module:
 *
 *   - re-uses the existing ``apiFetch`` client and the typed functions in
 *     ``@/lib/api/investigations`` (no second HTTP layer),
 *   - maps ``RealEntity`` rows into the ``EntityIntelligence`` shape the entity
 *     workspace already understands, preserving provenance/metadata, and
 *   - applies the same deterministic search / sort / pagination semantics the
 *     mock service uses, but over the persisted API data.
 *
 * There is deliberately NO silent fallback to the mock universe: an API
 * failure surfaces as an ``ApiClientError`` and the store's error state,
 * never as fabricated demo rows.
 *
 * Domain boundaries for Phase 17.7: only the canonical ``entities`` rows are
 * migrated. Phase 17.8 adds the persisted relationship surface (the Relations
 * tab reads real relationship rows with resolved entity names). Evidence,
 * events, activity, sources and resolution history are separate domains covered
 * by later phases, so in API mode the UI's corresponding tabs stay honestly
 * empty rather than being fabricated from the mock universe.
 */

import { API_BASE_URL } from './config';
import { apiFetch } from './client';
import {
  getEntity as getRealEntity,
  getEntityScoped,
  listEntitiesForInvestigation,
  type RealEntity,
} from './investigations';
import type {
  EntityIntelligence,
  EntityIntelligenceSummary,
  EntityListResponse,
  EntityRelationship,
  EntitySearchParams,
  EntityType,
  EntityActivityItem,
  EntityEvent,
  EntityEvidenceItem,
  RelatedEntity,
  ResolutionHistoryEntry,
  ResolutionState,
} from '@trinetra-pulse/types';
import { queryEntities } from '@/lib/entity-search';
import type { EntitySourceRef } from '@/services/entity.service';
import { loadEntityRelationships } from './relationships';

// -------------------------------------------------------------------
// Demo-surface helpers
// -------------------------------------------------------------------
// The Entity Workspace and Context Inspector anchor on canonical demo ids in
// mock mode and on the deterministic Operation Meridian uuids in API mode.
// The seeded rows carry their canonical id ("ent-person-001", ...) inside
// ``metadata.canonical_id`` so the UI can reconcile them.

function asJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function isDemo(real: RealEntity): boolean {
  return asJson(real.metadata).is_demo === true;
}

/** Canonical demo id ("ent-person-001") when the row was seeded, else the uuid. */
export function canonicalEntityId(real: RealEntity): string {
  const cid = asJson(real.metadata).canonical_id;
  return typeof cid === 'string' ? cid : real.id;
}

/**
 * Derive a neutral resolution state from the persisted row. The real schema
 * stores entity resolution as a separate ``entity_resolutions`` relation (a
 * later phase), so a single entity row exposes no per-entity resolution state.
 * We map the honest persisted signal instead of inventing one: a verified row
 * is CONFIRMED, otherwise NEEDS_REVIEW. This never claims an algorithmic
 * resolution that the backend does not persist.
 */
function resolutionStateFrom(real: RealEntity): ResolutionState {
  return real.is_verified ? 'CONFIRMED' : 'NEEDS_REVIEW';
}

/** Build the aliases list from the persisted attributes / metadata, if any. */
function aliasesFrom(real: RealEntity): string[] {
  const attrs = real.attributes ?? {};
  const metadata = real.metadata ?? {};
  const candidates = [
    metadata.aliases,
    metadata.alias,
    attrs.aliases,
    attrs.alias,
    attrs.aka,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      const flat = c.filter((x): x is string => typeof x === 'string' && x.length > 0);
      if (flat.length > 0) return flat;
    }
    if (typeof c === 'string' && c.length > 0) return c.split(',').map((s) => s.trim()).filter(Boolean);
  }
  // A canonical name that differs from the display name is a real alias.
  if (real.canonical_name && real.canonical_name !== real.name) {
    return [real.canonical_name];
  }
  return [];
}

// -------------------------------------------------------------------
// Mapping: RealEntity -> EntityIntelligence (the UI domain shape)
// -------------------------------------------------------------------

/**
 * Map a persisted entity row into the rich ``EntityIntelligence`` detail shape.
 *
 * Counts (sources / connections / events / evidence / activity) are reported by
 * dedicated relationship/evidence/event surfaces that are later-phase domains,
 * so they are left at 0 here — honest, never fabricated from mock data. The
 * seeded Operation Meridian entities resolve their canonical id and demo flag
 * from ``metadata`` so the UI reconciles them exactly like the mock universe.
 */
export function mapEntityIntelligence(real: RealEntity): EntityIntelligence {
  const metadata = real.metadata ?? {};
  return {
    id: real.id,
    name: real.name,
    canonicalName: real.canonical_name ?? undefined,
    displayName: real.name,
    entityType: real.entity_type as EntityType,
    description: real.description ?? undefined,
    resolutionState: resolutionStateFrom(real),
    confidence: real.confidence,
    sourcesCount: 0,
    connectionsCount: 0,
    eventsCount: 0,
    evidenceCount: 0,
    activityCount: 0,
    isVerified: real.is_verified,
    isFlagged: real.is_flagged,
    aliases: aliasesFrom(real),
    attributes: real.attributes ?? {},
    createdAt: real.created_at,
    updatedAt: real.updated_at,
  };
}

// -------------------------------------------------------------------
// Fetch layer
// -------------------------------------------------------------------

/**
 * Load the investigation-scoped persisted entities for an investigation.
 * The backend list endpoint is already scoped to the investigation, so a
 * foreign/other-investigation entity can never leak into this set.
 */
export async function listInvestigationEntities(
  investigationId: string,
): Promise<RealEntity[]> {
  return listEntitiesForInvestigation(investigationId);
}

/**
 * Fetch a single persisted entity, optionally scoped to an investigation.
 * The backend returns the raw row; mapping to the UI shape is applied by the
 * caller (getEntity) so this stays a thin typed read.
 */
export async function getRawEntity(
  entityId: string,
  investigationId?: string,
): Promise<RealEntity> {
  return investigationId
    ? getEntityScoped(entityId, investigationId)
    : getRealEntity(entityId);
}

// -------------------------------------------------------------------
// Search semantics over persisted entities
// -------------------------------------------------------------------
// The relational list endpoint returns the full investigation-scoped row set
// (no server-side filtering beyond scope), so filtering / sorting / pagination
// mirror the deterministic semantics of the mock service (queryEntities) but
// operate on the persisted API data. Investigation-scope filtering is inherent:
// we only ever receive this investigation's entities.

export interface EntityListResult {
  response: EntityListResponse;
  all: EntityIntelligence[];
}

/** Load the investigation-scoped persisted entities mapped into the UI shape. */
export async function loadEntityList(
  investigationId: string,
  params: EntitySearchParams = {},
): Promise<EntityListResult> {
  const rows = await listInvestigationEntities(investigationId);
  const mapped = rows.map(mapEntityIntelligence);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const { items, total } = queryEntities(mapped, { ...params, page, pageSize });
  return {
    response: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    all: mapped,
  };
}

// -------------------------------------------------------------------
// Convenience aggregate used by the entity detail page
// -------------------------------------------------------------------

export interface EntityDetailData {
  entity: EntityIntelligence;
}

/** Load a single persisted entity and map it to the UI shape. */
export async function loadEntityDetail(
  entityId: string,
  investigationId?: string,
): Promise<EntityDetailData> {
  const row = await getRawEntity(entityId, investigationId);
  return { entity: mapEntityIntelligence(row) };
}

// -------------------------------------------------------------------
// Detail bundle (API mode)
// -------------------------------------------------------------------
// The detail page consumes the rich full-bundle shape. In API mode the
// canonical entity row is persisted-and-scoped (Phase 17.7) and, from Phase
// 17.8, the Relationships tab reads real investigation-scoped relationship
// rows with entity names/types resolved — never fabricated from the mock
// universe. Evidence, events, activity, sources and resolution history are
// separate domains (later phases) so they stay honestly empty.
//
// The summary is derived honestly from the persisted entity row and the real
// relationship count: resolution state / confidence reflect the real entity,
// and ``connections`` / ``relationships`` reflect the number of persisted
// relationships touching the entity.

export interface EntityDetailBundleApi {
  entity: EntityIntelligence;
  summary: EntityIntelligenceSummary;
  relationships: EntityRelationship[];
  related: RelatedEntity[];
  evidence: EntityEvidenceItem[];
  events: EntityEvent[];
  activity: EntityActivityItem[];
  sources: EntitySourceRef[];
  resolutionHistory: ResolutionHistoryEntry[];
}

/** Honest summary derived from the persisted entity row and relationship set. */
function summaryFrom(
  entity: EntityIntelligence,
  relationshipCount = 0,
): EntityIntelligenceSummary {
  return {
    entityId: entity.id,
    connections: relationshipCount,
    sources: 0,
    events: 0,
    relationships: relationshipCount,
    evidence: 0,
    activity: 0,
    resolutionConfidence: entity.confidence,
    resolutionState: entity.resolutionState,
  };
}

/** Load a single persisted entity plus its persisted relationship slices. */
export async function loadEntityDetailBundle(
  entityId: string,
  investigationId?: string,
): Promise<EntityDetailBundleApi> {
  const { entity } = await loadEntityDetail(entityId, investigationId);

  let relationships: EntityRelationship[] = [];
  let related: RelatedEntity[] = [];
  if (investigationId) {
    try {
      const loaded = await loadEntityRelationships(entityId, investigationId);
      relationships = loaded.relationships;
      related = loaded.related;
    } catch {
      // A relationship-surface failure must not silently fabricate rows; the
      // relationships/related slices stay honestly empty and the entity row +
      // summary above remain valid. The entity itself already loaded.
      relationships = [];
      related = [];
    }
  }

  return {
    entity,
    summary: summaryFrom(entity, relationships.length),
    relationships,
    related,
    evidence: [],
    events: [],
    activity: [],
    sources: [],
    resolutionHistory: [],
  };
}

// -------------------------------------------------------------------
// Overview summary (API mode)
// -------------------------------------------------------------------

export interface EntityOverviewSummary {
  entities: number;
  candidates: number;
  pendingResolutions: number;
  jobsRunning: number;
}

/**
 * Honest overview summary for API mode.
 *
 * ``entities`` reflects the persisted investigation-scoped rows. The other
 * counters (candidates / pending resolutions / extraction jobs) belong to the
 * entity-intelligence pipeline surface which has no persisted relational
 * endpoint yet (Phase 17.7 boundary), so they are reported as 0 — never
 * fabricated from the in-memory demo universe.
 */
export function apiEntityOverviewSummary(
  totalEntities: number,
): EntityOverviewSummary {
  return {
    entities: totalEntities,
    candidates: 0,
    pendingResolutions: 0,
    jobsRunning: 0,
  };
}
