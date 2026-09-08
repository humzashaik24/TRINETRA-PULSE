# PHASE 18.2 COMPLETE

## 1. Objective

Add a tamper-evident **chain of custody** for every persisted evidence item:
a relational, per-evidence SHA-256 hash chain appended on each lifecycle
transition (create, upload, access, verification, metadata update, export),
with read + verification endpoints, RBAC-aware UI, seed coverage and tests.

```
Evidence item -> SHA-256 hash chain (relational, per-evidence)
                   -> genesis link on create
                   -> link appended on every lifecycle transition
                   -> live verifier replays chain: VALID / TAMPERED / BROKEN_CHAIN / MISSING
                   -> read endpoint (GET) + audited verify endpoint (POST)
                   -> detail panel + compact inspector view in the web app
```

**This is deliberately NOT a public blockchain.** No distributed ledger, no
consensus, no nodes, no tokens. Chain integrity rests on deterministic
SHA-256 of the evidence row + sequence + previous link stored in **PostgreSQL**
alongside the evidence — single source of truth, queryable and auditable like
any other row in the schema.

**Do NOT start Phase 18.3** — no anomaly detection, no autonomous agents, no
Neo4j/Redis expansion, no Docker, no transactions. Mock mode and the Operation
Meridian (inv-006) demo stay byte-for-byte functional.

## 2. Files created

**Backend**

- `apps/api/app/models/evidence_chain.py` — `EvidenceChainEntry` model
  (`evidence_chain_entries` table: UUID ids, FK `evidence_id` +
  `investigation_id` `ON DELETE CASCADE`, `sequence_number NOT NULL`,
  `action VARCHAR(32)`, `payload_hash` / `metadata_hash` /
  `previous_entry_hash` / `entry_hash` VARCHAR(64), nullable `actor_id`
  (FK → users, SET NULL) + `actor_email` snapshot, JSON `details`,
  timestamps; `UNIQUE (evidence_id, sequence_number)`; unique index on
  `entry_hash`) and the `EvidenceChainAction` enum.
- `apps/api/app/services/evidence_integrity.py` — canonical hashing:
  `compute_checksum(evidence_row, metadata)` (SHA-256 over canonical fields +
  metadata JSON, stable across renders) and `compute_metadata_hash(...)`.
- `apps/api/app/services/evidence_chain.py` — `EvidenceChainService`
  (`append` with centralized actor resolution, `list_chain`) and
  `EvidenceChainVerifier` (`verify(evidence)` replays the chain live,
  `verify_entries(entries, expected_payload_hash=...)`).
- `apps/api/app/schemas/real/evidence_chain.py` — `EvidenceChainEntryRead`,
  `EvidenceChainVerifyRead`.
- `apps/api/alembic/versions/d5e6f7a8b9c0_add_evidence_chain_entries.py` —
  additive revision; the migration chain is now **5 revisions** ending at
  `d5e6f7a8b9c0`. `action` is a plain `VARCHAR(32)` — a **plain string, no
  CHECK/enum constraint**, so the column stores exactly what the ORM writes on
  both SQLite and Postgres (no enum-name-vs-value mismatch).
- `apps/api/app/api/routers/evidence.py` — chain endpoints (see §4).
- `apps/api/tests/test_evidence_chain.py` — **20 tests** (see §10).

**Frontend**

- `apps/web/src/components/evidence/evidence-chain-panel.tsx` — custody chain
  panel (status badge, link list with short hashes, technical details
  breakdown, audited Verify action, honest mock-mode/empty/error states).
- `apps/web/src/components/evidence/evidence-chain-panel.test.tsx` — panel
  component tests (6).
- `apps/web/src/services/inspector.service.evidence.api.test.ts` — evidence
  context in API mode with compact custody summary (3).
- `docs/PHASE_18.2_COMPLETE.md` — this report.

## 3. Files modified

**Backend**

- `apps/api/app/models/__init__.py`, `apps/api/app/models/user.py` — export the
  chain model; `AuthAuditAction` gains `evidence_chain_created`,
  `evidence_chain_verified`, `evidence_chain_verify_failed`.
- `apps/api/app/models/investigation.py` — relationship to
  `EvidenceChainEntry` (cascade delete).
- `apps/api/app/services/real/investigation.py` (`create_evidence`) and
  `apps/api/app/services/real/ingestion.py` (`_create_evidence`) — both now
  delegate the `EvidenceChainService.append` genesis link, passing actor
  identity; actor resolution is centralized inside `append` (a real user row is
  used when `actor_id` matches, otherwise the email is snapshotted — defense in
  depth, never a dangling FK).
- `apps/api/app/api/deps.py` — no change needed (existing `CurrentUserDep` /
  `CanMutateDep` reused).
- `apps/api/app/db/seed.py` — idempotently **blocks existing seeded evidence**
  (genesis chain entries + integrity hash) and seeds CDR coverage evidence.
- `apps/api/alembic/env.py` — registers `EvidenceChainEntry`.
- Tests: `apps/api/tests/test_db_seed.py` (chain assertions), existing suites
  already wired through `auth_stubs.py`.

**Frontend**

- `packages/types/src/evidence-intelligence.ts` (+ `index.ts` re-export) —
  `EvidenceChainAction` + `EVIDENCE_CHAIN_ACTIONS`, `EvidenceChainStatus`
  (`VALID` / `TAMPERED` / `BROKEN_CHAIN` / `MISSING`), `EvidenceChainEntry`,
  `EvidenceChainVerification`, `EvidenceCustodySummary`.
- `apps/web/src/lib/api/evidence.ts` — client fns `getEvidenceChain` (GET),
  `getEvidenceChainVerification` (GET, read-only), `recordEvidenceChainVerification`
  (POST, audited).
- `apps/web/src/state/evidence.store.ts` — chain slice (`chain`,
  `chainVerification`, `chainLoading`, `chainError`, `chainAvailable`),
  `fetchChain` / `verifyChain` / `resetChain`, wired into `setInvestigationId`,
  `selectItem`, `fetchItem`, `clear`. **Mock mode never fabricates a chain** —
  `chainAvailable` stays `false` and the UI says so.
- `apps/web/src/components/evidence/evidence-detail-panel.tsx` — mounts the
  panel as the final "Custody chain" section.
- `apps/web/src/services/inspector.service.ts` — `InspectorEvidenceView` gains
  optional `custodyChain`; the evidence API branch attaches a compact summary
  from read-only verification only (absent, never guessed, on failure).
- `apps/web/src/components/shell/inspector/context-views.tsx` — `EvidenceContextView`
  renders the compact custody section with a status badge + link count.
- Tests: `apps/web/src/lib/api/evidence.test.ts` (+4 chain tests),
  `apps/web/src/state/evidence.store.api.test.ts` (chain slice: fetch, atomic
  reset, audited verify, selection/investigation reset; +6),
  `apps/web/src/state/evidence.store.test.ts` (mock-mode honesty; +1).

## 4. API surface

| Endpoint | Auth | Behaviour |
|---|---|---|
| `GET /api/v2/evidence/{id}/chain?investigation_id=` | any authenticated (incl. auditor) | full custody chain, oldest → newest |
| `GET /api/v2/evidence/{id}/chain/verify` | any authenticated (incl. auditor) | **read-only** verification — NEVER writes an audit event |
| `POST /api/v2/evidence/{id}/chain/verify` | any authenticated | verification + **audited** outcome (`evidence_chain_verified` / `evidence_chain_verify_failed`) |
| `POST /api/v2/evidence` | can-mutate | genesis `evidence_chain_created` audit event (folded into the request transaction) |

Evidence detail / chain reads are scoped by `investigation_id`: a chain
request for an evidence id that does not belong to the investigation returns
404 (no cross-investigation existence leak), same contract as evidence detail.

## 5. Chain construction

For evidence row `E`, entry `N`:

```
payload_hash   = SHA-256(canonical(E) | metadata_json)
metadata_hash  = SHA-256(metadata_json_canonical)
previous       = entry_hash of link N-1 ('' for the genesis link)
entry_hash     = SHA-256(f"{previous}:{sequence}:{action}:{payload_hash}:{metadata_hash}")
```

- `previous_entry_hash` pins every link to its predecessor → an unhashable
  state requires rewriting the whole chain from the touched link onward.
- The verifier replays the chain **and recomputes the live payload checksum**
  from the current evidence row — editing the evidence after the fact (e.g.
  changing its title/body) makes it TAMPERED even if the stored links were not
  touched.
- Deterministic across API renders: integrity checksum is data-only, so the
  row fetched after a create verifies against the genesis payload hash.
- Chain rows **share the evidence ownership scope** (evidence FK cascades),
  keeping cleanup correct when an investigation/evidence is deleted.

## 6. Chain actions

`evidence_created` (genesis — interactive API + ingestion),
`evidence_uploaded`, `evidence_accessed`, `evidence_verified`,
`evidence_metadata_updated`, `evidence_exported` — stored as plain strings in
`VARCHAR(32)`, validated at the model/enum layer in Python.

## 7. Schema, migration & seed

- One new table: `evidence_chain_entries` (18 model tables → **19 tables**).
  FKs `ON DELETE CASCADE`; `UNIQUE (evidence_id, sequence_number)`; unique
  index on `entry_hash`.
- Migration verified on a fresh SQLite database (all **5 revisions** apply
  cleanly) and `alembic upgrade head --sql` regenerates valid **PostgreSQL
  DDL** — UUID columns, CASCADE FKs, the uniqueness constraints, and `action
  VARCHAR(32)` with **no server-side enum/CHECK**.
- Seed is idempotent: existing seeded evidence gets blocks + integrity hashes
  on top of the untouched Phase 12–18.1 demo universe; CDR coverage evidence is
  seeded. Seeded `ev-001 …` demo ids verify as VALID chains in the seed DB.

## 8. Frontend

- **Detail panel**: `EvidenceChainPanel` renders under the evidence's Activity
  timeline — status badge, per-link action/actor/timestamp with short hashes, a
  collapsible "Technical details" breakdown of payload/metadata/previous/entry
  hashes, and a "Verify chain" button that records an audited verification.
- **Inspector**: `EvidenceContextView` shows a compact custody section (status
  badge + link count + verified time) fed by the `custodyChain` summary the
  inspector service attaches in API mode.
- **Honesty contract**: in mock mode no fiscal chain exists and the panel says
  so; a failed read shows an explicit error, never a fabricated hash; the
  summary is left absent rather than guessed when verification is unavailable.
- **RBAC**: chain reads are available to every authenticated role (auditor can
  verify read-only); the audited re-verify is an authenticated POST.

## 9. RBAC matrix (Phase 18.2 delta)

| Surface | Gate | investigator | supervisor | admin | auditor |
|---|---|---|---|---|---|
| `GET /evidence/{id}/chain` | CurrentUser read-only | ✅ | ✅ | ✅ | ✅ |
| `GET /evidence/{id}/chain/verify` | CurrentUser read-only (no audit write) | ✅ | ✅ | ✅ | ✅ |
| `POST /evidence/{id}/chain/verify` | CurrentUser + audit record | ✅ | ✅ | ✅ | ✅ |
| `POST /evidence` genesis link + `evidence_chain_created` audit | CanMutate | ✅ | ✅ | ✅ | ❌ 403 |

## 10. Test results

- **Backend**: `pytest tests -q` → **227 passed** (was 207; +20 in
  `tests/test_evidence_chain.py`). `ruff check app tests` and `ruff format app
  tests` → clean. `alembic upgrade head` on a fresh SQLite DB → 5 revisions
  applied; offline PG DDL confirmed. The 20 new tests cover: genesis link on
  create (API + ingestion), sequence pinning, chain ordering, payload-hash
  recomputation catching title mutations (TAMPERED), link deletion
  (BROKEN_CHAIN), verify read-only vs audited POST (auit actions, auditor
  allowed), cross-investigation 404, invalid-scope 400, missing chain → MISSING
  with no audit, and idempotency of the seed block.
- **Frontend**: `tsc --noEmit` clean; `eslint` clean (1 pre-existing
  `no-page-custom-font` warning in `layout.tsx`); `jest` → **83 suites / 687
  tests** (was 81 / 667); `next build` green in **both** mock and
  `NEXT_PUBLIC_USE_MOCK_API=false` modes.

## 11. Mock mode and Operation Meridian

Unchanged. Mock mode still renders the full demo universe (inv-006) from
in-memory services; the custody chain is the only relational-only feature and
is honestly absent there (a fabricated chain of fake hashes would be
meaningless). All mock tests pass.

## 12. Kept honest / deferred

- **Not a blockchain.** The chain is a per-evidence SHA-256 hash chain in
  **PostgreSQL**, replayed by a verified auditor — there is no distributed
  ledger, consensus, nodes, tokens or mining of any kind.
- **Live Render deployment + live managed-PostgreSQL verification: PENDING**
  (no Render access). Postgres is exercised via the SQLite override and
  verified offline via `alembic upgrade head --sql`.
- Chain append points cover the real mutation paths that exist today
  (interactive create, ingestion, verification). `evidence_uploaded` /
  `evidence_accessed` / `evidence_exported` actions exist in the enum + UI
  labels; end-user-facing "access/export" one-shot buttons that would
  legitimately generate those links are not yet wired (no such workflows exist).
- Automatic periodic re-verification, chain compaction across REST runs, and
  cross-node signing are future work, not part of this phase.

## 13. Remaining work

- Perform the Blueprint deployment and verify migrations, seed (incl. the
  evidence chain blocking) and a real login → evidence → chain verify round
  trip against live managed PostgreSQL once Render access exists.
- **Phase 18.3 is explicitly NOT started.** The scope of this session is
  strictly Phase 18.2; nothing in this report should be read as Phase 18.3 work
  or intention.