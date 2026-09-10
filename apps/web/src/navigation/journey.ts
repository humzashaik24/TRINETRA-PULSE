import type {
  EvidenceContext,
  InspectorContext,
} from '@/state/shell.store';

// ============================================================
// PHASE 13 — CROSS-MODULE JOURNEY NAVIGATION CONTRACT
// ============================================================
// The typed navigation contract that keeps the end-to-end
// investigation journey coherent. Every cross-module link carries a
// JourneyPayload (investigationId + optional focus/section) instead
// of arbitrary strings, so "Open Network" from an entity arrives at
// the correct investigation context with that entity selected.
//
// Payload keys are short URL query params so links stay shareable
// and the active investigation survives browser refresh.
//   ?i=inv-006            current investigation
//   ?focus=ent-person-001 selected object (entity / evidence / …)
//   ?section=entities     target workspace section where supported
// ============================================================

// ------------------------------------------------------------
// Public constants
// ------------------------------------------------------------

/** The canonical deterministic demo investigation (Operation Trinetra Nexus). */
export const DEMO_INVESTIGATION_ID = 'inv-demo-nexus';

/** The canonical network linked into the demo investigation. */
export const DEMO_NETWORK_ID = 'NET-004';

/** Query parameter names used by the journey contract. */
export const JOURNEY_QUERY = {
  investigation: 'i',
  focus: 'focus',
  section: 'section',
} as const;

// ------------------------------------------------------------
// Typed payload
// ------------------------------------------------------------

export interface JourneyPayload {
  /** Active investigation id (e.g. inv-006). */
  investigation?: string | null;
  /** Selected object id whose context must survive navigation. */
  focus?: string | null;
  /** Target section within a workspace (overview, findings, …). */
  section?: string | null;
}

export type FocusTarget = 'entity' | 'evidence' | 'finding' | 'relationship' | 'network';

/** The union of navigation targets that compose the demo journey. */
export interface JourneyTarget {
  focus: FocusTarget;
  payload: JourneyPayload;
}

export const DEMO_JOURNEY = {
  investigate: (): JourneyTarget => ({
    focus: 'entity',
    payload: { investigation: DEMO_INVESTIGATION_ID },
  }),
  entity: (id: string, investigation = DEMO_INVESTIGATION_ID): JourneyTarget => ({
    focus: 'entity',
    payload: { investigation, focus: id },
  }),
  evidence: (id: string, investigation = DEMO_INVESTIGATION_ID): JourneyTarget => ({
    focus: 'evidence',
    payload: { investigation, focus: id },
  }),
  finding: (id: string, investigation = DEMO_INVESTIGATION_ID): JourneyTarget => ({
    focus: 'finding',
    payload: { investigation, focus: id },
  }),
  relationship: (id: string, investigation = DEMO_INVESTIGATION_ID): JourneyTarget => ({
    focus: 'relationship',
    payload: { investigation, focus: id },
  }),
  network: (networkId: string, investigation = DEMO_INVESTIGATION_ID): JourneyTarget => ({
    focus: 'network',
    payload: { investigation, focus: networkId },
  }),
} as const;

// ------------------------------------------------------------
// Build / parse helpers
// ------------------------------------------------------------

/** Append journey context to a route path as URL query params. */
export function journeyHref(
  path: string,
  payload?: JourneyPayload | null
): string {
  if (!payload) return path;
  const params = new URLSearchParams();
  if (payload.investigation) params.set(JOURNEY_QUERY.investigation, payload.investigation);
  if (payload.focus) params.set(JOURNEY_QUERY.focus, payload.focus);
  if (payload.section) params.set(JOURNEY_QUERY.section, payload.section);
  const qs = params.toString();
  if (!qs) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${qs}`;
}

/** Parse journey context out of raw query strings or URLSearchParams. */
export function parseJourneyPayload(
  search: string | URLSearchParams
): JourneyPayload {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search;
  const payload: JourneyPayload = {};
  const investigation = params.get(JOURNEY_QUERY.investigation);
  const focus = params.get(JOURNEY_QUERY.focus);
  const section = params.get(JOURNEY_QUERY.section);
  if (investigation) payload.investigation = investigation;
  if (focus) payload.focus = focus;
  if (section) payload.section = section;
  return payload;
}

/** Merge two payloads (applied over a base, later values win). */
export function mergeJourneyPayload(
  base: JourneyPayload | null | undefined,
  over: JourneyPayload | null | undefined
): JourneyPayload | null {
  if (!base && !over) return null;
  return { ...(base ?? {}), ...(over ?? {}) };
}

// ------------------------------------------------------------
// Inspector context → journey payload (reverse direction)
// ------------------------------------------------------------

/** Derive the journey payload from a selected inspector context so
 *  "continue investigating" links preserve the current object. */
export function payloadFromContext(ctx: InspectorContext | null): JourneyPayload | null {
  if (!ctx) return null;
  const common = {
    evidenceId: (ctx as EvidenceContext).id,
  };
  void common;
  switch (ctx.type) {
    case 'entity':
      return { focus: ctx.id, investigation: undefined };
    case 'evidence':
      return { focus: ctx.id };
    case 'finding':
      return { focus: ctx.id };
    case 'relationship':
      return { focus: ctx.id };
    case 'network':
      return { focus: ctx.id };
    default:
      return null;
  }
}

/** Render-focused label for a journey focus id (best effort). */
export function focusLabel(kind: FocusTarget | undefined): string {
  switch (kind) {
    case 'entity':
      return 'Entity';
    case 'evidence':
      return 'Evidence';
    case 'finding':
      return 'Finding';
    case 'relationship':
      return 'Relationship';
    case 'network':
      return 'Network';
    default:
      return 'Object';
  }
}