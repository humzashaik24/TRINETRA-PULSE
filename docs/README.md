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

## Phase 18.3 — suspicious pattern detection

The real `/api/v2` layer computes explainable investigative leads from the
active investigation's persisted graph. `GET
/api/v2/investigations/{investigation_id}/patterns` is authenticated and
strictly scoped. It returns stable pattern IDs, typed severity/confidence,
supporting entity/relationship/evidence IDs, and a plain-language explanation.
No detector claims guilt, and missing amounts or timestamps remain missing.

The web analytics workspace keeps the existing mock structural-pattern engine
when `NEXT_PUBLIC_USE_MOCK_API=true`. With `false`, it requests the real
analytics summary and the patterns endpoint; backend errors remain visible
instead of silently switching to mock data.

See [PHASE_18.3_COMPLETE.md](PHASE_18.3_COMPLETE.md) for detector rules,
limits, tests, and known limitations.

Phase 18.5 production verification hardens the Render-native configuration,
health semantics, migration portability, seed idempotency, and local
end-to-end API-mode checks. See
[PHASE_18.5_COMPLETE.md](PHASE_18.5_COMPLETE.md).

Phase 18.6 adds filesystem and S3-compatible evidence payload providers behind
the existing storage abstraction. See
[PHASE_18.6_COMPLETE.md](PHASE_18.6_COMPLETE.md).

Phase 18.7 adds authenticated raw evidence multipart upload, provenance/custody
integration, integrity-checked retrieval, and storage/DB compensation through
those same providers. See [PHASE_18.7_COMPLETE.md](PHASE_18.7_COMPLETE.md).

## Phase 27 (Current) — Investigation Intelligence Workspace

The investigation workspace surfaces existing intelligence as a **read-only
command center** per case: an overview key-figures grid (incl. findings and
timeline events) with a "directions summary" section, a directions tab with
client-side priority/type filters and an expandable **lead detail panel**
(grounded supporting facts + related entities/relationships/evidence from the
scoped workspace store), and Network/Timeline anchor deep links — all opening
through the existing Context Inspector with the active `investigationId`
preserved.

Phase 27 is a **consumer layer**: it adds **no** new analytics engine and **no**
new backend endpoints. It connects existing investigative intelligence into a
unified read-only workspace — it does **not** generate new evidence, determine
guilt, or make autonomous investigative decisions.

See [PHASE_27_COMPLETE.md](PHASE_27_COMPLETE.md) for design, files, and the
backend contract tests (`apps/api/tests/test_investigation_workspace.py`,
6 tests) covering auth 401s, scoped child lists, cross-investigation 404s,
grounded directions, and no-secret-leakage.

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

### Phase 6 ✅
- Entity normalization + resolution client libraries
- Entity Intelligence UI (entity list, detail workspace, extraction/candidates/resolutions/audit)
- Backend entity-intelligence API (candidates, resolutions, extraction jobs, audit)
- Unit tests (web jest 41, API pytest 21)
- Documentation (design system / motion / application shell)

### Phase 7 ✅ — see [NETWORK_INTELLIGENCE.md](NETWORK_INTELLIGENCE.md)
- Concrete **@xyflow/react** graph engine on the library-agnostic `GraphEngine` contract
- Network workspace chrome: canvas, controls, stats, search, filters, timeline, path explorer, depth, list view, legend
- `/networks` listing + `/networks/[id]` interactive workspace pages
- Inspector integration (graph node/edge → EntityContext / RelationshipContext with graph-hint fallback)
- Reduced-motion + accessible controls, neutral observed/inferred terminology
- Web unit/component tests (150 passing)

### Phase 8 ✅ — see [NETWORK_ANALYTICS.md](NETWORK_ANALYTICS.md)
- Structural analytics engine (degree/betweenness/closeness/PageRank, composite network influence)
- Community detection (Louvain), connected components, density, bridge-entity detection (Tarjan + betweenness)
- Temporal snapshots + structural pattern detection (analytical severity, never guilt)
- Network analytics service (cache + in-flight dedupe), analytics store, inspector views, graph overlays
- `/networks/[id]/analytics` dashboard + tests
- AI assistant integration (out of scope for Phase 8)

### Phase 9 ✅ — see [INVESTIGATION_WORKSPACE.md](INVESTIGATION_WORKSPACE.md)
- Investigation domain types, lifecycle, identity model & naming (neutral, non-accusatory language)
- Deterministic mock universe (5 investigations reusing Phase 4–8 canonical ids)
- Investigation service + optimistic zustand store with unsaved-changes (dirty) tracking
- Shell / inspector wiring for investigation, note, event and analytics-snapshot contexts
- `/investigations` listing page (search / filter / sort) + `/investigations/[id]` workspace with 8 tabs
- Overview, Network (reuses Phase 7 `NetworkGraph`), Entities, Evidence, Timeline, Findings, Notes, Activity tabs
- Command-palette + breadcrumb integration
- Service/store/list/tab tests
- Explicitly out of scope: AI assistant, automated reports, predictive modelling, and any suspect/guilt scoring

### Phase 12 ✅ — see [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md)
- Evidence intelligence domain model (`EvidenceType`/`Status`, `EvidenceSource`/`Item`, provenance, links, coverage, support)
- `ExtractionMethod` extended with `ANALYTICAL` for analytical evidence (frequency / tower / network analysis)
- Deterministic 32-item evidence universe (INV-006 / Operation Meridian) reusing canonical entity/relationship/finding/event ids
- Evidence service (search/filter/pagination, coverage, relationship/finding/event support, entity summaries, collections, retrieval)
- Investigation-scoped evidence store + `/evidence` workspace (Repository / Coverage / Support / Retrieval / Network / Timeline)
- Grounded AI retrieval (budget-bounded, error-safe, provenance references) via `ai/evidence-retrieval.ts`
- Service/store/retrieval tests (48 new Jest tests)
- Explicitly out of scope: autonomous agents, agentic investigation, suspect ranking, guilt scoring, predictive policing, automated enforcement

### Phase 13 ✅ — see [SIH_DEMO_JOURNEY.md](SIH_DEMO_JOURNEY.md)
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

### Phase 14 ✅ — see [SIH_READINESS.md](SIH_READINESS.md)
- Hardening / cleanup / SIH-readiness phase (no new features, no rewrites)
- Removed provably-dead code: `services/api.ts`, `hooks/use-journey.ts`, `ai/tools.ts`, `packages/config` package
- Removed legacy duplicate shell chrome: `shell/sidebar.tsx`, `shell/header.tsx`, `navigation/config.ts` (+ barrel exports + orphaned `app.store` sidebar fields)
- Verified single-canonical shell / graph / AI / evidence / motion architectures; zero CRIME-X remnants
- Environment/config cleanup: accurate `.env.example` (removed ghost/misleading vars, added `AI_*`), `.gitignore` covers `.ruff_cache`/`.mypy_cache`
- Security hardening: production startup guard fails closed on default secrets; corrected docs that over-claimed authentication
- Documentation cleanup + `docs/SIH_READINESS.md`; final web suite 53 suites / 441 tests (web), API pytest 44 (all green)

### Phase 14.2 ✅ — Deep Dead-Code & Duplication Audit
- Cleanup-only follow-up: audited web / API / packages / docs for dead code and duplication; no whole-file dead code found, dead code was concentrated in unused exports
- Removed dead exports (16 edits): `lib/format.ts` (`maskValue`, `formatPhoneMasked`, `COVERAGE_LEVEL_VARIANT`, `RESOLUTION_STATE_VARIANT`), `services/entity.service.ts` (`searchEntities`, `fetchResolution`, `fetchEntityTypeCounts`, `setMergeArchiveSource`, `_internal`), `services/network.service.ts` (`_networkInternal`), `ai/provider.ts` (`availableProviders`), `ai/context-builder.ts` (`rankByPriority`), `ai/validation.ts` (`isNeutralPhrasing`), unused type re-exports (`engine/react-flow-engine.ts`, `ai/grounding.ts`, `analytics/network-analytics-engine.ts`, `state/investigation-operations.store.ts`), `graph/selectors.ts` (`DimState`), `lib/entity-domain.ts` (`confidenceTone`), `state/shell.store.ts` (`INSPECTOR_MAX_RATIO`, `WORKSPACE_MIN_WIDTH`), `navigation/journey.ts` (unused context type re-exports), `components/shell/index.ts` (`INVESTIGATION_TABS` barrel export), and `next.config.js` (`@radix-ui/react-icons` from `optimizePackageImports`)
- Preserved (documented, referenced, or scaffolding): motion-system primitives/hooks, intelligence + `MiniBar` components, TanStack Query, `checkbox.tsx`/`drawer.tsx` (barrel exports), API `models/db/auth/middleware` scaffolding, unused API schemas, mock data, test-only helpers, `zod`/`date-fns` deps
- Known defect (report-only, not fixed in this cleanup): pipeline "Findings"→`/findings` and "Timeline"→`/timeline` stage links are 404 routes (`services/investigation-operations.service.ts` fallbackPipeline + mock)
- Verification: TypeScript + ESLint clean (1 pre-existing `no-page-custom-font` warning), web 53 suites / 441 tests green (includes Operation Meridian demo journey), `next build` green (20 routes), API pytest 44 green, ruff clean

### Phase 14.2b ✅ — see [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Real application foundation**: converts the mock/in-memory demo into a real full-stack app — PostgreSQL + SQLAlchemy 2.x async + Alembic + seed, layered repositories/services/routers, real CRUD APIs under `/api/v2`, typed frontend API client + TanStack Query hooks — **additively**, without breaking existing architecture/UI
- **Backend**: portable `Uuid`/`JSONB` types (`app/db/types.py`), async session (`app/db/session.py`), 13 portable tables, Alembic initial migration, idempotent **Operation Meridian** seed (`app/db/seed.py`, deterministic UUID5 from canonical `inv-006`/`ent-*`/`rel-*`/`ev-*` ids), repositories, `InvestigationService`/`NetworkService`, `/api/v2` routers (investigations, entities, relationships, findings, evidence, events, notes, timeline, network, nested resources), single `{code,message,details,status_code}` error contract, dev-identity dependency gate (auth-required in production without `X-User-Id`)
- **Boundaries**: portable filesystem `EvidenceStorage` (`app/storage/evidence_storage.py`, S3-replaceable) + validated CSV data-intelligence reader (`app/intelligence/csv_reader.py`, provenance-carrying rows)
- **Frontend**: typed client (`src/lib/api/` config/client/investigations/provider), React Query hooks (`src/hooks/use-investigations.ts`), `QueryClientProvider` wired into `layout.tsx`, mock→API transition boundary driven by `NEXT_PUBLIC_USE_MOCK_API` (mock-first default), web `.env.example` + API `.env.example`
- **Verification**: API pytest **69** passing + ruff clean, alembic upgrade applies to SQLite (13 tables), web tsc clean, eslint clean (1 pre-existing font warning), jest **54 suites / 447 tests**, `next build` green (20 routes)
- **Deferred (documented)**: PostgreSQL integration runs against throwaway SQLite via `DATABASE_URL` (Docker unavailable); mypy remains informational (legacy ~168 pre-existing errors); the then-optional `docker-compose.yml` documented the future `api` container `depends_on` (needs a packaged image first) and was **removed in Phase 14.4**

### Phase 14.3 ✅ — see [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) + [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)
- **Production target = Render** via a Blueprint ([`render.yaml`](../render.yaml)) with **no Docker required**: Next.js native Node web service (`apps/web`), FastAPI native Python web service (`apps/api`), and managed PostgreSQL
- **Backend**: environment-driven CORS (`FRONTEND_URL`/`CORS_ORIGINS`, never `*`), unauthenticated top-level `/health` (+ `/health/db` safe DB check), `EVIDENCE_STORAGE_DIR` setting, `requirements.txt` for the Render Python runtime
- **Database**: Alembic verified to generate PostgreSQL DDL and apply cleanly; standalone `python -m app.db.seed` reproduces Operation Meridian (`inv-006`) in PostgreSQL
- **Frontend API mode**: investigations listing now branches to the real `/api/v2` client when `NEXT_PUBLIC_USE_MOCK_API=false`; mock mode unchanged
- **Tests**: added health/CORS and **investigation isolation** coverage (no cross-investigation leakage) — API pytest **90** passing, ruff clean, web type-check/lint/build green
- **Out of scope (unchanged)**: Phase 15, predictive/guilt/autonomous features; Docker remained optional local infrastructure at the close of 14.3 and was **fully removed in Phase 14.4**

### Phase 14.4 ✅ — Complete Docker Removal & Native Runtime Cleanup
- **Docker fully removed** from the repository. Deleted: `docker-compose.yml`, `.dockerignore`, root `package.json` `docker:up` / `docker:down` / `docker:reset` scripts, and the Docker compose data-dir ignores in `.gitignore`.
- **Production remains the Phase 14.3 Render architecture** with **zero Docker**: Next.js native Node web service, FastAPI native Python web service, managed Render PostgreSQL — all defined in [`render.yaml`](../render.yaml).
- **Native local development** (no Docker): run the FastAPI app with `uvicorn` and point `DATABASE_URL` at any PostgreSQL; mock mode still needs no database. See [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md#development-without-docker).
- **Documentation** updated to state Docker is removed and not required; historical mentions now describe it as removed rather than active.
- **Verification**: backend pytest **90** + ruff clean; frontend tsc clean, eslint clean (1 pre-existing font warning), jest green, `next build` green; `render.yaml` still defines native runtimes only (no image/build/docker references).

### Phase 15 ✅ — Production Activation on Render
- **Made the existing Phase 14.3/14.4 deployment genuinely runnable** — no new features, no Phase 16.
- **Fixed a production startup blocker** (`app/core/config.py`): `enforce_production_defaults` rejected an otherwise-correct Render deploy wired through `DATABASE_URL` because the unused `POSTGRES_*`/`NEO4J_*`/`REDIS_*` component passwords retained defaults. The guard now only rejects defaults the running config actually depends on (app/JWT secrets always; Postgres password only when no `DATABASE_URL` is set).
- **Pinned lint to exclude Alembic-generated migrations** (`pyproject.toml` `extend-exclude = ["alembic"]`) so `ruff check .` is clean for the whole API.
- **Added production-config regression tests** (`tests/test_production_config.py`, 6 tests) locking in the corrected startup guard and the `X-User-Id` auth gate. Added service-layer persistence test (`tests/test_investigation_service.py`, 4 tests) verifying create/update/list/not-found through the real `InvestigationService` + SQLAlchemy async stack. Added frontend API-mode store tests (`src/state/investigation.store.api.test.ts`, 6 tests) and React Query hook tests (`src/hooks/use-investigations.test.tsx`, 5 tests) covering data loading, empty, error, and query invalidation in API mode.
- **Fixed a real-frontend → API 401 blocker** (`apps/web/src/lib/api/client.ts`): the deployed frontend did not send the identity the backend requires in production, so every `/api/v2` call returned `401 authentication_required`. The typed client now sends the documented SIH demonstration identity (`X-User-Id: inspector.mehta@trinetra.local`) on every request, so the browser → FastAPI → PostgreSQL flow works on Render (with a regression test in `client.test.ts`).
- **Verified the full production data flow end-to-end** in production mode (migrate → seed → `/api/v2` list/detail/summary/entities/relationships/evidence/findings/notes/events/timeline/network-graph/analytics, plus the 404 and 401 error contracts).
- **Real-data flow scope documented**: with `NEXT_PUBLIC_USE_MOCK_API=false` the workspace reads everything from `/api/v2` and writes through the relational endpoints the backend provides; evidence/finding/note update & delete stay mock-only because the backend keeps a lean CRUD surface (adding those endpoints is out of scope).
- **Verification**: backend pytest **100** + `ruff check .` clean; frontend tsc clean + eslint clean (1 pre-existing font warning) + jest **56 suites / 459 tests** + `next build` green (also in production API mode); `render.yaml` valid YAML.
- **Out of scope (unchanged)**: Phase 16, predictive/guilt/autonomous features, Docker, new tables, auth rewrite, AI capabilities beyond the preserved `AI_PROVIDER=mock`.

### Phase 17.6 ✅ — Real Evidence Intelligence + SHA-256 Integrity — see [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Preceded by Phase 16** (real CSV ingestion pipeline: `POST /api/v2/datasets/upload` → `IngestionPipeline` → PostgreSQL) and **Phase 17.0–17.5** (audit/provenance events, real network graph, real network analytics, real timeline, grounded AI from persisted investigation data — all `isMockData()`-gated, all additive).
- **Real evidence read surface**: with `NEXT_PUBLIC_USE_MOCK_API=false` the Evidence Intelligence workspaces branch to a typed `/api/v2` client (`apps/web/src/lib/api/evidence.ts`): `getEvidenceById` (investigation-scoped), `getEvidenceIntegrity`, and `loadEvidenceSearch` over the nested `GET /investigations/{id}/evidence` row set with the same deterministic filter/sort/paginate/facet semantics as the mock service.
- **Investigation-scoped backend reads**: `GET /evidence/{id}?investigation_id=…` (404 when the scope does not match), `GET /evidence/{id}/integrity`, and a per-row `integrity` block on the nested evidence list — folded into `InvestigationService.get_evidence_scoped` / the `evidence` + `investigation_resources` routers.
- **SHA-256 integrity block** (`app/services/evidence_integrity.py`): every persisted evidence row carries `{checksum, status}`; the checksum is the digest of a **canonicalised** payload (title/description/type/date + canonical provenance fields, naive-UTC microsecond-trimmed datetimes) computed at create time and verified against the deterministic blob digest in `EvidenceStorage`. `test_checksum_verification_mismatch` proves tampered payloads are detected.
- **Frontend mapping**: `mapEvidenceItem`/`mapEvidenceSource` rebuild the Phase 12 UI shapes from the leaner relational rows; the checksum surfaces as `provenance.hash` and as an `integrity {checksum, status}` block on the detail panel; `EvidenceItem.integrity` is a new optional typed field in `@trinetra-pulse/types`.
- **API-mode wiring**: `evidence.store.ts` (list/detail/selection), `inspector.service.ts` (Context Inspector evidence resolution, STEP 12/13 AI source chips), the grounded-retrieval panel, and the network evidence mode all branch on `isMockData()` with **no silent mock fallback** — an API failure surfaces the store error state.
- **Phase 17.7 boundary (kept honest)**: coverage, relationship/finding/event support, entity summaries and collections have no relational endpoints yet (evidence↔entity/finding/event link model); in API mode those slices are `[]` → graceful empty states, never fabricated.
- **Verification**: backend pytest **154 passing + 1 warning** (27 in the evidence suite) + `ruff check .` clean; frontend **tsc clean + eslint clean + jest 68 suites / 584 tests** (new `lib/api/evidence.test.ts` + `state/evidence.store.api.test.ts`); mock mode fully intact.
- **Out of scope (explicit)**: blockchain / web3 / smart contracts (cryptographic integrity *prepares* the foundation for a later chain-of-custody phase), RBAC / auth rewrite, anomaly detection / scoring / agents, and the Phase 17.7 relational evidence links. Verified against SQLite locally; PostgreSQL DDL verified via Alembic offline mode, Render deployment pending.

### Phase 17.7 ✅ — Real Entity Intelligence (investigation-scoped) — see [PHASE_17.7_COMPLETE.md](PHASE_17.7_COMPLETE.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Real entity read surface**: with `NEXT_PUBLIC_USE_MOCK_API=false` the Entity workspace (`/entities`, `/entities/[id]`, SummaryStrip, Context Inspector entity resolution) branches to a typed `/api/v2` client (`apps/web/src/lib/api/entities.ts`): `mapEntityIntelligence` (persisted `RealEntity` → `EntityIntelligence`), `loadEntityList` (scoped rows + deterministic search/sort/pagination), `loadEntityDetail`/`loadEntityDetailBundle` (honest empty detail slices), `apiEntityOverviewSummary`.
- **Investigation-scoped backend reads**: `GET /entities/{id}?investigation_id=…` (404 when the scope does not match) — `InvestigationService.get_entity_scoped` on the `entities` router; the nested `GET /investigations/{id}/entities` list (already scoped) is the list path.
- **Honest mapping**: `resolutionState` derives from the persisted `is_verified` flag (verified → `CONFIRMED`, else `NEEDS_REVIEW`); aliases come from attributes/metadata/a differing `canonical_name`; relational counters and the entities↔relationships/evidence/event link surfaces are later-phase domains so they stay at 0 / `[]` in API mode; SummaryStrip candidates/resolutions/jobs are 0 — never fabricated from mock.
- **API-mode wiring**: `entity.store.ts` (list/detail/selection, `setInvestigationId` clears stale state), `inspector.service.ts` (Context Inspector entity resolution) branch on `isMockData()` with **no silent mock fallback** — an API failure surfaces the store/error state.
- **Verification**: backend pytest **163 passing + 2 warnings** (+9 new `tests/test_entity_api.py`: scoped list/detail, cross-investigation 404, create, error contract) + `ruff check apps/api` clean; frontend **tsc clean + eslint clean + jest 71 suites / 604 tests** (new `lib/api/entities.test.ts`, `state/entity.store.api.test.ts`, `services/inspector.service.entity.api.test.ts`); `alembic upgrade head` applies cleanly and Operation Meridian re-seeds (6 entity rows verified). Mock mode fully intact.
- **Phase 17.8 boundary (kept honest)**: relational entity↔relationships/evidence/events/findings link surfaces and the `entity_resolutions` relation have no joined API surface yet; in API mode those slices are `[]` / `0` → graceful empty states, never fabricated.
- **Out of scope (explicit)**: entity-resolution ML, `entity_resolutions` API, relationships/findings/notes/events migration, RBAC / auth rewrite, and the Phase 17.8 relational links. Verified against SQLite locally; PostgreSQL DDL verified via Alembic offline mode, Render deployment pending.

### Phase 17.8 -- Real Relationships (investigation-scoped) -- see [PHASE_17.8_COMPLETE.md](PHASE_17.8_COMPLETE.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Investigation-scoped relationship reads**: `GET /relationships/{id}?investigation_id=...` (404 when the scope does not match, no cross-investigation existence leak) via `InvestigationService.get_relationship_scoped`; the nested `GET /investigations/{id}/relationships` list (already scoped) stays the list path. The persisted `extraction_method` column is now exposed on `RelationshipRead`.
- **Typed relationship adapter**: `apps/web/src/lib/api/relationships.ts` maps persisted `RealRelationship` rows into the Phase 0 `EntityRelationship` UI shape: `mapApiRelationship` (resolves entity names/types from the investigation-scoped entity rows), `loadRelationshipDetail` (scoped detail read), `loadEntityRelationships` (all relationships touching an entity + derived `related` list + count), `relatedFrom`, and deterministic documented vocabulary translations (`relationship_type` incl. the `known_associiate` spelling to `RelationshipKind` with entity-type-aware USES/WORKS_FOR cases; `verification_status` incl. `possible` to `CANDIDATE`; `extraction_method` to `ExtractionMethod`).
- **API-mode wiring**: the entity detail Relations tab (`loadEntityDetailBundle` -> real relationship slices + summary counts) and the Context Inspector relationship resolution (`inspector.service.ts`, authoritative in API mode -- the graph-hint shortcut is mock-mode only) branch on `isMockData()` with **no silent mock fallback**; an API failure surfaces the page/inspector error state.
- **Verification**: backend pytest **175 passing + 3 warnings** (+12 new `tests/test_relationship_api.py`: scoped list/detail, cross-investigation 404 + list isolation, missing/bad ids, entity-integrity, persisted extraction method, ingestion-created relationships, error contract) + `ruff check apps/api` clean; frontend **tsc clean + eslint clean + jest 73 suites / 625 tests** (new `lib/api/relationships.test.ts`, `services/inspector.service.relationship.api.test.ts`, updated `lib/api/entities.test.ts`); `next build` green; seeded Operation Meridian re-seeds with 4 relationships + 4 graph edges intact. Mock mode fully intact.
- **Kept honest / deferred**: relationship creation has no UI flow and no `POST /relationships` endpoint, so it stays deferred; coverage / relationship-evidence-support / collections surfaces still have no relational endpoint and remain `[]` in API mode. Verified against SQLite locally; PostgreSQL DDL verified via Alembic offline mode, Render deployment pending.

### Phase 17.9 -- Real Findings, Notes & Events Detail (investigation-scoped) -- see [PHASE_17.9_COMPLETE.md](PHASE_17.9_COMPLETE.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Investigation-scoped detail reads**: `GET /findings/{id}?investigation_id=`, `GET /notes/{id}?investigation_id=`, `GET /events/{id}?investigation_id=` (each 404 on scope mismatch, no cross-investigation existence leak) via `InvestigationService.get_finding_scoped` / `get_note_scoped` / `get_event_scoped`. This closes the last unscoped detail reads in the workspace resource family; discovery lists, the findings/notes tabs, overview counts and the unified timeline already read persisted rows.
- **Typed detail adapters**: `apps/web/src/lib/api/findings.ts` (`loadFindingDetail` resolves entity_refs names/types from the scoped entity rows; `findingConfidenceFrom`/`findingCategoryFrom`/`findingSourceFrom`/`findingEvidenceIdsFrom` deterministic severity/confidence translations), `apps/web/src/lib/api/notes.ts` (`loadNoteDetail` + `noteCategoryFrom`), `apps/web/src/lib/api/events.ts` (`loadEventDetail` + `eventTitleFrom`) map persisted rows into their Phase 0 UI shapes.
- **API-mode wiring**: the Context Inspector finding/note/event resolution (`inspector.service.ts`) branches on `isMockData()` in API mode to these adapters, scoped to the current investigation, with **no silent mock fallback** — an API failure surfaces the inspector error state. Mock-mode branches unchanged.
- **Events stay in the existing `events` table** (no duplicate table): reuse of `EventRepository` + scoped list + merged timeline preserves categories/timestamps/ordering and Inspector navigation; ingestion events (`dataset_uploaded`, `ingestion_started`, `ingestion_completed`, `ingestion_failed`) remain visible per investigation. Existing `POST /findings` and `POST /notes` endpoints stay compatible (create-and-read-back verified).
- **Verification**: backend pytest **189 passing + 3 warnings** (+14 new `tests/test_findings_notes_events_api.py`: scoped list/detail for findings/events/notes, cross-investigation 404 + list isolation, missing/bad ids, event ordering, ingestion events surface in list/detail/timeline, POST create-and-read-back for findings/notes, error contract) + `ruff check apps/api` clean; frontend **tsc clean + eslint clean + jest 78 suites / 654 tests** (new `lib/api/findings.test.ts`, `lib/api/events.test.ts`, `lib/api/notes.test.ts`, `services/inspector.service.findings.api.test.ts`, `services/inspector.service.notes-events.api.test.ts`); `next build` green; `alembic upgrade head` applies cleanly; Operation Meridian seed intact. Mock mode fully intact.
- **Kept honest / deferred**: update/delete for findings/notes/events have no UI flow and no endpoints (stay deferred, consistent with evidence); discovery list counts stay as-is. Verified against SQLite locally; PostgreSQL DDL verified via Alembic offline mode, Render deployment pending.

### Phase 17.10 -- Render Production + PostgreSQL Integration Verification -- see [PHASE_17.10_COMPLETE.md](PHASE_17.10_COMPLETE.md) + [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Production path hardened for Render**: the API service's `preDeployCommand` now runs `python -m alembic upgrade head` on every deploy; `Settings.database_url` normalizes Render's bare `postgres://`/`postgresql://` connection string to `postgresql+asyncpg://` (async engine) with `database_url_sync` kept for Alembic; `psycopg2-binary` added so migrations work against PostgreSQL; the async pool is configurable (`DB_POOL_SIZE`/`DB_MAX_OVERFLOW`, 3/2 in `render.yaml`) to fit free-tier PostgreSQL connection limits.
- **Write-path fix**: investigation PATCH crashed with `MissingGreenlet` (DB-side `updated_at` expired after flush); the service now `refresh()`es before validation and a regression test (`test_update_investigation_round_trip`) was added.
- **Verified in production mode** (local run, `APP_ENV=production`, seeded SQLite override): startup secret guard, CORS without wildcard (forbidden origin rejected), the `X-User-Id` auth gate (401 without header), `/health` + `/api/v1/health/db`, every `/api/v2` read endpoint (persisted records, evidence integrity valid, timeline/graph/analytics), the full write surface (create/patch investigation, entity, finding, note, dataset upload + CDR ingestion with readable events), and cross-investigation isolation (all six resource types 404 under another scope; lists/timeline/graph/analytics untouched).
- **Frontend production verification**: `tsc` + `eslint` clean, `jest` 78 suites / 654 tests, `next build` green in API mode (`NEXT_PUBLIC_USE_MOCK_API=false`, API base URL inlined, no localhost/API leak in the bundle) and in mock mode; `next start` boots.
- **Backend verification**: `pytest` **190 passing** + `ruff check .` clean; `alembic upgrade head` re-verified (16 model tables + `alembic_version`, 13 tables with FKs, 30 indexes, provenance extension) and `--sql` re-generated valid PostgreSQL DDL.
- **Honest status**: live Render deployment and live managed-PostgreSQL verification
  **remain PENDING** (no Render API/CLI in the environment). Exact manual Blueprint
  steps are in [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md). Postgres is exercised
  via SQLite override + PostgreSQL DDL offline only.

### Phase 18.2 (Current) -- Tamper-Evident Evidence Chain of Custody -- see [PHASE_18.2_COMPLETE.md](PHASE_18.2_COMPLETE.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md) + [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md)
- **Relational hash chain (NOT a blockchain)**: every persisted evidence item gets a
  per-evidence SHA-256 chain of custody in PostgreSQL (`evidence_chain_entries`), pinned
  by `previous_entry_hash` → each new `EvidenceChainEntry` (create/upload/access/
  verified/metadata-updated/exported) links to its predecessor. No distributed ledger,
  no consensus, no nodes, no tokens — integrity is replayable from the single
  PostgreSQL source of truth.
- **Genesis + lifecycle**: interactive `POST /api/v2/evidence` and ingestion both append
  a genesis `evidence_created` link (actor resolution centralized in
  `EvidenceChainService.append`); `EvidenceChainVerifier` replays the chain **and
  recomputes the live payload SHA-256** from the current row, so an edited evidence
  body after the fact yields `TAMPERED` and a deleted/missing link yields
  `BROKEN_CHAIN`.
- **API**: `GET /api/v2/evidence/{id}/chain` (full chain, scoped by
  `investigation_id`, 404 on scope mismatch), `GET .../chain/verify` (**read-only**,
  always available incl. auditor, never writes audit), `POST .../chain/verify`
  (audited `evidence_chain_verified` / `evidence_chain_verify_failed`). New
  `evidence_chain_created` audit on create.
- **Schema + seed**: Alembic migration `d5e6f7a8b9c0` (5 revisions total; `action` is a
  plain `VARCHAR(32)`, no server-side enum/CHECK) → **19 model tables**; seed
  idempotently blocks existing seeded evidence with genesis links + integrity hashes.
- **Frontend**: `EvidenceChainPanel` on the evidence detail view (status badge, link
  list, collapsible hash technical details, audited Verify action) +
  `EvidenceContextView` compact custody section. Relational-only: mock mode honestly
  reports chains appear when connected to the backend — a fabricated demo chain would
  be meaningless.
- **Verification**: backend **227 pytest passing** + `ruff check`/`ruff format` clean
  (20 new tests in `tests/test_evidence_chain.py`); frontend **tsc clean + eslint clean
  + jest 83 suites / 687 tests**; `next build` green in mock + API modes; SQLite
  `upgrade head` (5 revisions) + offline PostgreSQL DDL confirmed; seed idempotent.
- **Kept honest / deferred**: live Render deployment remains PENDING (no access);
  **Phase 18.3 is NOT started** (no anomaly detection, autonomous agents,
  Neo4j/Redis expansion, Docker).

### Phase 18.1 ✅ -- Authentication + Role-Based Access Control -- see [PHASE_18.1_COMPLETE.md](PHASE_18.1_COMPLETE.md) + [REAL_APPLICATION_ARCHITECTURE.md](REAL_APPLICATION_ARCHITECTURE.md)
- **Backend auth**: `POST /api/v2/auth/login` (the only public v2 endpoint) verifies
  bcrypt hashes and issues a short-lived JWT (`JWT_ALGORITHM=HS256`, 30-min access via
  `app/core/security.py`); `GET /api/v2/auth/me` returns the safe profile; `GET
  /api/v2/admin/users` + `GET /api/v2/admin/audit` expose the user list and the auth
  audit trail. `X-User-Id` is **no longer trusted** — the bearer token is the identity
  (401/403 split, forged-role claims rejected).
- **RBAC model**: `admin` > `supervisor` > `investigator` hierarchy plus a distinct
  read-only `auditor`. All v2 mutations (entities/findings/evidence/notes/datasets/
  job-complete/job-cancel) → `CanMutateDep`; `DELETE /investigations/{id}` → supervisor
  minimum; datasets POST handlers → `CanMutateDep`; the assistant router (status
  /providers/query) → any authenticated user. Every denial records a
  `permission_denied` audit event (with the failing role) and returns 403 `forbidden`.
- **Schema + seed**: Alembic migration `c4d5e6f7a8b9` adds `users` + `auth_audit_events`
  (18 model tables total); `app/db/seed.py` is idempotent and seeds exactly 4 demo
  users (`investigator@trinetra.dev` / `Investigator!2026`, `supervisor@trinetra.dev`,
  `admin@trinetra.dev`, and read-only `auditor@trinetra.dev`). Demo logins are exported
  as `DEMO_USER_LOGINS` and printed by the seed.
- **Frontend auth UI**: `/login` page, `AuthGate` (dashboard route guard → redirect in
  API mode; self-provisions a deterministic demo session in mock mode — guarded by
  `isMockData()`, never in API mode), `AuthBootstrap` (401 → logout), a real `/profile`
  page (role badge + sign out), role-gated navigations (rail "Security" item,
  `filterRailItemsByRole`), admin users table + audit trail on `/security` (with 403
  denied states), and auditor read-only gating (new-investigation link/page +
  data-intelligence upload zone). Mock mode demo credentials are shown on the login
  page.
- **Client wiring**: `src/lib/api/client.ts` attaches `Authorization: Bearer <token>`
  (registered via `setAuthAccessToken`), fires `setOnUnauthorized` on an authenticated
  401, and never sends `Content-Type` for FormData.
- **Verification**: backend **207 pytest passing** + `ruff check` + `ruff format`
  clean (17 new tests in `tests/test_auth_rbac.py`; all 8 functional v2 suites wired
  through `tests/auth_stubs.py`); frontend **tsc clean + eslint clean + jest 81 suites
  / 667 tests** (`client.test.ts` bearer contract, `auth.store.test.ts`,
  `auth-gate.test.tsx`, `login-page.test.tsx`); `next build` green in mock + API modes;
  migration re-verified on SQLite (18 tables) + offline PostgreSQL DDL; seed idempotent
  (18 tables, 4 users, 0 audit events after first pass).
- **Kept honest / deferred**: live Render deployment remains PENDING (no access);
  Postgres exercised via SQLite + offline `--sql` DDL; **Phase 18.2 is NOT started**
  (no blockchain, anomaly detection, autonomous agents, Neo4j/Redis expansion).
