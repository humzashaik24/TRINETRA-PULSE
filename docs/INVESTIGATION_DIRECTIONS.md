# Investigation Direction Intelligence (Phase 26)

## What this is

Investigation directions are **analytical next-step leads** computed on request
from a single investigation's **already-persisted** records — entities,
relationships, evidence, events, deterministic pattern results and candidate
entity resolutions.

Directions answer one question only: *"what should I investigate next, and
why?"* They never reach a conclusion about a person or an organization.

> **Investigation directions are analytical leads derived from existing
> investigation data. They do not establish guilt or criminal intent.**

## Design principles

- **Compute-on-request, fully read-only.** Nothing is persisted by the
  directions API: no table, no migration, no analyst state. `status` is always
  `"new"` in every response. The `DirectionStatus` enum (`new / reviewing /
  dismissed / acted_on`) is deliberately future-proof so a later phase can add
  an analyst-decision workflow as a separate, careful migration step.
- **Grounded.** Every title, summary, rationale and supporting fact and every
  numeric `value` is derived verbatim from persisted fields. There is no free
  text, no LLM, no invented evidence or relationship, and no external service.
- **Deterministic.** The same persisted records always produce the same
  directions, in the same order, with the same stable ids
  (`dir-{sha256(payload)[:20]}`).
- **Clamped recommendation confidence.** `confidence` is the strength of the
  *recorded data's support for the suggested next step*, always `[0.0, 1.0]`.
  It is **not** a probability of guilt, intent, or any real-world fact.
- **Scoped.** Endpoints are investigation-scoped; a direction can only ever
  reference entities, relationships and evidence that belong to that
  investigation.

## Direction types

| `direction_type` | Trigger (persisted data only) |
| --- | --- |
| `high_connectivity_entity` | Entity degree ≥ `MIN_HUB_DEGREE` (2); highest connectivity, degree fact is the recorded relationship count |
| `bridge_entity` | Articulation point (DFS low-link); removing it increases connected components (fact = component count after removal) |
| `unresolved_connection` | Hub-neighbour pair with **no** direct recorded edge; shared evidence references boost the fact set |
| `suspicious_pattern` | An existing `PatternDetectionService` result (deterministic anomaly detector) |
| `evidence_gap` | Relationship still `needs_review` with **zero** evidence references |
| `relationship_verification` | Relationship still `needs_review` but with recorded references (fact = reference count) |
| `entity_resolution` | Candidate resolution in state `needs_review` from the resolution service |
| `timeline_gap` | Events with a null timestamp, or ≥ 30 calendar days between two consecutive dated events (fact = days) |
| `follow_up_evidence` | A relationship evidence reference absent from the investigation evidence register (fact = referenced id) |

## Scoring

```text
priority(confidence) =
    critical  when confidence >= 0.75
    high      when confidence >= 0.55
    medium    when confidence >= 0.35
    low       otherwise
```

Caps: `MAX_TOTAL_DIRECTIONS = 12`, `MAX_PER_TYPE = 4`,
`MIN_HUB_DEGREE = 2`, `UNRESOLVED_PAIR_LIMIT = 5`,
`TIMELINE_GAP_DAYS = 30`.

Results are sorted by priority (critical → low) then confidence (desc), then
truncated to the cap.

## API

- `GET /investigations/{investigation_id}/directions` — full lead list.
  Query filters: `direction_type`, `priority`, `status`, `limit` (1–200).
- `GET /investigations/{investigation_id}/directions/{direction_id}` — one
  direction by its stable id (404 otherwise).

Responses use the shared `{ code, message, details }` error contract; a missing
investigation returns `404 code=not_found`.

## Frontend

The investigation workspace gains a **Directions** tab (icon: `Compass`, between
Findings and Notes). The tab loads through
`lib/api/directions.ts` → `getInvestigationDirections`, which:

- in **API mode** calls the endpoint above through the shared `apiFetch`
  client;
- in **mock/demo mode** runs a deterministic mirror of the same three
  structural detectors (`high_connectivity_entity`, `bridge_entity`,
  `unresolved_connection`) over the loaded mock network graph, plus
  `evidence_gap` / `relationship_verification` from candidate edges.

The tab renders priority badges, clamped confidence, supporting-fact chips,
rationale, and cross-navigation: entity → `/entities/{id}`,
relationships → `…?tab=network`, evidence → `…?tab=evidence`. A persistent
footer repeats the disclaimer above.

## Tests

- `tests/test_investigation_directions.py` (backend): 31 tests covering all
  nine detectors, priority mapping, clamping, determinism, caps, grounding
  invariants, plus the read-only / scoped / filterable API surface.
- `apps/web/src/lib/api/directions.test.ts`: API-path, mock determinism and
  empty-state invariants.
- `apps/web/src/components/investigation/investigation-directions-tab.test.tsx`:
  loading, render, empty, error, priority, confidence, facts and navigation.