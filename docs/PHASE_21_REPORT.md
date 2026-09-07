# PHASE 21 — FINAL REPORT
## Blockchain Evidence Integrity Anchoring

**Repository:** `C:\SIH\trinetra-pulse-audit` · **Date:** 2026-09-06 · **Status:** COMPLETE

---

## 1. Executive Summary

Phase 21 layers a deterministic, tamper-evident blockchain integrity anchoring mechanism onto the existing evidence architecture. Each evidence item receives a server-derived SHA-256 checksum and a replayable custody chain hash. These hashes are optionally anchored on an abstracted EVM-compatible blockchain through a provider abstraction that ships with a deterministic mock registry and a lazy-import real `web3` provider.

The deliverable spans the full stack: backend package, ORM model, Alembic migration, four REST endpoints, typed frontend API client, mock/real service bridge, three UI components, AI query routing, deterministic grounding, and comprehensive testing. All language is deliberately neutral: the anchor proves a cryptographic digest existed at a point in time; it never asserts truthfulness of evidence content, nor does it infer guilt or innocence.

## 2. Objective & Scope

The objective was to add a blockchain-based integrity anchoring layer for evidence custody records within 2 days before the SIH demo. The scope covers: cryptographic digest derivation, custody chain derivation, provider abstraction (mock + real EVM), REST API, frontend UI, AI grounding, tests, and documentation. Out of scope: live chain deployment, full authentication system, non-EVM chains, and real PII on-chain.

## 3. Design Principles

Five non-negotiable principles govern the entire implementation: (a) no PII or raw evidence on-chain — only a 64-character digest; (b) no secrets in `NEXT_PUBLIC_*` environment variables or client bundles; (c) mock anchoring is always clearly labeled MOCK; (d) verification states are honest — UNAVAILABLE is never called VERIFIED; (e) blockchain calls never appear in graph, analytics, or evidence read paths.

## 4. Custody Chain Architecture

The custody chain is derived, never persisted as a separate ledger. It is replayed deterministically from the evidence record and the anchor row. Each evidence item carries a derived `EVIDENCE_UPLOADED` event (sequence 1) with actor sourced from provenance metadata or defaulting to `system`. When a blockchain anchor exists, a `BLOCKCHAIN_ANCHORED` event (sequence 2) is appended. The anchor binds the custody chain head at sequence 1 (the state before the anchor event).

## 5. Cryptographic Specification

The anchor digest is computed as `SHA256(investigation_id.hex + evidence_id.hex + evidence_checksum + custody_chain_hash + str(sequence))` with version string `evidence-integrity-v1`. Each custody event hash is `SHA256((previous_event_hash or "") + str(sequence) + action + event_timestamp.isoformat() + evidence_checksum + metadata_hash + actor)`. Canonical JSON uses sorted keys and compact separators. The algorithm is deterministic and fully reproducible.

## 6. Blockchain Provider Abstraction

The `app/evidence_integrity/providers` package defines three modules: `__init__.py` (common `AnchorReceipt` and `ProviderHealth` dataclasses plus `resolve_provider`), `mock.py` (deterministic in-memory mock registry with class-level store persistence), and `web3.py` (lazy `import web3` with `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, and `BLOCKCHAIN_CONTRACT_ADDRESS` required). The provider is selected by `BLOCKCHAIN_PROVIDER` in `core/config.py` (default: `mock`). Real provider configuration is server-side only; no secrets reach the browser.

## 7. Solidity Contract Design

`apps/api/contracts/AnchorRegistry.sol` is a minimal registry storing `bytes32 digest → { exists, blockNumber, timestamp }`. The contract stores only the 64-character hash. No evidence payload, PII, or metadata is committed on-chain. The contract is designed for testnet deployment and is never invoked in mock mode.

## 8. Backend Package Layout

The `app/evidence_integrity` package contains `digest.py` (anchor digest and custody event hash functions), `ledger.py` (derived custody chain replay from evidence record plus anchor row), `__init__.py` (package exports), and `providers/` sub-package (mock, web3, provider interface). The service layer lives in `app/services/real/evidence_integrity.py`, the schemas in `app/schemas/real/evidence_integrity.py`, and the router in `app/api/routers/evidence_integrity.py`.

## 9. ORM Model & Migration

`EvidenceBlockchainAnchor` is the only persisted model for this feature (custody events are derived). It stores anchor ID, evidence ID, investigation ID, custody chain hash, anchor digest, network, provider, mock flag, status, transaction ID, block number, contract address, timestamps, and metadata. The `InvestigationEvidence` model gained a `checksum` column. Alembic migration `e5f6a7b8c9d0_evidence_blockchain.py` creates the anchor table and adds the checksum column. Downgrade cleanly drops both.

## 10. Configuration & Secrets Handling

`core/config.py` adds `blockchain_provider`, `blockchain_network`, `blockchain_rpc_url`, `blockchain_private_key`, `blockchain_contract_address`, `blockchain_chain_id`, and `blockchain_confirmations`. All sensitive values default to `""` and are read server-side only. They never appear in `NEXT_PUBLIC_*` variables, render.yaml, or client-side JavaScript. The web3 provider raises a clear `ProviderError` if required values are missing.

## 11. REST API Contract

Four endpoints are mounted under `/evidence` in `app/api/app.py`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/{id}/integrity` | Derived custody chain and checksum |
| GET | `/{id}/blockchain` | Full integrity + anchor + provider view |
| POST | `/{id}/blockchain/anchor` | Anchor the current digest (idempotent) |
| POST | `/{id}/blockchain/verify` | Verify digest against on-chain state |

All endpoints require `X-User-Id` (auth context). Auditors may read and verify but receive 403 on anchor. Conflict (409) is returned when the evidence checksum has changed since the last anchor.

## 12. Evidence Service Integration

The evidence integrity service in `app/services/real/evidence_integrity.py` integrates with `app/storage/evidence_storage.py` for checksum fallback (when the `checksum` column is empty) and with `app/api/errors.py` for structured error responses. The service derives the local integrity state, delegates to the provider for anchor/verify, and stamps `verified_at` on successful verification. The architecture is additive: no legacy evidence tables or relationships are modified.

## 13. Frontend Type System

`packages/types/src/evidence-integrity.ts` defines the shared camelCase UI contracts: `EvidenceIntegritySummary`, `EvidenceBlockchainAnchorView`, `EvidenceIntegrityProviderView`, `EvidenceBlockchainView`, `EvidenceAnchorResult`, `EvidenceVerifyResult`, `EvidenceCustodyEvent`, and `EvidenceIntegrityContextPayload`. The `AIQueryType` union in `ai-investigation.ts` gained `BLOCKCHAIN_ANCHOR`.

## 14. API Client & Mock/Real Service Bridge

`lib/api/evidence-integrity.ts` mirrors the backend wire format (snake_case) and exposes four typed fetch functions. `services/evidence-integrity.service.ts` bridges mock and real modes: in mock mode, it derives real SHA-256 digests via `crypto.subtle.digest` over deterministic evidence reference metadata; in real mode, it maps snake_case responses to camelCase UI types. The mock provider uses a class-level `Map` so anchor records persist across requests within the same process.

## 15. Demo Seeding & Determinism

Evidence item `ev-intel-001` (Operation Meridian FIR) is pre-seeded with a verified anchor on the `trinetra-mock-chain` registry. The seed anchors at `2026-09-05T10:30:00Z` and verifies at `2026-09-05T11:00:00Z`. All mock data is deterministic: the same evidence ID always yields the same checksum, custody chain hash, transaction ID, and block number. The mock registry is reset on page reload.

## 16. UI Component: EvidenceChainPanel

`evidence-chain-panel.tsx` renders a three-layer visualization: (1) the local SHA-256 checksum, (2) the derived custody chain with chained event hashes, and (3) the blockchain anchor digest. Each layer is a distinct card with a numeric index, icon, title, subtitle, and monospace digest display. The overall verification state is shown as a badge. `data-testid="evidence-chain-panel"`.

## 17. UI Component: EvidenceBlockchainPanel

`evidence-blockchain-panel.tsx` displays the raw anchor view: provider, network, transaction ID, block number, contract address, timestamps, and status badge. It includes an Anchor button, a Verify button, an Explorer link, and a MOCK badge when the provider is a mock. A disclaimer states that only the digest crosses the boundary and that PII remains off-chain. `data-testid="evidence-blockchain-panel"`.

## 18. UI Component: EvidenceIntegritySection

`evidence-integrity-section.tsx` owns the async data loading lifecycle. On mount, it calls `getEvidenceBlockchain(evidenceId)` and displays a loading skeleton or error state. Anchor and Verify buttons trigger service calls and reload the view. Error messages are surfaced inline. The component composes `EvidenceChainPanel` and `EvidenceBlockchainPanel`. `data-testid="evidence-integrity-section"`.

## 19. EvidenceDetailPanel Integration

`evidence-detail-panel.tsx` imports and renders `EvidenceIntegritySection` in a new "Blockchain integrity" section placed immediately after the Provenance section. The section uses the existing `SectionTitle` pattern and `ShieldCheck` icon. No existing detail panel sections were modified or removed.

## 20. AI Query Routing

`query-router.ts` routes `BLOCKCHAIN_ANCHOR` queries when the input contains anchor-specific keywords: "blockchain anchor", "anchor digest", "on-chain digest", "custody chain", "immutable integrity", "tamper-evident", "transaction hash", "is this evidence anchored", and others. The routing occurs before `EVIDENCE_SUMMARY` in the keyword iteration, ensuring anchor-specific questions reach the correct handler.

## 21. AI Grounding & Answer Generation

`grounding.ts` handles `BLOCKCHAIN_ANCHOR` via `answerBlockchainAnchor`. This function reads integrity payloads from evidence context references, counts verified, mismatched, and unanchored states, and builds a data-grounded response. Mock anchoring is disclosed explicitly. A limitation states that anchor state proves a digest existed at a point in time, never determining guilt or evidence truthfulness, and that PII remains off-chain.

## 22. Context Builder Integrity Payload

`context-builder.ts` enriches each evidence source with a compact integrity payload when `EvidenceIntegrityContextPayload` is available. A second reference with `payload` carrying `verificationState`, `isMock`, `network`, `anchorDigest`, `custodyChainHash`, and `checksumPrefixed` is added. The integrity summary line is included in the evidence source summary for model context.

## 23. AI Orchestrator Enrichment

`ai-investigation.service.ts` enriches both mock and real context bundles with integrity payloads via `enrichEvidenceIntegrity`. This bounded helper calls `evidenceIntegrityContextPayload` for the first N evidence items (bounded by `CONTEXT_BUDGETS.evidence`), uses `Promise.all` for parallel resolution, and attaches the payload to the bundle's evidence items before building the AI context.

## 24. Security Model

The security model enforces four boundaries: (a) no raw evidence or PII on-chain — only the 64-character digest; (b) server-side provider credentials (`BLOCKCHAIN_PRIVATE_KEY`, `BLOCKCHAIN_RPC_URL`) are never exposed to the client; (c) blockchain calls are isolated from graph/analytics/evidence read paths; (d) no secrets appear in `NEXT_PUBLIC_*` variables or `render.yaml`. A `grep` audit confirms no leaked keys.

## 25. RBAC & Access Control

All evidence integrity endpoints require authentication via `X-User-Id`. Auditors (non-admin roles) may view integrity state and trigger verification but receive a 403 Forbidden response on anchor requests. The anchor action records the authenticated actor from the server-side context; the actor is never accepted from the client body.

## 26. Idempotency & Conflict Handling

Anchoring is idempotent: if the current digest matches an existing anchor, the response returns `already_anchored: true` with the existing anchor record. If the evidence checksum has changed since the last anchor (the local custody chain hash differs), the service returns 409 Conflict with a clear message. Verification is always safe to repeat and stamps `verified_at` on success.

## 27. Verification Flow

Verification proceeds in three steps: (1) compute the current local custody chain hash, (2) compare it against the stored anchor's custody chain hash (mismatch → `MISMATCH`), and (3) call the provider's `get_anchor` to confirm on-chain presence. If the digest is missing on-chain → `NOT_ANCHORED`. If the provider is unreachable → `UNAVAILABLE`. On match → `VERIFIED` with `verified_at` timestamp.

## 28. Provider Health & Status Labels

The provider health view surfaces `provider`, `network`, `healthy`, `isMock`, and `detail`. The five verification states (`NOT_ANCHORED`, `PENDING`, `ANCHORED`, `VERIFIED`, `MISMATCH`, `UNAVAILABLE`) are used consistently across backend and frontend. `UNAVAILABLE` is never labeled `VERIFIED`. Mock status badges are always displayed.

## 29. Error Handling

Backend errors follow the existing `{code, message, details, status_code}` contract via `app/api/errors.py`. Evidence not found yields 404 `not_found`. Anchor conflict yields 409 `conflict`. Unauthorized anchor yields 403 `forbidden`. Provider errors are caught and surfaced as `UNAVAILABLE` with a neutral message. Frontend components surface errors inline without exposing raw stack traces.

## 30. Testing Strategy

Backend: 20 dedicated tests in `test_evidence_blockchain.py` covering determinism, mock provider persistence, digest sensitivity, custody chain derivation, anchor idempotency, conflict handling, auditor RBAC, verification flow, no-PII-on-chain, and storage payload fallback. Full backend suite: 209 passing. Frontend: 4 new test files (service determinism, component rendering/actions, grounding answer, query routing) plus pre-existing tests. Full frontend suite: 604 passing across 74 suites.

## 31. Verification Matrix

| Layer | Check | Status |
|---|---|---|
| Backend | `compileall` | COMPILE_OK |
| Backend | `from app.main import app` | IMPORT_OK |
| Backend | `ruff check` | clean |
| Backend | Alembic offline DDL | clean |
| Backend | SQLite `create_all` | anchor table + checksum column present |
| Backend | `pytest` (blockchain) | 20 passed |
| Backend | `pytest` (full) | 209 passed |
| Frontend | `tsc --noEmit` | clean |
| Frontend | `next lint` | clean |
| Frontend | `jest` | 604 passed (74 suites) |
| Frontend | `next build` | clean |

## 32. Demo Walkthrough

Open the detail view for evidence `ev-intel-001` (Operation Meridian FIR). The Blockchain Integrity section loads in mock mode and shows a pre-seeded, verified anchor on the `trinetra-mock-chain` registry with transaction `0xb7e5...`, block `4285703`, and verified timestamp `2026-09-05T11:00:00Z`. Select additional evidence items and click "Anchor digest" to create new anchors; click "Verify" to confirm integrity. The MOCK badge is always visible in mock mode.

## 33. Known Limitations & Trade-offs

- Mock provider uses an in-memory store that resets on page reload — sufficient for demo, not for production persistence.
- The custody chain is derived, not persisted, which means it is replayed from the evidence record plus the anchor row on every request. This is intentional for minimal storage overhead and full reproducibility.
- Real EVM provider requires `web3` package installation (optional extra) and valid testnet credentials. Without them, the provider raises a clear error.
- The Solidity contract is a minimal testnet anchor and has not been audited for production deployment.
- Frontend mock digests are computed over evidence reference metadata (id, title, source, sourceId) — a realistic simulation that is clearly labeled MOCK.

## 34. Conclusion & Next Steps

Phase 21 successfully layers a blockchain integrity anchoring mechanism onto Trinetra Pulse's evidence architecture. The implementation is fully functional in mock mode for the demo, with a real EVM provider ready for testnet deployment. The custody chain is deterministic and replayable; the anchor proves digest existence at a point in time; and the UI clearly communicates state without fabrication. Next steps would include: testnet deployment of the AnchorRegistry contract, integration with a real evidence upload pipeline for live checksums, expansion of the RBAC model, and a security audit of the Solidity contract before production use.

---

> **Required statement:** Blockchain is used as an integrity anchor for evidence custody records. Raw evidence and personally identifiable information remain off-chain.