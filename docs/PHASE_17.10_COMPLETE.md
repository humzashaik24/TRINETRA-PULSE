# PHASE 17.10 COMPLETE

## 1. Objective

Validate and harden the complete Trinetra Pulse **production path** against
Render and PostgreSQL:

```
Next.js frontend
    -> Render native Node web service (apps/web)
    -> FastAPI backend (apps/api)
    -> Render managed PostgreSQL
    -> persisted investigations/entities/relationships/evidence/findings/notes/events
    -> graph / analytics / timeline / grounded AI
```

No Docker anywhere. Fix only genuine production blockers found by the audit;
do not start Phase 18.

## 2. Files created

- `docs/PHASE_17.10_COMPLETE.md` — this report.
- (Test artifact) `apps/api/tests/test_api_v2.py::test_update_investigation_round_trip`
  was added inside an existing file (listed under modified).

## 3. Files modified

- `apps/api/app/core/config.py` — `Settings.database_url` now normalizes a bare
  `postgres://` / `postgresql://` connection string (exactly what Render's
  managed DB exposes) to `postgresql+asyncpg://` for the async engine;
  `database_url_sync` normalizes `postgres://` -> `postgresql://` for Alembic;
  new `db_pool_size` / `db_max_overflow` settings (defaults 5/5).
- `apps/api/app/db/session.py` — engine pool uses `settings.db_pool_size` /
  `settings.db_max_overflow` instead of a hard-coded 20/10 (free tier never
  needs 30 connections).
- `apps/api/app/services/real/investigation.py` — `update()` now
  `await session.refresh(investigation)` after flush, fixing the
  `MissingGreenlet` 500 on `PATCH /investigations/{id}` (DB-side
  `updated_at` is expired after UPDATE in async SQLAlchemy).
- `apps/api/requirements.txt` — added `psycopg2-binary>=2.9.0` so Alembic's
  synchronous `postgresql://` URL works against PostgreSQL.
- `apps/api/pyproject.toml` — mirrored the `psycopg2-binary` dependency.
- `apps/api/.env.example` — documented URL normalization and the
  `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` pool variables.
- `apps/api/tests/test_api_v2.py` — added
  `test_update_investigation_round_trip` (PATCH persists + re-serializes
  without async lazy-load crash).
- `render.yaml` — API service gains `preDeployCommand: python -m alembic
  upgrade head` (schema applied on every deploy, deploy fails on error) and
  `DB_POOL_SIZE=3` / `DB_MAX_OVERFLOW=2`; header and comments updated for
  Phase 17.10.
- `docs/RENDER_DEPLOYMENT.md` — preDeployCommand in the resource table,
  pool vars, driver normalization note, updated first-deploy steps,
  "Production integration verification status" section (PENDING), exact
  manual deployment steps, troubleshooting updates.
- `docs/DATABASE_ARCHITECTURE.md` — connection/pool/driver documentation,
  migration verification numbers, live-PostgreSQL-pending note.
- `docs/REAL_APPLICATION_ARCHITECTURE.md` — Phase 17.10 bullet + verification
  numbers (pytest 190, jest 78/654).
- `docs/README.md` — Phase 17.10 section added, Phase 17.9 de-flagged.
- `README.md` — Phase 17.10 summary + updated doc links.

## 4. Files deleted

None. No tables deleted, no migrations removed, no functionality removed.
Mock mode is byte-for-byte unchanged.

## 5. Render services

`render.yaml` statically validated (valid YAML):

| Service | Type | Runtime | Root | Health | Deploy |
|---|---|---|---|---|---|
| `trinetra-pulse-api` | web | python | `apps/api` | `/health` | build `pip install -r requirements.txt`; preDeploy `python -m alembic upgrade head`; start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `trinetra-pulse-web` | web | node | repo root (workspace) | `/overview` | build `npm install && npm run build --workspace=apps/web`; start `npm run start --workspace=apps/web` |
| `trinetra-pulse-db` | postgres | managed | — | — | databaseName `trinetra`, region oregon, plan free |

`next start` binds to Render's `$PORT` automatically; `uvicorn` binds
`0.0.0.0:$PORT`. Build/start commands were executed locally and verified
(builds green, `next start` served `/overview` 200, uvicorn served all
endpoints).

## 6. Environment configuration

Backend (`trinetra-pulse-api`): `APP_ENV=production`, `APP_DEBUG=false`,
`DATABASE_URL` from the managed database (`fromDatabase`), `APP_SECRET_KEY` +
`JWT_SECRET_KEY` (`generateValue`), `FRONTEND_URL` (`sync: false` — operator
enters the web origin), `AI_PROVIDER=mock` (server-side AI, no key committed),
`DB_POOL_SIZE=3`, `DB_MAX_OVERFLOW=2`.

Frontend (`trinetra-pulse-web`): `NEXT_PUBLIC_USE_MOCK_API=false` (required for
production), `NEXT_PUBLIC_API_BASE_URL` (`sync: false` — operator enters the
API's public onrender URL; inlined at build time).

Verified: no production config points at localhost (the only `localhost`
values are dev defaults/browser CORS fallback); `FRONTEND_URL` must equal the
web origin exactly; no secrets committed (all `.env` files are `.env.example`
with placeholders).

## 7. PostgreSQL status

- A live PostgreSQL server was **not** available in the working environment
  (no local psql, no Render access). **No claim of live PostgreSQL testing is
  made.**
- `alembic upgrade head --sql` regenerated the full **PostgreSQL DDL**
  (`PostgresqlImpl`, transactional DDL) successfully.
- The PostgreSQL-specific runtime issue found by the audit — `create_async_engine`
  receives Render's bare `postgresql://` URL — was reproduced (psycopg2 import
  error / no async driver) and fixed via URL normalization; the normalized URL
  now builds an async engine successfully.
- Render's schema-migration step was broken (no migration ran on deploy); fixed
  with `preDeployCommand`. Alembic's sync driver (`psycopg2`) was missing;
  added.

## 8. Migration status

- `alembic upgrade head` re-verified against a fresh SQLite database: all three
  revisions apply cleanly. Result: **16 model tables** + `alembic_version`;
  13 tables declare foreign keys; **30 named indexes**; the provenance
  migration (`data_provenance` + `investigation_id`/`dataset_id`/
  `ingestion_job_id`/`checksum`) applied.
- All revisions are additive (create -> add datasets -> extend provenance);
  **no destructive migration exists**.
- No new migration was needed — the production incompatibilities were
  configuration/dependency issues, not schema issues.

## 9. Seed status

- `python -m app.db.seed` run twice against the migrated database
  (**idempotent** — identical counts after each run):
  inv-006 present; `entities=6`, `relationships=4`, `evidence=4`, `findings=2`,
  `events=3`, `investigation_notes=1`, `datasets=3`, `ingestion_jobs=3`.
- Seeding on Render is **intent-defined, not automatic**: the demo platform
  intentionally loads Operation Meridian as a documented one-off post-deploy
  step (`python -m app.db.seed`); a deployment that should start empty is never
  auto-seeded (the API `preDeployCommand` only migrates).

## 10. API smoke tests

The API was run locally in **production mode** (`APP_ENV=production`, real
secrets, `DATABASE_URL` -> seeded SQLite override, `FRONTEND_URL` set):

- `GET /health` -> `{"status":"healthy","version":"0.1.0","environment":"production","database":"ok"}`
- `GET /api/v1/health` and `GET /api/v1/health/db` -> healthy; db `ok`
- CORS preflight from `http://localhost:3000` -> `Access-Control-Allow-Origin`
  echoes it; preflight from a disallowed origin -> rejected, no header
- Auth gate: `/api/v2/*` without `X-User-Id` in production -> **401**
  `{"code":"authentication_required",...}` (the web client always sends
  `X-User-Id`)
- End-to-end `/api/v2` reads all returned **real persisted records** with no
  mock fallback: investigations, detail, summary (6/4/4/2/3/1),
  entities (6), relationships (4), evidence (4, SHA-256 integrity
  `status=VALID` on list + detail), findings (2), notes (1), events (3:
  case_event/transaction/meeting), timeline (10 entries),
  graph (6 nodes / 4 edges), analytics (components 2, avgDegree 1.333,
  flagged 3).
- Grounded AI endpoint `POST /api/v2/ai/investigation-assistant/query`
  reachable + authenticated + validated (deterministic mock provider response).
- Write paths verified write -> DB -> GET read-back returns the same record:
  `POST /investigations` (201), `PATCH /investigations/{id}` (title/priority
  persisted, `updated_at` refreshed), `POST /entities`, `POST /findings`,
  `POST /notes`, and `POST /datasets/upload` with a CDR CSV -> the ingestion
  pipeline created 6 entities / 3 relationships / 4 evidence records and the
  investigation's event stream gained `dataset_uploaded`, `ingestion_started`,
  `ingestion_completed` (visible via the scoped events list and timeline).
- Error contract verified on failures: `{code, message, details, status_code}`
  (404 `not_found`, 422 `validation_error`, 401 `authentication_required`).

## 11. Frontend production verification

- `npx tsc --noEmit`: clean.
- `npx eslint src --ext .ts,.tsx`: clean (1 pre-existing
  `no-page-custom-font` warning).
- `npx jest --silent`: **78 suites / 654 tests** passed.
- `npx next build` with `NEXT_PUBLIC_USE_MOCK_API=false` and
  `NEXT_PUBLIC_API_BASE_URL=https://trinetra-pulse-api.onrender.com`: green;
  the API base URL is inlined into client chunks; the only `localhost` token
  in the build is Next.js's standard `polyfills` chunk (dev-server URL
  parsing), **not** an API URL — no accidental localhost in the production
  bundle.
- `npx next build` with `NEXT_PUBLIC_USE_MOCK_API=true` (mock regression):
  green.
- `next start` boot smoke: `/overview` returns 200.

## 12. Investigation isolation verification

A second investigation ("Isolation Test B") was created and seeded (entity,
finding, note). Verified with a production-mode local server:

- B's entity/finding/note requested with **A's** `investigation_id` -> **404**
  (no existence leak).
- A's entity/relationship/evidence/finding/note/event requested with **B's**
  scope -> **404** across all six resource types.
- Correct-scope reads -> 200; unscoped reads still resolve (documented
  contract).
- Lists isolated: A shows 6 entities / 2 findings (B's rows never appear);
  B shows only its own.
- A's timeline (10), graph (6/4) and analytics untouched by B; B's graph is
  honestly empty (1 node, 0 edges).

## 13. Security verification

- CORS: `allow_origins` is environment-driven, never `["*"]` (`allow_methods`
  / `allow_headers` wildcards are origin-independent and safe). Disallowed
  origin rejected in a live preflight test.
- No secrets in the frontend: no `DATABASE_URL`, Postgres credentials, or API
  keys anywhere under `apps/web` (matched tokens are mock identifiers).
- Only `NEXT_PUBLIC_USE_MOCK_API` / `NEXT_PUBLIC_API_BASE_URL` are public config;
  `AI_API_KEY` is server-side only, never in the bundle.
- No committed `.env` files (only `.env.example` placeholders); `generateValue`
  supplies production secrets.
- Error responses do not leak internals: unhandled errors serialize as generic
  `Internal server error`; the API contract carries only
  `{code, message, details, status_code}`.
- Investigation scoping enforced (see 12).
- Evidence integrity verifiable end-to-end: list + detail + `/integrity`
  checksum (`sha256`, `status=VALID`).
- RBAC not implemented (explicitly out of scope for Phase 17.10; the
  `X-User-Id` dev-identity gate remains the documented mechanism).

## 14. Mock/API behavior

- Mock mode (`NEXT_PUBLIC_USE_MOCK_API=true`) is the untouched local/demo
  fallback: builds green and the full jest suite (78/654, all mock +
  API-mode tests) passes with no backend running.
- API mode (`NEXT_PUBLIC_USE_MOCK_API=false`) reads exclusively from `/api/v2`
  with **no silent API->mock fallback**; failures surface error states.
- The two modes never mix.

## 15. Full test results

- Backend: `pytest tests -q` -> **190 passed, 6 warnings** (pre-existing
  Starlette deprecation + Postgres-extension-on-SQLite warnings);
  `ruff check .` -> **All checks passed**.
- Frontend: `tsc --noEmit` clean; `eslint` clean (1 pre-existing warning);
  `jest` **78 suites / 654 tests**; `next build` green in API and mock modes.
- Migrations: `alembic upgrade head` clean on fresh DB; `--sql` valid
  PostgreSQL DDL.
- Seed: idempotent, exact Operation Meridian counts.

## 16. Deployment URL

- **Not available.** No live Render deployment exists and none was performed.
  Live deployment verification **remains pending**; exact manual steps are in
  `docs/RENDER_DEPLOYMENT.md`.

## 17. Known limitations

- **Render/live PostgreSQL verification remains pending** — no Render access,
  no live managed database. Postgres is exercised via the SQLite override
  (portable types) and PostgreSQL DDL offline mode only.
- Evidence payload blobs live on the ephemeral Render filesystem
  (`EVIDENCE_STORAGE_DIR`); metadata + SHA-256 integrity live in PostgreSQL.
  An object store is the documented production swap (not configured in 17.10).
- AI is `AI_PROVIDER=mock` (deterministic, offline); a real `AI_API_KEY` is
  server-side config and was not exercised.
- Free-tier Render PostgreSQL connection limits are handled through a
  conservative 3+2 async pool; if a higher-tier database is used, bump
  `DB_POOL_SIZE`/`DB_MAX_OVERFLOW`.
- `cors_allow_origins` falls back to localhost origins when neither
  `FRONTEND_URL` nor `CORS_ORIGINS` is set — production operators must set
  `FRONTEND_URL` (documented in render.yaml as `sync: false`).

## 18. Remaining work

- Perform the actual Blueprint deployment and its smoke test (browser network
  requests to the Render API, refresh persistence, per-surface walkthrough)
  once Render access exists.
- Verify migrations + seed against the live managed PostgreSQL.
- Optional: production object store for evidence payloads; real AI provider
  key.
- **Phase 18 is explicitly NOT started.** No Phase 18 work was performed in
  this session, and its scope must not be inferred from Phase 17.x boundaries.