/**
 * Typed adapter for the Phase 20 entity-intelligence endpoints.
 *
 * This module only speaks to `/api/v2/entity-intelligence`. It deliberately
 * does not import the mock service and never computes a match on the client:
 * reasons, scores, states and methods are copied from the backend response.
 */

import type {
  AuditEvent,
  CandidateStatus,
  EntityCandidate,
  EntityResolution,
  ExtractionJob,
  ResolutionState,
  ExtractionMethod,
} from '@trinetra-pulse/types';
import { apiFetch } from './client';
import { API_BASE_URL } from './config';

const PATH = '/entity-intelligence';

interface ApiCandidate {
  id: string;
  entity_type: string;
  raw_value: string;
  display_value: string;
  source: string;
  source_record: string;
  normalized_value?: string | null;
  dataset_id?: string | null;
  dataset_name?: string | null;
  confidence: number;
  extraction_method: string;
  status: string;
  resolution_state?: string | null;
  resolved_entity_id?: string | null;
  attributes?: Record<string, unknown>;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

interface ApiResolution {
  id: string;
  entity_a_id: string;
  entity_a_display: string;
  entity_a_type: string;
  entity_b_id: string;
  entity_b_display: string;
  entity_b_type: string;
  type: string;
  state: string;
  decision: string;
  confidence: number;
  reasons?: string[];
  method: string;
  created_at: string;
  updated_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_reason?: string | null;
  merged_target_id?: string | null;
  similarity?: number | null;
  evidence_refs?: string[];
  contradictions?: string[];
  provenance?: Record<string, unknown> | null;
}

interface ApiJob {
  id: string;
  dataset_id: string;
  dataset_name: string;
  status: string;
  progress: number;
  records_processed: number;
  entities_extracted: number;
  candidates_created: number;
  matches_found: number;
  errors?: string[];
  warnings?: string[];
  created_by: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface ApiAudit {
  id: string;
  actor: string;
  actor_name: string;
  action: string;
  action_label: string;
  object: string;
  object_type: string;
  object_id?: string | null;
  reason?: string | null;
  timestamp: string;
}

const candidateStatus = (value: string): CandidateStatus => {
  if (value === 'ACCEPTED' || value === 'REJECTED' || value === 'REVIEWED') return value;
  return 'PENDING';
};

const resolutionState = (value: string | null | undefined): ResolutionState | undefined => {
  const normalized = value?.toUpperCase();
  return normalized === 'CONFIRMED' ||
    normalized === 'PROBABLE' ||
    normalized === 'POSSIBLE' ||
    normalized === 'REJECTED' ||
    normalized === 'NEEDS_REVIEW'
    ? normalized
    : undefined;
};

/** Preserve the API's method vocabulary while satisfying the shared UI type. */
const extractionMethod = (value: string): ExtractionMethod => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const supported: ExtractionMethod[] = [
    'RULE_BASED', 'STRUCTURED_MAPPING', 'REGEX', 'NLP', 'ML', 'LLM',
    'MANUAL', 'ANALYTICAL', 'DATABASE_IMPORT', 'DOCUMENT_PARSE', 'AI_NLP',
    'AI_CV', 'AI_AUDIO', 'NETWORK_ANALYSIS', 'OTHER',
  ];
  return supported.includes(normalized as ExtractionMethod)
    ? normalized as ExtractionMethod
    : 'OTHER';
};

export function mapApiCandidate(row: ApiCandidate): EntityCandidate {
  return {
    id: row.id,
    datasetId: row.dataset_id ?? undefined,
    datasetName: row.dataset_name ?? undefined,
    entityType: row.entity_type as EntityCandidate['entityType'],
    rawValue: row.raw_value,
    normalizedValue: row.normalized_value ?? row.display_value,
    displayValue: row.display_value,
    source: row.source,
    sourceRecord: row.source_record,
    confidence: row.confidence,
    extractionMethod: extractionMethod(row.extraction_method),
    attributes: row.attributes ?? {},
    status: candidateStatus(row.status),
    resolutionState: resolutionState(row.resolution_state),
    resolvedEntityId: row.resolved_entity_id ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapApiResolution(row: ApiResolution): EntityResolution {
  const reasons = row.reasons ?? [];
  const state = resolutionState(row.state) ?? 'NEEDS_REVIEW';
  const decision =
    row.decision === 'MERGE' || row.decision === 'KEEP_SEPARATE'
      ? row.decision
      : 'REVIEW';
  return {
    id: row.id,
    entityAId: row.entity_a_id,
    entityBId: row.entity_b_id,
    entityAName: row.entity_a_display,
    entityBName: row.entity_b_display,
    entityADisplayValue: row.entity_a_display,
    entityBDisplayValue: row.entity_b_display,
    entityAType: row.entity_a_type as EntityResolution['entityAType'],
    entityBType: row.entity_b_type as EntityResolution['entityBType'],
    resolutionType: row.type,
    confidence: row.confidence,
    similarity: row.similarity ?? undefined,
    state,
    recommendation: decision,
    // API reasons are not reinterpreted as client-side matching signals.
    signals: [],
    summaryReason: reasons.join(' '),
    reasons,
    method: row.method,
    evidence: row.evidence_refs ?? [],
    evidenceRefs: row.evidence_refs ?? [],
    contradictions: row.contradictions,
    provenance: row.provenance ?? undefined,
    createdBy: row.reviewed_by ?? 'backend',
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewReason: row.review_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApiJob(row: ApiJob): ExtractionJob {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    datasetName: row.dataset_name,
    status: row.status as ExtractionJob['status'],
    progress: row.progress,
    recordsProcessed: row.records_processed,
    entitiesExtracted: row.entities_extracted,
    candidatesCreated: row.candidates_created,
    matchesFound: row.matches_found,
    errors: row.errors ?? [],
    warnings: row.warnings ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

function mapApiAudit(row: ApiAudit): AuditEvent {
  return {
    id: row.id,
    actor: row.actor,
    actorName: row.actor_name,
    action: row.action as AuditEvent['action'],
    actionLabel: row.action_label,
    object: row.object,
    objectType: row.object_type,
    objectId: row.object_id ?? undefined,
    reason: row.reason ?? undefined,
    timestamp: row.timestamp,
  };
}

export interface ApiCandidateFilter {
  status?: CandidateStatus | 'all';
  entityType?: string | 'all';
  resolutionState?: ResolutionState | 'all';
  search?: string;
}

function query(filter: ApiCandidateFilter): string {
  const params = new URLSearchParams();
  if (filter.status && filter.status !== 'all') params.set('status', filter.status);
  if (filter.entityType && filter.entityType !== 'all') params.set('entity_type', filter.entityType);
  if (filter.resolutionState && filter.resolutionState !== 'all') params.set('resolution_state', filter.resolutionState);
  if (filter.search?.trim()) params.set('search', filter.search.trim());
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export async function fetchApiCandidates(filter: ApiCandidateFilter = {}): Promise<EntityCandidate[]> {
  const rows = await apiFetch<ApiCandidate[]>(API_BASE_URL, `${PATH}/candidates${query(filter)}`);
  return rows.map(mapApiCandidate);
}

export async function fetchApiCandidate(id: string): Promise<EntityCandidate> {
  return mapApiCandidate(await apiFetch<ApiCandidate>(API_BASE_URL, `${PATH}/candidates/${id}`));
}

export async function reviewApiCandidate(
  id: string,
  decision: 'accept' | 'reject',
  reviewer: string,
): Promise<EntityCandidate> {
  return mapApiCandidate(await apiFetch<ApiCandidate>(API_BASE_URL, `${PATH}/candidates/${id}/review`, {
    method: 'POST',
    body: { decision, reviewer },
  }));
}

export async function fetchApiResolutions(): Promise<EntityResolution[]> {
  const rows = await apiFetch<ApiResolution[]>(API_BASE_URL, `${PATH}/resolutions`);
  return rows.map(mapApiResolution);
}

export async function fetchApiResolution(id: string): Promise<EntityResolution> {
  return mapApiResolution(await apiFetch<ApiResolution>(API_BASE_URL, `${PATH}/resolutions/${id}`));
}

export async function decideApiResolution(
  id: string,
  decision: 'confirm' | 'reject',
  reviewer: string,
  reason: string,
): Promise<EntityResolution> {
  return mapApiResolution(await apiFetch<ApiResolution>(API_BASE_URL, `${PATH}/resolutions/${id}/${decision}`, {
    method: 'POST',
    body: { reviewer, reason },
  }));
}

export async function mergeApiResolution(input: {
  resolutionId: string;
  targetEntityId: string;
  archiveSourceProfiles?: boolean;
  reviewer: string;
  reason: string;
}): Promise<EntityResolution> {
  return mapApiResolution(await apiFetch<ApiResolution>(
    API_BASE_URL,
    `${PATH}/resolutions/${input.resolutionId}/merge`,
    {
      method: 'POST',
      body: {
        target_entity_id: input.targetEntityId,
        archive_source_profiles: input.archiveSourceProfiles ?? true,
        reviewer: input.reviewer,
        reason: input.reason,
      },
    },
  ));
}

export async function fetchApiExtractionJobs(): Promise<ExtractionJob[]> {
  const rows = await apiFetch<ApiJob[]>(API_BASE_URL, `${PATH}/extraction-jobs`);
  return rows.map(mapApiJob);
}

export async function startApiExtractionJob(input: {
  datasetId: string;
  datasetName: string;
  createdBy: string;
}): Promise<ExtractionJob> {
  return mapApiJob(await apiFetch<ApiJob>(API_BASE_URL, `${PATH}/extraction-jobs`, {
    method: 'POST',
    body: { dataset_id: input.datasetId, dataset_name: input.datasetName, created_by: input.createdBy },
  }));
}

export async function cancelApiExtractionJob(id: string): Promise<ExtractionJob> {
  return mapApiJob(await apiFetch<ApiJob>(API_BASE_URL, `${PATH}/extraction-jobs/${id}/cancel`, {
    method: 'POST',
  }));
}

export async function fetchApiAuditEvents(): Promise<AuditEvent[]> {
  const rows = await apiFetch<ApiAudit[]>(API_BASE_URL, `${PATH}/audit`);
  return rows.map(mapApiAudit);
}
