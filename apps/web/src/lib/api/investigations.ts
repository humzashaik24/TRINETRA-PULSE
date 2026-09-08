/**
 * Typed client functions for the relational investigation API (/api/v2).
 *
 * These mirror the backend routes added during Phase 14.2:
 *   investigations, entities, relationships, findings, evidence, events,
 *   notes, timeline and network analytics.
 */

import { API_BASE_URL } from './config';
import { apiFetch, type ApiErrorBody } from './client';
import type {
  EntityType,
  ExtractionMethod,
  GraphEdge,
  GraphEdgeStatus,
  GraphNode,
  GraphNodeStatus,
  NetworkGraph,
  NetworkSummary,
  NetworkPath,
  RelationshipKind,
  AnalyticsFilter,
  NetworkAnalytics,
} from '@trinetra-pulse/types';

export type JsonObject = Record<string, unknown>;
export type Uuid = string;

export interface RealInvestigation {
  id: Uuid;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  lead_investigator: string | null;
  assigned_team: string[];
  tags: string[];
  started_at: string | null;
  closed_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealInvestigationCreate {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  lead_investigator?: string | null;
  assigned_team?: string[];
  tags?: string[];
  started_at?: string | null;
  metadata?: JsonObject;
}

export interface RealInvestigationUpdate {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  lead_investigator?: string | null;
  assigned_team?: string[];
  tags?: string[];
  closed_at?: string | null;
  metadata?: JsonObject;
}

export interface RealEntity {
  id: Uuid;
  investigation_id: Uuid;
  entity_type: string;
  canonical_name: string;
  name: string;
  description: string | null;
  attributes: JsonObject;
  confidence: number;
  risk_score: number;
  is_verified: boolean;
  is_flagged: boolean;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealRelationship {
  id: Uuid;
  investigation_id: Uuid;
  source_entity_id: Uuid;
  target_entity_id: Uuid;
  relationship_type: string;
  confidence: number;
  source: string | null;
  evidence_refs: string[];
  /** Phase 17.8 — persisted extraction method (manual/ai_nlp/…), when present. */
  extraction_method?: string | null;
  verification_status: string | null;
  description: string | null;
  weight: number;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealFinding {
  id: Uuid;
  investigation_id: Uuid;
  title: string;
  description: string | null;
  severity: string;
  confidence: string;
  status: string;
  entity_refs: string[];
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealEvidence {
  id: Uuid;
  investigation_id: Uuid;
  evidence_type: string;
  title: string;
  description: string | null;
  source: string | null;
  provenance: JsonObject;
  collected_at: string | null;
  storage_ref: string | null;
  filename?: string | null;
  content_type?: string | null;
  size?: number | null;
  metadata: JsonObject;
  /** Phase 17.6 — SHA-256 integrity block {checksum, status} when available. */
  integrity?: RealEvidenceIntegrity | null;
  created_at: string;
  updated_at: string;
}

/** SHA-256 integrity block attached to persisted evidence rows. */
export interface RealEvidenceIntegrity {
  checksum: string | null;
  status: string;
  storage_status?: string;
}

export interface RealEvent {
  id: Uuid;
  investigation_id: Uuid;
  event_type: string;
  timestamp: string | null;
  location: string | null;
  description: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealNote {
  id: Uuid;
  investigation_id: Uuid;
  content: string;
  author: string;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealEntityCreate {
  investigation_id: Uuid;
  entity_type: string;
  canonical_name?: string | null;
  name: string;
  description?: string | null;
  attributes?: JsonObject;
  confidence?: number;
  is_verified?: boolean;
  is_flagged?: boolean;
  metadata?: JsonObject;
}

export interface RealFindingCreate {
  investigation_id: Uuid;
  title: string;
  description?: string | null;
  severity?: string;
  confidence?: string;
  status?: string;
  entity_refs?: string[];
  metadata?: JsonObject;
}

export interface RealNoteCreate {
  investigation_id: Uuid;
  content: string;
  author: string;
  metadata?: JsonObject;
}

export interface RealPaginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RealInvestigationSummary {
  id: Uuid;
  title: string;
  status: string;
  priority: string;
  entity_count: number;
  relationship_count: number;
  evidence_count: number;
  finding_count: number;
  event_count: number;
  note_count: number;
  updated_at: string;
}

export interface RealTimelineEntry {
  kind: 'event' | 'note' | 'finding' | 'evidence';
  at: string | null;
  title: string | null;
  ref_id: Uuid | null;
  actor: string | null;
  description: string | null;
}

export interface RealTimeline {
  investigation_id: Uuid;
  entries: RealTimelineEntry[];
}

export interface RealGraphNode {
  id: Uuid;
  name: string;
  entity_type: string;
  risk_score: number;
  is_verified: boolean;
  is_flagged: boolean;
}

export interface RealGraphEdge {
  id: Uuid;
  source: Uuid;
  target: Uuid;
  relationship_type: string;
  weight: number;
}

export interface RealNetworkGraph {
  investigation_id: Uuid;
  nodes: RealGraphNode[];
  edges: RealGraphEdge[];
}

export interface RealAnalyticsOverview {
  investigation_id: Uuid;
  entity_count: number;
  relationship_count: number;
  connected_components: number;
  average_degree: number;
  flagged_entity_count: number;
  verified_entity_count: number;
  high_risk_entity_count: number;
  density?: number;
  largest_component_size?: number;
  isolated_entity_count?: number;
  highest_degree_entity_id?: Uuid | null;
  network_influence_leader_id?: Uuid | null;
  strongest_bridge_entity_id?: Uuid | null;
  centrality?: Record<string, unknown> | null;
  communities?: NetworkAnalytics['communities'] | null;
  components?: NetworkAnalytics['components'] | null;
  bridges?: NetworkAnalytics['bridges'] | null;
  temporal?: NetworkAnalytics['temporal'];
}

/** Wire contract for the Phase 19 server-side analytics bundle. */
export interface RealAdvancedAnalyticsResponse {
  investigation_id?: Uuid;
  network_id?: Uuid;
  status?: string;
  filters?: Partial<AnalyticsFilter>;
  summary?: Partial<NonNullable<NetworkAnalytics['summary']>> | null;
  degree?: NetworkAnalytics['degree'] | null;
  centrality?: unknown;
  betweenness?: NetworkAnalytics['betweenness'] | null;
  closeness?: NetworkAnalytics['closeness'] | null;
  pagerank?: NetworkAnalytics['pagerank'] | null;
  influence?: NetworkAnalytics['influence'] | null;
  communities?: NetworkAnalytics['communities'] | null;
  groups?: NetworkAnalytics['communities'] | null;
  components?: NetworkAnalytics['components'] | null;
  connected_components_detail?: NetworkAnalytics['components'] | null;
  density?: NetworkAnalytics['density'] | null;
  bridges?: NetworkAnalytics['bridges'] | null;
  bridge_entities?: NetworkAnalytics['bridges'] | null;
  bridge_relationships?: NetworkAnalytics['bridgeRelationships'] | null;
  bridgeRelationships?: NetworkAnalytics['bridgeRelationships'] | null;
  patterns?: NetworkAnalytics['patterns'] | null;
  temporal?: NetworkAnalytics['temporal'] | null;
  metadata?: Partial<NonNullable<NetworkAnalytics['metadata']>> | null;
  error?: string | null;
}

export type RealAnalyticsResponse = Partial<RealAnalyticsOverview> &
  Omit<RealAdvancedAnalyticsResponse, keyof RealAnalyticsOverview>;

export interface NetworkAnalyticsQuery {
  filter?: Partial<AnalyticsFilter>;
  /** Optional server-supported path scope (entity ids or a named path). */
  path?: string | { from?: string; to?: string };
}

// ---------------------------------------------------------------------------
// Investigations
// ---------------------------------------------------------------------------

export async function listInvestigations(
  params: { page?: number; page_size?: number } = {},
): Promise<RealPaginated<RealInvestigation>> {
  const { page = 1, page_size = 20 } = params;
  return apiFetch<RealPaginated<RealInvestigation>>(
    API_BASE_URL,
    `/investigations?page=${page}&page_size=${page_size}`,
  );
}

export async function getInvestigation(id: Uuid): Promise<RealInvestigation> {
  return apiFetch<RealInvestigation>(API_BASE_URL, `/investigations/${id}`);
}

export async function createInvestigation(
  input: RealInvestigationCreate,
): Promise<RealInvestigation> {
  return apiFetch<RealInvestigation>(API_BASE_URL, '/investigations', {
    method: 'POST',
    body: input,
  });
}

export async function updateInvestigation(
  id: Uuid,
  input: RealInvestigationUpdate,
): Promise<RealInvestigation> {
  return apiFetch<RealInvestigation>(API_BASE_URL, `/investigations/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteInvestigation(id: Uuid): Promise<void> {
  return apiFetch<void>(API_BASE_URL, `/investigations/${id}`, {
    method: 'DELETE',
  });
}

export async function getInvestigationSummary(
  id: Uuid,
): Promise<RealInvestigationSummary> {
  return apiFetch<RealInvestigationSummary>(
    API_BASE_URL,
    `/investigations/${id}/summary`,
  );
}

// ---------------------------------------------------------------------------
// Nested investigation resources
// ---------------------------------------------------------------------------

export async function listEntitiesForInvestigation(
  investigationId: Uuid,
): Promise<RealEntity[]> {
  return apiFetch<RealEntity[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/entities`,
  );
}

export async function getEntity(entityId: Uuid): Promise<RealEntity> {
  return apiFetch<RealEntity>(API_BASE_URL, `/entities/${entityId}`);
}

/**
 * Investigation-scoped entity detail. When ``investigationId`` is supplied the
 * backend treats a cross-investigation match as 404 (no existence leak), so
 * the caller must scope every detail read to the active investigation.
 */
export async function getEntityScoped(
  entityId: Uuid,
  investigationId?: Uuid,
): Promise<RealEntity> {
  const scope = investigationId ? `?investigation_id=${investigationId}` : '';
  return apiFetch<RealEntity>(API_BASE_URL, `/entities/${entityId}${scope}`);
}

export async function getRelationship(relationshipId: Uuid): Promise<RealRelationship> {
  return apiFetch<RealRelationship>(API_BASE_URL, `/relationships/${relationshipId}`);
}

/**
 * Investigation-scoped relationship detail. When ``investigationId`` is
 * supplied the backend treats a cross-investigation match as 404 (no
 * existence leak), so the caller must scope every detail read to the active
 * investigation. Phase 17.8.
 */
export async function getRelationshipScoped(
  relationshipId: Uuid,
  investigationId?: Uuid,
): Promise<RealRelationship> {
  const scope = investigationId ? `?investigation_id=${investigationId}` : '';
  return apiFetch<RealRelationship>(
    API_BASE_URL,
    `/relationships/${relationshipId}${scope}`,
  );
}

export async function listRelationshipsForInvestigation(
  investigationId: Uuid,
): Promise<RealRelationship[]> {
  return apiFetch<RealRelationship[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/relationships`,
  );
}

export async function listFindingsForInvestigation(
  investigationId: Uuid,
): Promise<RealFinding[]> {
  return apiFetch<RealFinding[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/findings`,
  );
}

export async function getFinding(findingId: Uuid): Promise<RealFinding> {
  return apiFetch<RealFinding>(API_BASE_URL, `/findings/${findingId}`);
}

/**
 * Investigation-scoped finding detail. When ``investigationId`` is supplied
 * the backend treats a cross-investigation match as 404 (no existence leak),
 * so the caller must scope every detail read to the active investigation.
 * Phase 17.9.
 */
export async function getFindingScoped(
  findingId: Uuid,
  investigationId?: Uuid,
): Promise<RealFinding> {
  const scope = investigationId ? `?investigation_id=${investigationId}` : '';
  return apiFetch<RealFinding>(API_BASE_URL, `/findings/${findingId}${scope}`);
}

export async function listEvidenceForInvestigation(
  investigationId: Uuid,
): Promise<RealEvidence[]> {
  return apiFetch<RealEvidence[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/evidence`,
  );
}

export async function listEventsForInvestigation(
  investigationId: Uuid,
): Promise<RealEvent[]> {
  return apiFetch<RealEvent[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/events`,
  );
}

export async function getEvent(eventId: Uuid): Promise<RealEvent> {
  return apiFetch<RealEvent>(API_BASE_URL, `/events/${eventId}`);
}

/**
 * Investigation-scoped event detail. When ``investigationId`` is supplied
 * the backend treats a cross-investigation match as 404 (no existence leak),
 * so the caller must scope every detail read to the active investigation.
 * Phase 17.9.
 */
export async function getEventScoped(
  eventId: Uuid,
  investigationId?: Uuid,
): Promise<RealEvent> {
  const scope = investigationId ? `?investigation_id=${investigationId}` : '';
  return apiFetch<RealEvent>(API_BASE_URL, `/events/${eventId}${scope}`);
}

export async function listNotesForInvestigation(
  investigationId: Uuid,
): Promise<RealNote[]> {
  return apiFetch<RealNote[]>(
    API_BASE_URL,
    `/investigations/${investigationId}/notes`,
  );
}

export async function getNote(noteId: Uuid): Promise<RealNote> {
  return apiFetch<RealNote>(API_BASE_URL, `/notes/${noteId}`);
}

/**
 * Investigation-scoped note detail. When ``investigationId`` is supplied
 * the backend treats a cross-investigation match as 404 (no existence leak),
 * so the caller must scope every detail read to the active investigation.
 * Phase 17.9.
 */
export async function getNoteScoped(
  noteId: Uuid,
  investigationId?: Uuid,
): Promise<RealNote> {
  const scope = investigationId ? `?investigation_id=${investigationId}` : '';
  return apiFetch<RealNote>(API_BASE_URL, `/notes/${noteId}${scope}`);
}

export async function createEntityForInvestigation(
  input: RealEntityCreate,
): Promise<RealEntity> {
  return apiFetch<RealEntity>(API_BASE_URL, '/entities', {
    method: 'POST',
    body: input,
  });
}

export async function createFindingForInvestigation(
  input: RealFindingCreate,
): Promise<RealFinding> {
  return apiFetch<RealFinding>(API_BASE_URL, '/findings', {
    method: 'POST',
    body: input,
  });
}

export async function createNoteForInvestigation(
  input: RealNoteCreate,
): Promise<RealNote> {
  return apiFetch<RealNote>(API_BASE_URL, '/notes', {
    method: 'POST',
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Timeline & network
// ---------------------------------------------------------------------------

export async function getTimeline(
  investigationId: Uuid,
): Promise<RealTimeline> {
  return apiFetch<RealTimeline>(API_BASE_URL, `/timeline/${investigationId}`);
}

export async function getNetworkGraph(
  investigationId: Uuid,
): Promise<RealNetworkGraph> {
  return apiFetch<RealNetworkGraph>(
    API_BASE_URL,
    `/networks/${investigationId}/graph`,
  );
}

// ---------------------------------------------------------------------------
// Graph mapping (Phase 17.2)
// ---------------------------------------------------------------------------

const BASE_NODE_SIZE: Record<string, number> = {
  person: 20,
  phone: 13,
  vehicle: 15,
  location: 15,
  organization: 23,
  account: 13,
  transaction: 12,
  event: 13,
  case: 20,
  document: 15,
  evidence: 13,
};

function nodeStatusFor(riskScore: number): GraphNodeStatus {
  if (riskScore >= 0.8) return 'needs_review';
  if (riskScore >= 0.5) return 'possible';
  if (riskScore >= 0.3) return 'probable';
  return 'confirmed';
}

function edgeStatusFor(confidence: number): GraphEdgeStatus {
  if (confidence >= 0.9) return 'confirmed';
  if (confidence >= 0.75) return 'probable';
  if (confidence >= 0.6) return 'possible';
  return 'candidate';
}

/**
 * Map a RealNetworkGraph (from GET /api/v2/networks/{id}/graph)
 * into the full NetworkGraph shape expected by the graph store and
 * all downstream components.
 *
 * The real API returns a simpler shape (id, name, entity_type, risk_score,
 * confidence, etc.). This function fills in the derived fields that the
 * frontend graph workspace requires.
 */
export function mapApiGraphToNetworkGraph(
  apiGraph: RealNetworkGraph,
  investigationId: string,
): NetworkGraph {
  const nodes: GraphNode[] = apiGraph.nodes.map((n, i) => {
    const entityType = n.entity_type as EntityType;
    const size = BASE_NODE_SIZE[entityType] ?? 15;
    return {
      id: n.id,
      entityId: n.id,
      type: entityType,
      label: n.name,
      displayLabel: n.name,
      status: nodeStatusFor(n.risk_score),
      confidence: n.risk_score,
      position: { x: 0, y: 0 },
      size,
      style: { size, shape: entityType === 'case' || entityType === 'document' ? 'rounded' : 'circle' },
      connections: 0,
      sources: [],
      metadata: {},
    };
  });

  // Compute connections (degree) from edges.
  const degreeMap = new Map<string, number>();
  for (const n of nodes) degreeMap.set(n.id, 0);
  const edges: GraphEdge[] = apiGraph.edges.map((e) => {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
    const relType = e.relationship_type as RelationshipKind;
    return {
      id: e.id,
      relationshipId: e.id,
      source: e.source,
      target: e.target,
      type: relType,
      label: relType.toLowerCase().replace(/_/g, ' '),
      confidence: e.weight,
      status: edgeStatusFor(e.weight),
      direction: 'directed' as const,
      weight: e.weight,
      sourceRecordLabel: 'CSV Import',
      evidence: [],
      extractionMethod: 'STRUCTURED_MAPPING' as ExtractionMethod,
      metadata: {},
    };
  });

  for (const n of nodes) n.connections = degreeMap.get(n.id) ?? 0;

  const sources = Array.from(new Set(nodes.flatMap((n) => n.sources))).sort();

  return {
    id: investigationId,
    name: `Investigation ${investigationId.slice(0, 8)}`,
    description: '',
    nodes,
    edges,
    clusters: [],
    metadata: {
      seedEntityId: null,
      caseId: null,
      sources,
      connectedComponents: 0,
      nodeCount: nodes.length,
      relationshipCount: edges.length,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build a NetworkSummary from a mapped NetworkGraph.
 */
export function mapApiGraphToSummary(graph: NetworkGraph): NetworkSummary {
  return {
    id: graph.id,
    name: graph.name,
    description: graph.description,
    status: 'ready',
    nodeCount: graph.nodes.length,
    relationshipCount: graph.edges.length,
    clusterCount: 0,
    connectedComponents: graph.metadata.connectedComponents,
    sources: graph.metadata.sources ?? [],
    dateRange: { start: null, end: null },
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
    caseId: graph.metadata.caseId,
    seedEntityId: graph.metadata.seedEntityId,
  };
}

export async function getNetworkAnalytics(
  investigationId: Uuid,
  query: NetworkAnalyticsQuery = {},
): Promise<RealAnalyticsResponse> {
  const params = new URLSearchParams();
  const filter = query.filter;
  if (filter) {
    if (filter.entityTypes?.length) params.set('entity_types', filter.entityTypes.join(','));
    if (filter.relationshipTypes?.length) params.set('relationship_types', filter.relationshipTypes.join(','));
    if (filter.communityIds?.length) params.set('community_ids', filter.communityIds.join(','));
    if (filter.componentIds?.length) params.set('component_ids', filter.componentIds.join(','));
    if (filter.sources?.length) params.set('sources', filter.sources.join(','));
    if (filter.from) params.set('from', filter.from);
    if (filter.to) params.set('to', filter.to);
    if ((filter.minConfidence ?? 0) > 0) params.set('min_confidence', String(filter.minConfidence));
  }
  if (query.path) {
    params.set('path', typeof query.path === 'string' ? query.path : JSON.stringify(query.path));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<RealAnalyticsResponse>(
    API_BASE_URL,
    `/networks/${investigationId}/analytics${suffix}`,
  );
}

/** Resolve a shortest path through the API when the backend supports it. */
export async function findNetworkPath(
  investigationId: Uuid,
  startEntityId: string,
  endEntityId: string,
): Promise<NetworkPathResponse | null> {
  const params = new URLSearchParams({
    start_entity_id: startEntityId,
    end_entity_id: endEntityId,
  });
  return apiFetch<NetworkPathResponse | null>(
    API_BASE_URL,
    `/networks/${investigationId}/path?${params.toString()}`,
  );
}

export interface NetworkPathResponse {
  investigation_id?: string;
  source_entity_id?: string;
  target_entity_id?: string;
  found?: boolean;
  start_entity_id?: string;
  end_entity_id?: string;
  startEntityId?: string;
  endEntityId?: string;
  node_ids?: string[];
  nodeIds?: string[];
  edge_ids?: string[];
  edgeIds?: string[];
  length: number;
  confidence?: number;
  explanation?: string;
}

// ---------------------------------------------------------------------------
// Datasets & Ingestion
// ---------------------------------------------------------------------------

export interface RealDataset {
  id: Uuid;
  investigation_id: Uuid;
  data_source_id: Uuid | null;
  name: string;
  description: string | null;
  source_name: string | null;
  format: string;
  category: string;
  status: string;
  record_count: number;
  file_size: number;
  file_name: string | null;
  quality_score: number;
  warnings: number;
  errors: number;
  duplicates: number;
  last_ingestion_id: Uuid | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealIngestionJob {
  id: Uuid;
  investigation_id: Uuid;
  dataset_id: Uuid;
  status: string;
  progress: number;
  records_processed: number;
  entities_extracted: number;
  candidates_created: number;
  matches_found: number;
  errors: string[];
  warnings: string[];
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
}

export interface RealUploadResult {
  dataset: RealDataset;
  job_id: string;
  records_processed: number;
  entities_created: number;
  relationships_created: number;
  evidence_created: number;
  duplicates_skipped: number;
  warnings: string[];
}

export async function listDatasets(
  investigationId?: Uuid,
): Promise<RealDataset[]> {
  const params = investigationId ? `?investigation_id=${investigationId}` : '';
  return apiFetch<RealDataset[]>(API_BASE_URL, `/datasets${params}`);
}

export async function getDataset(id: Uuid): Promise<RealDataset> {
  return apiFetch<RealDataset>(API_BASE_URL, `/datasets/${id}`);
}

export async function listAllIngestionJobs(): Promise<RealIngestionJob[]> {
  return apiFetch<RealIngestionJob[]>(API_BASE_URL, '/datasets/all-jobs');
}

export async function uploadDataset(
  file: File,
  investigationId: Uuid,
  options: { name?: string; description?: string; sourceName?: string; category?: string } = {},
): Promise<RealUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('investigation_id', investigationId);
  if (options.name) formData.append('name', options.name);
  if (options.description) formData.append('description', options.description);
  if (options.sourceName) formData.append('source_name', options.sourceName);
  if (options.category) formData.append('category', options.category);

  return apiFetch<RealUploadResult>(API_BASE_URL, '/datasets/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}

export interface RealEvidenceUploadResult extends RealEvidence {}

export type { ApiErrorBody };
