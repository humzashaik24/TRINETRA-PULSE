# PHASE 18.4 COMPLETE

## 1. Objective

Phase 18.4 hardens the existing persisted evidence custody feature into a
deterministic, investigation-scoped, append-only, tamper-evident audit chain.
This is a permissioned, relational, SHA-256 hash-linked tamper-evident
evidence chain. It is not a public blockchain.

## 2. Custody chain architecture

`evidence_chain_entries` stores one ordered ledger per evidence item. Each
entry records the investigation and evidence scope, controlled event type,
authenticated actor snapshot, event timestamp, authoritative evidence
checksum, canonical metadata digest, previous hash, and current entry hash.
The first entry links to the deterministic `GENESIS` marker. Evidence
creation and CSV ingestion append lifecycle entries through the existing
service boundary; clients cannot mass-assign custody records.

## 3. Hashing and verification

The existing evidence integrity service remains the sole source of the
evidence checksum. Metadata is serialized with sorted JSON keys and compact
separators. The entry digest is SHA-256 over a named, ordered canonical field
list containing the evidence ID, sequence, action, evidence hash, metadata
hash, previous hash, actor identity snapshot, and normalized UTC timestamp.

Verification recomputes every digest, checks the live evidence checksum,
sequence continuity, genesis/previous-link continuity, and returns structured
failure details, event counts, timestamps, and the chain head hash. Results
are `VALID`, `TAMPERED`, `BROKEN_CHAIN`, `MISSING`, or `INVALID_SCOPE`.

## 4. API, RBAC, and isolation

The existing endpoints remain the integration surface:

- `GET /api/v2/evidence/{evidence_id}/chain`
- `GET /api/v2/evidence/{evidence_id}/chain/verify`
- `POST /api/v2/evidence/{evidence_id}/chain/verify`

All operations first resolve the evidence through the investigation-scoped
service. Scope mismatches use the established safe not-found behavior.
Existing authenticated investigator, supervisor, administrator, and auditor
dependencies are reused; verification does not trust client-supplied actor,
hash, timestamp, or status values.

## 5. Frontend and mock mode

`EvidenceChainPanel` now presents a Tamper-Evident Evidence Chain, event
timestamps, actor, event type, and a collapsible technical view of evidence,
previous, metadata, and current hashes. Verify Chain displays the backend
result and structured failure state. Context Inspector continues to consume
the same real custody summary.

Mock mode does not fabricate hashes or verification results and states that
the chain is available when connected to the backend. API mode has no
fallback to mock custody data.

## 6. Database and deployment

The focused Alembic revision adds and backfills `event_timestamp` for existing
rows. The design remains compatible with SQLite test execution and PostgreSQL
Render deployment. No Docker, blockchain node, Redis, Neo4j, or external
service is required. Live Render/PostgreSQL execution remains dependent on
deployment access; local verification uses the repository's SQLite override
and PostgreSQL offline DDL generation.

## 7. Verification

The focused evidence-chain tests, frontend type checks, frontend chain-panel
tests, full backend/frontend suites, linting, and mock/API production builds
were run for this phase. Operation Meridian seed and ingestion compatibility
remain covered by the custody tests.

## 8. Phase boundary

Phase 18.5 was not started.
