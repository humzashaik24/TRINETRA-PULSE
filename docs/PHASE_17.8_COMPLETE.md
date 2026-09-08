# PHASE 17.8 COMPLETE

## Objective & scope

Move the **Relationship** surface from mock/in-memory reads onto the **real
persisted `/api/v2` path**: Frontend typed API client
(`lib/api/relationships.ts`) -> FastAPI `/api/v2` -> `InvestigationService` ->
`RelationshipRepository` -> PostgreSQL `relationships` table, while keeping mock
mode (`NEXT_PUBLIC_USE_MOCK_API=true`) fully intact.

Data-source gating follows the Phase 17 series exactly: `isMockData()` selects
the source; the two are **never mixed**, and there is **no silent API->mock
fallback** -- an API failure surfaces the page / inspector error state, never
fabricated relationship rows.

## Relationship Audit (before)

- **Backend** had an investigation-scoped relationship *list*
  (`GET /investigations/{id}/relationships`, limit 500) but the **detail read
  was unscoped**: `GET /relationships/{id}` resolved any persisted row with no
  cross-investigation protection (the entities/evidence routers already had
  scoped detail since 17.6/17.7). `RelationshipRead` did **not** expose the
  persisted `extraction_method` column even though the model stores it, and
  there was **no `get_relationship_scoped`** service method. There is **no**
  `POST /relationships` and no UI creation flow.
- **Frontend** already read real relationships for the investigation workspace
  list (Phase 17.4 `loadInvestigationWorkspace`) and the network graph edges
  (Phase 17.2 `mapApiGraphToNetworkGraph`). The two remaining relationship
  surfaces still used the mock universe in API mode:
  - `entities.ts` `loadEntityDetailBundle` returned **honestly empty**
    `relationships` / `related` (the Relations tab on `/entities/[id]` showed
    nothing in API mode).
  - `inspector.service.ts` relationship case had **no `isMockData()` branch**,
    so a hint-less relationship context (e.g. from the AI assistant bridge) fell
    through to the mock `fetchRelationship` even in API mode.
- **Vocabulary mismatch**: the persisted `relationship_type`
  (`known_associiate` [sic], `family`, `communicates`, `transaction`,
  `located_at`, `owns`, `member_of`, `contacts`, `travels_with`,
  `associated_with`, `other`), `verification_status` (`possible` has no UI
  member) and `extraction_method` (`ai_nlp`, `ai_cv`, ...) do not match the UI
  domain unions (`RelationshipKind`, `RelationshipCandidateStatus`,
  `ExtractionMethod`).

## Before -> After

| Surface | Before (API mode) | After (Phase 17.8) |
|---|---|---|
| `GET /relationships/{id}` | unscoped read | `?investigation_id=` scoped -> 404 on scope mismatch |
| `RelationshipRead` | no `extraction_method` | `extraction_method` persisted + serialized |
| Entity detail Relations tab | empty / 0 | real relationship rows, resolved names, real counts |
| Context Inspector relationship | mock leak (no `isMockData()` branch) | authoritative scoped read in API mode |
| Persisted vocabulary | raw backend values | deterministic documented UI mapping |
| `POST /relationships` | absent | absent (no UI flow -> deferred) |

## Real Relationship API Flow (API mode)

```
/entities/[id] page
  -> loadEntityDetailBundle(id, DEMO_INVESTIGATION_ID)        lib/api/entities.ts
  -> loadEntityRelationships(entityId, invId)                 lib/api/relationships.ts
      -> listRelationshipsForInvestigation(invId)             lib/api/investigations.ts
      -> listEntitiesForInvestigation(invId)                  (investigation-scoped)
      -> mapApiRelationship(row, entityById)                  deterministic kind/status/extraction
      -> relatedFrom(relationships, entityId)
  -> summary.connections = relationships.length               real count

Context Inspector (relationship context)
  -> resolveInspectorContext({type:'relationship'})           services/inspector.service.ts
      isMockData()? no
  -> loadRelationshipDetail(id, ctx.investigationId)          lib/api/relationships.ts
      -> getRelationshipScoped(id, invId)                     GET /relationships/{id}?investigation_id=...
      -> getEntityScoped(source/target ids)                   resolve names/types
  -> mapRelationship(rel) -> InspectorRelationshipView        rendered by inspector
```

Backend:

```
GET /api/v2/relationships/{id}?investigation_id=...
  routers/relationships.py
  -> InvestigationService.get_relationship_scoped(id, inv_id) services/real/investigation.py
      get_relationship(id) + scope guard (404 RelationshipNotFoundError)
  -> RelationshipRead.model_validate(rel)                     schemas/real/investigation.py (extraction_method now present)
```

## Mock Relationship Flow (mock mode)

Unchanged. `NEXT_PUBLIC_USE_MOCK_API=true` keeps:
- `services/entity.service.ts` `fetchRelationship(id)` /
  `fetchEntityRelationships(id)` (the deterministic mock universe
  `mockEntityRelationships`).
- Inspector relationship resolution keeps the graph-hint optimistic shortcut
  **and** the mock `fetchRelationship` path.
- Entity detail page keeps `fetchEntityDetailBundle` (mock) with its rich mock
  relationship rows.

The two branches are mutually exclusive and never mixed.

## Relationship Persistence

- `Relationship` model (`app/models/relationship.py`) persists the full surface:
  `investigation_id`, `source_entity_id`, `target_entity_id`, `relationship_type`,
  `confidence`, `source`, `evidence_refs` (JSONB), `extraction_method` (enum,
  default `manual`), `verification_status` (enum, default `needs_review`),
  `description`, `weight`, `start_date`/`end_date`, `metadata_`, timestamps.
- `RelationshipRead` now serializes **all** of these (added `extraction_method`).
- Seeded Operation Meridian relationships (rel-001/003/005/008) read back
  exactly: type, confidence, source, evidence refs, verification status,
  description, weight, `metadata.is_demo`, `extraction_method="manual"`.
- Streaming an updated `extraction_method` value (e.g. `ai_nlp`) round-trips
  through the API (covered by `test_relationship_extraction_method_persisted`).

## Investigation Isolation

- `get_relationship_scoped(relationship_id, investigation_id)` 404s when the
  scope does not match -- the same no-existence-leak contract as entities and
  evidence. Verified by:
  - `test_relationship_cross_investigation_rejected` (stitched relationship
    owned by another investigation; scoped read from Meridian's scope 404s,
    correct scope 200, unscoped still resolves).
  - `test_relationship_cross_investigation_list_is_isolated` (a foreign
    investigation's relationship never leaks into Meridian's nested list).
- Every relationship detail read in the frontend is scoped to the active
  investigation (`ctx.investigationId`, `DEMO_INVESTIGATION_ID`).

## Entity <-> Relationship Integrity

- Seeded and ingested relationships only ever reference entities that live in
  the **same investigation** (`test_relationship_entities_share_investigation`
  checks every row's source/target against the scoped entity set).
- The frontend name/type resolution uses only the investigation-scoped entity
  rows (`loadInvestigationEntityLookup`), so a foreign entity cannot be
  referenced or surfaced.

## Relationship Provenance

- Ingested relationships are written with the `data_provenance` rows
  (`relationship_id` set) by `_create_relationship_provenance`
  (`test_ingestion_relationships_surface_via_api` asserts provenance rows
  exist for ingested relationships).
- Persisted provenance fields ride through the mapping: `source`, `evidence_refs`,
  `metadata`, `verification_status`, `extraction_method`.

## Ingestion Compatibility

- `IngestionPipeline._find_or_create_relationship` deduplicates by
  (investigation_id, source_entity_id, target_entity_id, relationship_type) and
  persists `source` = dataset name, `evidence_refs`, `description`;
  `extraction_method` stays the model default `manual` (noted honestly in
  "Known Limitations").
- New backend test runs the pipeline against a fresh investigation and verifies
  the created rows surface through both the scoped list and scoped detail API,
  with the expected `associated_with` type, `source="CDR Test"`,
  `verification_status="needs_review"`, and provenance rows.
- Frontend `relationships` tests reuse the same persisted row shapes.

## Relationship Extraction Status

- The persisted `extraction_method` now flows through the API (`RelationshipRead`)
  and the typed client (`RealRelationship.extraction_method`) into the UI
  `MethodBadge` via a deterministic documented mapping:
  - `manual -> MANUAL`, `ai_nlp -> NLP`, `ai_cv/ai_audio/network_analysis ->
    ANALYTICAL`, `document_parse -> RULE_BASED`, `database_import ->
    STRUCTURED_MAPPING`, unknown -> `MANUAL`.
- `relationshipKindFrom` (entity-type-aware):
  - `known_associiate` (documented backend spelling) / `family` -> `KNOWS`
  - `transaction` -> `SENT_TRANSACTION`, `owns` -> `OWNS`,
    `located_at` -> `LOCATED_AT`, `member_of` -> `PART_OF`,
    `travels_with` -> `SUPPORTED_BY`, `communicates`/`contacts` -> `USES`
  - `associated_with` -> `USES` for person<->device links, else `INVOLVED_IN`
  - `other` -> `WORKS_FOR` for organization links, else `PART_OF`
  - unknown -> `PART_OF`
- `verificationStatusFrom`: `confirmed/probable/rejected/needs_review` map
  1:1; `possible` -> `CANDIDATE` (the relationship union has no POSSIBLE
  member); unknown -> `NEEDS_REVIEW`.
- The network graph edge mapping (`mapApiGraphToNetworkGraph`) is unchanged and
  remains compatible (edges stay driven by `NetworkService.graph`).

## Network Graph Compatibility

- Unchanged (Phase 17.2). `GET /networks/{id}/graph` maps persisted
  relationships to edges `{id, source, target, relationship_type, weight}`; the
  seeded Operation Meridian universe still yields **4 relationships and 4 graph
  edges** (`test_api_v2.py`). The inspector graph-edge contexts still resolve
  via `graph-inspector.ts` `graphEdgeToContext` (hints), but in API mode the
  relationship case now re-reads the authoritative persisted row instead of
  trusting hints alone.

## Context Inspector

- `inspector.service.ts` relationship case now branches on `isMockData()`:
  - API mode: `loadRelationshipDetail(ctx.id, ctx.investigationId)` ->
    `mapRelationship` -> `InspectorRelationshipView` (source/target names and
    types resolved from persisted entities). Even when graph hints are present,
    API mode reads the **authoritative** persisted row; failures are an explicit
    `{status:'error'}` state -- never the mock `fetchRelationship`.
  - Mock mode: unchanged (graph-hint shortcut then mock `fetchRelationship`).

## Relationship -> Entity

- `EntityRelationship` carries `sourceEntityId` / `targetEntityId` resolved in
  API mode; the entity Relations tab (`entity-relationships.tsx`) computes the
  "other" entity and navigates via `onNavigate(other.id)` to
  `/entities/{id}`.
- `relatedFrom` derives the `RelatedEntity[]` list driving the related-entities
  slice and summary counts.

## Relationship -> Network

- The network graph edges remain the persisted relationships (Phase 17.2), and
  `loadEntityRelationships` returns the same persisted rows, so the entity
  detail Relations tab and the network workspace agree on the same
  relationship set and counts.

## Security

- Cross-investigation existence leaks are prevented at the source: scoped
  detail 404s on scope mismatch (`RelationshipNotFoundError`, resource
  `Relationships`), list reads are inherently investigation-scoped, and the
  error contract is uniform `{code, message, details, status_code}`.
- No new surface introduces secrets; the existing `X-User-Id` identity gate
  applies to the whole `/api/v2` app.

## Tests Added

- **Backend** `apps/api/tests/test_relationship_api.py` (**12 tests**):
  scoped list (4 rows, all Meridian), persisted detail (type/confidence/source/
  evidence/verification/description/weight/metadata/extraction_method),
  extraction_method present on every seed row, scoped detail resolve,
  cross-investigation scoped 404 + correct-scope 200 + unscoped 200,
  cross-investigation list isolation, missing id 404 (error contract),
  malformed id 422, entity-integrity (same investigation), persisted
  extraction_method round-trip (`ai_nlp`), ingestion-created relationships via
  list+detail+provenance, error contract key-set.
- **Frontend** new `apps/web/src/lib/api/relationships.test.ts` (vocabulary
  translation incl. `possible->CANDIDATE`, `mapApiRelationship` with resolved
  names, `canonicalRelationshipId`, `loadRelationshipDetail` scoped/unscoped/
  failure, `loadEntityRelationships` sorting + derived `related` + no-fallback);
  new `services/inspector.service.relationship.api.test.ts` (API-mode
  resolution, hints still re-read the persisted row, error state without mock
  fallback); updated `lib/api/entities.test.ts` (Relations tab populated from
  persisted rows + summary counts, scope-absent empty honesty, relationship
  fetch failure does not fabricate rows).

## Verification

### Backend (Windows native, SQLite override -- no local PostgreSQL)
- Full `pytest` suite: **175 passed, 3 warnings** (pre-existing Starlette
  deprecation + Postgres extension defaults on SQLite). Baseline was 163;
  **+12** new relationship tests.
- `ruff check app tests`: **All checks passed**.
- Seeded Operation Meridian intact: 4 relationships, graph `edges == 4`,
  summary `relationship_count == 4` (asserted by `test_api_v2.py`).

### Frontend (apps/web)
- `npx tsc --noEmit`: clean.
- `npx eslint`: clean (1 pre-existing `no-page-custom-font` warning).
- `npx jest`: **73 suites / 625 tests passed** (baseline 71/604; **+21** from
  the new/updated relationship tests).
- `npm run build`: green (21 routes incl. `/entities/[id]`).

## Files Created / Modified

- **Backend created**: `apps/api/tests/test_relationship_api.py`.
- **Backend modified**: `apps/api/app/api/routers/relationships.py` (scoped
  detail), `apps/api/app/services/real/investigation.py`
  (`get_relationship_scoped`), `apps/api/app/schemas/real/investigation.py`
  (`RelationshipRead.extraction_method`).
- **Frontend created**: `apps/web/src/lib/api/relationships.ts`,
  `apps/web/src/lib/api/relationships.test.ts`,
  `apps/web/src/services/inspector.service.relationship.api.test.ts`.
- **Frontend modified**: `apps/web/src/lib/api/investigations.ts`
  (`RealRelationship.extraction_method`, `getRelationship`,
  `getRelationshipScoped`), `apps/web/src/lib/api/entities.ts`
  (`loadEntityDetailBundle` populates relationships/related + summary counts),
  `apps/web/src/services/inspector.service.ts` (relationship API branch),
  `apps/web/src/app/(dashboard)/entities/[id]/page.tsx` (API-mode comment),
  `apps/web/src/lib/api/entities.test.ts` (bundle tests).
- **Docs**: `docs/PHASE_17.8_COMPLETE.md` (this file),
  `docs/REAL_APPLICATION_ARCHITECTURE.md` (17.8 bullet, router table,
  verification numbers), `docs/README.md` (Phase 17.8 section).
- **Deleted**: none.

## Mock-API Behavior

- Mock mode is byte-for-byte the same user experience: mock relationship
  service, graph-hint shortcut, `fetchEntityDetailBundle`. All 73 jest suites
  (incl. the pre-existing mock inspector/entity-service tests) pass.
- API mode never imports the mock relationship service for these surfaces
  (asserted in the inspector and adapter tests with `not.toHaveBeenCalled()`).

## Known Limitations

- The `RelationshipType` enum stores `known_associiate` (documented spelling
  error); the mapping keys on that literal value and is applied via
  `relationshipKindFrom` so the UI renders the correct `KNOWS`/etc. kind.
- Ingestion-created relationships keep the model default
  `extraction_method="manual"`; the pipeline does not set a sensor-derived
  method. Honest, but noted for a later phase.
- In API mode a relationship-surface fetch failure inside the entity detail
  bundle yields honest empty relations (with the entity row + summary still
  valid); it never fabricates rows.
- Verified against throwaway SQLite (no local PostgreSQL/Render provisioned);
  PostgreSQL DDL remains verified via Alembic offline mode. Live PostgreSQL
  verification is pending deployment.

## Deferred Work (explicitly not done)

- **Relationship creation / mutation**: no `POST /relationships` endpoint, no
  service `create_relationship`, and no UI flow that needs one; the mock-only
  `addRelationshipToInvestigation` remains deferred. Documented honestly.
- Relationship-evidence support / coverage / collections surfaces still have no
  relational endpoint and stay `[]` in API mode (Phase 17.6 boundary carried
  forward).
- Per-entity resolution history, events/activity/findings link surfaces,
  `entity_resolutions` API.

## Exact Phase 17.9 Boundary

The next phase should extend the real `/api/v2` surface to the **Findings** and
**Notes/Events** domains (the remaining nested investigation resources), keeping
the same `isMockData()` boundary, investigation-scoped scoped detail reads,
typed adapter per domain, and no-silent-fallback guarantee. Relationships are
**complete** -- STOP here. No new relationship endpoints, no relationship
creation/editing, no findings/notes/events migration, no RBAC or auth rewrite,
no blockchain/score/agent features in 17.9.