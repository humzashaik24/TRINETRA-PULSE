import type {
  GraphEdge,
  GraphNeighborhood,
  GraphNode,
  GraphTimelineRange,
  NetworkPath,
  NetworkSearchResult,
  NetworkStatistics,
  NetworkSummary,
  NetworkGraph,
} from '@trinetra-pulse/types';
import {
  mockNetworkGraphById,
  mockNetworkGraphs,
  mockNetworkSummaries,
  mockNetworkSummaryById,
} from '@/mock/networks';
import { buildSummary, edgeStatusFor, statusFor } from '@/mock/networks/build';
import {
  formatAccountDigits,
  formatPhoneDigits,
  normalizePhone,
  type CdrRecord,
} from '@/lib/cdr/cdr-parse';

// ============================================================
// NETWORK SERVICE (mock-backed)
// ============================================================
// Graph query surface over the Phase 7 mock network catalogue.
// Each method mirrors an eventual REST endpoint so the API client
// can replace this implementation transparently.
// ============================================================

const LATENCY = 160;

const delay = (ms: number = LATENCY) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const adjacency = (graph: NetworkGraph) => {
  const map = new Map<string, string[]>();
  for (const n of graph.nodes) map.set(n.id, []);
  for (const e of graph.edges) {
    map.get(e.source)?.push(e.target);
    map.get(e.target)?.push(e.source);
  }
  return map;
};

const requireGraph = (id: string): NetworkGraph => {
  const graph = mockNetworkGraphById.get(id);
  if (!graph) throw new Error(`Network not found: ${id}`);
  return graph;
};

export interface GraphNeighborhoodOptions {
  depth?: number;
  includeEdges?: boolean;
}

/** Discover the k-hop neighborhood around a node (mock). */
export function expandNeighborhood(
  graph: NetworkGraph,
  centerId: string,
  options: GraphNeighborhoodOptions = {}
): GraphNeighborhood {
  const depth = options.depth ?? 1;
  const adj = adjacency(graph);
  const included = new Set<string>([centerId]);
  const frontier = [centerId];
  for (let hop = 0; hop < depth; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adj.get(id) ?? []) {
        if (!included.has(neighbor)) {
          included.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier.splice(0, frontier.length, ...next);
  }
  const nodes = graph.nodes.filter((n) => included.has(n.id));
  const edges = graph.edges.filter(
    (e) => included.has(e.source) && included.has(e.target)
  );
  return {
    centerId,
    nodes,
    edges: options.includeEdges === false ? [] : edges,
  };
}

/** Compute statistics for a graph or a visible subset. */
export function computeStatistics(
  graph: NetworkGraph,
  visible?: { nodes: Set<string>; edges: Set<string> }
): NetworkStatistics {
  const nodeCount = visible ? visible.nodes.size : graph.nodes.length;
  const edgeCount = visible ? visible.edges.size : graph.edges.length;
  const degrees = new Map<string, number>();
  for (const id of visible ? visible.nodes : new Set(graph.nodes.map((n) => n.id))) {
    degrees.set(id, 0);
  }
  const considerEdge = (e: GraphEdge) =>
    !visible || (visible.nodes.has(e.source) && visible.nodes.has(e.target));
  for (const e of graph.edges) {
    if (!considerEdge(e)) continue;
    if (!degrees.has(e.source)) degrees.set(e.source, 0);
    if (!degrees.has(e.target)) degrees.set(e.target, 0);
    degrees.set(e.source, (degrees.get(e.source) ?? 0) + 1);
    degrees.set(e.target, (degrees.get(e.target) ?? 0) + 1);
  }
  const degreeSum = Array.from(degrees.values()).reduce((a, b) => a + b, 0);
  const averageDegree = nodeCount > 0 ? degreeSum / nodeCount : 0;
  const possible = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 0;
  const density = possible > 0 ? edgeCount / possible : 0;
  return {
    networkId: graph.id,
    nodes: nodeCount,
    relationships: edgeCount,
    clusters: graph.clusters.length,
    connectedComponents: graph.metadata.connectedComponents,
    averageDegree: Math.round(averageDegree * 100) / 100,
    density: Math.round(density * 10000) / 10000,
  };
}

// ---- public API ----------------------------------------------------------

export async function getNetworks(): Promise<NetworkSummary[]> {
  await delay(120);
  return [...mockNetworkSummaries];
}

export async function getNetwork(id: string): Promise<NetworkGraph> {
  await delay(140);
  return requireGraph(id);
}

export async function getNetworkSummary(id: string): Promise<NetworkSummary> {
  await delay(100);
  const summary = mockNetworkSummaryById.get(id);
  if (!summary) throw new Error(`Network not found: ${id}`);
  return summary;
}

export async function getNodes(id: string): Promise<GraphNode[]> {
  await delay(100);
  return [...requireGraph(id).nodes];
}

export async function getEdges(id: string): Promise<GraphEdge[]> {
  await delay(100);
  return [...requireGraph(id).edges];
}

export async function getNeighbors(
  id: string,
  nodeId: string,
  options: GraphNeighborhoodOptions = {}
): Promise<GraphNeighborhood> {
  await delay(120);
  return expandNeighborhood(requireGraph(id), nodeId, options);
}

export async function findPath(
  id: string,
  startId: string,
  endId: string
): Promise<NetworkPath | null> {
  await delay(180);
  const graph = requireGraph(id);
  if (startId === endId) {
    return {
      startEntityId: startId,
      endEntityId: endId,
      nodeIds: [startId],
      edgeIds: [],
      length: 0,
      confidence: 1,
    };
  }
  const start = graph.nodes.find((n) => n.id === startId || n.entityId === startId);
  const end = graph.nodes.find((n) => n.id === endId || n.entityId === endId);
  if (!start || !end) throw new Error('Start or end node not found');

  // BFS to find the shortest path, storing predecessor (node) and edge.
  const parentNode = new Map<string, string>();
  const parentEdge = new Map<string, string>();
  const queue = [start.id];
  const visited = new Set([start.id]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === end.id) break;
    for (const e of graph.edges) {
      let neighbor: string | null = null;
      let edgeId = '';
      if (e.source === current) {
        neighbor = e.target;
        edgeId = e.id;
      } else if (e.target === current) {
        neighbor = e.source;
        edgeId = e.id;
      }
      if (neighbor !== null && !visited.has(neighbor)) {
        visited.add(neighbor);
        parentNode.set(neighbor, current);
        parentEdge.set(neighbor, edgeId);
        queue.push(neighbor);
      }
    }
  }
  if (!visited.has(end.id)) return null;

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cursor: string | null = end.id;
  while (cursor !== null && cursor !== start.id) {
    nodeIds.unshift(cursor);
    const e = parentEdge.get(cursor);
    if (e) edgeIds.unshift(e);
    cursor = parentNode.get(cursor) ?? null;
  }
  nodeIds.unshift(start.id);

  const pathEdges = graph.edges.filter((e) => edgeIds.includes(e.id));
  const confidence =
    pathEdges.length > 0
      ? pathEdges.reduce((sum, e) => sum + e.confidence, 0) / pathEdges.length
      : 1;

  return {
    startEntityId: start.entityId,
    endEntityId: end.entityId,
    nodeIds,
    edgeIds,
    length: nodeIds.length - 1,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export interface TimelineFilterInput {
  from?: string;
  to?: string;
}

export async function getTimeline(
  id: string,
  range: GraphTimelineRange = { from: null, to: null }
): Promise<GraphTimelineRange> {
  await delay(100);
  const graph = requireGraph(id);
  const timestamps = graph.edges.map((e) => e.timestamp).filter(Boolean) as string[];
  const min = timestamps.length ? timestamps.reduce((a, b) => (a < b ? a : b)) : graph.createdAt;
  const max = timestamps.length ? timestamps.reduce((a, b) => (a > b ? a : b)) : graph.updatedAt;
  return {
    from: range.from ?? min,
    to: range.to ?? max,
  };
}

export interface NetworkSearchParams {
  query: string;
  networkId?: string;
}

export async function searchNetwork(params: NetworkSearchParams): Promise<NetworkSearchResult[]> {
  await delay(140);
  const q = params.query.trim().toLowerCase();
  if (!q) return [];
  const graphs = params.networkId
    ? [requireGraph(params.networkId)]
    : mockNetworkGraphs;

  const results: NetworkSearchResult[] = [];
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      const haystack = `${node.label} ${node.entityId} ${node.id}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          id: node.id,
          kind: 'node',
          entityId: node.entityId,
          label: node.label,
          type: node.type,
          confidence: node.confidence,
          connections: node.connections,
          sourcesCount: node.sources.length,
          status: node.status,
        });
      }
    }
    for (const edge of graph.edges) {
      const haystack = edge.label.toLowerCase();
      if (!q || haystack.includes(q) || edge.id.toLowerCase().includes(q)) {
        results.push({
          id: edge.id,
          kind: 'edge',
          entityId: edge.id,
          label: `${edge.label} (${edge.source} → ${edge.target})`,
          type: 'relationship',
          confidence: edge.confidence,
          status: edge.status,
        });
      }
    }
  }
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 40);
}

export async function getClusters(id: string): Promise<NetworkGraph['clusters']> {
  await delay(100);
  return requireGraph(id).clusters;
}

export async function getStatistics(id: string): Promise<NetworkStatistics> {
  await delay(100);
  return computeStatistics(requireGraph(id));
}

// ------------------------------------------------------------
// KNOWLEDGE CANVAS — CDR / CSV GRAPH EXPANSION (mock)
// ------------------------------------------------------------
// Expands a network graph with Phone/Account nodes + edges derived
// from parsed CDR / transaction rows. Pure + deterministic: the same
// input records always produce the same graph projection, which lets
// the demo and the tests exercise identical behaviour.
// ------------------------------------------------------------

export interface NetworkExpansionNode {
  /** Internal graph node id. */
  nodeId: string;
  /** Canonical entity id (ent-phone-cdr-…) for downstream links. */
  entityId: string;
  label: string;
  type: 'phone' | 'account';
}

export interface NetworkCdrExpansion {
  /** The projected graph — input plus new nodes/edges. */
  graph: NetworkGraph;
  nodesCreated: NetworkExpansionNode[];
  edgesCreated: GraphEdge[];
  /** Existing nodes the import matched (deduplicated). */
  matchedExisting: NetworkExpansionNode[];
  communicationRecords: number;
  transactionRecords: number;
  skippedRecords: number;
  datasetName: string;
}

export interface NetworkCdrExpansionInput {
  graph: NetworkGraph;
  records: CdrRecord[];
  datasetName: string;
}

const CDR_EXTRACTION_METHOD = 'STRUCTURED_MAPPING';
const PHONE_CONFIDENCE = 0.9;
const TRANSACTION_CONFIDENCE = 0.85;

function cloneGraph(graph: NetworkGraph): NetworkGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({ ...n, metadata: { ...n.metadata } })),
    edges: graph.edges.map((e) => ({ ...e, metadata: { ...e.metadata } })),
    clusters: graph.clusters.map((c) => ({ ...c })),
    metadata: { ...graph.metadata },
  };
}

function recomputeDegrees(nodes: GraphNode[], edges: GraphEdge[]): void {
  const degree = new Map<string, number>();
  for (const node of nodes) degree.set(node.id, 0);
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) node.connections = degree.get(node.id) ?? 0;
}

function countComponents(nodes: GraphNode[], edges: GraphEdge[]): number {
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

function edgeLabelForType(kind: 'call' | 'sent_transaction', callType: CdrCallType): string {
  if (kind === 'sent_transaction') return 'sent transaction';
  switch (callType) {
    case 'VOICE':
      return 'call';
    case 'SMS':
      return 'message';
    case 'DATA':
      return 'data session';
    default:
      return 'communication';
  }
}

type CdrCallType = 'VOICE' | 'SMS' | 'DATA' | 'UNKNOWN';

/**
 * Pure projection of parsed CDR / transaction records onto a graph.
 * New phone/account nodes are created when the import references a
 * number that is not already present; otherwise the existing node is
 * reused (matched). Returns the projected graph plus the delta.
 */
export function buildCdrNetworkExpansion(
  input: NetworkCdrExpansionInput
): NetworkCdrExpansion {
  const { graph, records, datasetName } = input;
  const next = cloneGraph(graph);

  const phoneByDigits = new Map<string, GraphNode>();
  const accountByDigits = new Map<string, GraphNode>();
  for (const node of next.nodes) {
    if (node.type === 'phone') {
      const key = normalizePhone(node.label) ?? node.label.replace(/\D/g, '');
      phoneByDigits.set(key, node);
    }
    if (node.type === 'account') accountByDigits.set(node.label.replace(/\D/g, ''), node);
  }

  const nodesCreated: NetworkExpansionNode[] = [];
  const edgesCreated: GraphEdge[] = [];
  const matchedExisting = new Map<string, NetworkExpansionNode>();

  let addedEdges = 0;
  let addedNodes = 0;
  const edgeKey = new Set<string>();
  for (const edge of next.edges) {
    edgeKey.add(`${edge.source}|${edge.target}|${edge.type}`);
  }
  const createdEntityIds = new Set<string>();
  const trackMatched = (node: GraphNode, type: 'phone' | 'account') => {
    if (createdEntityIds.has(node.entityId)) return;
    if (!matchedExisting.has(node.entityId)) {
      matchedExisting.set(node.entityId, {
        nodeId: node.id,
        entityId: node.entityId,
        label: node.label,
        type,
      });
    }
  };

  const ensureNode = (
    type: 'phone' | 'account',
    digits: string,
    display: string,
    timestamp: string | null
  ): GraphNode => {
    const byDigits = type === 'phone' ? phoneByDigits : accountByDigits;
    const existing = byDigits.get(digits);
    if (existing) {
      trackMatched(existing, type);
      return existing;
    }
    const entityId = `${type === 'phone' ? 'ent-phone' : 'ent-account'}-cdr-${String(addedNodes + 1).padStart(3, '0')}`;
    const nodeId = `${graph.id}-cdr-${type === 'phone' ? 'ph' : 'ac'}-${String(addedNodes + 1).padStart(3, '0')}`;
    const confidence = type === 'phone' ? PHONE_CONFIDENCE : TRANSACTION_CONFIDENCE;
    const node: GraphNode = {
      id: nodeId,
      entityId,
      type,
      label: display,
      displayLabel: display,
      status: statusFor(confidence),
      confidence,
      position: { x: 0, y: 0 },
      size: 13,
      style: { size: 13, shape: 'circle' },
      connections: 0,
      sources: [datasetName],
      activityAt: timestamp ?? undefined,
      metadata: { source: 'cdn-expansion' as string, dataset: datasetName },
    };
    next.nodes.push(node);
    byDigits.set(digits, node);
    createdEntityIds.add(entityId);
    addedNodes += 1;
    nodesCreated.push({ nodeId, entityId, label: display, type });
    return node;
  };

const addEdge = (
    a: GraphNode,
    b: GraphNode,
    kind: 'call' | 'sent_transaction',
    record: CdrRecord
  ): void => {
    const type = kind === 'call' ? 'KNOWS' : 'SENT_TRANSACTION';
    const key = `${a.id}|${b.id}|${type}`;
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    addedEdges += 1;
    const confidence = kind === 'call' ? PHONE_CONFIDENCE : TRANSACTION_CONFIDENCE;
    const direction = kind === 'call' ? 'undirected' : 'directed';
    const label =
      kind === 'call'
        ? edgeLabelForType(kind, (record as { type?: CdrCallType }).type ?? 'UNKNOWN')
        : 'sent transaction';
    const edge: GraphEdge = {
      id: `${graph.id}-cdr-e-${String(addedEdges).padStart(3, '0')}`,
      relationshipId: `rel-cdr-${addedEdges}`,
      source: a.id,
      target: b.id,
      type,
      label,
      confidence,
      status: edgeStatusFor(confidence),
      direction,
      weight: confidence,
      sourceRecordLabel: `${datasetName} row ${record.sourceRow}`,
      timestamp: record.timestamp ?? undefined,
      evidence: [`${datasetName} row ${record.sourceRow}`],
      extractionMethod: CDR_EXTRACTION_METHOD,
      metadata: {},
    };
    next.edges.push(edge);
    edgesCreated.push(edge);
  };

  let communicationRecords = 0;
  let transactionRecords = 0;
  for (const record of records) {
    if (record.kind === 'communication') {
      communicationRecords += 1;
      const a = ensureNode('phone', record.caller, formatPhoneDigits(record.caller), record.timestamp);
      const b = ensureNode('phone', record.callee, formatPhoneDigits(record.callee), record.timestamp);
      addEdge(a, b, 'call', record);
    } else {
      transactionRecords += 1;
      const a = ensureNode('account', record.fromAccount, formatAccountDigits(record.fromAccount), record.timestamp);
      const b = ensureNode('account', record.toAccount, formatAccountDigits(record.toAccount), record.timestamp);
      addEdge(a, b, 'sent_transaction', record);
    }
  }

  recomputeDegrees(next.nodes, next.edges);
  next.metadata = {
    ...next.metadata,
    nodeCount: next.nodes.length,
    relationshipCount: next.edges.length,
    connectedComponents: countComponents(next.nodes, next.edges),
  };
  next.updatedAt = new Date().toISOString();

  const matchedExistingList = Array.from(matchedExisting.values()).sort((a, b) =>
    a.entityId.localeCompare(b.entityId)
  );

  return {
    graph: next,
    nodesCreated,
    edgesCreated,
    matchedExisting: matchedExistingList,
    communicationRecords,
    transactionRecords,
    skippedRecords: 0,
    datasetName,
  };
}

/**
 * Apply parsed CDR / transaction records to the live mock network
 * catalogue, updating the graph, its summary and the list view so
 * the whole workspace (network list, graph store, search) observes
 * the expansion on the next read.
 */
export async function expandNetworkWithCdr(
  networkId: string,
  records: CdrRecord[],
  options: { datasetName?: string } = {}
): Promise<NetworkCdrExpansion> {
  await delay(240);
  const graph = requireGraph(networkId);
  const datasetName =
    options.datasetName ??
    `CDR import ${new Date().toISOString().slice(0, 10)}`;
  const expansion = buildCdrNetworkExpansion({ graph, records, datasetName });

  mockNetworkGraphById.set(networkId, expansion.graph);
  mockNetworkGraphs.splice(
    0,
    mockNetworkGraphs.length,
    ...mockNetworkGraphs.map((g) => (g.id === networkId ? expansion.graph : g))
  );
  const rebuilt = mockNetworkGraphs.map(
    (g) => mockNetworkSummaryById.get(g.id) ?? buildSummary(g)
  );
  mockNetworkSummaryById.set(networkId, buildSummary(expansion.graph));
  mockNetworkSummaries.splice(0, mockNetworkSummaries.length, ...rebuilt);

  return expansion;
}
