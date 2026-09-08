# PHASE 17.9 COMPLETE

## Objective & scope

Move the **Findings**, **Notes** and **Events** detail surfaces from
mock/in-memory reads onto the **real persisted `/api/v2` path**: Frontend typed
detail adapters (`lib/api/findings.ts`, `lib/api/notes.ts`, `lib/api/events.ts`)
-> FastAPI `/api/v2` -> `InvestigationService` -> the existing `findings`,
`investigation_notes` and `events` tables, while keeping mock mode
(`NEXT_PUBLIC_USE_MOCK_API=true`) fully intact. **No new tables are created** --
all three domains reuse the tables provisioned in Phase 14.2.

Data-source gating follows the Phase 17 series exactly: `isMockData()` selects
the source; the two are **never mixed**, and there is **no silent API->mock
fallback** -- an API failure surfaces the inspector error state, never
fabricated finding/note/event rows.

## Audit (before)

- **Backend**: detail reads for findings, events and notes were **unscoped**:
  `GET /findings/{id}`, `GET /events/{id}` and `GET /notes/{id}` resolved any
  persisted row with no cross-investigation protection (the entities/evidence/
  relationships routers already had scoped detail since 17.6/17.7). There were
  **no** `get_finding_scoped` / `get_event_scoped` / `get_note_scoped` service
  methods. The scoped *lists* (`GET /investigations/{id}/findings|events|notes`)
  and the merged timeline already existed.
- **Frontend**: the adapters already mapped persisted **lists** of findings and
  notes into the store (findings/notes tabs, overview counts, timeline), but
  there was **no detail adapter** for any of the three domains, and:
  - `events` were fetched in `loadInvestigationWorkspace` then **discarded**
    (`void events`).
  - The Context Inspector finding/note/event cases had **no `isMockData()`
    branch**, so detail contexts fell through to the mock services even in API
    mode.
- **Vocabulary mismatch**: persisted values (`finding type/severity/status`,
  `event.category`/`event_type`, note `metadata.category`, event confidence 0-1
  float) do not match the UI domain unions (`InspectorFindingView` etc.).

## Before -> After

| Surface | Before (API mode) | After (Phase 17.9) |
|---|---|---|
| `GET /findings/{id}` | unscoped read | `?investigation_id=` scoped -> 404 on scope mismatch |
| `GET /notes/{id}` | unscoped read | `?investigation_id=` scoped -> 404 on scope mismatch |
| `GET /events/{id}` | unscoped read | `?investigation_id=` scoped -> 404 on scope mismatch |
| Finding detail adapter | absent | `lib/api/findings.ts` `loadFindingDetail` (scoped, entity_refs resolved) |
| Note detail adapter | absent | `lib/api/notes.ts` `loadNoteDetail` (scoped) |
| Event detail adapter | absent | `lib/api/events.ts` `loadEventDetail` (scoped) |
| Context Inspector finding/note/event | mock leak (no `isMockData()` branch) | authoritative scoped read in API mode |
| Events ingestion rows | visible in list/timeline only | also surfaced through scoped event list + detail |
| Persisted vocabulary | raw backend values | deterministic documented UI mapping |
| `POST /findings` / `POST /notes` | unchanged | unchanged (create-and-read-back verified) |

## Real Detail API Flow (API mode)

```
Context Inspector (finding context)
  -> resolveInspectorContext({type:'finding'})                services/inspector.service.ts
      isMockData()? no
  -> loadFindingDetail(id, ctx.investigationId)               lib/api/findings.ts
      -> getFindingScoped(id, invId)                          GET /findings/{id}?investigation_id=...
      -> listEntitiesForInvestigation(invId)                  resolve entity_refs names/types
  -> mapApiFinding(detail, entityById) -> InspectorFindingView

Context Inspector (note context)
  -> resolveInspectorContext({type:'note'})                   services/inspector.service.ts
      isMockData()? no
  -> loadNoteDetail(id, ctx.investigationId)                  lib/api/notes.ts
      -> getNoteScoped(id, invId)                             GET /notes/{id}?investigation_id=...
  -> mapApiNote(detail) -> InspectorNoteView

Context Inspector (event context)
  -> resolveInspectorContext({type:'event'})                  services/inspector.service.ts
      isMockData()? no
  -> loadEventDetail(id, ctx.investigationId)                 lib/api/events.ts
      -> getEventScoped(id, invId)                            GET /events/{id}?investigation_id=...
  -> mapApiEvent(detail) -> InspectorEventView
```

Backend:

```
GET /api/v2/findings/{id}?investigation_id=...
  routers/findings.py
  -> InvestigationService.get_finding_scoped(id, inv_id)      services/real/investigation.py
      get_finding(id) + scope guard (404 FindingNotFoundError)

GET /api/v2/notes/{id}?investigation_id=...
  routers/notes.py
  -> InvestigationService.get_note_scoped(id, inv_id)         scope guard (404 NoteNotFoundError)

GET /api/v2/events/{id}?investigation_id=...
  routers/events.py
  -> InvestigationService.get_event_scoped(id, inv_id)        scope guard (404 EventNotFoundError)
```

## Mock Detail Flow (mock mode)

Unchanged. `NEXT_PUBLIC_USE_MOCK_API=true` keeps the mock
finding/note/event services and the mock inspector branches byte-for-byte. The
two branches are mutually exclusive and never mixed.

## Findings Persistence

- `Finding` model (`app/models/finding.py`) persists
  `investigation_id`, `title`, `type`, `severity`, `status`, `description`,
  confidence (float), entity refs (JSONB `entity_refs`), evidence
  `evidence_refs` (JSONB), `source`, `metadata_`, timestamps.
- `loadFindingDetail` maps persisted rows into the Phase 0
  `InspectorFindingView` through deterministic translations:
  - `findingConfidenceFrom` (persisted 0-1 float -> UI 0-1; absent -> fallback
    from type or 0.5).
  - `findingCategoryFrom` (persisted `type` -> UI category),
  - `findingSourceFrom` (`metadata.source_type` else `'Relational analysis'`),
  - `findingEvidenceIdsFrom` (`metadata.evidence_ids` else `evidence_refs`),
  - entity_refs resolved to names/types via the investigation-scoped entity
    rows (foreign id fallback: id / `'unknown'` type).
- `POST /findings` stays compatible: create-and-read-back is covered by a new
  backend test.

## Notes Persistence

- `Note` model (`app/models/note.py`) persists `investigation_id`, `author`,
  `content`, `metadata_` (incl. `category`), timestamps.
- `loadNoteDetail` maps persisted notes into the Phase 0
  `InspectorNoteView` via `noteCategoryFrom` (`metadata.category`) and the
  documented `mapApiNote`.
- `POST /notes` stays compatible: create-and-read-back is covered by a new
  backend test.

## Events Persistence (no duplicate table)

- No new table. `Event` model (`app/models/event.py`) persists
  `investigation_id`, `event_type`, `category` (enum incl.
  `dataset_uploaded`, `ingestion_started`, `ingestion_completed`,
  `ingestion_failed`, `case_event`, `transaction`, `meeting`, ...), `timestamp`,
  `location`, `description`, `confidence` (float 0-1), evidence refs,
  `metadata_`, timestamps.
- Reuse of `EventRepository` + the scoped list + the merged timeline preserves
  event **categories**, **timestamps** and **ordering**: scoped list/ordering
  asserts events return sorted by timestamp ascending, and seed events
  (`meeting`/`transaction`/`case_event`) keep their order.
- **Ingestion events remain visible**: `IngestionPipeline` writes
  `dataset_uploaded`/`ingestion_started`/`ingestion_completed`/`ingestion_failed`
  rows; a new backend test runs the pipeline against a fresh investigation and
  verifies those events surface through the scoped list, the scoped detail and
  the unified timeline -- while the seeded Operation Meridian list stays
  untouched (no cross-investigation leak).
- **Inspector navigation** and the timeline must not regress: the event case
  reads the authoritative persisted row in API mode and navigates exactly as
  before.

## Investigation Isolation

- `get_finding_scoped` / `get_note_scoped` / `get_event_scoped` 404 when the
  scope does not match -- the same no-existence-leak contract as entities,
  evidence and relationships. Covered by:
  - `test_*_cross_investigation_rejected` (stitched row owned by another
    investigation; scoped read from Meridian's scope 404s, correct scope 200,
    unscoped still resolves),
  - `test_*_cross_investigation_list_is_isolated` (a foreign investigation's
    rows never leak into Meridian's nested list).
- Every detail read in the frontend is scoped to the active investigation
  (`ctx.investigationId`, `DEMO_INVESTIGATION_ID`).

## Context Inspector

- `inspector.service.ts` finding/note/event cases now branch on `isMockData()`:
  - API mode: authoritative scoped read via the corresponding
    `load*Detail(ctx.id, ctx.investigationId)`; failures are an explicit
    `{status:'error'}` state -- **never** the mock service.
  - Mock mode: unchanged.
- Asserted in the new inspector tests with `not.toHaveBeenCalled()` on the mock
  services.

## Security

- Cross-investigation existence leaks are prevented at the source: scoped
  detail 404s on scope mismatch (`FindingNotFoundError("Findings")`,
  `EventNotFoundError("Events")`, `NoteNotFoundError("Notes")`), list reads are
  inherently investigation-scoped, and the error contract is uniform
  `{code, message, details, status_code}`.
- No new surface introduces secrets; the existing `X-User-Id` identity gate
  applies to the whole `/api/v2` app.

## Verification

### Backend (Windows native, SQLite override -- no local PostgreSQL)
- Full `pytest` suite: **189 passed, 3 warnings** (pre-existing Starlette
  deprecation + Postgres extension defaults on SQLite). Baseline was 175;
  **+14** new tests.
- `ruff check app tests`: **All checks passed**.
- Seeded Operation Meridian intact: `inv-006` (`6c887c98-939a-50ce-ac27-f58376941de2`)
  with its deterministic finding/event/note ids and 4 graph edges unbroken
  (asserted by `test_api_v2.py`).

### Frontend (apps/web)
- `npx tsc --noEmit`: clean.
- `npx eslint src --ext .ts,.tsx`: clean (1 pre-existing `no-page-custom-font`
  warning at `src/app/layout.tsx:21`).
- `npx jest`: **78 suites / 654 tests passed** (baseline 73/625; **+5 new
  suites / +29 tests** from the finding/note/event adapter + inspector tests).
- `npm run build`: green (routes unchanged).
- `alembic upgrade head` applies cleanly against a throwaway SQLite DB (all 3
  revisions, schema re-applies without error); Operation Meridian re-seed
  unaffected.

## Tests Added

- **Backend** `apps/api/tests/test_findings_notes_events_api.py` (**14 tests**):
  scoped lists for findings (2)/events (3)/notes (1), events sorted by timestamp
  ascending, persisted detail reads (finding severity/confidence/status/
  entity_refs; event event_type/timestamp/location; note author/content), scoped
  detail resolve, cross-investigation 404 (no leak) + correct-scope 200 +
  unscoped 200, cross-investigation list isolation, missing id 404 with resource
  names Findings/Events/Notes, malformed id 422, list resources 404 for unknown
  investigation, ingestion events surface in scoped list + detail + timeline
  (Meridian list untouched), `POST /findings` + `POST /notes` create-and-read-back,
  error contract key-set.
- **Frontend** new `apps/web/src/lib/api/findings.test.ts`,
  `apps/web/src/lib/api/notes.test.ts`, `apps/web/src/lib/api/events.test.ts`
  (vocabulary + confidence + `mapApiFinding`/`mapApiNote`/`mapApiEvent` +
  `load*Detail` scoped/unscoped/failure); new
  `services/inspector.service.findings.api.test.ts` and
  `services/inspector.service.notes-events.api.test.ts` (API-mode resolution,
  hints still read persisted rows, error state without mock fallback, mock
  services not called in API mode).

## Files Created / Modified

- **Backend modified**: `apps/api/app/services/real/investigation.py`
  (`get_finding_scoped`/`get_event_scoped`/`get_note_scoped`),
  `apps/api/app/api/routers/findings.py` / `events.py` / `notes.py`
  (`investigation_id: UUID | None = Query(default=None)` + scoped getters).
- **Backend created**: `apps/api/tests/test_findings_notes_events_api.py`.
- **Frontend created**: `apps/web/src/lib/api/findings.ts`, `notes.ts`,
  `events.ts` (detail adapters + vocabulary helpers), and their test files
  (`findings.test.ts`, `notes.test.ts`, `events.test.ts`),
  `apps/web/src/services/inspector.service.findings.api.test.ts`,
  `inspector.service.notes-events.api.test.ts`.
- **Frontend modified**: `apps/web/src/lib/api/investigations.ts`
  (`getFinding`/`getFindingScoped`, `getEvent`/`getEventScoped`,
  `getNote`/`getNoteScoped`), `apps/web/src/services/inspector.service.ts`
  (finding/note/event API branches).
- **Docs**: `docs/PHASE_17.9_COMPLETE.md` (this file),
  `docs/REAL_APPLICATION_ARCHITECTURE.md` (17.9 bullet, router table,
  verification numbers), `docs/README.md` (Phase 17.9 section).
- **Deleted**: none. **New tables**: none (all three domains reuse Phase 14.2
  tables).

## Mock-API Behavior

- Mock mode is byte-for-byte the same user experience: mock finding/note/event
  services and mock inspector branches unchanged. All 78 jest suites pass.
- API mode never imports the mock finding/note/event services for these surfaces
  (asserted in the inspector tests with `not.toHaveBeenCalled()`).

## Known Limitations

- `InspectorFindingView.description` is `string | undefined` while the backend
  `ApiFindingDetail.description` is `string | null`; the inspector wiring
  converts with `?? undefined`.
- SQLite serializes naive datetimes without a timezone suffix (e.g.
  `2026-02-14T11:05:00`); test assertions are tz-agnostic (`startswith`).
- Verified against throwaway SQLite (no local PostgreSQL/Render provisioned);
  the migrations apply and generate valid PostgreSQL DDL via Alembic offline
  mode. **Live PostgreSQL / Render verification is pending deployment.**

## Deferred Work (explicitly not done)

- **Finding / note / event mutation** (update/delete): no UI flow and no
  endpoints, consistent with the evidence domain (17.6). `POST /findings` and
  `POST /notes` are read-compatible and unchanged; `POST /events` remains
  absent (no UI flow needs it).
- Cross-surfaces that still have no relational endpoint and stay `[]`/0 in API
  mode: `entity_resolutions`, findings/notes/events *link surfaces* on other
  resource detail pages beyond the Context Inspector.
- RBAC/auth rewrite, blockchain / score / agent / anomaly / AI features,
  Neo4j / Redis / Docker wiring.

## Honest Database Verification Status

- All backend, migration and seed verification runs were against a throwaway
  **SQLite** DB via the `DATABASE_URL` override (the documented local seam).
- No live PostgreSQL or Render environment was touched. PostgreSQL DDL is
  exercised through `alembic upgrade head --sql` (offline mode) only.
- **PostgreSQL/Render verification is pending** until the Render Blueprint is
  exercised against a managed database.

## Exact Phase 18 Boundary

Phase 17.9 completes the workspace resource family: findings, notes and events
now have investigation-scoped persisted detail reads wired through the Context
Inspector, with no silent mock fallback. The real `/api/v2` workspace surface is
now **complete**. STOP here. The next phase is **Phase 18** and is
**explicitly NOT started**: no Phase 18 work has been performed in this
session. Phase 18's exact scope is not yet defined and must not be inferred from
any prior phase description.