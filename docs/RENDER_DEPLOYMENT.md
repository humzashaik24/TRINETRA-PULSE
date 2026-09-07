# Render Deployment (Phase 14.3 → 15)

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

---

## Architecture

| Resource | Type | Runtime | Root dir | Build | Start |
|---|---|---|---|---|---|
| `trinetra-pulse-api` | web | python | `apps/api` | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `trinetra-pulse-web` | web | node | repo root | `npm install && npm run build --workspace=apps/web` | `npm run start --workspace=apps/web` |
| `trinetra-pulse-db` | postgres | — | — | — | — |

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
| `JWT_SECRET_KEY` | `generateValue` | Auth secret |
| `AUTH_ACTOR_EMAIL` | `sync: false` | Pinned production identity (Phase 22) |
| `AI_PROVIDER` | `value: mock` | Deterministic offline AI (no external key needed) |
| `BLOCKCHAIN_PROVIDER` | `value: mock` | Blockchain provider: `mock` (demo) or `web3` (real EVM) |
| `BLOCKCHAIN_NETWORK` | `value: trinetra-mock-chain` | Network label shown in the UI |
| `BLOCKCHAIN_RPC_URL` | `sync: false` | Real EVM RPC endpoint (required when `BLOCKCHAIN_PROVIDER=web3`) |
| `BLOCKCHAIN_PRIVATE_KEY` | `sync: false` | Real EVM private key (required when `BLOCKCHAIN_PROVIDER=web3`) |
| `BLOCKCHAIN_CONTRACT_ADDRESS` | `sync: false` | AnchorRegistry deployed address (required when `BLOCKCHAIN_PROVIDER=web3`) |

`DATABASE_URL` is injected from the managed PostgreSQL service, so no
credentials are ever committed. Render supplies the **internal** URL between
co-located services — FastAPI and PostgreSQL are in the same region.

> **Blockchain provider security:** `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`,
> and `BLOCKCHAIN_CONTRACT_ADDRESS` are server-side only. They are never exposed
> in `NEXT_PUBLIC_*` variables or client-side JavaScript. In mock mode (the
> default), none of these values are required.

### Frontend (`trinetra-pulse-web`)

| Variable | Source | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK_API` | `value: "false"` | **Must be false in production** → real `/api/v2` backend |
| `NEXT_PUBLIC_API_BASE_URL` | `sync: false` | Absolute public URL of `trinetra-pulse-api` (browser-reachable) |

`NEXT_PUBLIC_*` values are inlined **at build time**, so they must be set before
the build runs (Render makes service env vars available to the build). Never
put `DATABASE_URL` or any secret in a `NEXT_PUBLIC_*` variable.

---

## First deploy

1. Push the repository to GitHub (Blueprint lives at the repo root).
2. In Render Dashboard → **New → Blueprint**, choose the repo.
3. Render prompts for the `sync: false` values:
   - `FRONTEND_URL` → the web service URL, e.g. `https://trinetra-pulse-web.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL` → the API service URL, e.g. `https://trinetra-pulse-api.onrender.com`
4. After both services are healthy, **run migrations + seed** once against the
   managed PostgreSQL (see below).

> **Phase 15** verified that the API actually boots with the Blueprint's wiring
> (`APP_ENV=production`, `DATABASE_URL` from the managed database,
> `APP_SECRET_KEY`/`JWT_SECRET_KEY` generated): the production startup guard no
> longer rejects a deploy over unused `POSTGRES_*`/`NEO4J_*`/`REDIS_*` defaults.
> The migrate → seed → `/api/v2` flow (list/detail/summary/nested/timeline/
> network/analytics) was exercised end-to-end in production mode.

---

## Database migration & seeding on Render Postgres

Render Postgres exposes an `internal` and an `external` connection string. The
Blueprint wires the **internal** URL into `DATABASE_URL` for the API.

**Migrations are automatic on deploy (Phase 22):** `render.yaml` sets the API
service's `preDeployCommand` to `python -m alembic upgrade head`, so Alembic
applies the schema (16 production tables) against the managed PostgreSQL before
the new service version starts. The command is idempotent — it is a no-op when
the database is already at head — so re-deploys are safe. If a migration fails,
Render blocks the deploy instead of starting on a stale schema.

**Seeding is one-time and manual** (deterministic Operation Meridian universe,
inv-006). Run it once against the database from a machine with network access
(the Render Shell of the API service, or locally with the **external** URL):

```bash
cd apps/api

# (Optional; preDeployCommand normally applies the schema already.)
DATABASE_URL="<render postgres external URL>" python -m alembic upgrade head

# Seed Operation Meridian (inv-006)
DATABASE_URL="<render postgres external URL>" python -m app.db.seed
```

> `app.db.seed` also runs `create_all`, but that is a convenience for a fresh
> demo DB only. **Production schema changes must go through Alembic** (`alembic
> revision --autogenerate` + `alembic upgrade head`), never `create_all`.

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

In production the API **refuses to boot** on unsafe configuration (Phase 22):
`FRONTEND_URL`/`CORS_ORIGINS` set to `*`, an unset `FRONTEND_URL`, or a
localhost origin all raise at startup instead of silently weakening CORS. See
`Settings.cors_allow_origins` in `apps/api/app/core/config.py`.

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
- **Migrations don't apply** — run `alembic upgrade head` with the **external**
  Render Postgres URL from a machine that can reach it, or via the API Render
  Shell.
