/**
 * Typed client + adapter for the Evidence Intelligence surface of the real
 * relational API (/api/v2). Phase 17.6.
 *
 * The Phase 12 evidence-intelligence UI operates on the rich ``EvidenceItem``
 * / ``EvidenceSource`` shapes (mock universe). When the platform is pointed
 * at a running backend (``NEXT_PUBLIC_USE_MOCK_API=false``) the same UI must
 * read from the persisted ``evidence`` rows served by FastAPI. The relational
 * model is leaner than the rich UI model, so this module:
 *
 *   - re-uses the existing ``apiFetch`` client (no second HTTP layer),
 *   - maps ``RealEvidence`` rows into the UI shapes the workspace already
 *     understands, preserving the SHA-256 ``integrity`` block (checksum +
 *     status), and
 *   - applies the same deterministic search / sort / pagination semantics the
 *     mock service uses, but over the persisted API data.
 *
 * There is deliberately NO silent fallback to the mock universe: an API
 * failure surfaces as an ``ApiClientError`` and the store's error state,
 * never as fabricated demo rows.
 */

import { API_BASE_URL } from './config';
import { apiFetch, apiFetchBlob } from './client';
import type {
  RealEvidence,
  RealEvidenceIntegrity,
} from './investigations';
import type {
  EvidenceAnalysis,
  EvidenceChainEntry,
  EvidenceChainVerification,
  EvidenceItem,
  EvidenceMetadata,
  EvidenceProvenance,
  EvidenceSearchFilters,
  EvidenceSearchParams,
  EvidenceSearchResult,
  EvidenceSource,
  EvidenceStatus,
  EvidenceType,
  ExtractionMethod,
  LocalTranscriptionSubmitPayload,
} from '@trinetra-pulse/types';

export async function uploadEvidence(
  file: File,
  investigationId: string,
  options: {
    title?: string;
    description?: string;
    source?: string;
    evidenceType?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<RealEvidence> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('investigation_id', investigationId);
  formData.append('evidence_type', options.evidenceType ?? 'DOCUMENT');
  if (options.title) formData.append('title', options.title);
  if (options.description) formData.append('description', options.description);
  if (options.source) formData.append('source', options.source);
  if (options.metadata) formData.append('metadata', JSON.stringify(options.metadata));
  return apiFetch<RealEvidence>(API_BASE_URL, '/evidence/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}

export async function downloadEvidence(
  evidenceId: string,
  investigationId?: string,
): Promise<Blob> {
  const scope = investigationId
    ? `?investigation_id=${encodeURIComponent(investigationId)}`
    : '';
  return apiFetchBlob(API_BASE_URL, `/evidence/${evidenceId}/download${scope}`);
}

// -------------------------------------------------------------------
// Fetch layer
// -------------------------------------------------------------------

/** Fetch a single persisted evidence row, optionally scoped to an
 *  investigation (the backend 404s when the scope does not match). */
export async function getEvidenceById(
  evidenceId: string,
  investigationId?: string,
): Promise<RealEvidence> {
  const query = investigationId
    ? `?investigation_id=${encodeURIComponent(investigationId)}`
    : '';
  return apiFetch<RealEvidence>(API_BASE_URL, `/evidence/${evidenceId}${query}`);
}

/** Fetch the SHA-256 integrity block {checksum, status} for an evidence row. */
export async function getEvidenceIntegrity(
  evidenceId: string,
): Promise<RealEvidenceIntegrity> {
  return apiFetch<RealEvidenceIntegrity>(
    API_BASE_URL,
    `/evidence/${evidenceId}/integrity`,
  );
}

// -------------------------------------------------------------------
// Phase 18.2 — custody chain fetch layer
// -------------------------------------------------------------------
// The chain endpoints are relational-only (the mock evidence universe has no
// chain). Scope every read to the active investigation: the backend 404s on
// cross-investigation matches, so there is no existence leak between cases.

function chainQuery(investigationId?: string): string {
  return investigationId
    ? `?investigation_id=${encodeURIComponent(investigationId)}`
    : '';
}

/** Fetch the ordered custody chain entries for an evidence item. */
export async function getEvidenceChain(
  evidenceId: string,
  investigationId?: string,
): Promise<EvidenceChainEntry[]> {
  return apiFetch<EvidenceChainEntry[]>(
    API_BASE_URL,
    `/evidence/${evidenceId}/chain${chainQuery(investigationId)}`,
  );
}

/** Verify a custody chain WITHOUT recording an audit event (read-only). */
export async function getEvidenceChainVerification(
  evidenceId: string,
  investigationId?: string,
): Promise<EvidenceChainVerification> {
  return apiFetch<EvidenceChainVerification>(
    API_BASE_URL,
    `/evidence/${evidenceId}/chain/verify${chainQuery(investigationId)}`,
  );
}

/** Verify a custody chain AND record the outcome in the auth audit trail. */
export async function recordEvidenceChainVerification(
  evidenceId: string,
  investigationId?: string,
): Promise<EvidenceChainVerification> {
  return apiFetch<EvidenceChainVerification>(
    API_BASE_URL,
    `/evidence/${evidenceId}/chain/verify${chainQuery(investigationId)}`,
    { method: 'POST' },
  );
}

// -------------------------------------------------------------------
// Phase 24 — multimedia evidence intelligence fetch layer
// -------------------------------------------------------------------
// Like the custody chain, analyses are relational-only: they are computed
// server-side (never in the browser) and read scope-locked to the active
// investigation so there is no cross-case leak. There is no mock analysis.

/** Fetch the persisted analysis history for an evidence item (newest first). */
export async function getEvidenceAnalyses(
  evidenceId: string,
  investigationId?: string,
): Promise<EvidenceAnalysis[]> {
  return apiFetch<EvidenceAnalysis[]>(
    API_BASE_URL,
    `/evidence/${evidenceId}/analyses${chainQuery(investigationId)}`,
  );
}

/** Run a new server-side analysis of the evidence payload. */
export async function analyzeEvidence(
  evidenceId: string,
  investigationId?: string,
): Promise<EvidenceAnalysis> {
  return apiFetch<EvidenceAnalysis>(
    API_BASE_URL,
    `/evidence/${evidenceId}/analyze${chainQuery(investigationId)}`,
    { method: 'POST' },
  );
}

// -------------------------------------------------------------------
// Phase 25 — local (on-device) transcription fetch layer
// -------------------------------------------------------------------
// The evidence payload is fetched through the existing AUTHENTICATED download
// endpoint (investigation-scoped, RBAC-enforced, SHA-256 verified, custody +
// audit recorded). There are NO public object-storage URLs and no credentials
// in the browser: the payload only arrives to the authorized client that is
// already scoped to the investigation. Inference happens on-device; the
// structured result is posted back to the backend which re-verifies the
// checksum and persists the LOCAL analysis row.

/** Authorized, scope-locked binary retrieval of the evidence payload. */
export async function getEvidenceContent(
  evidenceId: string,
  investigationId?: string,
): Promise<Blob> {
  return downloadEvidence(evidenceId, investigationId);
}

/** Submit a locally (on-device) transcribed AUDIO result for persistence. */
export async function submitLocalTranscription(
  evidenceId: string,
  payload: LocalTranscriptionSubmitPayload,
  investigationId?: string,
): Promise<EvidenceAnalysis> {
  return apiFetch<EvidenceAnalysis>(
    API_BASE_URL,
    `/evidence/${evidenceId}/analyses/local-transcription${chainQuery(investigationId)}`,
    { method: 'POST', body: payload },
  );
}

// -------------------------------------------------------------------
// Demo-surface helpers
// -------------------------------------------------------------------
// The Evidence Workspace and Context Inspector are demo surfaces: in mock mode
// they anchor on the canonical demo ids, and in API mode on the deterministic
// Operation Meridian ids seeded into the relational database.

/** Operation Meridian uuid (deterministic seed) for canonical ``inv-006``. */
export const OPERATION_MERIDIAN_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

/** Evidence uuid (deterministic seed) for canonical ``ev-001``. */
export const OPERATION_MERIDIAN_EVIDENCE_001 = 'c5c948b4-aeb7-5915-bd6e-5df573fed86c';

const DEFAULT_STATUS: EvidenceStatus = 'AVAILABLE';
const DEFAULT_EXTRACTION_METHOD: ExtractionMethod = 'MANUAL';

function asJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function confidenceFrom(real: RealEvidence): number {
  const raw = asJson(real.provenance).confidence;
  return typeof raw === 'number' ? raw : 0.5;
}

function isDemo(real: RealEvidence): boolean {
  return asJson(real.metadata).is_demo === true;
}

// -------------------------------------------------------------------
// Mapping: RealEvidence -> EvidenceSource (search-row surface)
// -------------------------------------------------------------------

/** Map a persisted evidence row into the lightweight search-row shape. */
export function mapEvidenceSource(real: RealEvidence): EvidenceSource {
  const provenance = asJson(real.provenance);
  const metadata = asJson(real.metadata);
  const observedAt = real.collected_at ?? real.created_at;
  return {
    id: real.id,
    title: real.title,
    evidenceType: real.evidence_type as EvidenceType,
    status: DEFAULT_STATUS,
    sourceName: real.source ?? (provenance.source as string | undefined) ?? 'Relational API',
    observedAt,
    investigationId: real.investigation_id,
    entityIds: [],
    findingIds: [],
    eventIds: [],
    snippet: undefined,
    isDemoData: isDemo(real),
  };
}

// -------------------------------------------------------------------
// Mapping: RealEvidence -> EvidenceItem (detail surface)
// -------------------------------------------------------------------

/** Map a persisted evidence row into the full Phase 12 UI detail shape.
 *  UI-only link arrays are left empty: the relational model does not join
 *  evidence to entities/findings/events yet (Phase 17.7 boundary). Provenance
 *  is rebuilt from the persisted provenance dict + metadata, and the SHA-256
 *  integrity checksum is surfaced as the provenance hash. */
export function mapEvidenceItem(real: RealEvidence): EvidenceItem {
  const provenance = asJson(real.provenance);
  const metadata = asJson(real.metadata);
  const sourceName = real.source ?? (provenance.source as string | undefined) ?? 'Relational API';
  const recordIdentifier = metadata.record_identifier;
  const observedAt = real.collected_at ?? real.created_at;
  const itemProvenance: EvidenceProvenance = {
    source: sourceName,
    sourceId:
      (provenance.source_id as string | undefined) ??
      (typeof recordIdentifier === 'string' ? recordIdentifier : real.id),
    datasetId: metadata.dataset_id as string | undefined,
    createdAt: real.created_at,
    observedAt: undefined,
    recordIdentifier: typeof recordIdentifier === 'string' ? recordIdentifier : undefined,
    hash: real.integrity?.checksum ?? undefined,
    version: 1,
    reviewState: 'PENDING',
  };

  const itemMetadata: EvidenceMetadata = {};

  return {
    id: real.id,
    title: real.title,
    description: real.description ?? '',
    evidenceType: real.evidence_type as EvidenceType,
    status: DEFAULT_STATUS,
    investigationId: real.investigation_id,
    datasetId: metadata.dataset_id as string | undefined,
    datasetName: undefined,
    documentId: provenance.document_id as string | undefined,
    sourceName,
    extractionMethod: DEFAULT_EXTRACTION_METHOD,
    extractionConfidence: confidenceFrom(real),
    observedAt,
    createdAt: real.created_at,
    updatedAt: real.updated_at,
    provenance: itemProvenance,
    metadata: itemMetadata,
    snippet: undefined,
    links: [],
    versions: [],
    timeline: [],
    isDemoData: isDemo(real),
    integrity: real.integrity
      ? {
          checksum: real.integrity.checksum,
          status: real.integrity.status,
          storage_status: real.integrity.storage_status,
        }
      : undefined,
    filename: real.filename ?? (typeof metadata.filename === 'string' ? metadata.filename : undefined),
    contentType: real.content_type ?? (typeof metadata.content_type === 'string' ? metadata.content_type : undefined),
    size: real.size ?? (typeof metadata.size === 'number' ? metadata.size : undefined),
    tags: [],
  };
}

// -------------------------------------------------------------------
// Search semantics over persisted evidence
// -------------------------------------------------------------------
// The relational list endpoint returns the full investigation-scoped row set
// (no server-side pagination), so filtering / sorting / pagination mirror the
// deterministic semantics of the mock service but operate on API data.

function matchesApiFilters(item: EvidenceItem, filters: EvidenceSearchFilters): boolean {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const searchable = [
      item.title,
      item.description,
      item.sourceName,
      item.provenance.source,
      item.provenance.sourceId,
      item.provenance.recordIdentifier ?? '',
    ]
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(q)) return false;
  }
  if (filters.evidenceTypes?.length && !filters.evidenceTypes.includes(item.evidenceType)) return false;
  if (filters.sourceNames?.length && !filters.sourceNames.includes(item.sourceName)) return false;
  // Statuses / datasets / tags / confidence / dates are not modeled by the
  // relational evidence row; requesting them matches nothing (honest, never
  // fabricated from mock data).
  if (filters.statuses?.length) return false;
  if (filters.datasetIds?.length) return false;
  if (filters.tags?.length) return false;
  if (filters.entityIds?.length) return false;
  if (filters.findingIds?.length) return false;
  if (filters.eventIds?.length) return false;
  if (filters.dateRange) return false;
  if (filters.extractionMethods?.length) return false;
  if (filters.investigationId && item.investigationId !== filters.investigationId) return false;
  return true;
}

function sortSources(
  sources: EvidenceSource[],
  sortBy?: EvidenceSearchParams['sortBy'],
  sortOrder?: EvidenceSearchParams['sortOrder'],
): EvidenceSource[] {
  if (!sortBy) return sources;
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...sources].sort((a, b) => {
    switch (sortBy) {
      case 'observedAt':
        return dir * (new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'evidenceType':
        return dir * a.evidenceType.localeCompare(b.evidenceType);
      case 'sourceName':
        return dir * a.sourceName.localeCompare(b.sourceName);
      case 'createdAt':
        return dir * (new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
      default:
        return 0;
    }
  });
}

function buildApiFacets(sources: EvidenceSource[]): EvidenceSearchResult['facets'] {
  const TYPES: EvidenceType[] = [
    'DOCUMENT', 'FIR', 'REPORT', 'COMMUNICATION', 'TRANSACTION', 'VEHICLE',
    'LOCATION', 'IMAGE', 'VIDEO', 'AUDIO', 'RECORD', 'OTHER',
  ];
  const STATUSES: EvidenceStatus[] = [
    'AVAILABLE', 'PROCESSING', 'REQUIRES_REVIEW', 'VERIFIED', 'UNVERIFIED', 'ARCHIVED',
  ];
  const evidenceTypes = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<EvidenceType, number>;
  const statuses = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<EvidenceStatus, number>;
  const bySource: Record<string, number> = {};
  for (const item of sources) {
    evidenceTypes[item.evidenceType] += 1;
    statuses[item.status] += 1;
    bySource[item.sourceName] = (bySource[item.sourceName] ?? 0) + 1;
  }
  return { evidenceTypes, statuses, sources: bySource, entities: {} };
}

/** Load the investigation-scoped persisted evidence rows and adapt them into
 *  the search-result shape the workspace consumes. */
export async function loadEvidenceSearch(
  investigationId: string,
  params: EvidenceSearchParams = {},
): Promise<EvidenceSearchResult> {
  const rows = await apiFetch<RealEvidence[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/evidence`,
  );

  const items = rows.map(mapEvidenceItem);
  const filtered = items.filter((i) => matchesApiFilters(i, params));
  const sources = filtered.map((i) => ({
    id: i.id,
    title: i.title,
    evidenceType: i.evidenceType,
    status: i.status,
    sourceName: i.sourceName,
    observedAt: i.observedAt,
    investigationId: i.investigationId,
    entityIds: [],
    findingIds: [],
    eventIds: [],
    snippet: undefined,
    isDemoData: i.isDemoData,
  }));
  const sorted = sortSources(sources, params.sortBy, params.sortOrder);

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    totalPages,
    facets: buildApiFacets(sorted),
  };
}

export type {
  RealEvidence,
  RealEvidenceIntegrity,
  EvidenceAnalysis,
  EvidenceChainEntry,
  EvidenceChainVerification,
  LocalTranscriptionSubmitPayload,
};