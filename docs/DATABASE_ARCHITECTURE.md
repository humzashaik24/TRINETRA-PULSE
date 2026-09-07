# Database Architecture (Phase 14.3)

Trinetra Pulse persists to **PostgreSQL** in production via SQLAlchemy 2.x
(async) with **Alembic** migrations, seeded with the Operation Meridian demo
universe (`inv-006`). A portable type layer also lets tests and local
verification run on SQLite.

```
API (app/api/routers)
   → Service (app/services/real/*)
   → Repository (app/repositories/*)
   → SQLAlchemy 2 async
   → PostgreSQL (SQLite in tests / local override)
```

---

## Connection & config

- `Settings.database_url` (`apps/api/app/core/config.py`): an explicit
  `DATABASE_URL` wins; otherwise `POSTGRES_*` components compose
  `postgresql+asyncpg://…`.
- `Settings.database_url_sync`: Alembic's synchronous URL (strips `+asyncpg` /
  `+aiosqlite` driver segments).
- `app/db/session.py`: `create_async_engine` + `async_sessionmaker`
  (`expire_on_commit=False`). FastAPI dependency `get_session` in
  `app/api/deps.py`.
- **Portable types** (`app/db/types.py`): `Uuid` (native `UUID` on PG,
  `CHAR(32)` on SQLite) and `JSONB` TypeDecorator (true `JSONB` on PG,
  generic `JSON` elsewhere).

---

## Schema (16 tables)

| Table | Model | Notes |
|---|---|---|
| `investigations` | `Investigation` | status/priority enums, assigned_team, tags |
| `entities` | `Entity` | investigation-scoped; `entity_type` enum |
| `relationships` | `Relationship` | investigation-scoped; source/target FKs |
| `findings` | `InvestigationFinding` | investigation-scoped |
| `evidence` | `InvestigationEvidence` | investigation-scoped; `storage_ref` → payload store |
| `events` | `InvestigationEvent` | investigation-scoped |
| `investigation_notes` | `InvestigationNote` | investigation-scoped |
| `data_sources` | `DataSource` | catalog of import sources |
| `datasets` | `Dataset` | investigation-scoped; links a `DataSource` |
| `ingestion_jobs` | `IngestionJob` | investigation-scoped; per-dataset |
| `cases` | `Case` | legacy case module |
| `case_evidence` | `Evidence` | legacy case evidence module |
| `incidents` | `Incident` | legacy |
| `entity_resolutions` | `EntityResolution` | resolution graph |
| `evidence_entity_links` | `EvidenceEntityLink` | links evidence ↔ entities |
| `data_provenance` | `DataProvenance` | provenance trail |

> **Organization / User**: Phase 14.2 deliberately models organization as an
> `entity_type` (`Entity.entity_type = ORGANIZATION`) and identity as a
> `CurrentUser` dependency (`app/api/deps.py`), rather than inventing
> dedicated `organization`/`users` tables. This preserves the established
> schema and domain contracts — no unnecessary tables are created.

## Investigation scoping & isolation

Every investigation-owned resource (entities, relationships, findings,
evidence, events, notes, datasets, ingestion jobs) carries an
`investigation_id` FK (cascade delete). Repositories expose
`list_for_investigation(inv_id, …)` / `count_for_investigation(inv_id)`, and
services resolve the investigation first. This guarantees no cross-investigation
leakage — e.g. listing entities under `inv-006` never returns another
investigation's rows (covered by `tests/test_investigation_isolation.py`).

---

## Migrations (Alembic)

- Config: `apps/api/alembic.ini` + `apps/api/alembic/env.py` (URL from
  `Settings.database_url_sync`; imports all models; portable `JSONB` render).
- Revisions under `apps/api/alembic/versions/`:
  - `029f568507fd_initial_schema` — base 13 tables.
  - `a1b2c3d4e5f6_add_datasets` — `data_sources`, `datasets`,
    `ingestion_jobs` (→ 16 tables).
- From an **empty** database:

```bash
cd apps/api
DATABASE_URL="<postgres url>" python -m alembic upgrade head
```

Verified to generate clean PostgreSQL DDL in offline mode and to apply on
SQLite; designed to be applied against a fresh Render PostgreSQL.

> Generation of new migrations must go through Alembic. `Base.metadata.create_all`
> exists only inside `app.db.seed` for one-shot fresh-demo convenience and is
> **not** a production migration path.

---

## Seed — Operation Meridian (`inv-006`)

`app/db/seed.py` deterministically seeds the canonical demo universe. Every id
is `uuid5(uuid.NAMESPACE_DNS, "trinetra::<cid>")` from the legacy demo string
ids, so the database reproduces the same universe the demo shows:

- `investigations`: 1 (`inv-006`, Operation Meridian, ACTIVE/HIGH)
- `entities`: 6 — Rahul Kumar, Mumbai Trading Corp, Vikram Patel, bank account,
  transaction `TXN-2026-0482`, phone `+91 98765 43210`
- `relationships`: 4, `evidence`: 4, `findings`: 2, `events`: 3, `notes`: 1
- `datasets`: 3 (ds-001 FIR Records, ds-002 CDR Extract, ds-003 Bank Transaction
  Log), `ingestion_jobs`: 3 (all completed)

Idempotent (`force` + `cleanup_seed_investigation`). Run standalone:

```bash
cd apps/api
DATABASE_URL="<postgres url>" python -m app.db.seed
```

---

## Development without Docker

Docker has been **fully removed** from the repository (Phase 14.4). Everything
runs on native runtimes. Point `DATABASE_URL` at any PostgreSQL (a local native
install or a managed Render PostgreSQL), or use the SQLite override for
lightweight local checks:

```bash
# Lightweight (temporary SQLite) — for local iteration / tests
DATABASE_URL=sqlite+aiosqlite:///./trinetra.db python -m alembic upgrade head
DATABASE_URL=sqlite+aiosqlite:///./trinetra.db python -m app.db.seed
```

Two terminals — frontend (mock mode needs no database) and backend:

```text
Terminal 1 (API):  cd apps/api && uvicorn app.main:app --reload --port 8000
Terminal 2 (Web):  cd apps/web && npm run dev
```

There is no `docker-compose.yml` and no Docker requirement. The previous
optional local PostgreSQL/Neo4j/Redis stack was removed; production runs
entirely on Render (native Node + native Python + managed PostgreSQL).
