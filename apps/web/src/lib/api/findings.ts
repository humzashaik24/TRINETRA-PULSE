/**
 * Typed client + adapter for the Finding surface of the real relational API
 * (/api/v2). Phase 17.9.
 *
 * The investigation workspace and Context Inspector operate on the rich
 * ``InvestigationFinding`` / ``InspectorFindingView`` shapes (mock universe).
 * When the platform is pointed at a running backend
 * (``NEXT_PUBLIC_USE_MOCK_API=false``) the same surfaces must read from the
 * persisted ``findings`` rows (and the scoped findings list) served by
 * FastAPI. This module:
 *
 *   - re-uses the existing ``apiFetch`` client and the typed functions in
 *     ``@/lib/api/investigations`` (no second HTTP layer),
 *   - maps a ``RealFinding`` row into a detail shape the inspector can render
 *     directly, resolving ``entity_refs`` names/types from the
 *     investigation-scoped entity rows, and
 *   - applies deterministic, documented translations for the persisted
 *     vocabularies (severity / confidence) onto the UI unions.
 *
 * There is deliberately NO silent fallback to the mock universe: an API
 * failure surfaces as an ``ApiClientError`` and the caller's error state,
 * never as fabricated demo rows. Discovery (list), creation (POST /findings)
 * and workspace wiring already migrated in Phase 14.2/17.4; this module adds
 * the scoped reading half for finding *detail* (Phase 17.9).
 */

import {
  getEntity,
  getFinding,
  getFindingScoped,
  listEntitiesForInvestigation,
  type RealEntity,
  type RealFinding,
} from './investigations';

// -------------------------------------------------------------------
// Vocabulary translation (deterministic + documented)
// -------------------------------------------------------------------
// The persisted ``findings`` model uses coarse enums:
//   - severity: info, low, medium, high, critical
//   - confidence: observed, inferred, analytical, unknown
// The inspector finding view expects a numeric confidence plus the persisted
// severity string. Unknown values fall back to neutral members — never mock.

const FINDING_CONFIDENCE: Record<string, number> = {
  observed: 0.9,
  analytical: 0.8,
  inferred: 0.6,
  unknown: 0.4,
};

/** Numeric confidence for a persisted finding ``confidence`` value. */
export function findingConfidenceFrom(
  persisted: string | null | undefined,
): number {
  const key = (persisted ?? '').toLowerCase();
  return FINDING_CONFIDENCE[key] ?? 0.5;
}

/** UI category for a persisted finding ``severity`` (lower-cased). */
export function findingCategoryFrom(severity: string | null | undefined): string {
  return (severity ?? 'info').toLowerCase();
}

function asJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Deterministic source label for a persisted finding: prefers the persisted
 * ``metadata.source_type`` if present, else a neutral relational label.
 */
export function findingSourceFrom(finding: RealFinding): string {
  const sourceType = asJson(finding.metadata).source_type;
  return typeof sourceType === 'string' && sourceType.length > 0
    ? sourceType
    : 'Relational analysis';
}

/** Evidence ids referenced by a persisted finding (``metadata.evidence_ids``). */
export function findingEvidenceIdsFrom(finding: RealFinding): string[] {
  const ids = asJson(finding.metadata).evidence_ids;
  return Array.isArray(ids) ? ids.map((i) => String(i)) : [];
}

// -------------------------------------------------------------------
// Mapping: RealFinding -> inspector finding detail
// -------------------------------------------------------------------

export interface ApiFindingDetail {
  kind: 'finding';
  id: string;
  title: string;
  description: string | null;
  /** UI category derived from the persisted severity. */
  type: string;
  /** Numeric confidence derived from the persisted confidence enum. */
  confidence: number;
  severity: string;
  source: string;
  timestamp: string;
  entities: { id: string; name: string; type: string }[];
  investigationId?: string;
  evidenceIds: string[];
}

function entityTypeOf(row: RealEntity | undefined): string {
  return row?.entity_type ?? 'unknown';
}

/** Map a persisted finding row into the inspector finding detail shape. */
export function mapApiFinding(
  finding: RealFinding,
  entityById: ReadonlyMap<string, RealEntity>,
): ApiFindingDetail {
  return {
    kind: 'finding',
    id: finding.id,
    title: finding.title,
    description: finding.description,
    type: findingCategoryFrom(finding.severity),
    confidence: findingConfidenceFrom(finding.confidence),
    severity: (finding.severity ?? 'info').toLowerCase(),
    source: findingSourceFrom(finding),
    timestamp: finding.created_at,
    entities: (finding.entity_refs ?? []).map((ref) => {
      const row = entityById.get(ref);
      return {
        id: ref,
        name: row?.name ?? ref,
        type: entityTypeOf(row),
      };
    }),
    investigationId: finding.investigation_id,
    evidenceIds: findingEvidenceIdsFrom(finding),
  };
}

// -------------------------------------------------------------------
// Fetch layer
// -------------------------------------------------------------------

/**
 * Load a single persisted finding mapped into the inspector shape, resolving
 * the referenced entities via investigation-scoped entity reads.
 */
export async function loadFindingDetail(
  findingId: string,
  investigationId?: string,
): Promise<ApiFindingDetail> {
  const row = investigationId
    ? await getFindingScoped(findingId, investigationId)
    : await getFinding(findingId);

  const refs = row.entity_refs ?? [];
  const entityById: Map<string, RealEntity> = new Map();
  if (investigationId) {
    (await listEntitiesForInvestigation(investigationId)).forEach((e) =>
      entityById.set(e.id, e),
    );
  } else {
    const rows = await Promise.all(refs.map((ref) => getEntity(ref)));
    rows.forEach((e) => entityById.set(e.id, e));
  }

  return mapApiFinding(row, entityById);
}