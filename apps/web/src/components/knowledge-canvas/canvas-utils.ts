import type { XYPosition } from '@xyflow/react';
import type { RelationshipKind } from '@trinetra-pulse/types';
import {
  CANVAS_COL_OFFSET,
  CANVAS_CENTER,
  CANVAS_GRID_X,
  CANVAS_GRID_Y,
  CANVAS_RING_START,
  CANVAS_RING_STEP,
  CANVAS_ROW_OFFSET,
  type CanvasNodeKind,
  type CanvasOrigin,
} from './canvas-types';

// ============================================================
// KNOWLEDGE CANVAS — DETERMINISTIC UTILITIES
// ============================================================
// Pure helpers for node identity, deterministic placement and file
// classification. No random / clock state so tests and the demo
// universe render identically everywhere.
// ============================================================

/** Clamp a slot index into a readable, stable numeric id. */
function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

/** Build a deterministic canvas node id from kind + canonical ref. */
export function canvasNodeId(kind: CanvasNodeKind, refId: string | null, index = 0): string {
  const base = refId ? slug(refId) : `${index}`;
  return `n-${kind}-${base}`;
}

/** Build a deterministic edge id from source/target refs. */
export function canvasEdgeId(
  sourceId: string,
  targetId: string,
  relationship: string | null,
  index = 0,
): string {
  return `e-${slug(sourceId)}->${slug(targetId)}${relationship ? `-${slug(relationship)}` : ''}${index ? `-${index}` : ''}`;
}

/**
 * Deterministic freeform case board layout. Places the primary hub entity
 * at origin, evidence top-left, connected entities to the right, findings
 * bottom-right, and notes/events bottom-left.
 */
export function caseBoardPosition(
  kind: CanvasNodeKind,
  indexWithinKind: number,
  globalIndex: number,
): XYPosition {
  if (kind === 'entity' && indexWithinKind === 0) {
    return { x: CANVAS_CENTER.x, y: CANVAS_CENTER.y };
  }
  if (kind === 'entity') {
    const col = (indexWithinKind - 1) % 2;
    const row = Math.floor((indexWithinKind - 1) / 2);
    return {
      x: Math.round(CANVAS_CENTER.x + 360 + col * 320),
      y: Math.round(CANVAS_CENTER.y - 100 + row * 200),
    };
  }
  if (kind === 'evidence' || kind === 'source') {
    const col = indexWithinKind % 2;
    const row = Math.floor(indexWithinKind / 2);
    return {
      x: Math.round(CANVAS_CENTER.x - 360 + col * 320),
      y: Math.round(CANVAS_CENTER.y - 240 - row * 200),
    };
  }
  if (kind === 'finding') {
    const col = indexWithinKind % 2;
    const row = Math.floor(indexWithinKind / 2);
    return {
      x: Math.round(CANVAS_CENTER.x + 360 + col * 320),
      y: Math.round(CANVAS_CENTER.y + 240 + row * 200),
    };
  }
  const col = indexWithinKind % 2;
  const row = Math.floor(indexWithinKind / 2);
  return {
    x: Math.round(CANVAS_CENTER.x - 360 + col * 320),
    y: Math.round(CANVAS_CENTER.y + 240 + row * 200),
  };
}

/**
 * Deterministic ring layout. Nodes are placed on concentric rings centered
 * on CANVAS_CENTER so the demo universe always opens in the same shape.
 */
export function ringPosition(index: number, total: number): XYPosition {
  if (total <= 1) return { x: CANVAS_CENTER.x, y: CANVAS_CENTER.y };
  if (index === 0) return { x: CANVAS_CENTER.x, y: CANVAS_CENTER.y };
  const adjusted = index - 1;
  const ring = Math.floor(
    (Math.sqrt(8 * adjusted + 1) - 1) / 2,
  ) || 0;
  const ringCount = Math.max(1, ring);
  const radius = CANVAS_RING_START + (ringCount - 1) * CANVAS_RING_STEP;
  const perRing = Math.max(1, Math.floor(adjusted / ringCount + 1));
  const slot = adjusted - (ring * (ring + 1)) / 2;
  const angle = (slot / Math.max(1, perRing)) * Math.PI * 2;
  return {
    x: Math.round(CANVAS_CENTER.x + radius * Math.cos(angle)),
    y: Math.round(CANVAS_CENTER.y + radius * Math.sin(angle)),
  };
}

/**
 * Deterministic fan-out for freshly added nodes (3-per-row, reference
 * behaviour) placed relative to a center anchor.
 */
export function fanPosition(index: number, anchor: XYPosition = CANVAS_CENTER): XYPosition {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: Math.round(anchor.x + col * CANVAS_COL_OFFSET - CANVAS_COL_OFFSET),
    y: Math.round(anchor.y + row * CANVAS_ROW_OFFSET),
  };
}

/** Deterministic grid position for imported CDR/file nodes. */
export function gridPosition(index: number): XYPosition {
  return {
    x: Math.round(CANVAS_CENTER.x + (index % 6) * CANVAS_GRID_X - (2.5 * CANVAS_GRID_X)),
    y: Math.round(CANVAS_CENTER.y + Math.floor(index / 6) * CANVAS_GRID_Y + 120),
  };
}

/** Human friendly filename → label (reference displayNameFor). */
export function displayLabelFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-zA-Z0-9]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classify an uploaded file for its visual node. */
export type FileKind = 'image' | 'audio' | 'video' | 'pdf' | 'document' | 'data' | 'other';

export function kindForFile(fileName: string, mimeType: string): FileKind {
  const name = fileName.toLowerCase();
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/.test(name)) return 'image';
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm|flac)$/.test(name)) return 'audio';
  if (mimeType.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/.test(name)) return 'video';
  if (mimeType === 'application/pdf' || /\.pdf$/.test(name)) return 'pdf';
  if (mimeType === 'text/csv' || /\.csv$/.test(name)) return 'data';
  if (mimeType.startsWith('text/') || /\.(txt|md|docx?|pptx?|xlsx?)$/.test(name)) return 'document';
  return 'other';
}

/** SHA-256 over a blob (preview checksum — authoritative integrity lives
 *  server-side in Trinetra's evidence-integrity system). */
export async function sha256Hex(blob: Blob): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return '';
  try {
    const bytes = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

/** Relationship kind → friendly display label. */
export function relationshipLabel(type: RelationshipKind | string | null | undefined): string {
  if (!type) return 'related to';
  return type.toLowerCase().replace(/_/g, ' ');
}

/** Monotonic counter for deterministic audit ids within a module. */
let auditCounter = 0;
export function nextAuditId(): string {
  auditCounter += 1;
  return `aud-${auditCounter}`;
}

export const nowIso = (): string => new Date().toISOString();

/** Distinct deterministic id for brand-new local nodes. */
let localCounter = 0;
export function nextLocalId(prefix: string, origin: CanvasOrigin): string {
  localCounter += 1;
  return `${prefix}-${slug(origin)}-${localCounter}`;
}
