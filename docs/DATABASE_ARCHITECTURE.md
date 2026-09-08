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
  `postgresql+asyncpg://…`. Since Phase 17.10 a bare `postgres://` or
  `postgresql://` connection string (exactly what Render's managed database
  exposes) is normalized to `postgresql+asyncpg://…` for the async engine.
- `Settings.database_url_sync`: Alembic's synchronous URL (strips `+asyncpg` /
  `+aiosqlite` driver segments, normalizes `postgres://` → `postgresql://`);
  requires the `psycopg2` driver (in `requirements.txt` since Phase 17.10).
- `app/db/session.py`: `create_async_engine` + `async_sessionmaker`
  (`expire_on_commit=False`). Pool sizing is configurable via `DB_POOL_SIZE` /
  `DB_MAX_OVERFLOW` (defaults 5/5; `render.yaml` sets 3/2 for free-tier
  PostgreSQL connection limits). FastAPI dependency `get_session` in
  `app/api/deps.py`.
- **Portable types** (`app/db/types.py`): `Uuid` (native `UUID` on PG,
  `CHAR(32)` on SQLite) and `JSONB` TypeDecorator (true `JSONB` on PG,
  generic `JSON` elsewhere).

---

## Schema (19 tables)

| Table | Model | Notes |
|---|---|---|
| `investigations` | `Investigation` | status/priority enums, assigned_team, tags |
| `entities` | `Entity` | investigation-scoped; `entity_type` enum |
| `relationships` | `Relationship` | investigation-scoped; source/target FKs |
| `findings` | `InvestigationFinding` | investigation-scoped |
| `evidence` | `InvestigationEvidence` | investigation-scoped; `storage_ref` → payload store; SHA-256 `checksum` kept in the `metadata` JSONB (Phase 17.6) |
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
| `users` | `User` | Phase 18.1 — auth identities (email unique, bcrypt password, `UserRole`) |
| `auth_audit_events` | `AuthAuditEvent` | Phase 18.1 — login/Permission/evidence-chain audit trail |
| `evidence_chain_entries` | `EvidenceChainEntry` | Phase 18.2 — per-evidence SHA-256 chain of custody |

> **Evidence chain of custody (Phase 18.2).** `evidence_chain_entries` is the
> tamper-evident, per-evidence hash chain — **deliberately NOT a blockchain**
> (relational, replayable from PostgreSQL only; no distributed ledger). Every
> lifecycle transition (create, upload, access, verification, metadata update,
> export) appends a link: `payload_hash` (canonical evidence row + metadata
> JSON), `metadata_hash`, `previous_entry_hash` (pins the link to its
> predecessor), and `entry_hash = SHA-256(previous:sequence:action:payload:
> metadata)`. `UNIQUE (evidence_id, sequence_number)` preserves ordering; FKs to
> `evidence` + `investigations` cascade on delete; the verifier replays the
> chain **and** recomputes the live payload checksum, so post-hoc edits report
> `TAMPERED` and deleted/missing links report `BROKEN_CHAIN`. `action` is a
> plain `VARCHAR(32)` (no server-side enum/CHECK) → identical semantics on
> SQLite/PostgreSQL.

> **Phase 18.4 hardening.** The custody ledger is a permissioned, relational,
> SHA-256 hash-linked tamper-evident evidence chain. It is not a public
> blockchain. Entries use a deterministic `GENESIS` link, canonical metadata,
> authoritative evidence checksums, actor snapshots, and event timestamps.
> Verification recomputes hashes and links; the focused follow-up migration
> backfills timestamps for existing PostgreSQL rows.

> **Phase 18.6 storage.** Raw payload bytes are outside PostgreSQL and are
> addressed through the existing `EvidenceStorage` abstraction. Metadata,
> `storage_ref`, checksums, provenance, and custody hashes remain relational.
> Production uses an operator-configured S3-compatible bucket; no database
> table or migration was added.

> **Identity model**: Phase 14.2 modeled organization as an `entity_type`
> (`Entity.entity_type = ORGANIZATION`) and operators via the `CurrentUser`
> dependency rather than inventing tables. Phase 18.1 superseded only the
> operator half of that with a real `users` table (`User`, bcrypt-hashed
> passwords) + `auth_audit_events`, while organization-as-entity_type remains
> the domain contract. No unnecessary tables were created.

## Investigation scoping & isolation

Every investigation-owned resource (entities, relationships, findings,
evidence, events, notes, datasets, ingestion jobs) carries an
`investigation_id` FK (cascade delete). Repositories expose
`list_for_investigation(inv_id, …)` / `count_for_investigation(inv_id)`, and
services resolve the investigation first. This guarantees no cross-investigation
leakage — e.g. listing entities under `inv-006` never returns another
investigation's rows (covered by `tests/test_investigation_isolation.py`).

## Integrity metadata (Phase 17.6)

Every persisted `evidence` row carries an `integrity` JSONB block:
`{"checksum": "<sha256 hex>", "status": "VERIFIED"}`. The checksum is the
SHA-256 digest of a **canonicalised evidence payload** (title, description,
evidence type, collected date, canonical provenance fields), computed by
`app/services/evidence_integrity.py` at write time through the service layer
(the row's `integrity`), and by `app/storage/evidence_storage.py` over the
payload blob at ingestion (so a tampered blob mismatches the row checksum).
Canonicalisation normalises datetimes (naive UTC, microsecond-trimmed) so the
digest is stable across SQLite/PostgreSQL datetime round-trips. It is surfaced
by `GET /api/v2/evidence/{id}/integrity` and as a per-row `integrity` field on
the nested evidence list.

---

## Migrations (Alembic)

- Config: `apps/api/alembic.ini` + `apps/api/alembic/env.py` (URL from
  `Settings.database_url_sync`; imports all models; portable `JSONB` render).
- Revisions under `apps/api/alembic/versions/`:
  - `029f568507fd_initial_schema` — base 13 tables.
  - `a1b2c3d4e5f6_add_datasets` — `data_sources`, `datasets`,
    `ingestion_jobs` (→ 16 tables).
  - `b2c3d4e5f6a7_extend_provenance` — `data_provenance` gains
    `investigation_id` / `dataset_id` / `ingestion_job_id` FKs and `checksum`
    (investigation scoping + integrity). Uses `op.batch_alter_table` so the
    constraint DDL applies on both SQLite (batch table rebuild) and PostgreSQL
    (passthrough).
  - `c4d5e6f7a8b9_add_users_auth_audit` — `users` + `auth_audit_events`
    (Phase 18.1, → 18 tables).
  - `d5e6f7a8b9c0_add_evidence_chain_entries` — `evidence_chain_entries`
    (Phase 18.2, → 19 tables).
- From an **empty** database:

```bash
cd apps/api
DATABASE_URL="<postgres url>" python -m alembic upgrade head
```

Verified to generate clean PostgreSQL DDL in offline mode and to apply on
SQLite; designed to be applied against a fresh Render PostgreSQL. Phase 18.1/18.2:
`alembic upgrade head` re-verified against a fresh DB (**19 model tables** +
`alembic_version`; Phase 18.1 added `users` + `auth_audit_events`, Phase 18.2
added `evidence_chain_entries`) and `alembic upgrade head --sql` re-generated
valid PostgreSQL DDL. All **five** revisions are **additive** (create → add
datasets → extend provenance → auth tables → evidence chain) — no destructive
migration exists.

> On Render, `render.yaml` configures the API service's `preDeployCommand` to
> run `python -m alembic upgrade head` before every deploy, so the managed
> PostgreSQL schema is always current. Still, **live PostgreSQL verification
> remains pending** (Phase 17.10 could not reach a managed database from the
> working environment).

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
