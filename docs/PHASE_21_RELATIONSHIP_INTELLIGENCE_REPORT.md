# PHASE 21 — FINAL REPORT
## Relationship Intelligence & Multi-Source Correlation

> **Sub-deliverable.** This is a completed sub-deliverable under the broader Phase 21 — Blockchain Evidence Integrity Anchoring. All new primary Phase 21 documentation lives in the new `PHASE_21_COMPLETE.md` and `PHASE_21_REPORT.md` (34-section format).

**Repository:** `C:\SIH\trinetra-pulse-audit` · **Date:** 2026-09-06 · **Status:** COMPLETE

---

## 1. Executive summary

Phase 21 adds a deterministic, explainable relationship-corroboration layer. Every
relationship is described by the individual source observations that jointly observed it
(preserved per-observation, never aggregated away), an honest "how many independent sources?"
count, and corroboration status. All language is deliberately neutral — a linkage score is
never a probability of criminality or guilt. Real confirm/reject actions are analyst
adjudication with full audit + RBAC, and `NEEDS_REVIEW` is the honest default. The surface is
wired end-to-end: backend engine/service/schemas/router/migration, shared types, frontend
API client + service, the single Context Inspector panel, graph edge tinting, a GraphFilters
Correlation section, an entity-relationships badge, a timeline `relationship` category, and
AI grounding for corroboration questions.

## 2. Scope

In scope: backend engine (`relationship_intelligence` package) + model columns + schemas +
service + router + migration; shared types additions; frontend API client, mock-driven
service mirror, Context Inspector panel, graph edge tint + filter UI, entity-relationships
badge, timeline category, AI context-builder + grounding; tests; documentation.

Out of scope (deliberately not started / declined): live PostgreSQL migration, auto-confirm
of relationships, geofencing/geo analysis, blockchain, AI agents, Neo4j, Redis/Kafka, Docker.

## 3. Delivery summary

| Area | Delivered |
| --- | --- |
| Engine | `app/relationship_intelligence/{compute,observations}.py` (deterministic, correlation model) |
| Model | `relationships` extended: `intelligence_status`, `correlation_key`, `source_count`, `first_observed_at`, `last_observed_at`, `confidence`, `confidence_label`, `observation_count`, `evidence_count`, `conflicts` JSONB, `conflict_flags` JSONB, `rejection_reason` + 2 indexes |
| Service | `RelationshipIntelligenceService` (intelligence/observations/evidence/confirm/reject/evaluate/list) + audit + RBAC |
| API | `relationship_intelligence` router mounted; 7 endpoints (see §8) |
| Schemas | `RealRelationshipIntelligence`, observations, evaluation result, evidence support, snake_case wire |
| Migration | `d4e5f6a7b8c9_relationship_intelligence.py` (PostgreSQL DDL verified) |
| Shared types | `packages/types/src/relationship-intelligence.ts` + `network.ts`/`entity-intelligence.ts`/`investigation.ts`/`ai-investigation.ts` additions |
| Frontend | API client, service adapter (mock + real), Context Inspector panel, graph edge tint, GraphFilters correlation UI, entity badge, timeline category |
| AI | `context-builder` + `grounding.answerRelationshipIntelligence` + `OPEN_RELATIONSHIP` action; providers wired |

## 4. Correlation model

| Input | Rule |
| --- | --- |
| Observations | one per distinct evidence reference (backend from `data_provenance`; `observed_at=None` fallback) |
| `source_count` | number of distinct sources among observations |
| Correlated | `source_count >= 2` |
| `correlation_key` | deterministic `g-<sorted distinct sources joined with "+">` (empty when single-source) |
| Linkage score | correlated: `min(0.5 + 0.15·sources, 0.95)`; single-source: `min(0.55, base_confidence)` |
| Conflict | same source holding >1 observation AND base confidence < 0.6 → `conflicting_observations:<source>:<n>` |
| `confidence_label` | `HIGH ≥ 0.7` · `MEDIUM ≥ 0.4` · `LOW` otherwise |
| Status | `NEEDS_REVIEW` until a human confirms (`REVIEWED`) or discards (`DISCARDED`) |

## 5. Backend engine

- `apps/api/app/relationship_intelligence/__init__.py` — public surface + shared items.
- `compute.py` — `evaluate_relationship` (single deterministic compute path used by both the
  mock-independent tests and the service; no randomness).
- `observations.py` — `derive_observations_bulk` batches provenance lookups (no O(N²));
  `observed_at` falls back to `None` when no provenance row records a timestamp.
- Engine never auto-confirms; status starts `NEEDS_REVIEW`.

## 6. Backend model & migration

- `apps/api/app/models/relationships.py` gains the Phase 21 columns listed in §3.
- Indexes: `ix_relationships_intelligence_status`, `ix_relationships_correlation_key`.
- Migration `d4e5f6a7b8c9_relationship_intelligence.py` (down_revision `c3d4e5f6a7b8`) +
  `b2c3d4e5f6a7` + `c3d4e5f6a7b8` chain. PostgreSQL offline DDL verified end-to-end.
- SQLite `create_all` materializes every Phase 21 column.

## 7. Backend service layer

`apps/api/app/services/real/relationship_intelligence.py`:

- `get_intelligence` / `get_observations` / `get_evidence` — read paths, RBAC guarded.
- `confirm` / `reject` — review actions; reason captured; actor derived from auth; refresh
  after flush (MissingGreenlet-safe); audit every write.
- `evaluate_investigation` — runs the engine for an investigation.
- `list_for_investigation` — list intelligence for a relationship; F841 cleanup applied.

## 8. Backend API surface

Mounted router `app/api/routers/relationship_intelligence.py`:

- `GET    /relationships/{id}/intelligence`
- `GET    /relationships/{id}/observations`
- `GET    /relationships/{id}/evidence`
- `POST   /relationships/{id}/confirm`
- `POST   /relationships/{id}/reject`
- `POST   /investigations/{id}/relationships/evaluate`
- `GET    /investigations/{id}/relationships/intelligence`

Wire format is **snake_case** throughout (confirmed against the schemas).

## 9. RBAC & audit

- Actor identity derives exclusively from the current user (`CurrentUserDep`), never the
  request body.
- Auditors are read-only: writes to confirm/reject/evaluate return `403 {"code":"forbidden"}`.
- Every confirm/reject/evaluate run emits an `AuditEvent` with the authenticated actor.

## 10. Schemas & wire format

`apps/api/app/schemas/real/relationship_intelligence.py`:

- `RealRelationshipIntelligence` — id, relationship_id, status, correlation_key,
  source_count, first/last observed, confidence + label, observation_count, evidence_count,
  conflicts, conflict_flags, created/updated.
- Observation / evaluation-result / evidence-support response schemas, snake_case.

## 11. Shared types updates

- New module `packages/types/src/relationship-intelligence.ts`: statuses, label enum,
  `RelationshipObservation`, `RelationshipConflict` (with `observationId`),
  `RelationshipEvidenceSummary`, `RelationshipIntelligence`, `RelationshipIntelligenceList`,
  `RelationshipEvidenceLink`, `RelationshipEvaluationResult`,
  `RELATIONSHIP_INTELLIGENCE_STATUSES`.
- `network.ts` — `GraphEdge.intelligence` + `GraphFilters.intelligenceStatuses`.
- `entity-intelligence.ts` — `EntityRelationship.intelligence`.
- `investigation.ts` — timeline category union adds `'relationship'`.
- `ai-investigation.ts` — `AIQueryType.RELATIONSHIP_INTELLIGENCE`.

## 12. Frontend API client

`apps/web/src/lib/api/relationship-intelligence.ts` — typed fetch wrappers for all 7
endpoints, `isMockData()`-independent; used by the service for the real path.

## 13. Frontend service adapter

`apps/web/src/services/relationship-intelligence.service.ts`:

- Mock path derives deterministic intelligence from `mockEntityRelationships` evidence
  references (prefix-before-`/` → source label; fallback `source` then reference), mirroring
  the backend correlation rules.
- Real path maps snake_case wire → camelCase.
- Exports include `relationshipIntelligenceSnapshot` (embedded on relationship records),
  `getIntelligenceStatusLabel`, `getRelationshipIntelligence`, `getRelationshipObservations`,
  `getRelationshipEvidence`, `listRelationshipIntelligence`, `evaluateRelationshipIntelligence`,
  `confirmRelationship`, `rejectRelationship`, `evaluateRelationship`,
  `fetchRelationshipEvidenceLinks`.

## 14. Context Inspector panel

- `InspectorRelationshipView` now fetches `intelligence` + `evidenceLinks` in parallel.
- `context-views.tsx` renders `RelationshipIntelligencePanel`: correlation badge, metric rows
  (source count, observations, evidence, first/last observed, confidence label), neutral
  status messages, per-source observation list, evidence support with an explicit
  "No linked evidence" sentinel, and conflict flags.
- Confirm/Discard gated by `canReview && status === 'NEEDS_REVIEW'`. Web has no role store →
  `canReview = true` default; RBAC/actor is enforced server-side. Single inspector shell.
- No personal-intelligence overlap; relationship intelligence is its own panel.

## 15. Graph edge tint

- `transform.ts` propagates `intelligence` onto `RenderEdge`.
- `graph-edge.tsx` tints correlated edges (`sourceCount >= 2`) emerald
  (`hsl(150,55%,48%)`) and intelligence-without-correlation amber (`hsl(40,70%,52%)`);
  label chip appends `· {confidenceLabel}`.
- The real `/networks/{id}/graph` payload carries no per-edge intelligence, so the API graph
  path does not tint edges (see §31 honest limitation).

## 16. GraphFilters Correlation UI

- `graph.store.ts` `defaultFilters` adds `intelligenceStatuses: []`.
- `selectors.ts` `matchesIntelligenceStatus` applied in the visible-edge loop.
- `graph-filters.tsx` adds a **Correlation** section with toggles
  `NEEDS_REVIEW` / `REVIEWED` / `DISCARDED`, correct labels, `activeFilterCount`
  integration, and reset.

## 17. Entity relationships badge

- `badges.tsx` adds `RelationshipIntelligenceBadge`: variant by status
  (REVIEWED→success, DISCARDED→danger, ≥2 sources→network, else warning), dot except when
  DISCARDED, label `confidenceLabel · N src`.
- `entity-relationships.tsx` renders it when `rel.intelligence` is present; `withTypes`
  attaches the deterministic snapshot.

## 18. Timeline relationship category

- `investigation-timeline-tab.tsx` adds `'relationship'` to the timeline category union +
  `CATEGORY_META` (color/icon/dot) + `CATEGORY_ORDER`; `canInspect` includes it;
  `contextForEntry` maps to `{type:'relationship', id, investigationId}`.
- Mock timeline for `inv-001` gains one resolvable relationship entry (`rel-003`, KNOWS
  link) rendered in both list and inspector routes.

## 19. AI grounding & context-builder

- `context-builder.ts`: relationship sources broadcast `intelligence`
  (status, confidenceLabel, sourceCount, correlationKey); summary adds a correlation line
  ("Corroborated: N independent sources (label)" / "Single-source — pending corroboration");
  extra payload reference `{sourceCount, confidenceLabel, status}` on the same `sourceId`.
- `grounding.ts`: `RELATIONSHIP_INTELLIGENCE` case → `answerRelationshipIntelligence`
  (multi-source: "jointly observed across N independent sources"; single-source: "single
  source … pending corroboration"; unknown: not assessed) + `OPEN_RELATIONSHIP` action.
- Providers: mock provider delegates to grounding; API provider is a passthrough so the new
  query type works in mock mode.

## 20. Mock data

- `relationship-intelligence.service.test.ts` fixtures + `mockEntityRelationships` evidence
  references: `rel-001` (two distinct source documents) → correlated; `rel-003`/`rel-004`
  (same single document) → single-source. Nothing fabricated; deterministic.

## 21. Determinism guarantees

- Same relationship + same version → identical intelligence, order, conflict flags, no
  randomness (no `random`, no time-based jitter in compute).
- `correlation_key` sorts sources lexically before joining.
- Frontend mock mirrors the same rules; unit tests assert equality across repeated calls.

## 22. Observation derivation

- Backend: `derive_observations_bulk` reads `data_provenance` per evidence reference,
  seeding one observation per distinct source; `observed_at` falls back to `None`.
- Frontend mock: source label from the evidence reference's document prefix (before `/`,
  trimmed), falling back to relationship `source`, then the reference. This keeps
  multi-source correlation meaningful (distinct documents → distinct sources).

## 23. Evidence linking & honesty

- Intelligence surfaces `evidence_ids` and a `supported` summary.
- When a relationship has no linked evidence the UI says "No linked evidence" — support is
  never invented.
- Real path evidence comes from the relationships themselves; observation/evidence counts
  are bounded and stable.

## 24. Conflict detection

- Same source holding >1 observation AND base confidence < 0.6 yields a conflict flag
  `conflicting_observations:<source>:<n>`; conflict objects carry `observationId` on the
  frontend types.
- Conflicts are surfaced (never hidden) in the panel and never auto-resolved.

## 25. Confirmation workflow

- Status begins `NEEDS_REVIEW`.
- `confirm` → `REVIEWED` with `reason`; `reject` → `DISCARDED` with `rejection_reason`.
- Both are audited, actor-bound, RBAC-guarded (auditor 403). Buttons only show for
  `NEEDS_REVIEW` + `canReview`.

## 26. Test coverage — backend

`apps/api` — **189 passed** (`pytest -q`). `test_relationship_intelligence.py` (28 tests):
engine determinism, provenance fallback, observation bulk derivation, 3-way evidence match,
confirm/reject + audit + actor-from-auth, auditor 403, list/evaluate endpoints, isolation.
`ruff check app tests` → all checks passed.

## 27. Test coverage — frontend

`apps/web` — **70 suites / 583 tests passed** (9 new):

| Test file | Addition |
| --- | --- |
| `grounding.test.ts` | `RELATIONSHIP_INTELLIGENCE` multi-source + single-source answers, `OPEN_RELATIONSHIP`, neutral-language regex |
| `graph.test.ts` | intelligence-status filter (custom edges) |
| `relationship-intelligence.service.test.ts` | snapshot determinism/edge cases, status labels |
| `investigation-timeline-tab.test.tsx` | relationship entry renders + routes to relationship context |
| `investigation.service.test.ts` | timeline length 3→4 + category present |

## 28. Verification evidence matrix

| Check | Command | Result |
| --- | --- | --- |
| Backend tests | `pytest -q` (apps/api) | **189 passed** |
| Backend lint | `ruff check app tests` | All checks passed |
| Backend compile | `python -m compileall app -q` | OK |
| Postgres DDL (full chain) | `alembic upgrade head --sql` | Compiles clean through `d4e5f6a7b8c9` |
| SQLite model DDL | in-memory `create_all` | All Phase 21 columns + 2 indexes |
| Shared types | `tsc --noEmit` in `packages/types` | Clean |
| Web type check | `npx tsc --noEmit` (apps/web) | Clean (2 pre-existing `linkage.test.ts` errors only) |
| Web lint | `next lint` | Clean (1 pre-existing font warning) |
| Web tests | `npx jest --silent` | **70 suites / 583 passed** |
| Web build (mock) | `NEXT_PUBLIC_USE_MOCK_API=true next build` | 18/18 routes |
| Web build (real) | `NEXT_PUBLIC_USE_MOCK_API=false next build` | 18/18 routes |

## 29. Migrations found & fixed during verification

- Confirmed prior fixes already merged: `b2c3d4e5f6a7_extend_provenance.py` (missing
  `remote_cols=["id"]`) and `c3d4e5f6a7b8_add_resolution_columns.py` — both remain correct.
- New `d4e5f6a7b8c9_relationship_intelligence.py` authored with explicit
  `remote_cols=["id"]` on its FK and verified through the full offline chain.

## 30. Test-environment fixes

- None required this phase. The Phase 20 jest-config react remapping and monorepo hoisting
  remain in place and the full frontend suite runs (70 suites / 583 tests).

## 31. Honest limitations

- No live PostgreSQL migration run — offline DDL + in-memory SQLite `create_all` only.
- Real `/networks/{id}/graph` exposes no per-edge intelligence/direction; the API graph path
  therefore does not tint edges (n+1 intelligence fetches deliberately avoided). Intelligence
  is surfaced in the Context Inspector and list views.
- Mock correlation derives from evidence references; the real backend counts provenance
  sources and may differ by a source when a reference lacks a resolvable provenance row.
- `NEEDS_REVIEW` is the honest default; nothing is auto-confirmed or auto-rejected.
- Confirm/reject RBAC is enforced server-side; the web app has no role store
  (`canReview = true` default) and relies on the API for authorization.

## 32. Explicitly out of scope (declined / not started)

- Live PostgreSQL migration (offline DDL + SQLite only).
- Blockchain, AI agents, Neo4j, Redis/Kafka, Docker — not introduced.
- Relationship auto-confirmation and geo/geofencing analysis — not introduced.
- Perf: no new O(N²) paths in either engine or frontend mirror.

## 33. Verification commands

```bash
# backend
cd apps/api
venv/Scripts/python.exe -m pytest -q
venv/Scripts/python.exe -m ruff check app tests
$env:DATABASE_URL='postgresql+asyncpg://trinetra:trinetra_dev_password@localhost:5432/trinetra_pulse'
venv/Scripts/python.exe -m alembic upgrade head --sql

# frontend
cd apps/web
npx tsc --noEmit
npx next lint
npx jest --silent
$env:NEXT_PUBLIC_USE_MOCK_API='true';  npx next build
$env:NEXT_PUBLIC_USE_MOCK_API='false'; npx next build
```

## 34. Handoff notes

- Phase 22 is **not** started.
- "Relationship intelligence & multi-source correlation" (Phase 21) is complete and verified.
- See `docs/PHASE_21_COMPLETE.md` for the full walkthrough and design notes.
- All language used by the feature remains deliberately neutral — a linkage score is never a
  probability of criminality or guilt.