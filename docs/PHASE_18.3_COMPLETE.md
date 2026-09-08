# PHASE 18.3 COMPLETE

## 1. Objective

Implemented a real, deterministic, investigation-scoped suspicious-pattern
system over persisted SQLAlchemy entities, relationships, and evidence
references. Results are investigative leads, not accusations or guilt scores.

## 2. Files Created

- `apps/api/app/intelligence/anomaly_detection.py`
- `apps/api/app/api/routers/patterns.py`
- `apps/api/app/services/real/patterns.py`
- `apps/api/app/schemas/real/patterns.py`
- `apps/api/tests/test_pattern_detection.py`
- `apps/web/src/lib/api/patterns.ts`
- `packages/types/src/patterns.ts`

## 3. Files Modified

- `apps/api/app/api/app.py`
- `apps/web/src/state/analytics.store.ts`
- `apps/web/src/components/analytics/patterns-view.tsx`
- `apps/web/src/components/analytics/analytics-graph-integration.ts`
- `apps/web/src/state/analytics.store.api.test.ts`
- `packages/types/src/index.ts`
- `README.md`
- `docs/README.md`
- `docs/REAL_APPLICATION_ARCHITECTURE.md`

## 4. Detection Patterns Implemented

`CIRCULAR_FUND_FLOW`, `BURNER_SIM`, `NETWORK_HUB`, `BRIDGE_ENTITY`, and
`RAPID_RELATIONSHIP_EXPANSION`.

## 5. Detection Methodology

Cycles are directed DFS paths capped at six entities and canonicalized by
rotation, so duplicate rotations are not returned. Hubs use degree outliers
within the current investigation. Bridges use articulation-point analysis on
the existing undirected graph. Phone switching uses persisted person/phone
entity types and relationship timestamps. Expansion requires real relationship
start/end timestamps and a doubling plus at least two additional relationships
between the two observed halves of the available range.

Numeric amounts are summed only from existing numeric relationship metadata.
Missing amounts stay `null`. Evidence IDs are emitted only when a referenced
ID is present in the same investigation's persisted evidence rows.

Explicit limits are `MAX_CYCLE_LENGTH=6`, batched relationship loading of
5,000 rows, entity/evidence loading of 1,000/5,000 rows, and `MAX_RESULTS=100`.

## 6. Backend API

`GET /api/v2/investigations/{investigation_id}/patterns` returns a typed
`PatternDetectionResponse` containing stable SHA-256-derived result IDs,
pattern type, severity, confidence, explanation, source IDs, metadata, and
detected timestamp. Missing investigations use the existing
`investigation_not_found` error contract.

## 7. Frontend Integration

API mode loads analytics summary and patterns together through the existing
API client and Zustand analytics store. Pattern cards show analytical
severity, confidence, explanations, source entities, and evidence references.
Entity and evidence selections reuse the existing graph and Context Inspector
architecture. Mock mode remains on the existing structural engine.

## 8. Investigation Isolation

The route validates the requested investigation before loading any data.
Every repository query is filtered by `investigation_id`, and evidence
references are intersected with evidence rows from that investigation. The
detectors accept already-scoped inputs and never query globally.

## 9. Explainability

Every result includes a plain-language reason, the participating entity IDs,
supporting relationship IDs, valid evidence IDs, confidence, severity, and
detector metadata. Wording uses “potential”, “observed”, “hub”, “bridge”, and
“investigative lead”; it does not state or imply guilt.

## 10. Mock/API Behavior

`NEXT_PUBLIC_USE_MOCK_API=true` is unchanged and uses deterministic in-memory
demo data. `false` calls the real `/api/v2` analytics and patterns endpoints.
API failures are surfaced as the analytics error state; there is no silent
fallback to mock intelligence.

## 11. Tests Added

One backend detector test module with **5 tests** covers cycle uniqueness and
missing amounts, scope-safe inputs, phone switching with timestamps, hub and
bridge signals, and timestamp-gated expansion.

Existing frontend API analytics regression tests were extended to mock the new
typed patterns endpoint, preserving the existing API-mode contract.

## 12. Verification Results

- Backend targeted detector tests: **5 passed**
- Backend Ruff check (`app` and detector tests): **passed**
- Backend Python compilation: **passed**
- Frontend TypeScript check: **passed**
- Frontend Jest suite: **84 suites, 689 tests; passed after the API-mode
  regression fixture was updated for the new endpoint**

## 13. Regression Results

Existing mock analytics, graph, Context Inspector, authentication/RBAC, and
investigation workspace behavior remained on their existing paths. No Docker,
new infrastructure, or schema migration was introduced.

## 14. Operation Meridian Verification

No seed data was changed and no intelligence was fabricated. Operation
Meridian's real results depend on the persisted relationships, entity types,
evidence references, and relationship timestamps present in its database.
When those records do not meet a detector's rule, that detector returns no
qualifying result.

## 15. Known Limitations

The current relational model has no dedicated transaction amount column, so
amount totals are only available when numeric relationship metadata exists.
Phone semantics depend on persisted entity typing. Expansion uses relationship
start/end dates, not server `created_at`, because created-at timestamps alone
do not establish observed activity timing. API-mode analytics still maps the
existing summary endpoint for non-pattern centrality/community detail.

## 16. PostgreSQL/Render Status

No live PostgreSQL or Render environment was exercised for this phase. The
implementation uses the existing SQLAlchemy/PostgreSQL-compatible models and
requires no migration.

## 17. Phase 18.4 — NOT STARTED

Phase 18.4 was not started.
