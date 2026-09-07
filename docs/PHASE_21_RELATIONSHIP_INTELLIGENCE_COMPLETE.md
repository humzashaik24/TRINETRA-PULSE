# PHASE 21 — Relationship Intelligence & Multi-Source Correlation

> **Sub-deliverable.** This is a completed sub-deliverable under the broader Phase 21 — Blockchain Evidence Integrity Anchoring. All new primary Phase 21 documentation lives in the new `PHASE_21_COMPLETE.md` and `PHASE_21_REPORT.md`.

## Status: COMPLETE

Delivers a deterministic, explainable, evidence-anchored relationship-corroboration
surface across the Python/FastAPI backend, the Next.js frontend, shared types, tests, and an
Alembic migration. A relationship's intelligence aggregates the individual source
observations that jointly observed it — never a single inflated verdict.

**All language is deliberately neutral — a linkage score is never a probability of
criminality or guilt.**

---

## 1. Goal

For every relationship, answer three questions in neutral, explainable terms:

1. **How many independent sources observed it?** (`source_count`)
2. **What did each source observe?** (a per-observation list, `observed_at` where recorded)
3. **Which evidence backs it, and is it corroborated?** (evidence summary + conflicts)

The analyst makes every final call. `confirm` / `reject` gates are review actions, never an
engine verdict; `NEEDS_REVIEW` is the honest default until a human adjudicates.

## 2. Design principles

- **Per-source observations preserved.** CALL evidence and TRANSFER evidence stay separate —
  the unit of intelligence is the individual observation, not an aggregate blob.
- **Deterministic.** Same relationship + same algorithm version → same intelligence, same
  order, same conflict flags. No randomness, ever.
- **No O(N²).** Observations derive from bounded evidence references (`derive_observations_bulk`
  batches provenance lookups); the frontend mock mirrors this with one observation per
  distinct evidence reference.
- **Honest evidence linking.** Real `RelationshipIntelligence.evidence` and
  `evidence_ids`; when a relationship has no linked evidence the surface says so plainly
  ("No linked evidence") instead of inventing support.
- **RBAC + actor identity.** Actor derives exclusively from the authenticated context
  (`CurrentUserDep`), never the client. Auditors are read-only (`403 forbidden`).
- **Single Context Inspector.** Relationship intelligence renders inside the one shared
  inspector (Phase 3.5) — no new shell.

## 3. Correlation model (shared, deterministic)

| Input | Rule |
| --- | --- |
| Observations | one per distinct evidence reference (backend: from `data_provenance`, `observed_at=None` fallback) |
| `source_count` | number of distinct sources among observations |
| Correlated | `source_count >= 2` |
| `correlation_key` | deterministic `g-<sorted distinct sources joined with "+">` (empty when single-source) |
| Linkage score | correlated: `min(0.5 + 0.15·sources, 0.95)`; single-source: `min(0.55, base_confidence)` |
| Conflict | same source holding `>1` observation AND base confidence `< 0.6` → `conflicting_observations:<source>:<n>` |
| `confidence_label` | `HIGH ≥ 0.7` · `MEDIUM ≥ 0.4` · `LOW` otherwise |
| Status | `NEEDS_REVIEW` until a human confirms (`REVIEWED`) or discards (`DISCARDED`) |

The frontend mock mirrors this exactly, deriving from `mockEntityRelationships` evidence
references so counts are stable and testable.

## 4. Backend deliverables

- `apps/api/app/relationship_intelligence/` — engine: `evaluate_relationship` (shared
  deterministic compute), `observations.py` (`derive_observations_bulk` from
  `data_provenance` with EV/R5-style fallback), `compute.py`.
- `apps/api/app/models/relationships.py` — Phase 21 model columns: `intelligence_status`,
  `correlation_key`, `source_count`, `first_observed_at`, `last_observed_at`,
  `confidence`, `confidence_label`, `observation_count`, `evidence_count`,
  `conflicts` (JSONB), `conflict_flags` (JSONB), `rejection_reason` + 2 indexes.
- `apps/api/app/services/real/relationship_intelligence.py` —
  `RelationshipIntelligenceService` (intelligence / observations / evidence / confirm /
  reject / evaluate / list + RBAC + audit). `confirm`/`reject` refresh after flush
  (MissingGreenlet fix). `list_for_investigation` F841 cleanup.
- `apps/api/app/api/routers/relationship_intelligence.py` — mounted in `app/api/app.py`:
  - `GET  /relationships/{id}/intelligence`
  - `GET  /relationships/{id}/observations`
  - `GET  /relationships/{id}/evidence`
  - `POST /relationships/{id}/confirm`
  - `POST /relationships/{id}/reject`
  - `POST /investigations/{id}/relationships/evaluate`
  - `GET  /investigations/{id}/relationships/intelligence`
- `apps/api/app/schemas/real/relationship_intelligence.py` — response schemas
  (`RealRelationshipIntelligence`, observations, evaluation result, evidence support).
- Migration `apps/api/alembic/versions/d4e5f6a7b8c9_relationship_intelligence.py`
  (down_revision `c3d4e5f6a7b8`) — PostgreSQL offline DDL verified.
- Wire format is **snake_case** (confirmed against the backend schemas).
- `test_relationship_intelligence.py` — **28 tests** (engine determinism, provenance
  fallback, observation bulk derivation, 3-way evidence match, confirm/reject + audit +
  actor-from-auth, auditor 403, list/evaluate endpoints, isolation).

Backend Phase 21 was verified end-to-end: **189 passed**, `ruff` clean, `compileall app -q`
OK, PostgreSQL offline DDL compiles through head `d4e5f6a7b8c9`, fresh SQLite `create_all`
OK.

## 5. Frontend deliverables

- `packages/types/src/relationship-intelligence.ts` (+ re-export) —
  `RelationshipIntelligenceStatus`, `RelationshipConfidenceLabel`, `RelationshipObservation`,
  `RelationshipConflict` (with `observationId`), `RelationshipEvidenceSummary`
  (`{relationshipId, supported, evidenceIds, directCount}`), `RelationshipIntelligence`,
  `RelationshipIntelligenceList`, `RelationshipEvidenceLink`, `RelationshipEvaluationResult`,
  `RELATIONSHIP_INTELLIGENCE_STATUSES`.
- `packages/types/src/network.ts` — `GraphEdge.intelligence` (optional summary) and
  `GraphFilters.intelligenceStatuses`; `entity-intelligence.ts` — `EntityRelationship`
  optional `intelligence`; `investigation.ts` — timeline category union adds
  `'relationship'`; `ai-investigation.ts` — `AIQueryType.RELATIONSHIP_INTELLIGENCE`.
- `apps/web/src/lib/api/relationship-intelligence.ts` — typed client for the 7 endpoints
  (`isMockData`-independent fetch functions).
- `apps/web/src/services/relationship-intelligence.service.ts` — mock path derives
  deterministic intelligence from `mockEntityRelationships`; real path maps snake_case
  wire → camelCase via `isMockData()`. New exports: `getIntelligenceStatusLabel`,
  `getRelationshipIntelligence`, `getRelationshipObservations`, `getRelationshipEvidence`,
  `listRelationshipIntelligence`, `evaluateRelationshipIntelligence`, `confirmRelationship`,
  `rejectRelationship`, `evaluateRelationship`, `fetchRelationshipEvidenceLinks`, and the
  lightweight `relationshipIntelligenceSnapshot` embedded on relationship records.
- **Context Inspector** — `InspectorRelationshipView` gained `intelligence` +
  `evidenceLinks`; `context-views.tsx` renders `RelationshipIntelligencePanel` (correlation
  badge/variant, metrics, neutral messages, source observations, evidence support with a
  "No linked evidence" sentinel, conflict flags). Confirm/Discard buttons are gated by
  `canReview && status === 'NEEDS_REVIEW'`. Web app has no role store → `canReview = true`
  default; the backend enforces RBAC and actor identity server-side. Single inspector shell,
  no redesign.
- **Graph** — `transform.ts` propagates `edge.intelligence`; `graph-edge.tsx` tints edges
  emerald when correlated (`sourceCount >= 2`) and amber when intelligence exists but is
  single-source, and appends `· {confidenceLabel}` to the label; `selectors.ts` filters by
  `intelligenceStatuses`; `graph-filters.tsx` adds a **Correlation** filter section +
  `activeFilterCount`.
- **Entity relationships list** — new `RelationshipIntelligenceBadge` (confidence label ·
  source count) rendered when `rel.intelligence` is present; `entity.service.withTypes`
  attaches the deterministic snapshot.
- **Timeline** — `'relationship'` category added to `CATEGORY_META`/`CATEGORY_ORDER`;
  timeline entries of `ref_type: 'relationship'` open the Context Inspector. Mock timeline
  for `inv-001` gained one resolvable relationship entry (`rel-003`, the KNOWS link).
- **AI grounding** — `query-router` routes `RELATIONSHIP_INTELLIGENCE` prompts;
  `context-builder` surfaces correlation (source count + label) in relationship sources
  with a payload reference; `grounding.ts` answers corroboration neutrally and suggests
  `OPEN_RELATIONSHIP`. Mock provider deleges to grounding, so the new type works in mock
  mode.

## 6. Test coverage

### Backend (`apps/api`)
- **189 passed** (`pytest -q`); `test_relationship_intelligence.py` adds 28.
- `ruff check app tests` → **All checks passed**.
- Alembic PostgreSQL offline DDL → compiles through `d4e5f6a7b8c9` with 12 Phase 21
  columns + 2 indexes.
- Fresh SQLite `Base.metadata.create_all` → model materializes all Phase 21 columns.

### Frontend (`apps/web`)
- `tsc --noEmit` → clean (2 pre-existing errors in `lib/__tests__/linkage.test.ts` only —
  Phase 20 file, out of scope; does not block `next build`).
- `next lint` → clean (one pre-existing font-loading warning only).
- Jest → **70 suites / 583 tests passed** (9 new: grounding
  `RELATIONSHIP_INTELLIGENCE` ×2, graph intel filter ×1, `relationship-intelligence.service`
  ×5, timeline relationship entry ×1).
- `next build` with `NEXT_PUBLIC_USE_MOCK_API=true` → success (18/18 routes).
- `next build` with `NEXT_PUBLIC_USE_MOCK_API=false` → success (18/18 routes).

## 7. Honest limitations

- The migration chain was validated with offline PostgreSQL SQL and an in-memory SQLite
  `create_all`, not against a live PostgreSQL instance.
- The real `/networks/{id}/graph` payload exposes no intelligence or direction per edge, so
  the API graph path does **not** tint edges (n+1 intelligence fetches were deliberately
  avoided); intelligence surfaces in the Context Inspector and list views.
- The frontend mock correlation derivation comes from evidence references; on identical
  data the real backend counts provenance sources (may differ by a source when a reference
  has no resolvable provenance row).
- `NEEDS_REVIEW` is the honest default — nothing is ever auto-confirmed.

## 8. Verification commands

```bash
# backend
cd apps/api
venv/Scripts/python.exe -m pytest -q                 # 189 passed
venv/Scripts/python.exe -m ruff check app tests      # All checks passed

# alembic (PostgreSQL offline DDL, runs from apps/api)
$env:DATABASE_URL='postgresql+asyncpg://trinetra:trinetra_dev_password@localhost:5432/trinetra_pulse'
venv/Scripts/python.exe -m alembic upgrade head --sql

# fresh SQLite model
venv/Scripts/python.exe -c "import asyncio; from sqlalchemy.ext.asyncio import create_async_engine; from app.models import Base; async def r():\n  e=create_async_engine('sqlite+aiosqlite:///:memory:');\n  async with e.begin() as c: await c.run_sync(Base.metadata.create_all)\nasyncio.run(r())"

# frontend
cd apps/web
npx tsc --noEmit          # only 2 pre-existing linkage.test.ts errors
npx next lint
npx jest --silent          # 70 suites / 583 passed
$env:NEXT_PUBLIC_USE_MOCK_API='true';  npx next build
$env:NEXT_PUBLIC_USE_MOCK_API='false'; npx next build
```

## 9. Handoff

Phase 22 is **not** started. See `docs/PHASE_21_REPORT.md` (34-section final report) for the
full delivery record.