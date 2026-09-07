# PHASE 20 — FINAL REPORT
## Entity Resolution & Identity Correlation Intelligence

**Repository:** `C:\SIH\trinetra-pulse-audit` · **Date:** 2026-09-06 · **Status:** COMPLETE

---

## 1. Executive summary

Phase 20 adds a deterministic, explainable entity-resolution engine that correlates records
that plausibly refer to the same observed entity within a single investigation. The engine is
blocking-based (never O(N²)), produces stable results, exposes its reasoning
(`matched_features`, `contradictions`, `source_refs`), is fully audited and RBAC-guarded, and
never auto-merges — analysts confirm or reject every link. Both the real API layer
(`/api/v2`) and the mock workspace are wired end-to-end with tests.

## 2. Scope

In scope: backend engine + model + schemas + service + router + migration; shared types;
frontend mock candidates, client-side engine mirror, service adapter, Identity UI panel;
tests; documentation.

Out of scope (deliberately not started / declined): geo-fuzzy address matching, entity
auto-merge, blockchain, AI agents, Neo4j, Redis/Kafka, Docker.

## 3. Delivery summary

| Area | Delivered |
| --- | --- |
| Engine | `app/resolution/{normalization,matching,scoring,candidates}.py` (`entity-resolution-v1`) |
| Model | `entity_resolutions` extended: `investigation_id` FK+index, `linkage_score`, `resolution_version`, `resolution_method`, `matched_features`/`contradictions`/`source_refs` JSONB, `last_evaluated_at` |
| Service | `ResolutionService` (evaluate/list/confirm/reject/decorate/provenance) + audit + RBAC |
| API | `resolution` router mounted (`tags=["entity-resolution"]`); auditor read-only (`403`) |
| Schemas | `EntityResolutionCandidate`, `ResolutionCandidatesResponse`, `ResolutionEvaluationResult`, provenance/`metadata` alias handling |
| Migration | `c3d4e5f6a7b8_add_resolution_columns.py` (PostgreSQL DDL verified) |
| Shared types | `VerificationState` + `'auto_resolved'`; `ResolutionMethod`, `MatchFeature`, `ResolutionContradiction`, `ResolutionSourceRef`, candidate types |
| Frontend | `lib/linkage.ts` mirror; service adapter + audit actions; `entity-resolution-section.tsx`; Identity tab on entity detail |
| Mock | `mockEntityResolutionCandidates` seeded from real engine output |

## 4. Scoring & recommendation model

- Strong tier (phone / email / numeric identifier / vehicle / account / DOB):
  `min(0.82 + 0.05·(n−1), 0.97)` + weak bonus `min(0.03·n, 0.12)`.
- Weak-only (name / location): `min(0.15 + 0.12·n, 0.45)` — can never read HIGH.
- Contradiction penalty: −0.25 each; result clamped to [0,1].
- Labels/states: HIGH/auto_resolved ≥ 0.8 · MEDIUM/needs_review ≥ 0.5 · LOW/possible.
- `PROBABLE` is reserved for analyst-made (manual-method) resolutions.

## 5. Operation Meridian results (real, unfabricated)

Over the seeded `inv-006` entities the engine produced exactly 3 candidates:

1. `Rahul Kumar ↔ +91 98765 43210` — PHONE_EXACT + NAME_EXACT — **0.85 HIGH auto_resolved**
2. `Rahul Kumar ↔ 7731 0029 4567` — NAME_EXACT (holder) — **0.27 LOW possible**
3. `+91 98765 43210 ↔ 7731 0029 4567` — NAME_EXACT (holder) — **0.27 LOW possible**

## 6. Verification evidence

| Check | Command | Result |
| --- | --- | --- |
| Backend tests | `pytest -q` (apps/api) | **161 passed** |
| Backend lint | `ruff check app tests` | All checks passed |
| Postgres DDL (full chain) | `alembic upgrade head --sql` | Compiles clean through `c3d4e5f6a7b8` |
| SQLite model DDL | in-memory `create_all` | All Phase 20 columns + index present |
| Web type check | `npm run type-check` | Clean |
| Web lint | `next lint` | Clean (1 pre-existing warning) |
| Web tests | `npx jest --silent` | **69 suites / 574 passed** (15 new) |
| Web build (mock) | `NEXT_PUBLIC_USE_MOCK_API=true next build` | 18/18 routes |
| Web build (real) | `NEXT_PUBLIC_USE_MOCK_API=false next build` | 18/18 routes |

### Migrations found & fixed during verification
- `b2c3d4e5f6a7_extend_provenance.py` (pre-existing): three
  `op.create_foreign_key(...)` calls missing `remote_cols=["id"]` — fixed.
- `c3d4e5f6a7b8_add_resolution_columns.py` (new): same missing `remote_cols` — fixed before
  merge.

### Test-environment fix
- `apps/web/jest.config.js` react mappings repointed to the hoisted monorepo
  `node_modules/react` (npm-workspace layout) so the full frontend suite runs.

## 7. API surface (real `/api/v2`)

- `POST /entity-resolution/evaluate` — run engine for an investigation (audited).
- `GET  /entity-resolution?investigation_id=…&entity_id=…` — list candidates.
- `POST /entity-resolution/confirm` / `reject` — analyst adjudication (reason required,
  actor from auth; auditor → 403 `{"code":"forbidden"}`).
- Provenance endpoints return `metadata` under the correct alias round-trip.

## 8. RBAC & audit

- Actor identity derives exclusively from the current user (`CurrentUserDep`), never the
  request body.
- Every engine run / confirm / reject emits an `AuditEvent` (frontend mirrors this with
  `RESOLUTION_ENGINE_RAN`, `RESOLUTION_CONFIRMED`, `RESOLUTION_REJECTED`).
- `inv-006`-style demo data uses only genuine engine output; no entities fabricated.

## 9. Honest limitations

- No live PostgreSQL migration run (offline DDL + SQLite `create_all` used).
- The browser-side engine mirror uses full-name holder/owner blocking (no name-token
  blocking), so candidate counts may differ slightly from the server engine on identical data.
- `AUTO_RESOLVED` is a recommendation; nothing is merged without a human.
- Exact/verified-similarity matching only; fuzzy address and OCR-scale transcription matching
  are not implemented.

## 10. Handoff notes

- Phase 21 is **not** started.
- Run all commands in §6 to reproduce the evidence; see `docs/PHASE_20_COMPLETE.md` for the
  full walkthrough.