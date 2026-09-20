import type { Node, Edge } from '@xyflow/react';
import type { EntityType, RelationshipKind } from '@trinetra-pulse/types';

// ============================================================
// KNOWLEDGE CANVAS — TYPED GRAPH CONTRACT
// ============================================================
// The Canvas is a visual investigation layer over Trinetra's canonical
// investigation objects. Every node/edge that maps to a real Trinetra
// object carries its canonical ``refId``; the Canvas never duplicates the
// authoritative store — objects that exist in Trinetra are referenced,
// objects invented on the Canvas (notes, concept annotations, transient
// file visualizations) are explicitly marked with a local origin.
// ============================================================

/** The visual families a Canvas node can belong to. */
export type CanvasNodeKind =
  | 'entity' // canonical Trinetra entity
  | 'evidence' // canonical Trinetra evidence
  | 'finding' // canonical Trinetra finding
  | 'event' // canonical Trinetra timeline event
  | 'note' // investigator annotation (canvas-local)
  | 'source' // uploaded file visualization (transient)
  | 'concept'; // investigator concept / annotation

/** Where a node/edge came from. Drives audit + merge semantics. */
export type CanvasOrigin = 'system' | 'user' | 'ai' | 'cdr' | 'file' | 'whisper';

/** Node payload. ``Record<string, unknown>`` keeps @xyflow/react v12 happy. */
export interface CanvasNodeData extends Record<string, unknown> {
  kind: CanvasNodeKind;
  label: string;
  /** Canonical Trinetra object id when this node references one. */
  refId?: string | null;
  entityType?: EntityType | null;
  evidenceType?: string | null;
  summary?: string | null;
  origin: CanvasOrigin;
  confidence?: number | null;
  createdAt: string;
  /** Transient object URL for an image preview (never authoritative). */
  imageUrl?: string | null;
  fileName?: string | null;
  checksum?: string | null;
  transcript?: string | null;
  selected?: boolean;
  degree?: number;
  focusedCenter?: boolean;
  dimmed?: boolean;
  severity?: string | null;
  integrityStatus?: string | null;
}

export type CanvasNode = Node<CanvasNodeData>;

/** Edge payload. */
export interface CanvasEdgeData extends Record<string, unknown> {
  relationship?: RelationshipKind | null;
  label: string;
  confidence?: number | null;
  origin: CanvasOrigin;
  /** Canonical relationship id when this edge references one. */
  refId?: string | null;
}

export type CanvasEdge = Edge<CanvasEdgeData>;

/** The tabs available inside the full Canvas workspace. */
export type CanvasTab =
  | 'graph'
  | 'network'
  | 'directions'
  | 'report'
  | 'legal'
  | 'visualization'
  | 'audit'
  | 'settings';

export const CANVAS_TABS: readonly CanvasTab[] = [
  'graph',
  'network',
  'directions',
  'report',
  'legal',
  'visualization',
  'audit',
  'settings',
];

/** Canvas-local audit entry (UI journal; not a second evidence system). */
export interface CanvasAuditEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
  actor: string;
}

/** A single AI conversation message rendered in the Investigator panel. */
export interface CanvasChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  sources?: { id: string; sourceType: string; label: string }[];
  limitations?: string[];
}

// ------------------------------------------------------------
// Geometric layout constants (deterministic — the demo universe
// must render identically on every machine).
// ------------------------------------------------------------

export const CANVAS_GRID_X = 280;
export const CANVAS_GRID_Y = 200;
export const CANVAS_ROW_OFFSET = 34;
export const CANVAS_COL_OFFSET = 44;
export const CANVAS_CENTER = { x: 0, y: 0 };
export const CANVAS_RING_START = 280;
export const CANVAS_RING_STEP = 220;

/** Entity type → accent color token used by node glyphs. */
export const KIND_TO_TOKEN: Record<string, string> = {
  person: 'entity-person',
  phone: 'entity-phone',
  vehicle: 'entity-vehicle',
  location: 'entity-location',
  organization: 'entity-organization',
  account: 'entity-account',
  transaction: 'entity-transaction',
  event: 'entity-event',
  case: 'entity-case',
  document: 'entity-document',
  evidence: 'evidence',
  finding: 'anomaly',
  note: 'brand',
  source: 'network',
  concept: 'ai',
};