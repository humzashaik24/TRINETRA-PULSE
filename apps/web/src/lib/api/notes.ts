/**
 * Typed client + adapter for the Note surface of the real relational API
 * (/api/v2). Phase 17.9.
 *
 * The investigation workspace and Context Inspector operate on the rich
 * ``InvestigationNote`` / ``InspectorNoteView`` shapes (mock universe). When
 * the platform is pointed at a running backend
 * (``NEXT_PUBLIC_USE_MOCK_API=false``) the same surfaces must read from the
 * persisted ``investigation_notes`` rows served by FastAPI. This module:
 *
 *   - re-uses the existing ``apiFetch`` client and the typed functions in
 *     ``@/lib/api/investigations`` (no second HTTP layer),
 *   - maps a ``RealNote`` row into a detail shape the inspector can render
 *     directly, and
 *   - applies a deterministic documented translation for the ``category``
 *     field (stored in ``metadata.category``, optional).
 *
 * There is deliberately NO silent fallback to the mock universe: an API
 * failure surfaces as an ``ApiClientError`` and the caller's error state,
 * never as fabricated demo rows. Discovery (list), creation (POST /notes)
 * and workspace wiring already migrated in Phase 14.2/17.4; this module adds
 * the scoped reading half for note *detail* (Phase 17.9).
 */

import {
  getNote,
  getNoteScoped,
  type RealNote,
} from './investigations';

// -------------------------------------------------------------------
// Mapping: RealNote -> inspector note detail
// -------------------------------------------------------------------

export interface ApiNoteDetail {
  kind: 'note';
  id: string;
  investigationId?: string;
  author: string;
  body: string;
  category: string | null;
}

function asJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/** Optional category persisted in ``metadata.category``. */
export function noteCategoryFrom(note: RealNote): string | null {
  const category = asJson(note.metadata).category;
  return typeof category === 'string' && category.length > 0
    ? category
    : null;
}

/** Map a persisted note row into the inspector note detail shape. */
export function mapApiNote(note: RealNote): ApiNoteDetail {
  return {
    kind: 'note',
    id: note.id,
    investigationId: note.investigation_id,
    author: note.author,
    body: note.content,
    category: noteCategoryFrom(note),
  };
}

// -------------------------------------------------------------------
// Fetch layer
// -------------------------------------------------------------------

/**
 * Load a single persisted note mapped into the inspector shape. Scoped to the
 * active investigation so a cross-investigation match is a 404, never a leak.
 */
export async function loadNoteDetail(
  noteId: string,
  investigationId?: string,
): Promise<ApiNoteDetail> {
  const row = investigationId
    ? await getNoteScoped(noteId, investigationId)
    : await getNote(noteId);
  return mapApiNote(row);
}