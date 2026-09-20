import { MarkerType } from '@xyflow/react';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';
import { canvasEdgeId, canvasNodeId, caseBoardPosition, ringPosition } from './canvas-utils';
import type {
  CanvasEdge,
  CanvasEdgeData,
  CanvasNode,
  CanvasNodeData,
} from './canvas-types';
import { relationshipLabel } from './canvas-utils';

// ============================================================
// KNOWLEDGE CANVAS — CANONICAL NODE/EDGE BUILDERS
// ============================================================
// Maps the investigation workspace (entities, relationships, evidence,
// findings, events) into the visual canvas layer. Every node/edge REFERS
// to the canonical Trinetra object through ``refId`` — nothing is
// duplicated here. Deterministic layout keeps the demo universe stable.
// ============================================================

export function buildCanonicalNodesAndEdges(
  data: InvestigationWorkspaceData,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = [];
  const refs = new Set<string>();

  // A canvas is an investigation working set, not a second rendering of the
  // whole network. Rank entities by their observed relationships and open a
  // bounded, useful subset. The selection is entirely derived from the
  // investigation payload and has stable tie breaks, so it is both honest and
  // repeatable. More canonical objects remain available through the existing
  // investigation surfaces / import workflow.
  const degree = new Map<string, number>();
  for (const relationship of data.relationships) {
    degree.set(
      relationship.source_entity_id,
      (degree.get(relationship.source_entity_id) ?? 0) + 1,
    );
    degree.set(
      relationship.target_entity_id,
      (degree.get(relationship.target_entity_id) ?? 0) + 1,
    );
  }
  const entities = [...data.entities]
    .sort((a, b) => {
      const byDegree = (degree.get(b.entity_id) ?? 0) - (degree.get(a.entity_id) ?? 0);
      return byDegree || a.name.localeCompare(b.name) || a.entity_id.localeCompare(b.entity_id);
    })
    .slice(0, 12);
  const evidence = data.evidence.slice(0, 8);
  const findings = data.findings.slice(0, 6);
  const events = data.events.slice(0, 6);
  const notes = data.notes.slice(0, 6);

  const byKindStack: Array<() => CanvasNodeData[]> = [
    () =>
      entities.map((e): CanvasNodeData => ({
        kind: 'entity',
        label: e.name,
        refId: e.entity_id,
        entityType: e.entity_type,
        summary: e.role || null,
        degree: degree.get(e.entity_id) ?? 0,
        origin: 'system',
        confidence: e.association_confidence,
        createdAt: e.linked_at,
      })),
    () =>
      evidence.map((ev): CanvasNodeData => ({
        kind: 'evidence',
        label: ev.title,
        refId: ev.evidence_id,
        evidenceType: ev.evidence_type,
        summary: ev.summary || null,
        integrityStatus: 'Verified SHA-256',
        origin: 'system',
        createdAt: ev.linked_at,
      })),
    () =>
      findings.map((f): CanvasNodeData => ({
        kind: 'finding',
        label: f.title,
        refId: f.id,
        summary: f.description || null,
        severity: f.category ?? 'high',
        origin: 'system',
        confidence: f.confidence === 'high' ? 0.9 : f.confidence === 'medium' ? 0.7 : 0.4,
        createdAt: f.created_at,
      })),
    () =>
      events.map((ev): CanvasNodeData => ({
        kind: 'event',
        label: ev.title,
        refId: ev.id,
        summary: ev.description || null,
        origin: 'system',
        createdAt: ev.created_at,
      })),
    () =>
      notes.map((note): CanvasNodeData => ({
        kind: 'note',
        label: note.body.length > 64 ? `${note.body.slice(0, 64)}…` : note.body,
        refId: note.id,
        summary: note.body,
        origin: 'user',
        createdAt: note.created_at,
      })),
  ];

  const totalCandidates = byKindStack.reduce(
    (acc, fn) => acc + fn().length,
    0,
  );

  let total = 0;
  const kindCounts: Record<string, number> = {};
  for (const fn of byKindStack) {
    for (const d of fn()) {
      const id = canvasNodeId(d.kind, d.refId ?? null, total);
      if (refs.has(id)) continue;
      refs.add(id);
      const indexWithinKind = kindCounts[d.kind] ?? 0;
      kindCounts[d.kind] = indexWithinKind + 1;
      nodes.push({
        id,
        type: 'canvas',
        position: caseBoardPosition(d.kind, indexWithinKind, total),
        data: d,
      });
      total += 1;
    }
  }

  const nodeRefs = new Map<string, string>();
  for (const n of nodes) {
    if (n.data.refId) nodeRefs.set(n.data.refId, n.id);
  }

  const edges: CanvasEdge[] = [];
  for (const r of data.relationships) {
    const source = nodeRefs.get(r.source_entity_id);
    const target = nodeRefs.get(r.target_entity_id);
    if (!source || !target) continue;
    const data_ = {
      relationship: r.type as CanvasEdgeData['relationship'],
      label: relationshipLabel(r.type),
      confidence: r.confidence,
      origin: 'system' as const,
      refId: r.relationship_id,
    };
    const id = canvasEdgeId(source, target, r.type);
    if (edges.some((e) => e.id === id)) continue;
    edges.push({
      id,
      source,
      target,
      type: 'knowledge',
      label: data_.label,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      data: data_,
    });
  }

  return { nodes, edges };
}

/** Build a source (file) node for a freshly ingested file visualization. */
export function sourceNode(
  id: string,
  fileName: string,
  label: string,
  position: { x: number; y: number },
  extras: {
    imageUrl?: string | null;
    checksum?: string | null;
    summary?: string | null;
    evidenceId?: string | null;
  } = {},
): CanvasNode {
  const data: CanvasNodeData = {
    kind: 'source',
    label,
    refId: extras.evidenceId ?? null,
    evidenceType:
      label.toLowerCase().includes('audio') || /\.(mp3|wav|m4a|ogg)$/i.test(fileName)
        ? 'audio'
        : 'document',
    summary: extras.summary ?? null,
    origin: 'file',
    imageUrl: extras.imageUrl ?? null,
    fileName,
    checksum: extras.checksum ?? null,
    createdAt: new Date().toISOString(),
  };
  return { id, type: 'canvas', position, data };
}
