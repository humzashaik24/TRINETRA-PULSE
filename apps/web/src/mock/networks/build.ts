import type {
  EntityType,
  ExtractionMethod,
  GraphCluster,
  GraphEdge,
  GraphEdgeDirection,
  GraphEdgeStatus,
  GraphNode,
  GraphNodeStatus,
  NetworkGraph,
  NetworkSummary,
  RelationshipKind,
} from '@trinetra-pulse/types';

// ============================================================
// MOCK — NETWORK GRAPH BUILDER
// ============================================================
// Compact seed format → full graph contracts.
// Kept out of React components. Graph nodes reference canonical
// entity ids (the same ids used by entity-profiles) rather than
// duplicating entity records.
// ============================================================

export interface NodeSeed {
  /** Canonical entity identifier (Entity.id). */
  entityId: string;
  label: string;
  type: EntityType;
  confidence: number;
  sources: string[];
  activityAt: string;
  status?: GraphNodeStatus;
  metadata?: Record<string, unknown>;
}

const BASE_SIZE: Record<EntityType, number> = {
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

function statusFor(confidence: number): GraphNodeStatus {
  if (confidence >= 0.9) return 'confirmed';
  if (confidence >= 0.75) return 'probable';
  if (confidence >= 0.6) return 'possible';
  return 'needs_review';
}

export function makeNode(id: string, seed: NodeSeed): GraphNode {
  const size = BASE_SIZE[seed.type];
  return {
    id,
    entityId: seed.entityId,
    type: seed.type,
    label: seed.label,
    displayLabel: seed.label,
    status: seed.status ?? statusFor(seed.confidence),
    confidence: seed.confidence,
    position: { x: 0, y: 0 },
    size,
    style: { size, shape: seed.type === 'case' || seed.type === 'document' ? 'rounded' : 'circle' },
    connections: 0,
    sources: seed.sources,
    activityAt: seed.activityAt,
    metadata: seed.metadata ?? {},
  };
}

export type EdgeRow = [
  source: string,
  target: string,
  type: RelationshipKind,
  confidence: number,
  sourceLabel: string,
  timestamp: string,
  evidence?: string[],
];

const METHOD_BY_SOURCE: Record<string, ExtractionMethod> = {
  'CDR Extract - Operation clean': 'STRUCTURED_MAPPING',
  'CDR Extract - Harness Cell': 'STRUCTURED_MAPPING',
  'CDR Extract - Skyline Watch': 'STRUCTURED_MAPPING',
  'FIR Records - Pune District': 'STRUCTURED_MAPPING',
  'FIR Records - Kochi Port': 'STRUCTURED_MAPPING',
  'FIR Records - Delhi North': 'STRUCTURED_MAPPING',
  'Bank Transaction Log': 'STRUCTURED_MAPPING',
  'Vehicle Tracking Data': 'STRUCTURED_MAPPING',
  'Cell Tower Data': 'RULE_BASED',
  'Witness Statements': 'NLP',
  'Customs Manifest ML-2026-031': 'STRUCTURED_MAPPING',
  'GST Ledger Extract': 'STRUCTURED_MAPPING',
  'Telecom Subscriber DB': 'STRUCTURED_MAPPING',
  'Geospatial Movement Log': 'RULE_BASED',
  'Crime Records Bureau': 'RULE_BASED',
  'Social Media Metadata': 'ML',
  'Bank SWIFT Trail': 'STRUCTURED_MAPPING',
};

function edgeStatusFor(confidence: number): GraphEdgeStatus {
  if (confidence >= 0.9) return 'confirmed';
  if (confidence >= 0.75) return 'probable';
  if (confidence >= 0.6) return 'possible';
  return 'candidate';
}

function directionFor(type: RelationshipKind): GraphEdgeDirection {
  return type === 'KNOWS' ? 'undirected' : 'directed';
}

const DEFAULT_EVIDENCE: Record<string, string[]> = {
  'CDR Extract - Operation clean': ['cdr_extract.csv #2241', 'Bank Transaction Log'],
  'CDR Extract - Harness Cell': ['cdr_harness_q1.csv row 11'],
  'CDR Extract - Skyline Watch': ['cdr_skyline_feb26.csv row 19'],
  'FIR Records - Pune District': ['FIR-2026-001 / R2'],
  'FIR Records - Kochi Port': ['FIR-2026-014 / R4'],
  'FIR Records - Delhi North': ['FIR-2026-021 / R3'],
  'Bank Transaction Log': ['transactions_flagged_aug2026.xlsx row 132'],
  'Vehicle Tracking Data': ['vehicle_tracking_mh.csv row 1202'],
  'Cell Tower Data': ['celltower_pune_mumbai.json bucket 4'],
  'Witness Statements': ['ws_batch3_014.txt'],
  'Customs Manifest ML-2026-031': ['manifest_ml_031 line 48'],
  'GST Ledger Extract': ['gst_q4_extract.csv row 33'],
  'Telecom Subscriber DB': ['subscriber_db_lookup 2026-01'],
  'Geospatial Movement Log': ['geo_routes_2025.geojson'],
  'Crime Records Bureau': ['crb_alias_review 2024'],
  'Social Media Metadata': ['social_meta_ken_2025.json'],
  'Bank SWIFT Trail': ['swift_trail_q3.csv row 92'],
};

export function makeEdge(id: string, row: EdgeRow): GraphEdge {
  const [source, target, type, confidence, sourceLabel, timestamp, evidence] = row;
  const label = type.toLowerCase().replace(/_/g, ' ');
  return {
    id,
    relationshipId: id.replace(/^[a-z0-9]+-\d+-/i, 'rel-').slice(0, 24),
    source,
    target,
    type,
    label,
    confidence,
    status: edgeStatusFor(confidence),
    direction: directionFor(type),
    weight: confidence,
    sourceRecordLabel: sourceLabel,
    timestamp,
    evidence: evidence && evidence.length > 0 ? evidence : DEFAULT_EVIDENCE[sourceLabel] ?? [],
    extractionMethod: METHOD_BY_SOURCE[sourceLabel] ?? 'RULE_BASED',
    metadata: {},
  };
}

export interface NetworkSeed {
  id: string;
  name: string;
  description: string;
  status?: NetworkSummary['status'];
  seedEntityId?: string;
  caseId?: string;
  nodes: NodeSeed[];
  edges: EdgeRow[];
  clusters: { id: string; label: string; nodeIds: string[] }[];
  createdAt: string;
  updatedAt: string;
}

export function buildNetwork(seed: NetworkSeed): NetworkGraph {
  const nodes = seed.nodes.map((n, i) => makeNode(`${seed.id}-n-${String(i + 1).padStart(3, '0')}`, n));
  // Edge rows reference canonical entity ids; resolve to internal node ids.
  const nodeIdByEntity = new Map(nodes.map((n) => [n.entityId, n.id]));
  const edges = seed.edges.map((e, i) => {
    const [source, target, ...rest] = e;
    const sourceId = nodeIdByEntity.get(source) ?? source;
    const targetId = nodeIdByEntity.get(target) ?? target;
    return makeEdge(`${seed.id}-e-${String(i + 1).padStart(3, '0')}`, [sourceId, targetId, ...rest]);
  });

  // Compute degree for every node.
  const degree = new Map<string, number>();
  for (const node of nodes) degree.set(node.id, 0);
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) node.connections = degree.get(node.id) ?? 0;

  const clusters: GraphCluster[] = seed.clusters.map((c) => ({
    id: c.id,
    label: c.label,
    nodeIds: c.nodeIds,
    confidence: 0.8,
    metadata: { source: 'graph-analytics/preview' },
  }));

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const sources = Array.from(new Set(nodes.flatMap((n) => n.sources))).sort();

  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    nodes,
    edges,
    clusters,
    metadata: {
      seedEntityId: seed.seedEntityId ?? null,
      caseId: seed.caseId ?? null,
      sources,
      connectedComponents: countConnectedComponents(nodes, edges),
      nodeCount: nodes.length,
      relationshipCount: edges.length,
    },
    createdAt: seed.createdAt,
    updatedAt: seed.updatedAt,
  };
}

function countConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): number {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }
  const visited = new Set<string>();
  let components = 0;
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    components += 1;
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length > 0) {
      const current = queue.pop() as string;
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  return components;
}

export function buildSummary(graph: NetworkGraph): NetworkSummary {
  const meta = graph.metadata;
  const times = ([] as string[])
    .concat(
      graph.nodes.map((n) => n.activityAt).filter(Boolean) as string[],
      graph.edges.map((e) => e.timestamp).filter(Boolean) as string[]
    )
    .sort();
  return {
    id: graph.id,
    name: graph.name,
    description: graph.description,
    status: 'ready',
    nodeCount: graph.nodes.length,
    relationshipCount: graph.edges.length,
    clusterCount: graph.clusters.length,
    connectedComponents: meta.connectedComponents,
    sources: meta.sources ?? [],
    dateRange: {
      start: times[0] ?? null,
      end: times[times.length - 1] ?? null,
    },
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
    caseId: meta.caseId,
    seedEntityId: meta.seedEntityId,
  };
}

export { buildSummary as summarizeNetwork, statusFor, edgeStatusFor };