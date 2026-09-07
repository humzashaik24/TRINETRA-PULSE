# PHASE 20 — Entity Resolution & Identity Correlation Intelligence

## Status: COMPLETE

Delivered as a deterministic, explainable, investigation-scoped linkage engine across the
Python/FastAPI backend, the Next.js frontend, shared types, tests, and an Alembic migration.

---

## 1. Goal

Correlate entities that plausibly refer to the **same observed person/organization** across
records inside one investigation, without ever claiming forensic certainty. The engine
produces a **linkage score** and evidence features; the analyst always makes the final
confirm/reject call. All language is deliberately neutral — a linkage score is never a
probability of criminality or guilt.

## 2. Design principles

- **Investigation-scoped only.** Resolution never crosses investigation boundaries and is
  impossible across tenants (isolation is enforced at the repository/query layer and tested).
- **Blocking, not O(N²).** Candidate generation uses blocking keys
  (`MAX_KEYS_PER_ENTITY = 12`), mirroring a production dedupe index.
- **Deterministic.** Same entities + same algorithm version → same candidates, in the same
  order. Result sets are stable for the analyst and for tests.
- **Explainable.** Every candidate carries `matched_features`, `contradictions`,
  `source_refs`, and the `resolution_version` that produced it.
- **Audited.** Engine runs, confirms, and rejections are all written to the audit trail with
  the acting user; actor identity never comes from the request body.
- **RBAC.** Auditors are read-only (`403 {"code": "forbidden"}` on every mutation).
- **Honest recommendation states.** `AUTO_RESOLVED` only for engine-scored results;
  `PROBABLE` is reserved for analyst-made determinations; automatic results are always
  pending human adjudication — resolution is never irreversible.

## 3. Scoring model (`apps/api/app/resolution/scoring.py`, mirrored in `apps/web/src/lib/linkage.ts`)

| Stage | Rule | Result |
| --- | --- | --- |
| Strong identifier match(es) | `min(0.82 + 0.05 * (strong_count - 1), 0.97)` | Tier 1 platform |
| Weak attribute bonus | `+ min(weak_count * 0.03, 0.12)` | capped contribution |
| Weak-only overlaps | `min(0.15 + weak_count * 0.12, 0.45)` | never reaches HIGH |
| Contradiction penalty | `−0.25` per conflict | explicit double penalty |

- Strong tier: exact phone, email, numeric identifier (PAN/Aadhaar/GSTIN), vehicle, account,
  date of birth.
- Weak tier: exact/similar normalized name, exact location.
- `confidence_label`: HIGH ≥ 0.8, MEDIUM ≥ 0.55, LOW otherwise.
- `recommended_state`: `AUTO_RESOLVED` ≥ 0.8; `NEEDS_REVIEW` ≥ 0.5; `POSSIBLE` otherwise.
- `holder`/`owner` are name-recognized attributes used for identity-correlation evidence
  (e.g. a phone/account registry listing a person's name).

## 4. Operation Meridian (`inv-006`) — engine output (genuine, nothing fabricated)

Run over the seeded real entities, the engine produced exactly **3 candidate pairs**:

| Pair | Features | Linkage | Confidence | State |
| --- | --- | --- | --- | --- |
| `Rahul Kumar` ↔ `+91 98765 43210` | PHONE_EXACT + NAME_EXACT | 0.85 | HIGH | auto_resolved |
| `Rahul Kumar` ↔ `7731 0029 4567` | NAME_EXACT (holder) | 0.27 | LOW | possible |
| `+91 98765 43210` ↔ `7731 0029 4567` | NAME_EXACT (holder) | 0.27 | LOW | possible |

No entities were invented for the demo; the demo surfaces exactly the engine's real output.

## 5. Backend deliverables

- `apps/api/app/models/entity_resolution.py` — extended model: `investigation_id` (FK CASCADE,
  indexed), `linkage_score`, `resolution_version`, `resolution_method`
  (`resolutionmethod` enum), `matched_features`/`contradictions`/`source_refs` (JSONB),
  `last_evaluated_at`. `VerificationState.AUTO_RESOLVED` added.
- `apps/api/app/resolution/{normalization,matching,scoring,candidates}.py` — engine
  (`RESOLUTION_VERSION = "entity-resolution-v1"`).
- `apps/api/app/services/real/resolution.py` — `ResolutionService`: evaluate / list /
  confirm / reject / decorate / provenance + RBAC + audit.
- `apps/api/app/api/routers/resolution.py`, mounted in `app/api/app.py` under
  `tags=["entity-resolution"]`.
- `apps/api/app/schemas/real/resolution.py` (+ exports) — response schemas with
  `validation_alias="metadata"` + `serialization_alias="metadata"`.
- Migration `c3d4e5f6a7b8_add_resolution_columns.py` (down_revision `b2c3d4e5f6a7`).

### Migration chain fix
Verifying the full `alembic upgrade` chain exposed a pre-existing defect in
`b2c3d4e5f6a7_extend_provenance.py`: three `op.create_foreign_key(...)` calls omitted
`remote_cols=["id"]`. Both that file and the new `c3d4e5f6a7b8` migration were corrected. The
full chain now compiles to PostgreSQL offline DDL without errors.

## 6. Frontend deliverables

- `packages/types/src/entity-resolution.ts` (+ `packages/types/src/index.ts` exports) —
  `VerificationState` extended with `'auto_resolved'`; `ResolutionMethod`, `MatchFeature`,
  `ResolutionContradiction`, `ResolutionSourceRef`, `EntityResolutionCandidate`,
  `ResolutionCandidatesResponse`, `ResolutionEvaluationResult`.
- `apps/web/src/lib/linkage.ts` — deterministic client mirror of the engine (blocking keys,
  tiered scoring, contradiction penalties) used by the mock workspace.
- `apps/web/src/services/entity.service.ts` — Phase 20 functions:
  `fetchEntityResolutions`, `fetchInvestigationResolutions`,
  `evaluateInvestigationResolutions`, `confirmEntityResolutions`,
  `rejectEntityResolutions`; `resolutions` added to `fetchEntityDetailBundle`. New audit
  actions `RESOLUTION_ENGINE_RAN` / `RESOLUTION_CONFIRMED` / `RESOLUTION_REJECTED` added to
  `AuditAction`.
- `apps/web/src/mock/entity-resolutions.ts` — `mockEntityResolutionCandidates` seeded with the
  three real Operation Meridian pairs (plus the genuine `R. Kumar ↔ Rahul Kumar` phone
  overlap).
- `apps/web/src/components/entity-intelligence/entity-resolution-section.tsx` — Identity
  panel with linkage score, confidence, features, contradictions, source datasets, and
  analyst confirm/reject (reason required, audited).
- `apps/web/src/components/entity-intelligence/entity-detail.tsx` + `…/entities/[id]/page.tsx`
  — new **Identity** tab wired to confirm/reject/evaluate + refresh.

## 7. Test coverage

### Backend (`apps/api`)
- **161 passed** (`pytest -q`), including the new
  `apps/api/tests/test_entity_resolution.py` (22 tests): normalization units, matching/scoring
  tiers, contradiction penalty, blocking/candidate determinism + scoping, evaluate →
  auto-resolved, entity resolution listing, confirm/reject + audit, auditor 403 (dependency
  override), cross-investigation isolation, unknown investigation → 404, actor-from-auth-only,
  foreign-entity scoping.
- `ruff check app tests` → **All checks passed**.

### Frontend (`apps/web`)
- `tsc --noEmit` → clean.
- `next lint` → clean (one pre-existing font-loading warning only).
- Jest → **69 suites / 574 tests passed**, including 15 new Phase 20 tests
  (`linkage.test.ts`, `entity.service.linkage.test.ts`, `entity-resolution-section.test.tsx`).
  Note: `jest.config.js` react mappings were repointed from `<rootDir>/node_modules/react` to
  the hoisted monorepo root so the suite runs under the current npm-workspace layout.
- `next build` with `NEXT_PUBLIC_USE_MOCK_API=true` → success (18/18 routes).
- `next build` with `NEXT_PUBLIC_USE_MOCK_API=false` → success (18/18 routes).

### Migration
- PostgreSQL offline DDL: `alembic upgrade head --sql` → full chain compiles from scratch
  through `c3d4e5f6a7b8` without errors.
- Fresh SQLite `Base.metadata.create_all` → `entity_resolutions` materializes all Phase 20
  columns + `ix_entity_resolutions_investigation_id` (SQLite FK *alter* is intentionally not
  supported by the pre-existing Postgres-only provenance migration, so the alembic chain is
  exercised via Postgres DDL and model `create_all`).

## 8. Honest limitations

- The migration chain was validated with offline PostgreSQL SQL and an in-memory SQLite
  `create_all`, not against a live PostgreSQL instance.
- The client linkage mirror approximates the backend (full-name holder/owner blocking without
  name-token blocking), so count/ordering can differ slightly from the server engine on the
  same data.
- `AUTO_RESOLVED` is an engine recommendation: entities are never merged automatically; only
  an analyst can confirm (or reject) a link.
- Address similarity is deliberately conservative (dedupe-cleaned comparison only) — fuzzy
  address matching is out of scope.
- Deterministic exact-match matching is by design; it does not perform fuzzy name
  transcription matching beyond the verified similarity tier.

## 9. Verification commands

```bash
# backend
cd apps/api
venv/Scripts/python.exe -m pytest -q
venv/Scripts/python.exe -m ruff check app tests

# alembic (PostgreSQL offline DDL)
$env:DATABASE_URL='postgresql+asyncpg://trinetra:trinetra_dev_password@localhost:5432/trinetra_pulse'
venv/Scripts/python.exe -m alembic upgrade head --sql

# frontend
cd apps/web
npm run type-check
npx next lint
npx jest --silent
$env:NEXT_PUBLIC_USE_MOCK_API='true'; npm run build
$env:NEXT_PUBLIC_USE_MOCK_API='false'; npm run build
```