# PHASE 17.7 COMPLETE

## Objective & scope

Move the **Entity Intelligence** surface (Phase 6/9 entities UI, Entity list + detail,
SummaryStrip, Context Inspector entity resolution) from the mock/in-memory universe onto the
**real persisted `/api/v2` path** — Frontend → typed API client (`lib/api/entities.ts`) →
FastAPI `/api/v2` → `InvestigationService` → `EntityRepository` → PostgreSQL `entities` table —
while keeping mock mode (`NEXT_PUBLIC_USE_MOCK_API=true`) fully intact.

Data-source gating follows the Phase 17 series exactly: `isMockData()` selects the source;
the two are **never mixed**, and there is **no silent API→mock fallback** — an API failure
surfaces the store / page / inspector error state, never fabricated demo rows.

## What was built

### Backend (apps/api)

- **Investigation-scoped entity detail** — `InvestigationService.get_entity_scoped` +
  `entities` router: `GET /api/v2/entities/{id}?investigation_id=…` returns **404** when the
  scope does not match (no cross-investigation existence leak), mirroring the Phase 17.6
  evidence scoping. Every entity read is now scopeable to its investigation.
- The nested `GET /investigations/{id}/entities` list was already investigation-scoped and is
  unchanged; the frontend uses it for the whole Entity workspace.

### Frontend (apps/web)

- **`lib/api/entities.ts`** — typed adapter re-using the existing `apiFetch` + the typed
  functions in `lib/api/investigations.ts` (no second HTTP layer): `mapEntityIntelligence`
  (persisted `RealEntity` → Phase 6 `EntityIntelligence`), `canonicalEntityId`,
  `getRawEntity` (optional investigation scope → `getEntityScoped`), `loadEntityList`
  (scoped fetch + deterministic `queryEntities` search/sort/pagination over the API row set),
  `loadEntityDetail` / `loadEntityDetailBundle` (honest empty detail slices), and
  `apiEntityOverviewSummary` (honest API-mode summary counts).
- **Mapping honesty** — `resolutionState` derives from the persisted signal (verified →
  `CONFIRMED`, else `NEEDS_REVIEW`; never an invented algorithmic resolution); aliases come
  from `attributes`/`metadata`/a differing `canonical_name`; relational counters
  (sources/connections/events/evidence/activity) are **0** because those surfaces are
  later-phase domains — never fabricated from mock.
- **`state/entity.store.ts`** — list/detail/selection branch on `isMockData()`;
  `setInvestigationId` clears state and reloads through the active data source; selections
  are investigation-scoped detail reads; API failures surface as the store error state.
- **`entities/page.tsx`** — wired to the store; `SummaryStrip` in API mode reports the real
  persisted entity count with candidates/resolutions/jobs honestly at 0.
- **`entities/[id]/page.tsx`** — API mode resolves the persisted entity (scoped read) with
  honestly empty relationships/evidence/events/activity/sources/resolution-history tabs.
- **`inspector.service.ts`** — entity context branches on `isMockData()`: API mode resolves
  the persisted row as a scoped detail read (`loadEntityDetail`), never the mock service.

## Non-goals (explicitly not done)

No entity resolution / merging ML, no `entity_resolutions` API surface, no relationships /
findings / notes / events migration, no RBAC or auth rewrite, no Docker / Neo4j / Redis, no
UI redesign. `entity.service.ts` (mock) is retained for mock mode.

## Phase 17.8 boundary (exact)

Validated, explicitly deferred, and kept **honest** (empty result sets, never fabricated from
mock):

- Relational **entity↔relationships / evidence / events / findings** link surfaces and the
  `entity_resolutions` relation have no joined API read surface yet.
- Consequently, in API mode: `EntityDetailBundle.relationships / related / evidence / events /
  activity / sources / resolutionHistory` are `[]`, and the per-entity counters
  (sources/connections/events/evidence/activity) are `0`.
- Candidates / pending resolutions / extraction-job counters in the SummaryStrip are `0` in
  API mode (the entity-intelligence pipeline surface is not migrated).

## Verification

### Backend (SQLite override — Windows native, no Docker/PostgreSQL provisioned)
- Full `pytest` suite: **163 passed, 2 warnings** (StarletteDeprecationWarning, pre-existing)
  — baseline was 154; **+9** new `tests/test_entity_api.py` tests.
- New entity suite: scoped list, persisted detail (canonical name, confidence, verified /
  flagged, attributes, seeded canonical-id metadata), cross-investigation scoped 404 with no
  existence leak, invalid id 404 / bad uuid 422, create persistence + listing, create rejected
  for unknown investigation, API error contract.
- `ruff check apps/api`: **All checks passed**.

### Frontend
- `tsc --noEmit`: clean. `eslint`: clean (1 pre-existing font warning).
- `jest`: **71 suites / 604 tests** — mock regression intact + new
  `lib/api/entities.test.ts` (mapping, resolution derivation, aliases, list semantics, failure
  with no mock fallback, honest detail bundle + summary) + `state/entity.store.api.test.ts`
  (API routing, scoped selection, failure → error state, empty set, investigation-switch
  reload clearing stale selection) + `services/inspector.service.entity.api.test.ts`
  (API-mode entity resolution, failure → error state, mock service never called).
- `next build`: green (21 routes).

### Database / migrations
- `alembic upgrade head`: **applies cleanly** on a fresh SQLite DB (3 revisions).
- Seed: Operation Meridian reproduces; **6 entity rows** (Rahul Kumar, Mumbai Trading Corp,
  Vikram Patel, account 7731…, TXN-2026-0482, phone +91 98765 43210) verified queryable with
  the expected persisted fields.

## Honest database verification status

- **SQLite: verified end-to-end** (migrate → seed → entity rows queryable).
- **PostgreSQL: DDL verified offline** (batch-mode migration is a passthrough on PostgreSQL).
  **Live PostgreSQL / Render deploy: PENDING** — no PostgreSQL instance is provisioned in this
  working environment (no psycopg2 installed, port 5432 closed). Rendered DDL is valid; the
  seed/tests exercise the same SQLAlchemy models on SQLite.

## File tracking (Phase 17.7; repo is NOT a git repo)

- New: `docs/PHASE_17.7_COMPLETE.md`,
  `apps/web/src/lib/api/entities.ts`, `apps/web/src/lib/api/entities.test.ts`,
  `apps/web/src/state/entity.store.ts`, `apps/web/src/state/entity.store.api.test.ts`,
  `apps/web/src/services/inspector.service.entity.api.test.ts`,
  `apps/api/tests/test_entity_api.py`.
- Modified: `apps/api/app/services/real/investigation.py` (`get_entity_scoped`),
  `apps/api/app/api/routers/entities.py` (scoped detail query),
  `apps/api/app/api/routers/investigation_resources.py` (unchanged),
  `apps/web/src/lib/api/investigations.ts` (`getEntityScoped`),
  `apps/web/src/lib/api/config.ts` (unchanged),
  `apps/web/src/state/evidence.store.ts` (unchanged),
  `apps/web/src/app/(dashboard)/entities/page.tsx`,
  `apps/web/src/app/(dashboard)/entities/[id]/page.tsx`,
  `apps/web/src/services/inspector.service.ts`,
  `docs/REAL_APPLICATION_ARCHITECTURE.md`, `docs/README.md`.
- Audit copy for cross-checking: `C:\SIH\trinetra-pulse-audit` — Phase 17.7 changes are NOT
  mirrored there; run tests from `C:\SIH\trinetra-pulse` only.

## Out of scope (unchanged)

Autonomous agents / agentic investigation, suspect ranking, guilt/criminality scoring,
predictive policing, automated enforcement, entity-resolution ML, Phase 17.8 relational link
surfaces, blockchain phase, Phase 16-adjacent features.