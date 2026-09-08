import type {
  InvestigationDirection,
  InvestigationDirectionPriority,
  InvestigationDirectionType,
  InvestigationDirectionsResponse,
  InvestigationSupportingFact,
  SupportingFactType,
} from '@trinetra-pulse/types';
import { mockInvestigationById } from '@/mock/investigations';
import { mockNetworkGraphById } from '@/mock/networks';
import type { GraphEdge, GraphNode } from '@trinetra-pulse/types';
import { API_BASE_URL, isMockData } from './config';
import { apiFetch } from './client';

// ============================================================
// INVESTIGATION DIRECTION INTELLIGENCE — API ADAPTER (Phase 26)
// ============================================================
// Analytical next-step leads computed by the backend on request
// from persisted investigation records (never persisted, never
// free-text AI). In demo mode a deterministic mirror of the same
// detectors runs over the loaded mock network graph so the UI
// behaves identically. Directions are analytical leads, not
// judgements: they never establish guilt or criminal intent.
// ============================================================

const MAX_TOTAL = 12;
const MAX_PER_TYPE = 4;
const MIN_HUB_DEGREE = 2;
const UNRESOLVED_PAIR_LIMIT = 5;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Compact deterministic hash (djb2) so demo ids stay stable per run. */
function stableHash(payload: string): string {
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function priorityFor(confidence: number): InvestigationDirectionPriority {
  if (confidence >= 0.75) return 'critical';
  if (confidence >= 0.55) return 'high';
  if (confidence >= 0.35) return 'medium';
  return 'low';
}

function stableId(
  type: InvestigationDirectionType,
  title: string,
  entityIds: string[],
  relationshipIds: string[],
): string {
  const payload = [type, title.toLowerCase(), ...entityIds, ...relationshipIds]
    .sort()
    .join('|');
  return `dir-${stableHash(payload)}`;
}

interface DemoScene {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entityIdByNode: Map<string, string>;
  labelByNode: Map<string, string>;
  adjacency: Map<string, Set<string>>;
}

function buildScene(investigationId: string): DemoScene {
  const record = mockInvestigationById.get(investigationId);
  const networkId = record?.networks[0]?.network_id;
  const graph = networkId ? mockNetworkGraphById.get(networkId) : undefined;
  if (!graph) {
    return {
      nodes: [],
      edges: [],
      entityIdByNode: new Map(),
      labelByNode: new Map(),
      adjacency: new Map(),
    };
  }
  const entityIdByNode = new Map<string, string>();
  const labelByNode = new Map<string, string>();
  for (const node of graph.nodes) {
    entityIdByNode.set(node.id, node.entityId);
    labelByNode.set(node.id, node.label);
  }
  const adjacency = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (edge.source === edge.target) continue;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  return { nodes: graph.nodes, edges: graph.edges, entityIdByNode, labelByNode, adjacency };
}

function relatedRelationshipIds(edges: GraphEdge[], nodeId: string): string[] {
  return edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => edge.relationshipId)
    .sort();
}

function articulationNodes(adjacency: Map<string, Set<string>>): string[] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const result: string[] = [];
  const collected = new Set<string>();
  let timer = 0;

  const visit = (node: string, parent: string | null): void => {
    index.set(node, timer);
    low.set(node, timer);
    timer += 1;
    let children = 0;
    for (const neighbor of adjacency.get(node) ?? []) {
      if (!index.has(neighbor)) {
        children += 1;
        visit(neighbor, node);
        low.set(node, Math.min(low.get(node)!, low.get(neighbor)!));
        const isArticulation =
          (parent === null && children > 1) ||
          (parent !== null && (low.get(neighbor)! >= index.get(node)!));
        if (isArticulation && !collected.has(node)) {
          collected.add(node);
          result.push(node);
        }
      } else if (neighbor !== parent) {
        low.set(node, Math.min(low.get(node)!, index.get(neighbor)!));
      }
    }
  };

  for (const node of [...adjacency.keys()].sort()) {
    if (!index.has(node)) visit(node, null);
  }
  return result;
}

function componentCountAfterRemoval(adjacency: Map<string, Set<string>>, removed: string): number {
  const seen = new Set<string>();
  let count = 0;
  for (const start of adjacency.keys()) {
    if (start === removed || seen.has(start)) continue;
    count += 1;
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (neighbor === removed || seen.has(neighbor)) continue;
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
  }
  return count;
}

interface DemoOption {
  investigationId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Map<string, Set<string>>;
  label: (nodeId: string) => string;
  entityId: (nodeId: string) => string;
}

function demoDirections(option: DemoOption): InvestigationDirection[] {
  const { investigationId, nodes, edges, adjacency, label, entityId } = option;
  const directions: InvestigationDirection[] = [];
  const now = new Date().toISOString();

  const factOf = (
    factType: SupportingFactType,
    description: string,
    value: InvestigationSupportingFact['value'],
    links: { entity?: string; relationship?: string; evidence?: string } = {},
  ): InvestigationSupportingFact => ({
    fact_type: factType,
    description,
    entity_id: links.entity ?? null,
    relationship_id: links.relationship ?? null,
    evidence_id: links.evidence ?? null,
    value,
  });

  const degrees = nodes
    .map((node) => ({ node, degree: (adjacency.get(node.id) ?? new Set()).size }))
    .sort((left, right) => right.degree - left.degree || left.node.label.localeCompare(right.node.label));
  const maxDegree = degrees.length > 0 ? Math.max(degrees[0].degree, 1) : 1;

  for (const { node, degree } of degrees) {
    if (degree < MIN_HUB_DEGREE) break;
    directions.push({
      id: stableId('high_connectivity_entity', `Follow connections around ${label(node.id)}`, [entityId(node.id)], relatedRelationshipIds(edges, node.id)),
      investigation_id: investigationId,
      direction_type: 'high_connectivity_entity',
      title: `Follow connections around ${label(node.id)}`,
      summary: `${label(node.id)} has ${degree} recorded relationships, the highest connectivity observed in this investigation.`,
      priority: priorityFor(clamp(0.3 + 0.5 * (degree / maxDegree))),
      confidence: clamp(0.3 + 0.5 * (degree / maxDegree)),
      rationale: `${label(node.id)} is connected to ${degree} other entities. Its neighbors are likely worth reviewing first.`,
      supporting_facts: [factOf('degree_observed', `Recorded relationships involving ${label(node.id)}.`, degree, { entity: entityId(node.id) })],
      related_entity_ids: [entityId(node.id)],
      related_relationship_ids: relatedRelationshipIds(edges, node.id),
      related_evidence_ids: [],
      status: 'new',
      created_at: now,
    });
    if (directions.length >= MAX_PER_TYPE) break;
  }

  const articulation = articulationNodes(adjacency);
  const articulationMax = articulation.reduce(
    (max, node) => Math.max(max, (adjacency.get(node) ?? new Set()).size),
    1,
  );
  for (const node of articulation) {
    const componentsAfter = componentCountAfterRemoval(adjacency, node);
    const degree = (adjacency.get(node) ?? new Set()).size;
    directions.push({
      id: stableId('bridge_entity', `Investigate bridge entity ${label(node)}`, [entityId(node)], []),
      investigation_id: investigationId,
      direction_type: 'bridge_entity',
      title: `Investigate bridge entity ${label(node)}`,
      summary: `${label(node)} is an articulation point: removing it would split the recorded network into ${componentsAfter} components.`,
      priority: priorityFor(clamp(0.35 + 0.25 * (componentsAfter - 1) + 0.2 * (degree / articulationMax))),
      confidence: clamp(0.35 + 0.25 * (componentsAfter - 1) + 0.2 * (degree / articulationMax)),
      rationale: `${label(node)} bridges otherwise separate parts of the network (degree ${degree}). Activity through it is a high-leverage review point.`,
      supporting_facts: [
        factOf('articulation_point', `Removing ${label(node)} disconnects the recorded graph into ${componentsAfter} parts.`, componentsAfter, { entity: entityId(node) }),
        factOf('degree_observed', `Recorded degree of ${label(node)}.`, degree, { entity: entityId(node) }),
      ],
      related_entity_ids: [entityId(node)],
      related_relationship_ids: [],
      related_evidence_ids: [],
      status: 'new',
      created_at: now,
    });
  }

  const hubs = [...adjacency.keys()].sort(
    (left, right) => (adjacency.get(right)?.size ?? 0) - (adjacency.get(left)?.size ?? 0) || left.localeCompare(right),
  );
  let unresolvedCount = 0;
  for (const hub of hubs) {
    const neighbors = [...(adjacency.get(hub) ?? [])].sort();
    for (let index = 0; index < neighbors.length; index += 1) {
      for (let other = index + 1; other < neighbors.length; other += 1) {
        const left = neighbors[index];
        const right = neighbors[other];
        if (adjacency.get(left)?.has(right) || adjacency.get(right)?.has(left)) continue;
        const shared = edges
          .filter((edge) => {
            const endpoints = new Set([edge.source, edge.target]);
            return (
              (endpoints.has(hub) && endpoints.has(left)) ||
              (endpoints.has(hub) && endpoints.has(right))
            );
          })
          .flatMap((edge) => edge.evidence);
        const sharedSet = [...new Set(shared)];
        directions.push({
          id: stableId('unresolved_connection', `Check for a missing link between ${label(left)} and ${label(right)}`, [entityId(left), entityId(right), entityId(hub)], []),
          investigation_id: investigationId,
          direction_type: 'unresolved_connection',
          title: `Check for a missing link between ${label(left)} and ${label(right)}`,
          summary: `${label(left)} and ${label(right)} are both connected to ${label(hub)} but no direct relationship is recorded between them.`,
          priority: priorityFor(clamp(0.4 + 0.3 * ((adjacency.get(hub)?.size ?? 1) - 1) / Math.max(adjacency.get(hub)?.size ?? 1, 1))),
          confidence: clamp(0.4 + 0.3 * ((adjacency.get(hub)?.size ?? 1) - 1) / Math.max(adjacency.get(hub)?.size ?? 1, 1)),
          rationale: 'Recorded relationships place these entities in the same neighbourhood without a direct edge — an unrecorded relationship is plausible and worth checking.',
          supporting_facts: [factOf('unresolved_pair', `Shared connection to ${label(hub)}.`, right)],
          related_entity_ids: [entityId(left), entityId(right), entityId(hub)],
          related_relationship_ids: [],
          related_evidence_ids: sharedSet,
          status: 'new',
          created_at: now,
        });
        unresolvedCount += 1;
        if (unresolvedCount >= UNRESOLVED_PAIR_LIMIT) break;
      }
      if (unresolvedCount >= UNRESOLVED_PAIR_LIMIT) break;
    }
    if (unresolvedCount >= UNRESOLVED_PAIR_LIMIT) break;
  }

  const candidates = edges
    .filter((edge) => edge.status === 'candidate')
    .sort((left, right) => right.confidence - left.confidence);
  let gapCount = 0;
  let verificationCount = 0;
  for (const edge of candidates) {
    const counterparty = `${label(edge.source)}–${label(edge.target)}`;
    if (edge.evidence.length === 0) {
      directions.push({
        id: stableId('evidence_gap', `Find evidence for the ${counterparty} relationship`, [], [edge.relationshipId]),
        investigation_id: investigationId,
        direction_type: 'evidence_gap',
        title: `Find evidence for the ${counterparty} relationship`,
        summary: `There is no recorded evidence reference behind the ${counterparty} relationship.`,
        priority: priorityFor(clamp(0.55 + 0.15 * (1 - edge.confidence))),
        confidence: clamp(0.55 + 0.15 * (1 - edge.confidence)),
        rationale: 'The relationship is recorded but carries zero backing evidence; locating corroborating material would strengthen the record.',
        supporting_facts: [factOf('relationship_without_evidence', 'Relationship has no recorded evidence reference.', 0, { relationship: edge.relationshipId })],
        related_entity_ids: [entityId(edge.source), entityId(edge.target)],
        related_relationship_ids: [edge.relationshipId],
        related_evidence_ids: [],
        status: 'new',
        created_at: now,
      });
      gapCount += 1;
      if (gapCount >= MAX_PER_TYPE) break;
    } else {
      directions.push({
        id: stableId('relationship_verification', `Verify the ${counterparty} relationship`, [], [edge.relationshipId]),
        investigation_id: investigationId,
        direction_type: 'relationship_verification',
        title: `Verify the ${counterparty} relationship`,
        summary: `The ${counterparty} relationship still has verification status needs_review despite recorded references.`,
        priority: priorityFor(clamp(0.5 + 0.2 * edge.confidence)),
        confidence: clamp(0.5 + 0.2 * edge.confidence),
        rationale: `${edge.evidence.length} recorded evidence reference(s) have not yet been evaluated against this relationship.`,
        supporting_facts: [factOf('verification_pending', `Relationship unverified with ${edge.evidence.length} evidence reference(s).`, edge.evidence.length, { relationship: edge.relationshipId })],
        related_entity_ids: [entityId(edge.source), entityId(edge.target)],
        related_relationship_ids: [edge.relationshipId],
        related_evidence_ids: [],
        status: 'new',
        created_at: now,
      });
      verificationCount += 1;
      if (verificationCount >= MAX_PER_TYPE) break;
    }
  }

  const orderRank: Record<InvestigationDirectionPriority, number> = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
  };
  return directions
    .sort(
      (left, right) =>
        orderRank[right.priority] - orderRank[left.priority] ||
        right.confidence - left.confidence,
    )
    .slice(0, MAX_TOTAL);
}

/** Deterministic demo generator over the loaded mock workspace graph. */
export function buildDemoDirections(investigationId: string): InvestigationDirectionsResponse {
  const scene = buildScene(investigationId);
  const directions = demoDirections({
    investigationId,
    nodes: scene.nodes,
    edges: scene.edges,
    adjacency: scene.adjacency,
    label: (nodeId) => scene.labelByNode.get(nodeId) ?? nodeId,
    entityId: (nodeId) => scene.entityIdByNode.get(nodeId) ?? nodeId,
  });
  return {
    investigation_id: investigationId,
    computed_at: new Date().toISOString(),
    directions,
  };
}

/** Fetch grounded directions for an investigation (demo or real API). */
export async function getInvestigationDirections(
  investigationId: string,
): Promise<InvestigationDirectionsResponse> {
  if (isMockData()) {
    return buildDemoDirections(investigationId);
  }
  return apiFetch<InvestigationDirectionsResponse>(
    API_BASE_URL,
    `/investigations/${investigationId}/directions`,
  );
}

export type { InvestigationDirection, InvestigationDirectionsResponse };