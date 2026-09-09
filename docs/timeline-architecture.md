# Timeline Architecture & Timestamp Semantics

Phase 29 ("Investigation Timeline Intelligence") consolidates every time-bearing
surface of the investigation workspace into **one honest, ascending, grouped
timeline** plus a **grounded event inspector**. This document is the canonical
reference for what a timeline row is, where each row's timestamp comes from, and
the exact ordering rules.

## Surface

- **Investigation workspace → Timeline tab** (`investigation-timeline-tab.tsx`)
  renders the **unified timeline** for the active investigation.
- **Finding detail panel → "Relevant timeline events"**
  (`finding-detail-panel.tsx`) renders only timeline rows a finding is grounded
  in (see *Grounding*).

## Row model

Shared in `apps/web/src/lib/timeline.ts` — `TimelineRow`:

| Field | Meaning |
| --- | --- |
| `id` | Stable row id (`tl-…` in feed, `tl-ev-{evidence_id}`, `tl-ev-{id}` fallback, `tl-fnd-…`, `tl-note-…`, `tl-act-…`, `tl-sys-…`). |
| `category` | `event` / `evidence` / `finding` / `note` / `activity` / `system`. |
| `timestamp` | `string \| null`. **Never invented.** `null` means "time genuinely unknown". |
| `title` / `description` | Best-available text for the row. |
| `refId` / `refType` | The workspace object the row points at (`InvestigationTimelineItem`, `InvestigationEvidence`, `InvestigationFinding`, `InvestigationNote`, `InvestigationActivity`). |
| `actor` | Who caused the row (evidence `linked_by`, activity actor, etc.). |

## Timestamp semantics

Each category maps to a **specific, documented provenance** — it is never
inferred from a different field:

| Category | Source | Provenance label |
| --- | --- | --- |
| `event` | `InvestigationEvent.occurred_at` (nullable) | "Event time" |
| `evidence` | `InvestigationEvidence.collected_at` (nullable) | "Evidence collected" |
| `finding` | `InvestigationFinding.created_at` | "Finding created" |
| `note` | `InvestigationNote.created_at` | "Note created" |
| `activity` | `InvestigationActivity.timestamp` | "Action time" |
| `system` | feed record timestamp | "Record time" |

Rules:

1. **Never substitute.** `created_at` is never used as an event time or a
   collection time; `occurred_at` / `collected_at` are never derived from the
   record's creation timestamp.
2. **Null is honest.** When the underlying column is `null` (or unknown), the
   row renders **"Time unavailable"** — a timestamp is never fabricated to fill
   an empty slot.

### Feed normalisation (API → frontend)

`apps/web/src/lib/api/adapter.ts::mapTimeline` maps the feed delivered by
`GET /investigations/{id}/timeline`:

- `kind === 'event'` → a `TimelineItem` with `timestamp = toIsoOrNull(at)`
  (backend sends `null` when the underlying event has no timestamp).
- `kind === 'note'` → `timestamp = note.created_at`.
- `kind === 'finding'` and `kind === 'evidence'` feed records are **dropped**
  (findings and evidence enter the unified timeline from their own slices, so
  feed duplicates never double-render).
- A missing/invalid `at` maps to `timestamp: null` — never a placeholder.

## Ordering

- **Backend sort** (`apps/api/app/services/real/investigation.py::timeline`):
  **untimed entries first** (epoch marker `-1_000_000_000_000_000_000_000_000_000`),
  then by `kind`, then `title`, then presence of `ref_id`. Deterministic —
  faster than a date tie-break and never throws on `null`.
- **Frontend sort** (`lib/timeline.ts::compareTimelineAsc`): strictly ascending
  by timestamp, **timeless rows LAST** as an explicit "Time unavailable" group,
  tie-broken by category order, then title, then id. The undated group is
  labelled "Time unavailable" so unknown-time rows are visible, not silently
  buried.
- **Unified timeline merge** (`buildUnifiedTimeline`): feed (event/note/system,
  duplicates of finding/evidence kinds filtered) + activity + findings +
  evidence slices merged, sorted with `compareTimelineAsc`, then grouped by
  calendar day (`groupTimelineRows`) with the undated group last.

## Grounding — finding → timeline

`lib/timeline.ts::relevantTimelineForFinding` renders **only** rows the finding
is actually grounded in:

- **Evidence rows** = the finding's `evidence_ids`, resolved against the
  workspace evidence slice (each row's timestamp is that evidence's
  `collected_at`).
- **Event rows** = feed `event` rows whose underlying `InvestigationEvent` is
  **entity-grounded**: the event's `entity_ids` share at least one entity with
  the finding's `entity_refs`. This only runs when the workspace has an events
  slice; without entity grounding there are **no** event rows.
- **No invention.** Unresolvable evidence ids and ungrounded events are simply
  absent; the empty state reads "No linked timeline events."
  (`finding-timeline-empty`).

## Event inspector

`timeline-event-detail-panel.tsx` — an expanded row detail for any timeline row:

- **Event**: type badge, id, occurred-at ("Time unavailable" when null),
  location ("Location not recorded" when null), description, related entities
  and relationships (buttons open the context inspector scoped to the current
  investigation), and related evidence. The relational schema has no
  event↔entity / event↔evidence foreign keys, so both lists render **honest
  empty states** when nothing is linked.
- **Evidence**: type, id, collected-at, linked-by / linked-at, summary, related
  timeline events (honest empty state), and a deep link to the Evidence tab
  (`?tab=evidence`).
- **Finding**: severity + confidence badges, created-at, related entities,
  provenance (created-by / created-at / updated-at).
- **Note / activity / system**: title, time, description, provenance.

## Invariant

A timeline is a **record keepers keep**: timestamps shown are the timestamps the
data actually records. Where the data records no time, the UI says so out loud.