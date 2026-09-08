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
- **17.6 — Real evidence intelligence with SHA-256 integrity.** The `isMockData()`
  boundary extends to the Evidence Intelligence workspaces: `state/evidence.store.ts`
  (list/detail/selection) and `services/inspector.service.ts` (Context Inspector)
  branch to a new typed evidence adapter (`src/lib/api/evidence.ts` — `getEvidenceById`,
  `getEvidenceIntegrity`, `loadEvidenceSearch`) when `NEXT_PUBLIC_USE_MOCK_API=false`.
  The backend serves investigation-scoped reads (`GET /evidence/{id}?investigation_id=…`,
  `GET /evidence/{id}/integrity`, per-row `integrity` on the nested list) and computes a
  **SHA-256 checksum** of a canonicalised evidence payload at create time
  (`app/services/evidence_integrity.py`), verified against the deterministic blob digest
  in `app/storage/evidence_storage.py`. The checksum surfaces as `EvidenceItem.provenance.hash`
  and as an `integrity: {checksum, status}` block on the UI detail panel. UI-only link
  arrays, coverage, relationship/finding support, entity summaries and collections have
  **no relational endpoints yet** — the evidence↔entity/finding/event link model is the
  Phase 17.7 boundary — so in API mode those slices stay **honestly empty** (graceful
  empty states, never fabricated from mock). There is **no silent API→mock fallback**;
  an API failure surfaces the store error state. See
  [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md).
- **17.7 — Real entity intelligence (investigation-scoped).** The `isMockData()` boundary
  extends to the Entity workspace (`/entities` + `/entities/[id]`), its Zustand store
  (`state/entity.store.ts`) and the Context Inspector entity resolution
  (`services/inspector.service.ts`): when `NEXT_PUBLIC_USE_MOCK_API=false` all reads branch
  to a typed entity adapter (`src/lib/api/entities.ts` — `mapEntityIntelligence`,
  `loadEntityList`, `loadEntityDetail`/`loadEntityDetailBundle`, `apiEntityOverviewSummary`).
  The backend detail read is now investigation-scoped (`GET /entities/{id}?investigation_id=…`
  → 404 on scope mismatch, `get_entity_scoped`), so a cross-investigation entity can never
  leak. Mapping is honest: `resolutionState` derives from the persisted verified flag,
  relational counters and the entities↔relationships/evidence/event link surfaces are
  later-phase domains so they stay at 0 / empty in API mode (never fabricated from mock);
  candidates / resolutions / extraction-job counts in the SummaryStrip are likewise 0.
  No silent API→mock fallback. See [PHASE_17.7_COMPLETE.md](PHASE_17.7_COMPLETE.md).
- **17.8 -- Real relationships (investigation-scoped).** The relationship detail read is now
  investigation-scoped (`GET /relationships/{id}?investigation_id=...` -> 404 on scope
  mismatch, `get_relationship_scoped`), and the persisted `extraction_method` column is
  exposed on `RelationshipRead`. A new typed relationship adapter
  (`src/lib/api/relationships.ts`: `mapApiRelationship`, `loadRelationshipDetail`,
  `loadEntityRelationships`, `relatedFrom`) maps persisted relationship rows into the Phase 0
  `EntityRelationship` shape with resolved entity names/types, using deterministic documented
  translations for the persisted vocabularies (`relationship_type`, incl. the
  `known_associiate` spelling, -> `RelationshipKind` with entity-type-aware USES/WORKS_FOR
  special cases; `verification_status`, incl. `possible` -> `CANDIDATE`; `extraction_method`
  -> `ExtractionMethod`). The entity detail Relations tab (`loadEntityDetailBundle`) and the
  Context Inspector relationship resolution (`inspector.service.ts`, always authoritative in
  API mode -- the graph-hint shortcut is mock-mode only) now read real persisted rows. The
  investigation workspace relationship list and network graph edges already surfaced real
  relationships (Phases 17.2/17.4). Relationship creation stays deferred (no UI flow, no
  POST endpoint). No silent API->mock fallback. See
  [PHASE_17.8_COMPLETE.md](PHASE_17.8_COMPLETE.md).
- **17.9 -- Real findings, notes & events detail (investigation-scoped).** The
  finding / note detail reads are now investigation-scoped (`GET /findings/{id}?investigation_id=...`,
  `GET /notes/{id}?investigation_id=...`, `GET /events/{id}?investigation_id=...` -> 404 on scope
  mismatch, via `get_finding_scoped` / `get_note_scoped` / `get_event_scoped`), closing the last
  unscoped detail reads in the workspace family. The Context Inspector finding/note/event branches
  (`services/inspector.service.ts`) resolve persisted scoped rows in API mode through new typed
  adapters (`src/lib/api/findings.ts`, `src/lib/api/notes.ts`, `src/lib/api/events.ts`:
  `loadFindingDetail` resolves entity_refs names/types from the scoped entity rows with
  deterministic severity/confidence translations; `loadNoteDetail`; `loadEventDetail`). Events
  continue through the existing `events` table / scoped list / merged timeline (no duplicate
  table): ingestion-created events (`dataset_uploaded`, `ingestion_started`, `ingestion_completed`,
  `ingestion_failed`) remain visible per investigation. Discovery (lists), the findings/notes tabs,
  overview counts and the unified timeline already read persisted rows (Phases 14.2/17.4); the
  finding/note/event POST endpoints keep working unchanged. No silent API->mock fallback. See
  [PHASE_17.9_COMPLETE.md](PHASE_17.9_COMPLETE.md).
- **17.10 -- Render production + PostgreSQL integration verification.** The
  production path (Next.js -> Render native Node -> FastAPI native Python ->
  Render managed PostgreSQL -> persisted workspace + graph/analytics/timeline/
  grounded AI) was audited, hardened and validated: `render.yaml` now runs
  `python -m alembic upgrade head` as the API service's `preDeployCommand`
  (schema always applied on deploy); `Settings.database_url` normalizes
  Render's bare `postgres://`/`postgresql://` connection string to
  `postgresql+asyncpg://` for the async engine; `psycopg2-binary` was added so
  Alembic's synchronous URL works against PostgreSQL; and the async engine pool
  is configurable (`DB_POOL_SIZE`/`DB_MAX_OVERFLOW`, 3/2 in `render.yaml`)
  to fit free-tier connection limits. A genuine write-path bug was fixed: the
  investigation PATCH endpoint crashed with `MissingGreenlet` because the DB-side
  `updated_at` (`onupdate=func.now()`) is expired after flush -- the service now
  `refresh()`es before validation (regression test added). Live Render
  deployment and live PostgreSQL verification **remain pending** (no Render
  access in the environment); everything else was verified in production mode
  against a seeded SQLite override (startup guard, CORS without wildcard,
  auth gate, health, every /api/v2 read + write path, cross-investigation
  isolation for all six resource types, evidence integrity, production web
  build in API mode with no localhost in the bundle). See
  [PHASE_17.10_COMPLETE.md](PHASE_17.10_COMPLETE.md).
- **18.1 -- Authentication + RBAC (real layer).** The dev-identity `X-User-Id`
  gate was replaced by real JWT authentication and a role-based access-control
  model. `POST /api/v2/auth/login` (the only public v2 endpoint) verifies bcrypt
  hashes and issues a 30-minute HS256 JWT; `GET /auth/me` returns the safe
  profile; `/admin/users` and `/admin/audit` expose user management and the auth
  audit trail (`permission_denied` events are recorded on every RBAC denial).
  Every v2 mutation is gated by `CanMutateDep`, investigation delete by
  `SupervisorDep`, and assistant reads by any authenticated user; the role
  hierarchy is `admin` > `supervisor` > `investigator` with a distinct read-only
  `auditor`. The token is a stateless JWT — forged roles are rejected with 403,
  malformed/expired tokens with 401, and `X-User-Id` is never trusted. A new
  Alembic revision (`c4d5e6f7a8b9`) adds `users` + `auth_audit_events`; the seed
  idempotently creates four demo users. The web app gained `/login`, an
  `AuthGate` route guard, `AuthBootstrap` (401 -> logout), a profile page, a
  role-gated Security page (users + audit) and role-filtered navigation with
  auditor read-only gating; the API client attaches `Authorization: Bearer`.
  Backend: 207 pytest, ruff clean. Frontend: 81 suites / 667 tests, tsc +
  eslint clean, `next build` green both modes. Live Render deployment remains
  pending. See [PHASE_18.1_COMPLETE.md](PHASE_18.1_COMPLETE.md).
- **18.2 -- Tamper-evident evidence chain of custody.** Every evidence lifecycle
  transition appends a SHA-256 hash-chain link in PostgreSQL
  (`evidence_chain_entries`, migration `d5e6f7a8b9c0`, 19 model tables). **This is
  NOT a blockchain** — no distributed ledger, consensus, nodes or tokens; the
  chain is a per-evidence sequence of links (action, payload/metadata/previous/
  entry hashes, actor snapshot) pinned by `previous_entry_hash` and replayed by
  `EvidenceChainVerifier`, which also recomputes the live payload checksum so a
  post-hoc evidence-body edit reports `TAMPERED` (deleted/missing link →
  `BROKEN_CHAIN`, no links → `MISSING`). Genesis links are appended
  automatically by interactive evidence create and CDR ingestion (actor
  resolution centralized in `EvidenceChainService.append`); the seed
  idempotently blocks existing demo evidence. API: `GET /{id}/chain`,
  `GET /{id}/chain/verify` (read-only, auditor-friendly, never writes audit),
  `POST /{id}/chain/verify` (audited `evidence_chain_verified` /
  `evidence_chain_verify_failed`), `POST /evidence` (audited
  `evidence_chain_created`); all reads scoped 404-safe by `investigation_id`.
  Frontend: `EvidenceChainPanel` on the evidence detail view + compact custody
  section in `EvidenceContextView`, mock-mode honestly absent (no fabricated
  hashes). Backend: 227 pytest, ruff clean. Frontend: 83 suites / 687 tests,
  tsc + eslint clean, `next build` green in mock + API modes. Live Render
  deployment remains pending. See [PHASE_18.2_COMPLETE.md](PHASE_18.2_COMPLETE.md).
- **18.4 -- Blockchain-inspired custody hardening.** The existing relational
  chain now uses deterministic `GENESIS` linking, canonical SHA-256 event
  hashes, authoritative evidence checksums, authenticated actor/timestamp
  inputs, structured verification failures, and explicit investigation
  isolation. This is a permissioned, relational, SHA-256 hash-linked
  tamper-evident evidence chain. It is not a public blockchain. See
  [PHASE_18.4_COMPLETE.md](PHASE_18.4_COMPLETE.md).
- **18.6 -- Durable evidence object storage.** The existing storage boundary
  now supports local filesystem development and server-configured
  S3-compatible production storage with deterministic investigation-scoped
  object keys. PostgreSQL remains the metadata/checksum/provenance/custody
  source of truth; raw payload storage never bypasses authorization.
 - **18.7 -- Real evidence payload lifecycle.** `POST /evidence/upload` is a
  JWT/RBAC-protected multipart endpoint. It validates the server-configured
  `EVIDENCE_MAX_UPLOAD_BYTES` limit and safe filename, assigns the existing
  investigation-scoped object key, stores bytes through `EvidenceStorage`,
  records the raw SHA-256 through `evidence_integrity`, persists metadata plus
  `DataProvenance`, and appends `EVIDENCE_UPLOADED` in the existing custody
  chain. `GET /evidence/{id}/download` checks scope and storage integrity
  before streaming; it never creates a public URL. Storage-first failures and
  database failures attempt compensating object deletion. CSV ingestion remains
  unchanged; non-CSV files in the existing Data Intelligence uploader use the
  evidence endpoint.

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
| `auth` | `POST /auth/login` (public), `GET /auth/me` (Phase 18.1) |
| `admin` | `GET /admin/users`, `GET /admin/audit` (role-gated, Phase 18.1) |
| `investigations` | CRUD + paginated list + summary |
| `entities` / `relationships` | CRUD (+ scoped entity read `?investigation_id=`, Phase 17.7; + scoped relationship read `?investigation_id=`, Phase 17.8) |
| `findings` / `evidence` / `events` / `notes` | CRUD (+ scoped evidence read & `/evidence/{id}/integrity`, Phase 17.6; + scoped findings/events/notes reads `?investigation_id=`, Phase 17.9) |
| `evidence` chain (Phase 18.2) | `GET /evidence/{id}/chain` (scoped read), `GET /evidence/{id}/chain/verify` (read-only verify, auditor OK), `POST /evidence/{id}/chain/verify` (audited verify) |
| `timeline` | unified timeline for an investigation |
| `network` | graph + analytics |
| `investigation_resources` | nested lists under `/investigations/{id}/…` |
| `assistant` | `/status`, `/providers`, AI query (authenticated; read-only by role) |

**Error contract** — every failure serializes as
`{code, message, details, status_code}` via domain exceptions in
`app/api/errors.py` (`NotFoundError`, `ConflictError`, `IntegrityError`,
`AuthRequiredError`, `NotAuthorizedError`, with `*Error` suffixes per ruff N818).

**Dependencies** (`app/api/deps.py`) — `get_session` FastAPI dep and the
Phase 18.1 authentication/RBAC gateway:
- `CurrentUserDep` — parses the `Authorization: Bearer <JWT>`, rejects
  malformed/expired tokens with 401 `unauthorized` and loads the active user.
- `CanMutateDep` — `CurrentUserDep` + not the read-only `auditor` (403
  `forbidden`, audit event recorded).
- `SupervisorDep` — `CanMutateDep` + rank >= `supervisor` (incumbent protection
  forbids an admin from demoting/deactivating themselves).
The old `X-User-Id` header is **no longer trusted** — identity comes only from
the bearer token.

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
  storage. Since Phase 17.6 the digest of the payload blob is computed with a
  deterministic SHA-256 helper and compared against the row's `integrity`
  checksum at ingestion. Links to the `storage_ref` field on relational evidence.
- **`CsvReader`** (`app/intelligence/csv_reader.py`) — parses CSV into
  provenance-carrying `CsvRow`s (dataset name, physical row index, record
  identifier via `id_column`), validating `required_columns`. This is the
  ingestion boundary for CDR / bank / FIR / GST extracts.

---

## Verification

```bash
# Backend -- SQLite override for local verification
cd apps/api
.\venv\Scripts\python.exe -m pytest -q        # 227 passing (Phase 18.2); warnings pre-existing
.\venv\Scripts\python.exe -m ruff check .     # clean (alembic/ excluded)
alembic upgrade head                          # 19 tables apply (incl. users, auth_audit_events, evidence_chain_entries)

# Frontend
cd apps/web
npx tsc --noEmit                              # clean
npx eslint src --ext .ts,.tsx                 # clean (1 pre-existing font warning)
npx jest                                      # 83 suites / 687 tests (Phase 18.2)
npx next build                                # routes green (mock + API modes)
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
> wired exactly as the Render Blueprint does. Phase 18.1 adds real login
> (`/api/v2/auth/*`) and RBAC across the v2 surface; unauthenticated requests in
> production receive 401 `unauthorized`.

---

## Node & Phase References

- Web journey constants stay in `src/navigation/journey.ts`
  (`DEMO_INVESTIGATION_ID='inv-006'`, `DEMO_NETWORK_ID='NET-001'`).
- `@trinetra-pulse/types` shared package remains the single source of type
  truth; the v2 client defines its own response shapes matching the backend
  schemas so it can evolve independently of the demo-mirror types.

## Phase 18.3 — real suspicious-pattern detection

Pattern detection is a read-time service boundary at
`app/services/real/patterns.py`, backed by deterministic detector functions in
`app/intelligence/anomaly_detection.py`. It batches the current investigation's
entities, relationships, and evidence, then returns a typed
`PatternDetectionResponse`; no new database table is required.

The detectors are deliberately analytical:

- directed cycles up to six entities, canonicalized to remove rotation
  duplicates, with amounts only when numeric persisted relationship metadata
  contains them;
- person-to-phone multiplicity, shared phone associations, and rapid switching
  only when relationship timestamps support that language;
- degree-based high-connectivity hubs using the investigation's own degree
  distribution;
- articulation points in the undirected persisted graph as bridge-entity leads;
- relationship-count expansion across the available `start_date`/`end_date`
  range, with no result when timestamps are insufficient.

`GET /api/v2/investigations/{investigation_id}/patterns` uses the existing JWT
and RBAC dependencies and the existing error contract. The frontend API client
maps the result into the established analytics panel and Context Inspector;
entity and evidence IDs remain navigable. Mock mode still uses the existing
in-memory structural engine and API mode has no mock fallback.
