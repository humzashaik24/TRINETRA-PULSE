# Real Application Foundation (Phase 14.2 → 16)

Phase 14.2 converts Trinetra Pulse from a mock/in-memory demo into a **real
full-stack application** — PostgreSQL + SQLAlchemy 2.x async + Alembic + seed,
layered repositories/services/routers, real CRUD APIs under `/api/v2`, and a
typed frontend API client with TanStack Query hooks — **without breaking the
existing architecture or UI** (Zustand, React Flow, 441+ tests stay intact).

**Phase 14.3** targets **Render** as the production deploy: a
[Render Blueprint](../render.yaml) (Next.js Node service + FastAPI Python
service + managed PostgreSQL, **no Docker required**), environment-driven CORS,
a top-level health endpoint, and updated documentation.

**Phase 14.4** **removes Docker entirely** (cleanup only — no new features):
`docker-compose.yml`, `.dockerignore`, and the Docker npm scripts were deleted;
local development and production both run on native runtimes. See
[RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) and
[DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md).

**Phase 15** makes the existing deployment genuinely runnable on Render (no new
features): it fixes a production **startup blocker** where
`enforce_production_defaults` rejected an otherwise-correct deploy wired through
`DATABASE_URL` because the unused `POSTGRES_*`/`NEO4J_*`/`REDIS_*` component
passwords retained defaults, pins lint to exclude Alembic-generated migrations
(so `ruff check .` is clean), adds production-config regression tests, and
verifies the full migration → seed → `/api/v2` data flow end-to-end.

**Phase 16** adds a real data ingestion pipeline (new features, additive):
CSV file upload via `POST /api/v2/datasets/upload` (multipart FormData) →
`IngestionPipeline` (CSV parsing → entity extraction with column heuristics →
relationship creation between entity pairs per row → InvestigationEvidence per
row → quality score computation) → PostgreSQL persistence. Frontend components
(`UploadZone`, `DatasetTable`, `IngestionHistory`) are wired to the real API
(or mock, depending on `NEXT_PUBLIC_USE_MOCK_API`). Investigation workspace
gains a 9th "Data" tab for scoped data management. See
[DATA_INGESTION.md](DATA_INGESTION.md) for the full pipeline reference.

The legacy demo code is preserved exactly as before. The real layer is additive:
mounted at a separate path and switched on via environment configuration, so
the Operation Meridian demo continues to work with zero backend by default.

**Phase 17** moves the primary read/analytics surfaces from mock to the real
persisted `/api/v2` backend while keeping the demo (`NEXT_PUBLIC_USE_MOCK_API=true`)
fully intact. Each surface now branches on `isMockData()`:

- **17.0–17.1 — audit + provenance.** Inventory audit; ingestion and data
  mutations record `InvestigationEvent` provenance rows (14 provenance tests).
- **17.2 — Real network graph.** `graph.store.ts` `loadNetwork()` branches to
  the API and maps `GET /networks/{id}/graph` (`NetworkGraph`) through
  `mapApiGraphToNetworkGraph`/`mapApiGraphToSummary` in `investigations.ts`
  into the React Flow state (confidence→status, weight→confidence, derived
  `connections`, `STRUCTURED_MAPPING` extraction).
- **17.3 — Real network analytics.** `analytics.store.ts` `loadAnalytics()`
  branches to the API and maps `GET /networks/{id}/analytics`
  (`AnalyticsOverview`) through `mapApiAnalyticsToNetworkAnalytics` into the
  `NetworkAnalytics` bundle. The backend intentionally returns summary
  metrics only, so centrality/communities/bridges/patterns/temporal render as
  null/empty in API mode (documented, deliberate).
- **17.4 — Real investigation timeline.** The investigation workspace already
  routed its timeline through `loadInvestigationWorkspace` → `getTimeline(id)`
  → `GET /timeline/{investigationId}`. This phase tightens parity with mock
  mode: `mapTimeline` (in `adapter.ts`) drops `finding` entries (the unified
  timeline tab merges findings separately from the findings slice, so keeping
  them in the API feed would list each finding twice), and the
  `InvestigationTimelineItem.category` type union gained `'finding'`. API-mode
  reads remain investigation-scoped; every mapped item is stamped with the
  active `investigation_id`.
- **17.5 — Grounded AI from persisted investigation data.** When
  `NEXT_PUBLIC_USE_MOCK_API=false`, the AI assistant grounds every answer in
  REAL, investigation-scoped data instead of the in-memory demo. The web
  retrieval layer (`src/ai/retrieval.ts`) reads the persisted investigation
  through the existing typed `/api/v2` client (`getInvestigationSummary`,
  `getInvestigation`, entity/relationship/evidence/finding lists,
  `getTimeline`, network graph/analytics, `getEntity`), bounds it into a
  `ContextSourceBundle`, serializes it as a compact bounded `context` payload,
  and forwards it to the backend v2 assistant (`POST /api/v2/ai/...`). The
  backend receives the bounded context **as data** — it never queries the
  database or runs the client's facts verbatim — adds a minimal scope stub,
  runs the configured provider (server-side `mock` or `openai`/OpenAI-compatible
  via `AI_PROVIDER`/`AI_MODEL`/`AI_API_KEY`/`AI_BASE_URL`), applies the
  `guard_neutral` phrase guard, and echoes only references that exist in the
  supplied context. The frontend `ApiInvestigationProvider` then runs the
  response through the existing `validateResponse` pipeline (its `buildRegistry`
  derives known-good ids from the retrieved bundle), so fabricated or
  out-of-scope references are dropped and ungrounded answers flip to
  `not_found`. Isolation is enforced client-side: every request carries an
  explicit `investigationId`, retrieval is strictly scoped to it, and
  `ai.store` clears conversation/context (incl. `lastScope`) whenever the scope
  changes. The deterministic mock provider is untouched and remains the default
  (`NEXT_PUBLIC_USE_MOCK_API=true`). API keys never reach the client;
  provider configuration stays server-side. `GET /api/v2/ai/status` reports the
  active provider/model so the UI can name the non-real fallback honestly.

---

## Principles

- **Additive, not a rewrite.** Legacy `/api/v1` routers, in-memory stores, mock
  services and Zustand stores are untouched. The real layer lives beside them.
- **Mock-first by default.** The web app consumes in-memory demo data unless
  `NEXT_PUBLIC_USE_MOCK_API=false`, so the SIH demo runs with just Node + Python.
- **Portable types.** The same models run on PostgreSQL (native `UUID`/`JSONB`)
  and SQLite (fallbacks) so integration can be verified without Docker.
- **Single error contract.** `/api/v2` returns `{code, message, details,
  status_code}` on every failure, and the typed client surfaces it verbatim.

---

## Layer Map

```
┌────────────────────────────────────────────────────────────────────┐
│ WEB  (apps/web)                                                    │
│   React Query hooks  (src/hooks/use-investigations.ts)             │
│   Typed API client (src/lib/api/investigations.ts + client.ts)     │
│   Data-source switch (src/lib/api/config.ts)                       │
│   QueryClientProvider (src/lib/api/provider.tsx, wired in layout)  │
│   ── presentational UI continues to consume Zustand stores ──      │
└───────────────┬────────────────────────────────────────────────────┘
                │ fetch → /api/v2
┌───────────────▼────────────────────────────────────────────────────┐
│ API  (apps/api)  — app/api/app.py  create_real_app()              │
│   Routers  (app/api/routers/*.py)                                  │
│   Services (app/services/real/*.py)                                │
│   Repositories (app/repositories/*.py)                             │
│   Schemas   (app/schemas/real/*.py)                                │
│   Error contract (app/api/errors.py) / deps (app/api/deps.py)      │
└───────────────┬────────────────────────────────────────────────────┘
                │ SQLAlchemy 2.0 async
┌───────────────▼────────────────────────────────────────────────────┐
│ DB layer                                                           │
│   Models (app/models/*.py)  portable Uuid / JSONB (app/db/types.py)│
│   Session (app/db/session.py)                                      │
│   Migrations (alembic/  initial_schema)                            │
│   Seed (app/db/seed.py  → Operation Meridian, 16 tables)           │
└────────────────────────────────────────────────────────────────────┘
```

Supporting boundaries:
- **Evidential storage** — `app/storage/evidence_storage.py`, a portable
  filesystem-backed store for evidence payloads (S3-replaceable in production).
- **Data intelligence** — `app/intelligence/csv_reader.py`, a validated CSV
  ingestion boundary (CDR / bank / FIR extracts) with per-row provenance.

---

## Backend

### Configuration (`app/core/config.py`)

- `DATABASE_URL` override wins (Postgres in production, SQLite in tests).
- Otherwise `POSTGRES_*` components compose a `postgresql+asyncpg://` URL.
- `database_url_sync` is the synchronous variant used by Alembic (strips the
  `+asyncpg` / `+aiosqlite` driver segments).
- **Production startup guard** (`enforce_production_defaults`) only rejects
  default secrets the running config actually depends on: `app_secret_key` and
  `jwt_secret_key` always; `postgres_password` only when no `DATABASE_URL` is
  set. The Render Blueprint injects `DATABASE_URL` + generated app/JWT secrets,
  so a deploy boots without requiring irrelevant component passwords (Phase 15).

### Data layer

- **Portable types** (`app/db/types.py`): `Uuid` (native `UUID` on PG,
  `CHAR(32)` on SQLite) and `JSONB` TypeDecorator (true `JSONB` on PG).
- **16 tables** resolve across cases, case_evidence, data_provenance, data_sources,
  datasets, entities, entity_resolutions, events, evidence, evidence_entity_links,
  findings, incidents, ingestion_jobs, investigation_notes, investigations,
  relationships. `Relationship` is investigation-scoped via `investigation_id`.
- **Alembic** initial migration `029f568507fd_initial_schema` applies cleanly.

### Seed — Operation Meridian (`app/db/seed.py`)

Deterministic. Every row id is `uuid5(uuid.NAMESPACE_DNS, "trinetra::<cid>")`
from the legacy canonical string ids (`inv-006`, `ent-…`, `rel-…`, `ev-…`,
`inf-…`, `event-…`, `inn-…`), so the real DB reproduces the same universe the
demo shows. Contents:

- `inv-006` **Operation Meridian**: ACTIVE / HIGH, lead **Inspector Mehta**,
  tags `[import, meridian, demo]`.
- 6 entities: Rahul Kumar, Mumbai Trading Corp, Vikram Patel, account
  `7731 0029 4567`, `TXN-2026-0482`, `+91 98765 43210`.
- 4 relationships (rel-001/003/005/008), 4 evidence (ev-001/004/007/009),
  2 findings (inf-006-1/2), 3 events, 1 note.
- Idempotent (`force` param + `cleanup_seed_investigation`). CLI:
  `python -m app.db.seed`.

### Repositories (`app/repositories/*.py`)

`InvestigationRepository`, `EntityRepository`, `RelationshipRepository`,
`FindingRepository`, `EvidenceRepository`, `EventRepository`, `NoteRepository`
on a small async `BaseRepository`. Investigation-scoped list/count helpers and
`cleanup_investigation`.

### Services (`app/services/real/*.py`)

- **`InvestigationService`** — CRUD + summary + timeline + nested resource
  creation/listing. `list()` returns `(items, total)`.
- **`NetworkService`** — graph + analytics over the investigation's
  entities/relationships, including connected-components analysis.

### API (`/api/v2`)

A `create_real_app()` FastAPI app mounts a full router set and the error
handler. Mounted in `app/main.py` beside the legacy `/api/v1` routers:

| Router | Purpose |
|---|---|
| `investigations` | CRUD + paginated list + summary |
| `entities` / `relationships` | CRUD |
| `findings` / `evidence` / `events` / `notes` | CRUD |
| `timeline` | unified timeline for an investigation |
| `network` | graph + analytics |
| `investigation_resources` | nested lists under `/investigations/{id}/…` |

**Error contract** — every failure serializes as
`{code, message, details, status_code}` via domain exceptions in
`app/api/errors.py` (`NotFoundError`, `ConflictError`, `IntegrityError`,
`AuthRequiredError`, `NotAuthorizedError`, with `*Error` suffixes per ruff N818).

**Dependencies** (`app/api/deps.py`) — `get_session` FastAPI dep and a
dev-identity gateway (`get_current_user`): in production an `X-User-Id` header
is required and must **match** the server-configured `AUTH_ACTOR_EMAIL`
(default `inspector.mehta@trinetra.local`); any other value is rejected with
401 so a caller cannot impersonate a different identity (Phase 22). In
development the header is optional and falls back to the default investigator.

---

## Frontend

### Typed API client (`src/lib/api/`)

- **`config.ts`** — `DATA_SOURCE` (`'mock' | 'api'`) + `API_BASE_URL`, driven by
  `NEXT_PUBLIC_USE_MOCK_API` (default `true`) and `NEXT_PUBLIC_API_BASE_URL`
  (default `/api/v2`).
- **`client.ts`** — `apiFetch<T>(baseUrl, path, opts)`; non-2xx responses are
  parsed against the `{code, message, details, status_code}` contract into
  `ApiClientError`.
- **`investigations.ts`** — typed functions for every `/api/v2` endpoint and
  the backend response shapes (Investigation, Entity, Relationship, Finding,
  Evidence, Event, Note, Summary, Timeline, NetworkGraph, AnalyticsOverview).
- **`provider.tsx`** — `ApiProvider` (QueryClientProvider with sensible
  defaults), wired into `src/app/layout.tsx`.

### React Query hooks (`src/hooks/use-investigations.ts`)

Cached, enabled-aware hooks for every list/detail/summary/timeline/graph/
analytics query, keyed under `investigationQueryKeys` for targeted
invalidation. Kebab-case files, camelCase named exports.

### Data-source boundary

The presentational UI (components, Zustand stores) is untouched and continues
to read mock services. The real data path is exercised directly through the
client + hooks, and by flipping `NEXT_PUBLIC_USE_MOCK_API=false` the app moves
to the relational API. `.env.example` in `apps/web` documents both switches.

**Phase 15 — real-data flow scope.** With `NEXT_PUBLIC_USE_MOCK_API=false` the
workspace **reads** everything from `/api/v2` via the adapter
(`loadInvestigationWorkspace`: investigation, summary, entities, relationships,
evidence, findings, notes, events, timeline, network graph, analytics) and
**writes** through the relational endpoints the backend provides. The backend
deliberately keeps a **lean CRUD surface** (no update/delete for evidence,
findings, or notes), so the corresponding UI mutations — unlink-entity,
link/unlink-evidence, edit-finding, edit-note, remove-note — remain **mock-only
and are not wired to the API** rather than adding new backend endpoints (out of
scope for production activation). The listing page and investigation
list/detail/nested/graph/analytics reads are fully API-backed.

---

## Evidential Storage & Data Intelligence

- **`EvidenceStorage`** (`app/storage/evidence_storage.py`) — stores the blob
  payload + metadata for an evidence id under a configurable base directory
  (`<base>/<evidence_id>/payload` + `meta.json`), with `save/load/delete/exists/
  list_ids`. Idempotent and dependency-free; the production swap is object
  storage. Links to the `storage_ref` field on relational evidence.
- **`CsvReader`** (`app/intelligence/csv_reader.py`) — parses CSV into
  provenance-carrying `CsvRow`s (dataset name, physical row index, record
  identifier via `id_column`), validating `required_columns`. This is the
  ingestion boundary for CDR / bank / FIR / GST extracts.

## Blockchain Evidence Integrity (Phase 21)

Phase 21 layers a deterministic integrity anchoring mechanism onto the evidence
architecture. For each evidence item the system derives a SHA-256 checksum and a
replayable custody chain hash. These hashes are optionally anchored on an
abstracted EVM-compatible blockchain through a provider abstraction that ships
with a deterministic mock registry and a lazy-import real `web3` provider.

The anchor payload is the 64-character digest only — raw evidence and personally
identifiable information never cross a provider boundary. The custody chain is
derived (replayed from the evidence record plus the anchor row), not persisted
as a separate ledger. Backend endpoints live under `/evidence/{id}/*` and the
frontend surfaces the integrity state through the `EvidenceDetailPanel`.

See [PHASE_21_COMPLETE.md](PHASE_21_COMPLETE.md) and
[PHASE_21_REPORT.md](PHASE_21_REPORT.md) for the full specification.

---

## Verification

```bash
# Backend — SQLite override for local verification
cd apps/api
.\venv\Scripts\python.exe -m pytest -q        # 139 passing (Phase 17.5)
.\venv\Scripts\python.exe -m ruff check .     # clean (alembic/ excluded)
alembic upgrade head                          # 16 tables apply

# Frontend
cd apps/web
npx tsc --noEmit                              # clean
npx eslint src --ext .ts,.tsx                 # clean (1 pre-existing font warning)
npx jest                                      # 62 suites + 8 new suites (Phase 17.5)
npx next build                                # routes green
```

> PostgreSQL is the production target; integration is verified against
> throwaway SQLite via `DATABASE_URL` because no local PostgreSQL is provisioned
> in the working environment. `alembic upgrade head --sql` has been run to
> confirm the migrations generate valid PostgreSQL DDL. Production deployment
> is via Render ([RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)); Docker has been
> **fully removed** (Phase 14.4) — native Node + native Python + managed
> PostgreSQL only. Phase 15 additionally exercises the full production path
> (migrate → seed → `/api/v2` list/detail/summary/nested/timeline/network/
> analytics) in production mode and confirms the API boots with a `DATABASE_URL`
> wired exactly as the Render Blueprint does.

---

## Node & Phase References

- Web journey constants stay in `src/navigation/journey.ts`
  (`DEMO_INVESTIGATION_ID='inv-006'`, `DEMO_NETWORK_ID='NET-001'`).
- `@trinetra-pulse/types` shared package remains the single source of type
  truth; the v2 client defines its own response shapes matching the backend
  schemas so it can evolve independently of the demo-mirror types.
