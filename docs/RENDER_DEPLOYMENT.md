# Render Deployment (Phase 14.3 → 17.10)

> **Production target: Render native runtimes.** Docker is **not** required to
> run Trinetra Pulse in production — it has been **fully removed** from the
> repository (Phase 14.4). Only native Node, native Python, and managed
> PostgreSQL are used.

Trinetra Pulse deploys to Render as a three-resource Blueprint:

```
GitHub
  └── render.yaml (Blueprint)
        ├── Web Service  : Next.js     (apps/web)   — runtime: node
        ├── Web Service  : FastAPI     (apps/api)   — runtime: python
        └── Database     : Render PostgreSQL
```

- Frontend → Next.js native **Node** runtime (`apps/web`)
- Backend  → FastAPI native **Python** runtime (`apps/api`)
- Database → Render **Managed PostgreSQL** (never Docker in production)

Phase 18.4 requires no blockchain node or additional service. The evidence
custody feature is a permissioned, relational, SHA-256 hash-linked
tamper-evident evidence chain. It is not a public blockchain; its ledger and
verification data remain in the managed PostgreSQL database.

---

## Architecture

| Resource | Type | Runtime | Root dir | Build | Pre-deploy | Start |
|---|---|---|---|---|---|---|
| `trinetra-pulse-api` | web | python | `apps/api` | `pip install -r requirements.txt` | `python -m alembic upgrade head` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `trinetra-pulse-web` | web | node | repo root | `npm install && npm run build --workspace=apps/web` | — | `npm run start --workspace=apps/web` |
| `trinetra-pulse-db` | postgres | — | — | — | — | — |

The whole definition lives in **[`render.yaml`](../render.yaml)** at the repo
root. The APIs of the two web services are **monorepo-aware**: the frontend
build runs from the repo root so the npm workspace resolves the shared
`packages/*` and root `package-lock.json`, then scopes to `apps/web` for
`next build` / `next start`.

`next start` binds to Render's `$PORT` automatically (Next.js reads `PORT`),
and FastAPI listens on `0.0.0.0:$PORT`.

---

## Environment variables

### Backend (`trinetra-pulse-api`)

| Variable | Source | Purpose |
|---|---|---|
| `DATABASE_URL` | `fromDatabase` | Render PostgreSQL **internal** connection string |
| `APP_ENV` | `value: production` | Enables production hardening (default-secret guard) |
| `APP_DEBUG` | `value: "false"` | Turns off interactive docs in production |
| `FRONTEND_URL` | `sync: false` | Deployed frontend origin (CORS) |
| `APP_SECRET_KEY` | `generateValue` | Server secret |
| `JWT_SECRET_KEY` | `generateValue` | JWT signing secret (Phase 18.1). Crash-consistent across syncs so issued tokens survive redeploys; production refuses the dev default |
| `AI_PROVIDER` | `value: mock` | Deterministic offline AI (no external key needed) |
| `DB_POOL_SIZE` | `value: "3"` | Async engine pool size (fits free-tier PostgreSQL limits) |
| `DB_MAX_OVERFLOW` | `value: "2"` | Async engine pool overflow |
| `EVIDENCE_STORAGE_PROVIDER` | `value: "s3"` | Durable production payload provider |
| `EVIDENCE_STORAGE_BUCKET` | `sync: false` | Server-side S3-compatible bucket |
| `EVIDENCE_STORAGE_REGION` | `sync: false` | Object-storage region |
| `EVIDENCE_STORAGE_ENDPOINT` | `sync: false` | Optional S3-compatible endpoint |
| `EVIDENCE_STORAGE_ACCESS_KEY_ID` | `sync: false` | Server-side object-storage credential |
| `EVIDENCE_STORAGE_SECRET_ACCESS_KEY` | `sync: false` | Server-side object-storage secret |
| `EVIDENCE_STORAGE_PREFIX` | `value: "evidence"` | Deterministic object-key prefix |
| `EVIDENCE_MAX_UPLOAD_BYTES` | `value: "209715200"` | Server-side 200 MiB upload ceiling |

`DATABASE_URL` is injected from the managed PostgreSQL service, so no
credentials are ever committed. Render supplies the **internal** URL between
co-located services — FastAPI and PostgreSQL are in the same region.

> **Driver normalization (Phase 17.10).** Render's managed-DB connection string
> is a bare `postgresql://…` URL. `Settings.database_url` rewrites it to
> `postgresql+asyncpg://…` for the async engine, and `database_url_sync`
> returns the bare `postgresql://…` form for Alembic (which requires the
> synchronous `psycopg2` driver — added to `requirements.txt` in 17.10).
> `postgres://` aliases are normalized too.

### Frontend (`trinetra-pulse-web`)

| Variable | Source | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK_API` | `value: "false"` | **Must be false in production** → real `/api/v2` backend |
| `NEXT_PUBLIC_API_BASE_URL` | `sync: false` | Absolute public URL of `trinetra-pulse-api` (browser-reachable) |

`NEXT_PUBLIC_*` values are inlined **at build time**, so they must be set before
the build runs (Render makes service env vars available to the build). Never
put `DATABASE_URL` or any secret in a `NEXT_PUBLIC_*` variable.

Phase 18.6 requires an operator-managed S3-compatible bucket for durable raw
payloads. The application uses keys of the form
`evidence/{investigation_id}/{evidence_id}/payload`; filenames are metadata
only. Phase 18.7 uploads and downloads through authenticated API requests and
checks the stored object against its server-generated SHA-256 before retrieval.
Live object-storage verification remains pending until credentials are
available.

---

## First deploy

1. Push the repository to GitHub (Blueprint lives at the repo root).
2. In Render Dashboard → **New → Blueprint**, choose the repo.
3. Render prompts for the `sync: false` values:
   - `FRONTEND_URL` → the web service URL, e.g. `https://trinetra-pulse-web.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL` → the API service URL, e.g. `https://trinetra-pulse-api.onrender.com`
4. **Schema migrations run automatically** on every deploy: the API service's
   `preDeployCommand` runs `python -m alembic upgrade head` before the new
   service version starts (and fails the deploy on error).
5. **Seed Operation Meridian once** (intentional for the demo): run
   `python -m app.db.seed` against the managed database (Render Shell of the
   API service, or locally with the external URL). Idempotent — safe to repeat.

> **Phase 17.10** added the `preDeployCommand`, the pool-sizing vars, the
> `psychopg2` driver for Alembic's synchronous URL, and the
> `postgres://`/`postgresql://` → `postgresql+asyncpg://` normalization so the
> managed-DB connection string works with the async engine out of the box. See
> [PHASE_17.10_COMPLETE.md](PHASE_17.10_COMPLETE.md).

> **Phase 15** verified that the API actually boots with the Blueprint's wiring
> (`APP_ENV=production`, `DATABASE_URL` from the managed database,
> `APP_SECRET_KEY`/`JWT_SECRET_KEY` generated): the production startup guard no
> longer rejects a deploy over unused `POSTGRES_*`/`NEO4J_*`/`REDIS_*` defaults.
> The migrate → seed → `/api/v2` flow (list/detail/summary/nested/timeline/
> network/analytics) was exercised end-to-end in production mode.

---

## Database migration & seeding on Render Postgres

Render Postgres exposes an `internal` and an `external` connection string. The
Blueprint wires the **internal** URL into `DATABASE_URL` for the API. Run
migrations/seed from a machine with network access to the database (the Render
Shell of the API service, or locally with the **external** URL):

```bash
cd apps/api

# 1. Apply schema (Alembic) — creates the 19 production tables from empty DB
DATABASE_URL="<render postgres external URL>" python -m alembic upgrade head

# 2. Seed Operation Meridian (inv-006)
DATABASE_URL="<render postgres external URL>" python -m app.db.seed
```

> `app.db.seed` also runs `create_all`, but that is a convenience for a fresh
> demo DB only. **Production schema changes must go through Alembic** (`alembic
> revision --autogenerate` + `alembic upgrade head`), never `create_all`.

---

## Production integration verification status (Phase 17.10)

- **Live Render deployment: PENDING** — no Render CLI / API key is available in
  the working environment, so `render.yaml` has **not** been deployed and the
  managed PostgreSQL service has **not** been exercised. Nothing here claims a
  deployment that was not performed.
- **Statically verified** in Phase 17.10:
  - `render.yaml` is valid YAML; three Blueprint resources
    (`trinetra-pulse-api`, `trinetra-pulse-web`, `trinetra-pulse-db`);
    runtime=native python / native node / managed postgres; no Docker.
  - API `preDeployCommand` runs `alembic upgrade head` on every deploy.
  - Web service sets `NEXT_PUBLIC_USE_MOCK_API=false`; the API base URL and
    `FRONTEND_URL` are the only `sync: false` values the operator must enter.
  - The full app was run in **production mode locally** (`APP_ENV=production`,
    real `DATABASE_URL` to throwaway SQLite): startup guard, CORS (no
    wildcard), auth gate, health, and every `/api/v2` read/write endpoint
    verified end-to-end (see PHASE_17.10_COMPLETE.md).
  - `alembic upgrade head --sql` generates valid **PostgreSQL** DDL (19 tables,
    including the persisted evidence custody ledger and auth audit tables).
- **Because the managed PostgreSQL was not reachable, "PostgreSQL verification"
  covers the offline PostgreSQL DDL only. Live PostgreSQL + Render verification
  remains pending.**

### Exact manual deployment steps (once Render access is available)

1. Push the repo to a GitHub repository Render can access.
2. Render Dashboard → **New → Blueprint** → select the repo → `render.yaml` is
   auto-detected.
3. Enter the two `sync: false` values:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<api-service-name>.onrender.com`
   - `FRONTEND_URL` = `https://<web-service-name>.onrender.com`
4. Confirm the three resources synced: `trinetra-pulse-api`, `trinetra-pulse-web`,
   `trinetra-pulse-db` (managed PostgreSQL, region oregon, free plan).
5. Wait for the first deploy; the API's `preDeployCommand` applies the schema
   automatically. Check the API service → **Events** tab for
   `Run python -m alembic upgrade head` succeeded.
6. Run the one-off demo seed (idempotent):
   `DATABASE_URL="<external URL>" python -m app.db.seed` from `apps/api`
   (or the API Render Shell). This seeds Operation Meridian **and** the four
   Phase 18.1 demo users, and **blocks the seeded evidence** with genesis
   custody-chain links + integrity hashes (Phase 18.2).
7. Verify health: `GET /health` (free plan sleep may delay the first call), then
   open the web service and confirm the Investigation Command Center loads from
   `/api/v2` (browser DevTools → Network → requests to the API origin).
8. Phase 18.2 chain check: open any seeded evidence detail (API mode) and confirm
   the **Custody chain** section shows a VALID chain with
   `GET /evidence/{id}/chain/verify`; the Context Inspector shows the compact
   custody badge for the same evidence.

---

## Sign-in (Phase 18.1) on Render

The v2 API is JWT-protected: every request needs a Bearer token from
`POST /api/v2/auth/login` (the only public v2 endpoint). The web app shows an
`/login` page (mock mode also self-provisions a demo session). The four seeded
demo accounts:

| Email | Password | Role |
|---|---|---|
| `investigator@trinetra.dev` | `Investigator!2026` | investigator |
| `supervisor@trinetra.dev` | `Supervisor!2026` | supervisor |
| `admin@trinetra.dev` | `Admin!2026` | admin |
| `auditor@trinetra.dev` | `Auditor!2026` | auditor (read-only) |

Sign in, then read-only visitors see read-only UI; supervisors/admins see the
**Security** page (users + audit trail); only admins can manage users.
Tokens expire after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (30 by default); an
expired/revoked token signs the user out automatically (`AuthBootstrap`).

---

## Health & observability

- `GET /health` (root) returns `{"status":"healthy","version":"…","environment":"…"}` — unauthenticated, no secrets.
- `GET /health/db` adds a safe `database: ok|unavailable` field (best-effort).
- Render `healthCheckPath` is `/health` for the API and `/overview` for the web service.

Exposed health data never includes database credentials, tokens, or keys.

---

## CORS (production-safe)

CORS origins are environment-driven (no `allow_origins=["*"]`). The backend
allows the origins produced by `FRONTEND_URL` and `CORS_ORIGINS`
(comma-separated). Local development falls back to `localhost:3000/3001`.
See `Settings.cors_allow_origins` in `apps/api/app/core/config.py`.

---

## Evidence storage on Render (ephemeral filesystem)

Render service filesystems are **ephemeral** — any bytes written to local disk
are lost on redeploy. The evidence model therefore keeps **metadata in
PostgreSQL** (the `evidence` tables) while payload bytes go to `EvidenceStorage`
(`apps/api/app/storage/evidence_storage.py`). The filesystem implementation is
for local development and tests only. In production, configure an **object
store** (e.g. S3) — the abstraction is designed to be swapped in without
changing the metadata layer. Do **not** rely on `EVIDENCE_STORAGE_DIR`
(`.evidence`) for persistent production uploads.

---

## Testing against the deployed environment

- `NEXT_PUBLIC_USE_MOCK_API=false` + working `/api/v2` endpoints → API mode.
- Switch back to `true` (and unset `NEXT_PUBLIC_API_BASE_URL`) → mock mode.

See [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) and
[REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md).

---

## Troubleshooting

- **Mobile/SAAS credential errors** — ensure `DATABASE_URL` points at the
  Render Postgres syntax (`postgres://…`). `config.database_url_sync` maps
  `postgresql+asyncpg://` → `postgresql://` for Alembic.
- **Blank investigation workspace in production** — confirm
  `NEXT_PUBLIC_API_BASE_URL` is the API's public URL and the API has been
  seeded; if the API is reachable but empty, run `python -m app.db.seed`.
- **CORS errors in the browser** — confirm `FRONTEND_URL` matches the web
  service origin exactly (scheme + host, no trailing slash).
- **Migrations don't apply** — the API `preDeployCommand` now runs them; if it
  fails check the PostgreSQL URL reachability from the API service. Manually run
  `alembic upgrade head` with the **external** Render Postgres URL from a
  machine that can reach it, or via the API Render Shell.
