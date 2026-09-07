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

**Phase 21** adds blockchain evidence integrity anchoring: deterministic
SHA-256 checksum + derived custody chain hash + optional blockchain anchor
per evidence item, with a provider abstraction (mock registry for demo, real
EVM via web3 for testnet). The anchor payload is the digest only — raw evidence
and PII never leave the platform. See
[PHASE_21_COMPLETE.md](docs/PHASE_21_COMPLETE.md) and
[PHASE_21_REPORT.md](docs/PHASE_21_REPORT.md).

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
- [Render Deployment (Phase 14.3)](docs/RENDER_DEPLOYMENT.md)
- [Database Architecture (Phase 14.3)](docs/DATABASE_ARCHITECTURE.md)
- [Demo Journey](docs/SIH_DEMO_JOURNEY.md)
- [Architecture](docs/README.md#architecture)
- [Domain Model](docs/README.md#domain-model)
- [API Reference](docs/README.md#api-conventions)
- [Development](docs/README.md#development-commands)

## License

Government/Research Use Only
