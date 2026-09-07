# Trinetra Pulse

## Criminal Network Intelligence and Investigation Platform

Trinetra Pulse transforms fragmented crime-related data into investigation intelligence through a systematic pipeline:

```
Data → Entities → Relationships → Networks → Patterns → Evidence → Investigation Intelligence
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- PostgreSQL 16 *(optional — only for the real `/api/v2` layer)*

> **Demo-first:** the web app is mock-driven and the API is in-memory, so the
> **Operation Meridian** demo runs with just Node (and Python for the API)
> — **no database required**. Docker is **not** used anywhere. See
> [SIH_READINESS.md](SIH_READINESS.md) for the demo-only quick start. The
> PostgreSQL setup below is only for running the real relational layer.

### Database (optional, real `/api/v2` layer)

Point `DATABASE_URL` at any PostgreSQL instance (a local native install or
managed Render PostgreSQL). See [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md#development-without-docker). No Docker.

### 1. Backend Setup

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd apps/web
npm install
npm run dev
```

App: http://localhost:3000

---

## Project Structure

```
trinetra-pulse/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   └── src/
│   │       ├── app/            # Next.js App Router
│   │       ├── components/     # Reusable components
│   │       ├── features/       # Feature modules
│   │       ├── hooks/          # Custom React hooks
│   │       ├── lib/            # Utilities
│   │       ├── services/       # API client & services
│   │       ├── state/          # Zustand stores
│   │       ├── types/          # Frontend types
│   │       └── styles/         # Global styles
│   │
│   └── api/                    # FastAPI backend
│       └── app/
│           ├── core/           # Config, health
│           ├── models/         # SQLAlchemy models
│           ├── schemas/        # Pydantic schemas
│           ├── repositories/   # Async data-access layer (Phase 14.2)
│           ├── services/real/  # Real investigation/network services (Phase 14.2)
│           ├── api/            # /api/v2 real app, routers, errors, deps (Phase 14.2)
│           ├── storage/        # Filesystem evidence storage (Phase 14.2)
│           ├── intelligence/   # CSV ingestion boundary (Phase 14.2)
│           ├── entities/       # Entity endpoints
│           ├── relationships/  # Relationship endpoints
│           ├── cases/          # Case management
│           ├── networks/       # Graph analytics
│           ├── evidence/       # Evidence management
│           ├── events/         # Event tracking
│           ├── analytics/      # Analytics
│           ├── patterns/       # Pattern detection
│           ├── ai/             # AI services
│           ├── reports/        # Report generation
│           ├── middleware/     # Middleware
│           ├── services/       # Business logic
│           └── db/             # Database config
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   └── ui/                     # Shared UI components + motion system
│
├── services/                   # Placeholder ML service stubs (not wired into the demo API)
│   ├── ingestion/              # Data ingestion stub
│   ├── entity-resolution/      # Entity matching stub
│   ├── relationship-extraction/# Relationship extraction stub
│   ├── graph-analytics/        # Graph algorithms stub
│   ├── anomaly-detection/      # Anomaly detection stub
│   └── ai/                     # ML/AI services stub
│
├── infrastructure/
│   └── terraform/              # Infrastructure as code (placeholder)

├── docs/                       # Documentation
├── render.yaml                 # Render Blueprint (production deploy, no Docker)
└── .env.example                # Environment template
```

---

## Architecture

```
                    TRINETRA PULSE
                           │
              ┌────────────┴────────────┐
              │                         │
          FRONTEND                  BACKEND
              │                         │
        Next.js/React                FastAPI
              │                         │
              │              ┌──────────┼──────────┐
              │              │          │          │
              │          PostgreSQL   Neo4j      Redis
              │              │          │
              │              └────┬─────┘
              │                   │
              │              ML SERVICES
              │                   │
              │              AI SERVICES
              └───────────────────┘
```

### Frontend Stack

| Technology | Purpose |
|---|---|
| Next.js 14 | React framework with App Router |
| React 18 | UI library |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| Zustand | Global client state |
| TanStack Query | Server state management |
| Framer Motion | Animations |
| Lucide React | Icons |
| @xyflow/react | Graph visualization (concrete graph engine) |
| d3-force | Force-directed graph layout |

### Backend Stack

| Technology | Purpose |
|---|---|
| FastAPI | Async Python API framework |
| SQLAlchemy 2.0 | ORM (async) |
| Alembic | Database migrations |
| Pydantic v2 | Data validation |
| structlog | Structured logging |
| python-jose | JWT authentication |

### Data Layer

| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Primary relational database |
| Neo4j 5.x | Graph database for networks |
| Redis 7 | Caching & queue management |

### ML/AI Stack

| Technology | Purpose |
|---|---|
| scikit-learn | Classical ML algorithms |
| PyTorch | Deep learning |
| Transformers | NLP models |
| NetworkX | Graph algorithms |

---

## Domain Model

### Entities

| Entity | Description |
|---|---|
| Person | Individual suspect, victim, witness |
| Phone | Phone number and metadata |
| Vehicle | Vehicle registration and details |
| Location | Geographic location |
| Organization | Criminal organization, business |
| Account | Financial or online account |
| Transaction | Financial transaction |
| Event | Notable occurrence |
| Document | Evidence document |
| Case | Investigation case reference |
| Evidence | Evidence item reference |

### Relationships

Every relationship supports:
- Source and target entities
- Relationship type
- Confidence score (0-1)
- Data source attribution
- Evidence references
- Extraction method
- Verification status
- Metadata

### Verification States

- `confirmed` — Verified by analyst
- `probable` — High confidence, pending verification
- `possible` — Medium confidence
- `rejected` — Determined to be false
- `needs_review` — Requires analyst attention

---

## API Conventions

### Base URL
```
http://localhost:8000/api/v1
```

### Endpoints

| Resource | Endpoints |
|---|---|
| Entities | `GET/POST /entities`, `GET /entities/:id` |
| Relationships | `GET/POST /relationships`, `GET /relationships/:id` |
| Cases | `GET/POST /cases`, `GET /cases/:id` |
| Networks | `GET /networks`, `GET /networks/:id` |
| Analytics | `GET /analytics`, `GET /analytics/entity-stats` |
| AI | `POST /ai/extract-entities`, `POST /ai/resolve-entities` |
| Entity Intelligence | `GET/POST /entity-intelligence/candidates`, `POST /entity-intelligence/candidates/:id/review`, `GET /entity-intelligence/resolutions`, `POST /entity-intelligence/resolutions/:id/confirm\|reject\|merge`, `GET/POST /entity-intelligence/extraction-jobs`, `POST /entity-intelligence/extraction-jobs/:id/cancel`, `GET /entity-intelligence/audit` |
| Evidence Integrity | `GET /evidence/:id/integrity`, `GET /evidence/:id/blockchain`, `POST /evidence/:id/blockchain/anchor`, `POST /evidence/:id/blockchain/verify` |

### Entity Intelligence Domain

Phase 6 adds the entity resolution pipeline as a first-class domain:

- **Extraction jobs** (`job-…` ids) — model the ingest of a dataset (`FIR Records`, `CDR Extract`, `Bank Transaction Log`, `Vehicle Tracking`, `Witness Statements`, `Cell Tower`) into typed candidates with a per-type extraction method.
- **Candidates** (`cand-…` ids) — typed extractions (`person`, `phone`, `vehicle`, `account`, `transaction`, `case`, `evidence`) carrying a raw value, a normalized value, an extraction confidence, and source attribution. Analysts can review each candidate.
- **Resolutions** (`res-…` ids) — pair a candidate against a matching entity. The system reports weighted, explainable signals and a recommendation (`MERGE` / `REVIEW` / `KEEP_SEPARATE`) but **never auto-merges**; an analyst confirms, rejects, or merges.
- **Audit events** (`aud-…` ids) — immutable log of every create/review/resolution/merge/confirm/reject action for provenance.

Resolution states: `CONFIRMED`, `PROBABLE`, `POSSIBLE`, `REJECTED`, `NEEDS_REVIEW`.

### Response Format

```json
{
  "id": "uuid",
  "field": "value",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Pagination

```
GET /entities?page=1&page_size=20
```

### Error Format

```json
{
  "detail": "Error message",
  "status_code": 400,
  "path": "/api/v1/entities"
}
```

---

## Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update values for your environment. Never commit `.env` files.

### Key Variables

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Environment | `development` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `NEO4J_URI` | Neo4j bolt URI | `bolt://localhost:7687` |
| `REDIS_HOST` | Redis host | `localhost` |
| `JWT_SECRET_KEY` | JWT signing key | Must be set |

---

## Development Commands

```bash
# Database (optional, real /api/v2 layer) — native, no Docker
# Point DATABASE_URL at any PostgreSQL, e.g. export DATABASE_URL="postgresql+asyncpg://..."

# Backend
cd apps/api
pip install -e ".[dev]"           # Install with dev deps
uvicorn app.main:app --reload     # Start API server
pytest tests/ -v                  # Run tests
ruff check .                      # Lint
mypy .                            # Type check

# Frontend
cd apps/web
npm install                       # Install dependencies
npm run dev                       # Start dev server
npm run build                     # Build for production
npm run lint                      # Lint
npm test                          # Run tests

# Monorepo
npm run dev:web                   # Start frontend
npm run dev:api                   # Start backend
```

---

## Testing

### Backend Tests
```bash
cd apps/api
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd apps/web
npm test
```

Frontend unit tests target the pure-logic libraries with Jest + ts-jest in a node environment:
`src/lib/__tests__/{entity-normalization,entity-resolution,entity-search}.test.ts` (41 tests).

Phase 7 adds network workspace tests in `components/network/` and `app/(dashboard)/networks/` (graph-inspector mapping, list view, listing page, detail loading/error states). The React Flow renderer is lazy-mounted and intentionally excluded from jsdom tests.

Phase 8 adds analytics tests in `analytics/` (centrality, community, components, bridges, temporal, patterns, filter, influence, engine), `services/network-analytics.service.test.ts`, `state/analytics.store.test.ts`, inspector analytics views, the graph-integration helper, and the `RankingTable` component. They run in the `unit` node project with a single jsdom component test for `RankingTable`.

Phase 9 adds investigation tests in `services/investigation.service.test.ts`, `state/investigation.store.test.ts`, `app/(dashboard)/investigations/` (listing page) and `components/investigation/` (overview / entities / notes tabs). The Network tab imports the React Flow renderer and is intentionally excluded from jsdom coverage.

Phase 13 adds demo-journey coverage: `navigation/journey.test.ts` (URL payload contract), `ai/contextual-prompts.test.ts` (scope-aware starters), `services/inspector-journey.test.ts` + `services/demo-universe.test.ts` (evidence/finding/entity resolution + data-consistency audit), and `components/demo/demo-journey.test.tsx` (hero → overview command center → context preservation). Full web suite: 53 suites / 441 tests.

### Phase 6 Entity Intelligence API Tests
```bash
cd apps/api
venv\Scripts\python.exe -m pytest tests/test_entity_intelligence.py -q   # 21 tests
```

The entity-intelligence endpoints are stub-backed (in-memory stores), require `seed_intelligence()` for realistic fixtures, and `reset_intelligence()` before each test for isolation. Entity ids are string-prefixed (`ent-…`, `cand-…`, `res-…`, `job-…`, `aud-…`) with datetimes stored as `datetime` objects.

---

## Security Notes

- Never commit secrets or API keys
- Use `.env` for local configuration; `.env.example` contains placeholders only
- The API runs as an **in-memory demo**; authentication/RBAC are **not yet
  implemented** (all endpoints are anonymous). This is a documented Phase 14
  known limitation — see [SIH_READINESS.md](SIH_READINESS.md). Auth-boundary
  hardening is planned before any real data is attached.
- A startup guard refuses to run in `APP_ENV=production` while default secrets
  (app/jwt/DB passwords) are still set
- Error responses are generic (no stack traces exposed to clients)
- All data changes logged with audit trail

---

## Roadmap

Phases 0–13 are **complete and verified** (see `docs/` chapter docs below). The
roadmap entries below this section document each completed phase.

### Phase 6 (Current) ✅
- Entity normalization + resolution client libraries
- Entity Intelligence UI (entity list, detail workspace, extraction/candidates/resolutions/audit)
- Backend entity-intelligence API (candidates, resolutions, extraction jobs, audit)
- Unit tests (web jest 41, API pytest 21)
- Documentation (design system / motion / application shell)

### Phase 7 (Current) ✅ — see [NETWORK_INTELLIGENCE.md](NETWORK_INTELLIGENCE.md)
- Concrete **@xyflow/react** graph engine on the library-agnostic `GraphEngine` contract
- Network workspace chrome: canvas, controls, stats, search, filters, timeline, path explorer, depth, list view, legend
- `/networks` listing + `/networks/[id]` interactive workspace pages
- Inspector integration (graph node/edge → EntityContext / RelationshipContext with graph-hint fallback)
- Reduced-motion + accessible controls, neutral observed/inferred terminology
- Web unit/component tests (150 passing)

### Phase 8 (Current) ✅ — see [NETWORK_ANALYTICS.md](NETWORK_ANALYTICS.md)
- Structural analytics engine (degree/betweenness/closeness/PageRank, composite network influence)
- Community detection (Louvain), connected components, density, bridge-entity detection (Tarjan + betweenness)
- Temporal snapshots + structural pattern detection (analytical severity, never guilt)
- Network analytics service (cache + in-flight dedupe), analytics store, inspector views, graph overlays
- `/networks/[id]/analytics` dashboard + tests
- AI assistant integration (out of scope for Phase 8)

### Phase 9 (Current) ✅ — see [INVESTIGATION_WORKSPACE.md](INVESTIGATION_WORKSPACE.md)
- Investigation domain types, lifecycle, identity model & naming (neutral, non-accusatory language)
- Deterministic mock universe (5 investigations reusing Phase 4–8 canonical ids)
- Investigation service + optimistic zustand store with unsaved-changes (dirty) tracking
- Shell / inspector wiring for investigation, note, event and analytics-snapshot contexts
- `/investigations` listing page (search / filter / sort) + `/investigations/[id]` workspace with 8 tabs
- Overview, Network (reuses Phase 7 `NetworkGraph`), Entities, Evidence, Timeline, Findings, Notes, Activity tabs
- Command-palette + breadcrumb integration
- Service/store/list/tab tests
- Explicitly out of scope: AI assistant, automated reports, predictive modelling, and any suspect/guilt scoring

### Phase 12 (Current) ✅ — see [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md)
- Evidence intelligence domain model (`EvidenceType`/`Status`, `EvidenceSource`/`Item`, provenance, links, coverage, support)
- `ExtractionMethod` extended with `ANALYTICAL` for analytical evidence (frequency / tower / network analysis)
- Deterministic 32-item evidence universe (INV-006 / Operation Meridian) reusing canonical entity/relationship/finding/event ids
- Evidence service (search/filter/pagination, coverage, relationship/finding/event support, entity summaries, collections, retrieval)
- Investigation-scoped evidence store + `/evidence` workspace (Repository / Coverage / Support / Retrieval / Network / Timeline)
- Grounded AI retrieval (budget-bounded, error-safe, provenance references) via `ai/evidence-retrieval.ts`
- Service/store/retrieval tests (48 new Jest tests)
- Explicitly out of scope: autonomous agents, agentic investigation, suspect ranking, guilt scoring, predictive policing, automated enforcement

### Phase 13 (Current) ✅ — see [SIH_DEMO_JOURNEY.md](SIH_DEMO_JOURNEY.md)
- End-to-end demo journey for **inv-006 / Operation Meridian** (NET-001) integrating Phases 0–12 without rewriting existing architecture
- Typed cross-module navigation contract (`navigation/journey.ts`, `use-journey-focus.ts`) with `?i=&focus=&section=` deep-link seeding of the active investigation
- Overview command center (quick actions, clickable linked entities/evidence/findings, demo journey guide) + demo hero entry point on `/investigations`
- Network workspace applies journey focus (seed investigation, select/center/expand the focused node); graph ↔ analytics links preserve journey params
- Unified investigation timeline (events + evidence + findings + notes + activity) with category legend
- Contextual AI starters from the live scope (`ai/contextual-prompts.ts`); AI source chips carry `investigationId` so AI → Source → Inspector stays grounded
- Command palette + command-bar context reach into the current investigation
- **Data-consistency fixes**: both evidence namespaces (`ev-*` and `ev-intel-*`) and investigation findings (`inf-*`) now resolve through the Context Inspector
- Tests: journey, contextual-prompts, inspector-journey, demo-universe audit, demo-journey E2E, demo-e2e full-journey (web 53 suites / 441 tests)
- Explicitly out of scope: Phase 14, predictive/guilt/autonomous features, second shell / graph engine / AI architecture

### Phase 14 (Current) ✅ — see [SIH_READINESS.md](SIH_READINESS.md)
- Hardening / cleanup / SIH-readiness phase (no new features, no rewrites)
- Removed provably-dead code: `services/api.ts`, `hooks/use-journey.ts`, `ai/tools.ts`, `packages/config` package
- Removed legacy duplicate shell chrome: `shell/sidebar.tsx`, `shell/header.tsx`, `navigation/config.ts` (+ barrel exports + orphaned `app.store` sidebar fields)
- Verified single-canonical shell / graph / AI / evidence / motion architectures; zero CRIME-X remnants
- Environment/config cleanup: accurate `.env.example` (removed ghost/misleading vars, added `AI_*`), `.gitignore` covers `.ruff_cache`/`.mypy_cache`
- Security hardening: production startup guard fails closed on default secrets; corrected docs that over-claimed authentication
- Documentation cleanup + `docs/SIH_READINESS.md`; final web suite 53 suites / 441 tests (web), API pytest 44 (all green)

### Phase 14.2 (Current) ✅ — Deep Dead-Code & Duplication Audit
- Cleanup-only follow-up: audited web / API / packages / docs for dead code and duplication; no whole-file dead code found, dead code was concentrated in unused exports
- Removed dead exports (16 edits): `lib/format.ts` (`maskValue`, `formatPhoneMasked`, `COVERAGE_LEVEL_VARIANT`, `RESOLUTION_STATE_VARIANT`), `services/entity.service.ts` (`searchEntities`, `fetchResolution`, `fetchEntityTypeCounts`, `setMergeArchiveSource`, `_internal`), `services/network.service.ts` (`_networkInternal`), `ai/provider.ts` (`availableProviders`), `ai/context-builder.ts` (`rankByPriority`), `ai/validation.ts` (`isNeutralPhrasing`), unused type re-exports (`engine/react-flow-engine.ts`, `ai/grounding.ts`, `analytics/network-analytics-engine.ts`, `state/investigation-operations.store.ts`), `graph/selectors.ts` (`DimState`), `lib/entity-domain.ts` (`confidenceTone`), `state/shell.store.ts` (`INSPECTOR_MAX_RATIO`, `WORKSPACE_MIN_WIDTH`), `navigation/journey.ts` (unused context type re-exports), `components/shell/index.ts` (`INVESTIGATION_TABS` barrel export), and `next.config.js` (`@radix-ui/react-icons` from `optimizePackageImports`)
- Preserved (documented, referenced, or scaffolding): motion-system primitives/hooks, intelligence + `MiniBar` components, TanStack Query, `checkbox.tsx`/`drawer.tsx` (barrel exports), API `models/db/auth/middleware` scaffolding, unused API schemas, mock data, test-only helpers, `zod`/`date-fns` deps
- Known defect (report-only, not fixed in this cleanup): pipeline "Findings"→`/findings` and "Timeline"→`/timeline` stage links are 404 routes (`services/investigation-operations.service.ts` fallbackPipeline + mock)
- Verification: TypeScript + ESLint clean (1 pre-existing `no-page-custom-font` warning), web 53 suites / 441 tests green (includes Operation Meridian demo journey), `next build` green (20 routes), API pytest 44 green, ruff clean

### Phase 14.2b (Current) ✅ — see [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Real application foundation**: converts the mock/in-memory demo into a real full-stack app — PostgreSQL + SQLAlchemy 2.x async + Alembic + seed, layered repositories/services/routers, real CRUD APIs under `/api/v2`, typed frontend API client + TanStack Query hooks — **additively**, without breaking existing architecture/UI
- **Backend**: portable `Uuid`/`JSONB` types (`app/db/types.py`), async session (`app/db/session.py`), 13 portable tables, Alembic initial migration, idempotent **Operation Meridian** seed (`app/db/seed.py`, deterministic UUID5 from canonical `inv-006`/`ent-*`/`rel-*`/`ev-*` ids), repositories, `InvestigationService`/`NetworkService`, `/api/v2` routers (investigations, entities, relationships, findings, evidence, events, notes, timeline, network, nested resources), single `{code,message,details,status_code}` error contract, dev-identity dependency gate (auth-required in production without `X-User-Id`)
- **Boundaries**: portable filesystem `EvidenceStorage` (`app/storage/evidence_storage.py`, S3-replaceable) + validated CSV data-intelligence reader (`app/intelligence/csv_reader.py`, provenance-carrying rows)
- **Frontend**: typed client (`src/lib/api/` config/client/investigations/provider), React Query hooks (`src/hooks/use-investigations.ts`), `QueryClientProvider` wired into `layout.tsx`, mock→API transition boundary driven by `NEXT_PUBLIC_USE_MOCK_API` (mock-first default), web `.env.example` + API `.env.example`
- **Verification**: API pytest **69** passing + ruff clean, alembic upgrade applies to SQLite (13 tables), web tsc clean, eslint clean (1 pre-existing font warning), jest **54 suites / 447 tests**, `next build` green (20 routes)
- **Deferred (documented)**: PostgreSQL integration runs against throwaway SQLite via `DATABASE_URL` (Docker unavailable); mypy remains informational (legacy ~168 pre-existing errors); the then-optional `docker-compose.yml` documented the future `api` container `depends_on` (needs a packaged image first) and was **removed in Phase 14.4**

### Phase 14.3 (Current) ✅ — see [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) + [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)
- **Production target = Render** via a Blueprint ([`render.yaml`](../render.yaml)) with **no Docker required**: Next.js native Node web service (`apps/web`), FastAPI native Python web service (`apps/api`), and managed PostgreSQL
- **Backend**: environment-driven CORS (`FRONTEND_URL`/`CORS_ORIGINS`, never `*`), unauthenticated top-level `/health` (+ `/health/db` safe DB check), `EVIDENCE_STORAGE_DIR` setting, `requirements.txt` for the Render Python runtime
- **Database**: Alembic verified to generate PostgreSQL DDL and apply cleanly; standalone `python -m app.db.seed` reproduces Operation Meridian (`inv-006`) in PostgreSQL
- **Frontend API mode**: investigations listing now branches to the real `/api/v2` client when `NEXT_PUBLIC_USE_MOCK_API=false`; mock mode unchanged
- **Tests**: added health/CORS and **investigation isolation** coverage (no cross-investigation leakage) — API pytest **90** passing, ruff clean, web type-check/lint/build green
- **Out of scope (unchanged)**: Phase 15, predictive/guilt/autonomous features; Docker remained optional local infrastructure at the close of 14.3 and was **fully removed in Phase 14.4**

### Phase 14.4 (Current) ✅ — Complete Docker Removal & Native Runtime Cleanup
- **Docker fully removed** from the repository. Deleted: `docker-compose.yml`, `.dockerignore`, root `package.json` `docker:up` / `docker:down` / `docker:reset` scripts, and the Docker compose data-dir ignores in `.gitignore`.
- **Production remains the Phase 14.3 Render architecture** with **zero Docker**: Next.js native Node web service, FastAPI native Python web service, managed Render PostgreSQL — all defined in [`render.yaml`](../render.yaml).
- **Native local development** (no Docker): run the FastAPI app with `uvicorn` and point `DATABASE_URL` at any PostgreSQL; mock mode still needs no database. See [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md#development-without-docker).
- **Documentation** updated to state Docker is removed and not required; historical mentions now describe it as removed rather than active.
- **Verification**: backend pytest **90** + ruff clean; frontend tsc clean, eslint clean (1 pre-existing font warning), jest green, `next build` green; `render.yaml` still defines native runtimes only (no image/build/docker references).

### Phase 15 (Current) ✅ — Production Activation on Render
- **Made the existing Phase 14.3/14.4 deployment genuinely runnable** — no new features, no Phase 16.
- **Fixed a production startup blocker** (`app/core/config.py`): `enforce_production_defaults` rejected an otherwise-correct Render deploy wired through `DATABASE_URL` because the unused `POSTGRES_*`/`NEO4J_*`/`REDIS_*` component passwords retained defaults. The guard now only rejects defaults the running config actually depends on (app/JWT secrets always; Postgres password only when no `DATABASE_URL` is set).
- **Pinned lint to exclude Alembic-generated migrations** (`pyproject.toml` `extend-exclude = ["alembic"]`) so `ruff check .` is clean for the whole API.
- **Added production-config regression tests** (`tests/test_production_config.py`, 6 tests) locking in the corrected startup guard and the `X-User-Id` auth gate. Added service-layer persistence test (`tests/test_investigation_service.py`, 4 tests) verifying create/update/list/not-found through the real `InvestigationService` + SQLAlchemy async stack. Added frontend API-mode store tests (`src/state/investigation.store.api.test.ts`, 6 tests) and React Query hook tests (`src/hooks/use-investigations.test.tsx`, 5 tests) covering data loading, empty, error, and query invalidation in API mode.
- **Fixed a real-frontend → API 401 blocker** (`apps/web/src/lib/api/client.ts`): the deployed frontend did not send the identity the backend requires in production, so every `/api/v2` call returned `401 authentication_required`. The typed client now sends the documented SIH demonstration identity (`X-User-Id: inspector.mehta@trinetra.local`) on every request, so the browser → FastAPI → PostgreSQL flow works on Render (with a regression test in `client.test.ts`).
- **Verified the full production data flow end-to-end** in production mode (migrate → seed → `/api/v2` list/detail/summary/entities/relationships/evidence/findings/notes/events/timeline/network-graph/analytics, plus the 404 and 401 error contracts).
- **Real-data flow scope documented**: with `NEXT_PUBLIC_USE_MOCK_API=false` the workspace reads everything from `/api/v2` and writes through the relational endpoints the backend provides; evidence/finding/note update & delete stay mock-only because the backend keeps a lean CRUD surface (adding those endpoints is out of scope).
- **Verification**: backend pytest **100** + `ruff check .` clean; frontend tsc clean + eslint clean (1 pre-existing font warning) + jest **56 suites / 459 tests** + `next build` green (also in production API mode); `render.yaml` valid YAML.
- **Out of scope (unchanged)**: Phase 16, predictive/guilt/autonomous features, Docker, new tables, auth rewrite, AI capabilities beyond the preserved `AI_PROVIDER=mock`.

### Phase 21 (Current) ✅ — see [PHASE_21_COMPLETE.md](PHASE_21_COMPLETE.md) + [PHASE_21_REPORT.md](PHASE_21_REPORT.md)
- **Blockchain evidence integrity anchoring**: deterministic SHA-256 checksum + derived custody chain hash + optional blockchain anchor per evidence item
- **Backend**: `app/evidence_integrity` package (digest, ledger, providers: mock + real EVM via web3), `EvidenceBlockchainAnchor` model + Alembic migration, four `/evidence/{id}/*` endpoints, server-side `BLOCKCHAIN_*` settings, idempotent anchoring, auditor RBAC (read-only)
- **Frontend**: shared types, typed API client + service (mock/real bridge, demo seeded anchor for `ev-intel-001`), `EvidenceChainPanel` (3-layer visualization), `EvidenceBlockchainPanel` (anchor status + actions + MOCK badge), `EvidenceIntegritySection` wired into `EvidenceDetailPanel`
- **AI grounding**: `BLOCKCHAIN_ANCHOR` query type, anchor-specific keywords, deterministic answer from persisted integrity payloads (not invented), context-builder enrichment
- **Sub-deliverables**: the earlier Relationship Intelligence work is preserved as sub-deliverables — see [PHASE_21_RELATIONSHIP_INTELLIGENCE_COMPLETE.md](PHASE_21_RELATIONSHIP_INTELLIGENCE_COMPLETE.md) and [PHASE_21_RELATIONSHIP_INTELLIGENCE_REPORT.md](PHASE_21_RELATIONSHIP_INTELLIGENCE_REPORT.md)
- **Verification**: backend 209 pytest + ruff clean, frontend 604 jest (74 suites) + tsc clean + eslint clean + `next build` green
- **Required statement**: Blockchain is used as an integrity anchor for evidence custody records. Raw evidence and personally identifiable information remain off-chain.
