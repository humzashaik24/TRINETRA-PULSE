/**
 * Typed client + adapter for the Event surface of the real relational API
 * (/api/v2). Phase 17.9.
 *
 * The investigation timeline and Context Inspector navigate canonical events
 * (an ``InvestigationEvent`` row with ``event_type`` / ``timestamp`` /
 * ``location`` / ``description``). When the platform is pointed at a running
 * backend (``NEXT_PUBLIC_USE_MOCK_API=false``) the same surfaces must read
 * from the persisted ``events`` rows (and the scoped events list / merged
 * timeline feed) served by FastAPI. This module:
 *
 *   - re-uses the existing ``apiFetch`` client and the typed functions in
 *     ``@/lib/api/investigations`` (no second HTTP layer),
 *   - maps a ``RealEvent`` row into a detail shape the inspector can render
 *     directly (the persisted feed also includes ingestion-created events:
 *     dataset_uploaded / ingestion_started / ingestion_completed /
 *     ingestion_failed), and
 *   - preserves the persisted category (``event_type``) and timestamp so the
 *     timeline ordering and inspector navigation stay consistent.
 *
 * There is deliberately NO silent fallback to the mock universe: an API
 * failure surfaces as an ``ApiClientError`` and the caller's error state,
 * never as fabricated demo rows. The merged timeline feed (GET /timeline) was
 * introduced in Phase 17.1/17.4; this module adds the scoped reading half for
 * event *detail* (Phase 17.9).
 */

import {
  getEvent,
  getEventScoped,
  type RealEvent,
} from './investigations';

// -------------------------------------------------------------------
// Mapping: RealEvent -> inspector event detail
// -------------------------------------------------------------------

export interface ApiEventDetail {
  kind: 'event';
  id: string;
  investigationId?: string;
  /** Event type + description so the feed label stays honest. */
  title: string;
  occurredAt: string | null;
  eventType: string;
  location: string | null;
  description: string | null;
}

/**
 * Feed-friendly event label: the persisted ``event_type`` when no description
 * is present, otherwise the description (matches how the timeline titles
 * canonical events).
 */
export function eventTitleFrom(event: RealEvent): string {
  return event.description && event.description.length > 0
    ? event.description
    : event.event_type;
}

/** Map a persisted event row into the inspector event detail shape. */
export function mapApiEvent(event: RealEvent): ApiEventDetail {
  return {
    kind: 'event',
    id: event.id,
    investigationId: event.investigation_id,
    title: eventTitleFrom(event),
    occurredAt: event.timestamp,
    eventType: event.event_type,
    location: event.location,
    description: event.description,
  };
}

// -------------------------------------------------------------------
// Fetch layer
// -------------------------------------------------------------------

/**
 * Load a single persisted event mapped into the inspector shape. Scoped to
 * the active investigation so a cross-investigation match is a 404, never a
 * leak.
 */
export async function loadEventDetail(
  eventId: string,
  investigationId?: string,
): Promise<ApiEventDetail> {
  const row = investigationId
    ? await getEventScoped(eventId, investigationId)
    : await getEvent(eventId);
  return mapApiEvent(row);
}