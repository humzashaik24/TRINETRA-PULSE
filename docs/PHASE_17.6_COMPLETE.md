# PHASE 17.6 COMPLETE

## Objective & scope

Move the **Evidence Intelligence** surfaces (Phase 12 UI + grounded retrieval) from the
mock/in-memory universe onto the **real persisted `/api/v2` path** — Frontend → typed API
client → FastAPI `/api/v2` → InvestigationService → repository → PostgreSQL metadata →
`EvidenceStorage` payload layer — while keeping mock mode (`NEXT_PUBLIC_USE_MOCK_API=true`)
fully intact, and adding a **SHA-256 integrity block** to every persisted evidence row as the
cryptographic foundation for a later chain-of-custody / blockchain phase.

Data-source gating follows the rest of the Phase 17 series: `isMockData()` selects the
source; the two are **never mixed** and there is **no silent API→mock fallback** — an API
failure surfaces the store error state, never fabricated demo rows.

## What was built

### Backend (apps/api)

- **Scoped evidence reads** — `InvestigationService.get_evidence_scoped` + `evidence`
  router: `GET /api/v2/evidence/{id}?investigation_id=…` (404s when the scope does not
  match) and `GET /api/v2/evidence/{id}/integrity` returning `{checksum, status}`. The
  nested `GET /investigations/{id}/evidence` list now returns a per-row `integrity` block.
- **SHA-256 integrity** (`services/evidence_integrity.py`) — deterministic digest over a
  **canonical** payload (title / description / evidence type / date / canonical provenance
  fields, naive-UTC microsecond-trimmed datetimes so the digest survives SQLite/PostgreSQL
  datetime round-trips). Computed at create time (`create_evidence`) and verified against
  the deterministic blob digest in `EvidenceStorage` at ingestion; tampered payloads are
  detected (`test_checksum_verification_mismatch`).
- **Storage digest** — `EvidenceStorage.save` attaches a deterministic SHA-256 context to
  the payload blob.
- **Seed** — all four Operation Meridian evidence rows (ev-001 FIR, ev-004 CDR,
  ev-007 "GST registration", ev-009 flagged transfer) get checksums and verify **VALID**.

### Frontend (apps/web)

- **`lib/api/evidence.ts`** — typed client re-using the existing `apiFetch` (no second HTTP
  layer): `getEvidenceById`, `getEvidenceIntegrity`, `loadEvidenceSearch`, the
  Operation Meridian demo anchors, `mapEvidenceItem`/`mapEvidenceSource` (persisted
  `RealEvidence` → Phase 12 `EvidenceItem`/`EvidenceSource`, checksum → `provenance.hash` +
  `integrity {checksum,status}`), and the deterministic filter/sort/paginate/facet search
  semantics over the API row set.
- **`evidence.store.ts`** — list/detail/selection branch on `isMockData()`; coverage,
  relationship/finding support, entity summaries and collections return **honestly empty**
  arrays in API mode.
- **Surfaces** — workspace demo anchors resolve to Operation Meridian ids in API mode;
  Context Inspector evidence resolution (`inspector.service.ts`), the grounded-retrieval
  panel, and the network evidence mode all branch on `isMockData()`.
- **Types** — optional `EvidenceItem.integrity` (`packages/types`); `RealEvidence.integrity`
  + `RealEvidenceIntegrity` (`investigations.ts`).
- **Detail panel** — surfaced integrity status + content hash beside provenance.

## Non-goals (explicitly not done)

No blockchain / web3 / wallets / smart contracts, no RBAC or auth rewrite, no anomaly
detection / scoring / agents, no Neo4j / Redis / Docker, no S3 / Azure / GCS storage, no new
engines, no UI redesign. Cryptographic integrity only **prepares** the foundation for a later
chain-of-custody phase.

## Phase 17.7 boundary (exact)

Validated, explicitly deferred to Phase 17.7, and kept **honest** (empty result sets, never
fabricated from mock):

- Relational **evidence↔entity / finding / event link endpoints** (`evidence_entity_links`
  exists in-schema but there is no joined API read surface yet).
- Consequently, in API mode: `EvidenceItem.links` / `versions` / `timeline` and
  `EvidenceSource.entityIds` / `findingIds` / `eventIds`, plus the coverage /
  relationship-support / finding-support / entity-summary / collections slices are `[]`.
- Non-modeled search filters (statuses, datasets, tags, entity/finding/event ids, date
  range, extraction methods) **match nothing** rather than fabricating results.

## Verification

### Backend (SQLite override — Windows native, no Docker/PostgreSQL provisioned)
- `pytest` full suite: **154 passed, 1 warning** (StarletteDeprecationWarning only).
- Evidence suite: `test_evidence_api.py` + `test_evidence_storage.py` + `test_db_seed.py`
  = **27 passed** (14 integrity + 15 API + seed/checksum).
- `ruff check .`: **All checks passed**.

### Frontend
- `tsc --noEmit`: clean. `eslint`: clean (1 pre-existing font warning).
- `jest`: **68 suites / 584 tests** — mock regression intact + new
  `lib/api/evidence.test.ts` (mapping, integrity surfacing, fetch layer, search semantics,
  honest empty-state semantics) + `state/evidence.store.api.test.ts` (API routing, failure
  → error state with no mock fallback, empty coverage/support, investigation-switch reload).
- `next build`: green (20 routes).

### Database / migrations
- **Fixed a latent defect**: `alembic/versions/b2c3d4e5f6a7_extend_provenance.py` had
  invalid `create_foreign_key` signatures (missing `remote_cols`) and
  non-SQLite-compatible constraint ALTERs, so `alembic upgrade head` crashed on SQLite.
  Rewritten with `op.batch_alter_table` (SQLite batch rebuild, PostgreSQL passthrough).
- `alembic upgrade head`: **applies cleanly** on a fresh SQLite DB (3 revisions → 16 tables).
- Seed: Operation Meridian reproduces; all 4 evidence rows verified **VALID** against stored
  checksums.
- `alembic upgrade head --sql`: generates **clean PostgreSQL DDL** (49 statements).
- Alembic re-applied green after the migration fix; full backend suite still green.

## Honest database verification status

- **SQLite: verified end-to-end** (migrate → seed → checksums → verify).
- **PostgreSQL: DDL verified offline** (`--sql` renders valid DDL; the batch-mode
  migration is a passthrough on PostgreSQL). **Live PostgreSQL / Render deploy: PENDING** —
  no PostgreSQL instance is provisioned in this working environment. Render uses an
  ephemeral filesystem, so document that local-disk `EvidenceStorage` payloads are
  non-durable there (metadata + integrity live in PostgreSQL regardless).

## File tracking (Phases 17.6; repo is NOT a git repo)

- New: `docs/PHASE_17.6_COMPLETE.md`, `apps/web/src/lib/api/evidence.ts`,
  `apps/web/src/lib/api/evidence.test.ts`, `apps/web/src/state/evidence.store.api.test.ts`.
- Modified: `apps/api/app/services/evidence_integrity.py`,
  `apps/api/app/services/real/investigation.py`, `apps/api/app/api/routers/evidence.py`,
  `apps/api/app/api/routers/investigation_resources.py`,
  `apps/api/app/schemas/real/investigation.py`, `apps/api/app/storage/evidence_storage.py`,
  `apps/api/app/db/seed.py`, `apps/api/tests/test_evidence_api.py`,
  `apps/api/tests/test_evidence_storage.py`, `apps/api/tests/test_db_seed.py`,
  `apps/api/alembic/versions/b2c3d4e5f6a7_extend_provenance.py`,
  `packages/types/src/evidence-intelligence.ts`,
  `apps/web/src/lib/api/investigations.ts`, `apps/web/src/state/evidence.store.ts`,
  `apps/web/src/components/evidence/evidence-workspace.tsx`,
  `apps/web/src/components/evidence/evidence-detail-panel.tsx`,
  `apps/web/src/components/evidence/retrieval/evidence-retrieval-panel.tsx`,
  `apps/web/src/components/evidence/network/network-evidence-mode.tsx`,
  `apps/web/src/services/inspector.service.ts`,
  `docs/EVIDENCE_INTELLIGENCE.md`, `docs/REAL_APPLICATION_ARCHITECTURE.md`,
  `docs/DATABASE_ARCHITECTURE.md`, `docs/README.md`.
- Audit copy for cross-checking: `C:\SIH\trinetra-pulse-audit`.

## Out of scope (unchanged)

Autonomous agents / agentic investigation, suspect ranking, guilt/criminality scoring,
predictive policing, automated enforcement, Phase 17.7 relational links, blockchain phase
(now foundation-ready), Phase 16-adjacent features.