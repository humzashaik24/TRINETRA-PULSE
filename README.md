# Trinetra Pulse

**AI-powered Criminal Network Intelligence and Investigation Platform**

Trinetra Pulse transforms fragmented crime-related data into investigation intelligence.

```
Data → Entities → Relationships → Networks → Patterns → Evidence → Intelligence
```

The product ships demo/mock-first: the web app is fully mock-driven and the
FastAPI backend is an in-memory demo, so the **Operation Meridian** demo runs
without a database.

Since **Phase 14.2** there is also a real application foundation: a relational
API (`/api/v2` — PostgreSQL + SQLAlchemy async + Alembic + seed) and a typed
frontend client with TanStack Query hooks. It is **additive** and stays
off by default, so the demo is unaffected. Set `NEXT_PUBLIC_USE_MOCK_API=false`
in `apps/web/.env` to point the web app at the real API. See
[REAL_APPLICATION_ARCHITECTURE.md](docs/REAL_APPLICATION_ARCHITECTURE.md).

**Phase 14.3** targets **Render** as the production deploy — Next.js Node
service, FastAPI Python service, managed PostgreSQL, all defined in
[`render.yaml`](render.yaml). **Phase 14.4** completed the transition: Docker
has been **fully removed** from the repository. **Phase 15** made the existing
deployment genuinely runnable: fixed the production startup guard (so a Render
deploy wired through `DATABASE_URL` boots instead of refusing over
irrelevant component passwords), pinned lint to exclude Alembic-generated
migrations, and added production-config regression tests. See
[RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md) and
[DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md).

**Phase 16** adds real data ingestion: CSV upload through the frontend → backend
parsing → entity/relationship extraction → evidence persistence → PostgreSQL.
The investigation workspace now has a 9th "Data" tab for upload and dataset
management scoped to the current investigation. See
[DATA_INGESTION.md](docs/DATA_INGESTION.md).

**Phase 17.10** hardened the production path for Render: schema migrations now
run automatically on every API deploy (`preDeployCommand`); Render's
`postgres://`/`postgresql://` connection string is normalized to
`postgresql+asyncpg://` for the async engine (with `psycopg2` added for
Alembic); the async pool is sized for free-tier PostgreSQL limits; and a
`MissingGreenlet` write-path crash on investigation updates was fixed. The full
read+write surface, isolation, CORS, auth gate, and production web build were
verified in production mode. **Live Render deployment and live managed-PostgreSQL
verification remain pending** (not deployable from the working environment).
See [PHASE_17.10_COMPLETE.md](docs/PHASE_17.10_COMPLETE.md),
[RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md), and
[DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md).

**Phase 18.1** adds real authentication + role-based access control (RBAC) to
the `/api/v2` layer and the web app. The backend issues short-lived JWTs
(`POST /api/v2/auth/login`, `/auth/me`) and enforces an RBAC hierarchy —
`admin` > `supervisor` > `investigator`, plus a distinct read-only `auditor` —
across every v2 mutation (entities/findings/evidence/notes/datasets/jobs,
investigation delete, assistant queries) with a `users` + `auth_audit_events`
schema (Alembic migration + idempotent seed of four demo users). The web app
gains a sign-in page, an `AuthGate` for the dashboard surface, a real profile
page, a role-gated Security page (admin users table + auth audit trail), and
role-filtered navigation + mutation gating (auditors are read-only everywhere).
Mock mode still self-provisions a deterministic demo session; API mode requires
real login. Backend: 207 pytest + ruff clean. Frontend: 81 suites / 667 tests,
tsc + eslint clean, `next build` green in both modes. Live Render deployment
remains **pending**. Demo credentials and setup in
[PHASE_18.1_COMPLETE.md](docs/PHASE_18.1_COMPLETE.md).

**Phase 18.2** adds a tamper-evident **chain of custody** for every persisted
evidence item: a relational, per-evidence SHA-256 hash chain in PostgreSQL
(`evidence_chain_entries`) — **deliberately NOT a public blockchain** (no
distributed ledger, consensus, nodes or tokens). Every evidence lifecycle
transition (create, upload, access, verification, metadata update, export)
appends a link pinned to the previous link's hash; a verifier replays the chain
**and** recomputes the live payload SHA-256, so a post-hoc edit to an evidence
body reports `TAMPERED` and a deleted/missing link reports `BROKEN_CHAIN`. The
API exposes read (`GET /chain`), read-only verification (`GET /chain/verify`,
available to the auditor) and audited verification (`POST /chain/verify`); the
web app renders a custody chain panel on the evidence detail view and a compact
custody section in the Context Inspector. Mock mode stays honest — demo rows
have no fabricated chain. Backend: 227 pytest + ruff clean. Frontend: 83 suites
/ 687 tests, tsc + eslint clean, `next build` green in both modes. Live Render
deployment remains **pending**. See
[PHASE_18.2_COMPLETE.md](docs/PHASE_18.2_COMPLETE.md).

**Phase 18.7** closes the raw evidence lifecycle: authenticated multipart
uploads validate filenames and size, store bytes through the existing
filesystem/S3 provider, calculate the server-side SHA-256 authority, persist
provenance and custody events, compensate storage on database failure, and
provide scoped integrity-checked downloads. Non-CSV files selected in the
existing Data Intelligence upload UI use this evidence endpoint; CSV ingestion
remains on its existing pipeline. See
[PHASE_18.7_COMPLETE.md](docs/PHASE_18.7_COMPLETE.md).

**Phase 18.3** adds deterministic, investigation-scoped suspicious-pattern
detection over persisted entities and relationships. The real API exposes
`GET /api/v2/investigations/{id}/patterns` for potential circular fund flows,
potential phone switching, high-connectivity hubs, bridge entities, and rapid
relationship expansion when real timestamps exist. Results are explainable
leads with stable IDs and persisted entity/relationship/evidence references;
they are never guilt determinations. Mock mode remains unchanged, while API
mode calls the real endpoint without a mock fallback. See
[PHASE_18.3_COMPLETE.md](docs/PHASE_18.3_COMPLETE.md).

**Phase 18.4** hardens evidence custody into a deterministic, append-only,
investigation-scoped SHA-256 hash-linked audit chain with structured
verification and tamper reporting. This is a permissioned, relational,
SHA-256 hash-linked tamper-evident evidence chain. It is not a public
blockchain. See [PHASE_18.4_COMPLETE.md](docs/PHASE_18.4_COMPLETE.md).

**Phase 18.5** verifies the Render-native production configuration, migration
chain, deterministic seed, authentication/RBAC boundaries, investigation
isolation, real API-mode builds, health behavior, and end-to-end local
verification. Live Render deployment remains explicitly pending without
deployment credentials. See
[PHASE_18.5_COMPLETE.md](docs/PHASE_18.5_COMPLETE.md).

**Phase 18.6** adds durable S3-compatible raw evidence storage behind the
existing `EvidenceStorage` boundary, while retaining filesystem storage for
local development. Metadata, checksums, provenance, and custody remain in the
existing PostgreSQL architecture. See
[PHASE_18.6_COMPLETE.md](docs/PHASE_18.6_COMPLETE.md).

## Quick Start (web demo)

```bash
# 1. Frontend
cd apps/web
npm install
npm run dev
```

Open **http://localhost:3000** and choose **Explore Demo Investigation →
Operation Meridian** (`inv-006`).

## Full stack (API + web)

```bash
# 1. API (in-memory demo — no database required)
cd apps/api
python -m venv venv
venv\Scripts\activate            # Windows; on macOS/Linux: source venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# 2. Frontend
cd apps/web
npm install
npm run dev
```

**API**: http://localhost:8000/docs   **App**: http://localhost:3000

No Docker is required anywhere. For a real database, point `DATABASE_URL` at
any PostgreSQL (a local native install or managed Render PostgreSQL); the
demo and mock mode run with no database at all. See
[DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md#development-without-docker)
and [RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md).

## Tests & build

```bash
cd apps/web
npx tsc --noEmit && npm run lint && npx jest --silent && npm run build

cd apps/api   # use the venv
.\venv\Scripts\python.exe -m pytest tests/ -q
.\venv\Scripts\python.exe -m ruff check .
```

## Documentation

- [Full Documentation](docs/README.md)
- [SIH Readiness (Phase 14)](docs/SIH_READINESS.md)
- [Real Application Foundation (Phase 14.2/14.3)](docs/REAL_APPLICATION_ARCHITECTURE.md)
- [Data Ingestion (Phase 16)](docs/DATA_INGESTION.md)
- [Render Deployment (Phase 17.10)](docs/RENDER_DEPLOYMENT.md)
- [Database Architecture (Phase 17.10)](docs/DATABASE_ARCHITECTURE.md)
- [Phase 17.10 Completion Report](docs/PHASE_17.10_COMPLETE.md)
- [Phase 18.1 Completion Report (Auth + RBAC)](docs/PHASE_18.1_COMPLETE.md)
- [Phase 18.2 Completion Report (Evidence Chain of Custody)](docs/PHASE_18.2_COMPLETE.md)
- [Demo Journey](docs/SIH_DEMO_JOURNEY.md)
- [Architecture](docs/README.md#architecture)
- [Domain Model](docs/README.md#domain-model)
- [API Reference](docs/README.md#api-conventions)
- [Development](docs/README.md#development-commands)

## License

Government/Research Use Only
