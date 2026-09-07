# PHASE 21 — Blockchain Evidence Integrity Anchoring

## Status: COMPLETE

Delivers a deterministic, tamper-evident blockchain integrity anchoring layer for evidence custody records. The platform derives a local SHA-256 checksum and a replayable custody chain hash for each evidence item and optionally anchors that hash on an abstracted EVM-compatible blockchain. Raw evidence and personally identifiable information never leave the platform.

All language remains deliberately neutral: the anchor proves a cryptographic digest existed on-chain at a point in time; it never asserts the truthfulness of evidence content, nor does it infer guilt or innocence.

## Summary

### Backend

- New `app/evidence_integrity` package (`digest.py`, `ledger.py`, provider abstraction under `providers/`).
- `EvidenceBlockchainAnchor` model and Alembic migration (additive only — no legacy tables removed).
- `blockchain_provider` settings in `core/config.py` with server-side `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `BLOCKCHAIN_CONTRACT_ADDRESS` (never exposed to the client).
- Four `/evidence/{id}/*` endpoints: integrity, blockchain, anchor, verify.
- Mock provider (deterministic, clearly labeled `trinetra-mock-chain`) and a lazy-import real EVM provider via `web3`.
- Anchor is idempotent; changed state yields a conflict; auditors may verify but not anchor.

### Frontend

- Shared types in `packages/types/src/evidence-integrity.ts` (camelCase UI contracts).
- Typed API client and service (`services/evidence-integrity.service.ts`) with mock/real switch and seeded demo anchor for `ev-intel-001`.
- `EvidenceChainPanel` (three-layer visualisation: local checksum → custody hash chain → blockchain anchor), `EvidenceBlockchainPanel` (anchor status, network, tx, digest, anchor and verify actions, MOCK badge), and `EvidenceIntegritySection` (async data loader composed into `EvidenceDetailPanel`).

### AI Grounding

- New `BLOCKCHAIN_ANCHOR` query type, routed by anchor-specific keywords.
- Deterministic grounding answers derived strictly from the persisted integrity payloads; mock anchoring is disclosed explicitly in the response.
- Evidence context sources carry compact integrity payloads via `ContextBuilder`, bounded by the existing evidence budget.

### Security

- No secrets or PII on-chain. Only the 64-character digest crosses a provider boundary.
- Blockchain calls remain isolated from graph/analytics paths.
- `NEXT_PUBLIC_*` environment values stay client-safe; server-side provider credentials are excluded from the client build.

## Files (backend)

| File | Purpose |
|---|---|
| `apps/api/app/evidence_integrity/digest.py` | Canonical anchor digest and custody event hash derivation |
| `apps/api/app/evidence_integrity/ledger.py` | Derived, replayable custody chain (never persisted as a separate ledger) |
| `apps/api/app/evidence_integrity/providers/mock.py` | Deterministic mock anchor registry |
| `apps/api/app/evidence_integrity/providers/web3.py` | Real EVM provider (lazy `import web3`) |
| `apps/api/app/models/evidence_integrity.py` | `EvidenceBlockchainAnchor` ORM model |
| `apps/api/app/models/investigation.py` | `InvestigationEvidence.checksum` column |
| `apps/api/app/core/config.py` | `blockchain_*` settings |
| `apps/api/app/api/routers/evidence_integrity.py` | REST endpoints |
| `apps/api/app/services/real/evidence_integrity.py` | Core integrity, anchor, and verify service |
| `apps/api/app/schemas/real/evidence_integrity.py` | Wire schemas (snake_case) |
| `apps/api/alembic/versions/e5f6a7b8c9d0_evidence_blockchain.py` | Alembic migration |
| `apps/api/contracts/AnchorRegistry.sol` | Minimal Solidity anchor registry |
| `apps/api/tests/test_evidence_blockchain.py` | Backend tests (20 passing) |

## Files (frontend)

| File | Purpose |
|---|---|
| `packages/types/src/evidence-integrity.ts` | Shared integrity types (camelCase) |
| `packages/types/src/ai-investigation.ts` | `BLOCKCHAIN_ANCHOR` query type |
| `apps/web/src/lib/api/evidence-integrity.ts` | Typed API client (snake_case wire) |
| `apps/web/src/services/evidence-integrity.service.ts` | Mock/real bridge and demo seeding |
| `apps/web/src/components/evidence/evidence-chain-panel.tsx` | Three-layer integrity chain panel |
| `apps/web/src/components/evidence/evidence-blockchain-panel.tsx` | Anchor status and action panel |
| `apps/web/src/components/evidence/evidence-integrity-section.tsx` | Async integrity section |
| `apps/web/src/components/evidence/evidence-detail-panel.tsx` | Wired after Provenance |
| `apps/web/src/ai/query-router.ts` | Anchor keywords |
| `apps/web/src/ai/grounding.ts` | `answerBlockchainAnchor` |
| `apps/web/src/ai/context-builder.ts` | Integrity payload on evidence context |
| `apps/web/src/services/ai-investigation.service.ts` | Integrity enrichment for both paths |

## Verification

| Layer | Check | Status |
|---|---|---|
| Backend | `compileall` | COMPILE_OK |
| Backend | `from app.main import app` | IMPORT_OK |
| Backend | `ruff check` | clean |
| Backend | `alembic -c ... downgrade base` offline DDL | clean |
| Backend | SQLite `create_all` | anchor table + checksum column present |
| Backend | `pytest apps/api/tests/test_evidence_blockchain.py` | 20 passed |
| Backend | `pytest apps/api` | 209 passed |
| Frontend | `tsc --noEmit` | clean |
| Frontend | `next lint` | clean |
| Frontend | `jest` | 604 passed (74 suites) |
| Frontend | `next build` | clean |

## Demo

Open the detail view for evidence `ev-intel-001` (Operation Meridian FIR). The Blockchain Integrity section loads by default in mock mode and shows a pre-seeded, verified anchor on the `trinetra-mock-chain` registry. Anchoring and verification actions are available for additional evidence items.

> **Note:** All blockchain anchor states in mock mode are clearly labeled MOCK. The demo registry is an in-memory simulation, not a real blockchain.

## Required statement

Blockchain is used as an integrity anchor for evidence custody records. Raw evidence and personally identifiable information remain off-chain.