/**
 * Typed client + adapter for the Relationship surface of the real relational
 * API (/api/v2). Phase 17.8.
 *
 * The Phase 0-compatible entity-intelligence UI operates on the rich
 * ``EntityRelationship`` shape (camelCase, resident entity names). When the
 * platform is pointed at a running backend (``NEXT_PUBLIC_USE_MOCK_API=false``)
 * the same UI must read from the persisted ``relationships`` rows served by
 * FastAPI. The relational model is leaner than the rich UI model, so this
 * module:
 *
 *   - re-uses the existing ``apiFetch`` client and the typed functions in
 *     ``@/lib/api/investigations`` (no second HTTP layer),
 *   - maps ``RealRelationship`` rows into the ``EntityRelationship`` shape the
 *     entity workspace already understands, resolving entity names/types from
 *     the investigation-scoped entity rows, and
 *   - applies deterministic, documented translations for the persisted
 *     vocabularies (relationship_type / verification_status / extraction_method)
 *     which are coarser than the UI unions.
 *
 * There is deliberately NO silent fallback to the mock universe: an API
 * failure surfaces as an ``ApiClientError`` and the caller's error state,
 * never as fabricated demo rows.
 *
 * Domain boundaries for Phase 17.8: only reading relationships is migrated
 * (scoped detail + investigation list). Relationship creation has no UI flow
 * or backend endpoint yet and stays deferred.
 */

import { API_BASE_URL } from './config';
import { apiFetch } from './client';
import {
  getEntity,
  getEntityScoped,
  getRelationship,
  getRelationshipScoped,
  listEntitiesForInvestigation,
  listRelationshipsForInvestigation,
  type RealEntity,
  type RealRelationship,
} from './investigations';
import type {
  EntityRelationship,
  EntityType,
  ExtractionMethod,
  RelatedEntity,
  RelationshipCandidateStatus,
  RelationshipKind,
} from '@trinetra-pulse/types';

// -------------------------------------------------------------------
// Vocabulary translation (deterministic + documented)
// -------------------------------------------------------------------
// The persisted ``relationships`` model uses its own vocabularies:
//   - relationship_type: known_associiate (sic), family, communicates,
//     transaction, located_at, owns, member_of, contacts, travels_with,
//     associated_with, other
//   - extraction_method: manual, ai_nlp, ai_cv, ai_audio, document_parse,
//     database_import, network_analysis, other
//   - verification_status: confirmed, probable, possible, rejected, needs_review
// The UI domain unions are coarser, so each persisted value maps to the
// closest honest member. Unknown values fall back to the neutral member —
// never to mock data.

function isPhoneOrDevice(...types: (string | undefined)[]): boolean {
  return types.some(
    (t) => t === 'phone' || t === 'device' || t === 'account' || t === 'vehicle',
  );
}

/** Map a persisted ``relationship_type`` to a ``RelationshipKind``. */
export function relationshipKindFrom(
  persisted: string,
  sourceEntityType?: string,
  targetEntityType?: string,
): RelationshipKind {
  // Entity-type-aware special cases: the seeded Operation Meridian links store
  // coarse types ("associated_with" for person↔device = USES) that the demo
  // universe surfaces as the richer kinds. Derived deterministically from
  // persisted fields only.
  if (persisted === 'associated_with') {
    return isPhoneOrDevice(sourceEntityType, targetEntityType) ? 'USES' : 'INVOLVED_IN';
  }
  if (persisted === 'other') {
    if (sourceEntityType === 'organization' || targetEntityType === 'organization') {
      return 'WORKS_FOR';
    }
    return 'PART_OF';
  }
  switch (persisted) {
    case 'known_associiate': // backend enum value (documented spelling)
    case 'known_associate':
    case 'family':
      return 'KNOWS';
    case 'communicates':
    case 'contacts':
      return 'USES';
    case 'transaction':
      return 'SENT_TRANSACTION';
    case 'located_at':
      return 'LOCATED_AT';
    case 'owns':
      return 'OWNS';
    case 'member_of':
      return 'PART_OF';
    case 'travels_with':
      return 'SUPPORTED_BY';
    default:
      return 'PART_OF';
  }
}

/** Map a persisted ``verification_status`` to a ``RelationshipCandidateStatus``. */
export function verificationStatusFrom(
  persisted: string | null | undefined,
): RelationshipCandidateStatus {
  switch (persisted) {
    case 'confirmed':
      return 'CONFIRMED';
    case 'probable':
      return 'PROBABLE';
    case 'possible': // the relationship union has no POSSIBLE member
      return 'CANDIDATE';
    case 'rejected':
      return 'REJECTED';
    case 'needs_review':
      return 'NEEDS_REVIEW';
    default:
      return 'NEEDS_REVIEW';
  }
}

/** Map a persisted ``extraction_method`` to an ``ExtractionMethod``. */
export function extractionMethodFrom(
  persisted: string | null | undefined,
): ExtractionMethod {
  switch (persisted) {
    case 'manual':
      return 'MANUAL';
    case 'ai_nlp':
      return 'NLP';
    case 'ai_cv':
    case 'ai_audio':
    case 'network_analysis':
      return 'ANALYTICAL';
    case 'document_parse':
      return 'RULE_BASED';
    case 'database_import':
      return 'STRUCTURED_MAPPING';
    default:
      return 'MANUAL';
  }
}

// -------------------------------------------------------------------
// Demo-surface helpers
// -------------------------------------------------------------------

function asJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/** Canonical demo id ("rel-001") when the row was seeded, else the uuid. */
export function canonicalRelationshipId(real: RealRelationship): string {
  const cid = asJson(real.metadata).canonical_id;
  return typeof cid === 'string' ? cid : real.id;
}

// -------------------------------------------------------------------
// Mapping: RealRelationship -> EntityRelationship
// -------------------------------------------------------------------

function entityTypeFrom(row: RealEntity | undefined): EntityType {
  const t = row?.entity_type;
  const ok: string[] = [
    'person',
    'phone',
    'vehicle',
    'location',
    'organization',
    'account',
    'transaction',
    'event',
    'case',
    'document',
  ];
  return t && ok.includes(t) ? (t as EntityType) : 'person';
}

/**
 * Map a persisted relationship row into the rich ``EntityRelationship`` shape,
 * resolving source/target names and types from the investigation-scoped entity
 * rows (the persisted row only stores uuids).
 */
export function mapApiRelationship(
  real: RealRelationship,
  entityById: ReadonlyMap<string, RealEntity>,
): EntityRelationship {
  const src = entityById.get(real.source_entity_id);
  const tgt = entityById.get(real.target_entity_id);
  const sourceEntityType = entityTypeFrom(src);
  const targetEntityType = entityTypeFrom(tgt);
  return {
    id: canonicalRelationshipId(real),
    sourceEntityId: real.source_entity_id,
    sourceEntityName: src?.name ?? real.source_entity_id,
    sourceEntityType,
    targetEntityId: real.target_entity_id,
    targetEntityName: tgt?.name ?? real.target_entity_id,
    targetEntityType,
    type: relationshipKindFrom(
      real.relationship_type,
      sourceEntityType,
      targetEntityType,
    ),
    confidence: real.confidence,
    source: real.source ?? 'Relational API',
    timestamp: real.created_at,
    evidence: real.evidence_refs ?? [],
    extractionMethod: extractionMethodFrom(real.extraction_method),
    verificationStatus: verificationStatusFrom(real.verification_status),
    metadata: real.metadata ?? {},
    createdAt: real.created_at,
  };
}

/** Derive the ``RelatedEntity`` list for an entity from its relationships. */
export function relatedFrom(
  relationships: EntityRelationship[],
  entityId: string,
): RelatedEntity[] {
  return relationships
    .filter((r) => r.sourceEntityId === entityId || r.targetEntityId === entityId)
    .map((r) => {
      const isSource = r.sourceEntityId === entityId;
      return {
        id: isSource ? r.targetEntityId : r.sourceEntityId,
        name: isSource ? r.targetEntityName : r.sourceEntityName,
        entityType: isSource ? r.targetEntityType : r.sourceEntityType,
        relationshipType: r.type,
        relationshipConfidence: r.confidence,
        verificationStatus: r.verificationStatus,
        source: r.source,
      };
    });
}

// -------------------------------------------------------------------
// Fetch layer
// -------------------------------------------------------------------

/** Load the persisted relationship rows for an investigation (already scoped). */
export async function listRelationshipRows(
  investigationId: string,
): Promise<RealRelationship[]> {
  return listRelationshipsForInvestigation(investigationId);
}

/** Load the investigation-scoped persisted entities as a name/type lookup. */
export async function loadInvestigationEntityLookup(
  investigationId: string,
): Promise<ReadonlyMap<string, RealEntity>> {
  const rows = await listEntitiesForInvestigation(investigationId);
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * Load a single persisted relationship mapped into the UI shape, resolving the
 * source/target entities via investigation-scoped detail reads.
 */
export async function loadRelationshipDetail(
  relationshipId: string,
  investigationId?: string,
): Promise<EntityRelationship> {
  const row = investigationId
    ? await getRelationshipScoped(relationshipId, investigationId)
    : await getRelationship(relationshipId);
  const [srcRow, tgtRow] = await Promise.all([
    investigationId
      ? getEntityScoped(row.source_entity_id, investigationId)
      : getEntity(row.source_entity_id),
    investigationId
      ? getEntityScoped(row.target_entity_id, investigationId)
      : getEntity(row.target_entity_id),
  ]);
  const lookup = new Map<string, RealEntity>([
    [srcRow.id, srcRow],
    [tgtRow.id, tgtRow],
  ]);
  return mapApiRelationship(row, lookup);
}

/**
 * Load the relationships touching an entity (scoped to an investigation),
 * mapped into the UI shape with resolved entity names, plus the derived
 * ``RelatedEntity`` list and the total relationship count for the entity.
 */
export async function loadEntityRelationships(
  entityId: string,
  investigationId: string,
): Promise<{ relationships: EntityRelationship[]; related: RelatedEntity[]; count: number }> {
  const [rows, entityById] = await Promise.all([
    listRelationshipRows(investigationId),
    loadInvestigationEntityLookup(investigationId),
  ]);
  const relationships = rows
    .filter((r) => r.source_entity_id === entityId || r.target_entity_id === entityId)
    .map((r) => mapApiRelationship(r, entityById))
    .sort((a, b) => b.confidence - a.confidence);
  return {
    relationships,
    related: relatedFrom(relationships, entityId),
    count: relationships.length,
  };
}