# PHASE 18.5 — FINAL REPORT

## Production-hardening outcome

The Render-native production path was audited and verified locally without
introducing infrastructure or changing the completed intelligence architecture.
Production uses native Node/Next.js, native Python/FastAPI, and managed
PostgreSQL. `NEXT_PUBLIC_USE_MOCK_API=false` is wired in `render.yaml`.

## Fixes applied

- Production startup now requires a non-empty deployed `FRONTEND_URL` and
  rejects wildcard or localhost CORS origins.
- `/api/v1/health/db` now returns HTTP 503 when the database is unavailable
  instead of reporting a successful HTTP status.
- The Phase 18.4 `event_timestamp` migration now uses Alembic batch alteration,
  allowing the same revision chain to complete on SQLite verification and
  PostgreSQL.

## Required Render variables

API: `DATABASE_URL` (managed database), `APP_ENV=production`,
`APP_DEBUG=false`, generated `APP_SECRET_KEY`, generated `JWT_SECRET_KEY`,
`FRONTEND_URL`, `AI_PROVIDER=mock`, `DB_POOL_SIZE=3`, and
`DB_MAX_OVERFLOW=2`.

Web: `NEXT_PUBLIC_USE_MOCK_API=false` and
`NEXT_PUBLIC_API_BASE_URL=https://<api-service>.onrender.com`.

`DATABASE_URL`, `APP_SECRET_KEY`, and `JWT_SECRET_KEY` are never exposed to
the browser. The two public URL values are build-time web configuration.

## Verification status

The six-revision Alembic chain generated PostgreSQL offline DDL and completed
SQLite upgrade/downgrade/upgrade verification. Operation Meridian seeding was
run twice against a throwaway database with stable counts: one investigation,
six entities, four relationships, four evidence items, two findings, three
events, one note, three datasets, three ingestion jobs, four users, and eight
custody entries. No audit rows were created by idempotent seeding.

The complete backend suite passed with 235 tests and eight pre-existing
deprecation warnings. Ruff and Python compilation passed. The complete
frontend suite passed with 84 Jest suites and 689 tests; TypeScript and ESLint
passed. Next.js production builds passed in both mock and API modes, with one
pre-existing custom-font warning.

Existing API tests cover authentication, invalid/missing bearer tokens, role
permissions, investigation-scoped resource access, ingestion, graph,
analytics, patterns, timeline, grounded AI, evidence integrity, custody
verification, and Operation Meridian compatibility.

## Live deployment boundary

Live Render credentials and a reachable managed PostgreSQL instance were not
available in this environment. Therefore live Blueprint deployment, live
PostgreSQL connectivity, browser-to-Render API traffic, and production
ingestion against Render are **PENDING**. The repository is prepared for that
sequence in `docs/RENDER_DEPLOYMENT.md`.

## Storage limitation

Evidence metadata, checksums, provenance, and custody hashes are persisted in
PostgreSQL. Raw payload bytes currently use the existing filesystem storage
abstraction; Render filesystems are ephemeral. Durable object storage is
documented as a later limitation and was not implemented in Phase 18.5.

## Phase boundary

Phase 18.6 was not started.
