# Evidence Intelligence & Grounded Retrieval (Phase 12 / 17.6)

A dedicated **evidence intelligence layer** that turns evidence into the *grounding* for the whole investigation: evidence → entities → relationships → findings → events → network → analytics → AI, with **provenance preserved at every hop** — and, since Phase 17.6, a **SHA-256 integrity block** on every persisted evidence row plus an **API-mode surface** that reads the persisted `/api/v2` evidence rows.

```
Evidence domain types (packages/types/src/evidence-intelligence.ts)
        ▲
Phase 12 (demo):  mock/evidence-intelligence.ts   # deterministic 32-item universe (INV-006 / Operation Meridian)
Phase 17.6 (api): src/lib/api/evidence.ts          # typed /api/v2 client + RealEvidence -> UI mapping + integrity
        ▲
evidence.service.ts  (mock)  ·  lib/api/evidence.ts (api)  ── gated by isMockData(), never mixed
        ▲
evidence.store.ts (zustand)      # investigation-scoped selection + search + filters
        ▲
evidence workspace (/evidence)   # Repository / Coverage / Support / Retrieval / Network / Timeline
```

## Scope

| Area | Status |
|---|---|
| Evidence domain model (`EvidenceType`, `EvidenceStatus`, `EvidenceSource`, `EvidenceItem`, `EvidenceProvenance`, `EvidenceLink`, `EvidenceCoverage`, support models) | Done |
| `ExtractionMethod` extended with `ANALYTICAL` | Done |
| Deterministic mock universe (32 items, `ev-intel-001..032`) reusing canonical ids | Done |
| `evidence.service.ts` — search, filters, pagination, coverage, support, retrieval | Done |
| `evidence.store.ts` — investigation-scoped zustand store | Done |
| `ai/evidence-retrieval.ts` — budget-bounded, error-safe grounded retrieval | Done |
| `src/lib/api/evidence.ts` — typed `/api/v2` client, `RealEvidence` → UI mapping, search semantics (17.6) | Done |
| SHA-256 integrity `{checksum, status}` computed on create, stored with the row, returned by the API (17.6) | Done |
| API-mode store wiring: list / detail / selection / inspector / retrieval / network (17.6) | Done |
| Tests (mock + API mode) | Done |

Out of scope (explicitly **not** part of Phase 12 / 17.6): autonomous agents, agentic investigation, suspect ranking, guilt/criminality scoring, predictive policing, automated enforcement, blockchain / web3 / smart contracts (cryptographic integrity *prepares the foundation* for a later chain-of-custody phase), and the relational evidence↔entity/finding/event link endpoints (the **Phase 17.7 boundary** — see below).

## Core principle: provenance over inference

- "**unsupported**" always means *no linked evidence currently available* — **never** "false". Coverage is a workflow view, not a judgement.
- Every result preserves provenance: `source` / `sourceId` / `datasetId` / `observedAt` / `createdAt` / version / hash.
- Evidence **links** (`EvidenceLink.targetType`) reference canonical `entity` / `relationship` / `finding` / `event` / `evidence` ids, and same-entity links (*e.g.* CCTV corroborates a witness statement) are supported.
- `ExtractionMethod.ANALYTICAL` distinguishes analytical evidence (frequency analysis, tower aggregation, network analysis) from observed extraction (NLP / ML / manual).

## Evidence model highlights

- **`EvidenceSource`** — the search/preview shape, carrying denormalised `entityIds` / `findingIds` / `eventIds` for filtering.
- **`EvidenceItem`** — the full record: description, extraction method + confidence, provenance chain, structured metadata, bounded `snippet`, `links`, version history, and a per-item action `timeline`.
- **`EvidenceCoverage`** — per-target support level (`SUPPORTED` / `PARTIALLY_SUPPORTED` / `UNSUPPORTED`) with direct vs contextual breakdown, an optional `gap`, and the assessed evidence ids.
- **Support models** — `RelationshipEvidenceSupport`, `FindingEvidenceSupport`, `EventEvidenceSupport`, `EntityEvidenceSummary` project evidence onto the rest of the domain.

## Grounded AI retrieval

`ai/evidence-retrieval.ts` is the pipeline from **user query → evidence → context builder**:

- `retrieveEvidenceContext` — deterministic relevance scoring, bounded by a retrieval budget (`maxEvidenceItems`, `maxSnippetLength`, `maxLinkedEntities`, `maxLinkedFindings`).
- `buildEvidenceContextBundle` — merges evidence sources into the existing `ContextSourceBundle` for the AI context pipeline.
- `generateEvidenceSourceReferences` — emits clickable source chips with provenance payloads.
- **Error-safe**: a failed or empty retrieval returns `{ evidence: [] }` with an explicit note — evidence is never fabricated.

## Workspace

`/evidence` (Evidence Intelligence) hosts six views:

- **Repository** — search bar (text + type/status filter chips + clear), result list, and a live detail panel with full provenance, links, extraction confidence and per-item activity.
- **Coverage** — the coverage model with supported/partial/unsupported summary plus per-target gaps.
- **Support** — relationship and finding evidence support lists (direct vs contextual, relevance).
- **Retrieval** — grounded retrieval demo with sample queries, budget note and clickable evidence references.
- **Network** — evidence projected onto nodes (entities) and edges (relationships).
- **Timeline** — evidence ordered chronologically by observed date.

All evidence is clearly `DEMO`-labelled; canonical ids are never duplicated inside the same evidence module.

## Phase 17.6 — the persisted evidence surface

When the platform points at a running backend (`NEXT_PUBLIC_USE_MOCK_API=false`) the same workspace reads the **persisted relational evidence rows** instead of the mock universe. Gating follows the rest of the application: `isMockData()` selects the data source; there is **no silent fallback** — an API failure surfaces the store error state, never fabricated demo rows.

- **Client** — `src/lib/api/evidence.ts` re-uses the existing `apiFetch` (no second HTTP layer):
  - `getEvidenceById(id, investigationId?)` → `GET /evidence/{id}?investigation_id=...` (the backend 404s when the scope does not match).
  - `getEvidenceIntegrity(id)` → `GET /evidence/{id}/integrity` (`{checksum, status}`).
  - `loadEvidenceSearch(investigationId, params)` → `GET /investigations/{id}/evidence`, then the same deterministic filter / sort / paginate / facet semantics the mock service uses, applied over the API row set.
- **Mapping** — `mapEvidenceItem` rebuilds the Phase 12 detail shape from the leaner relational row: provenance is rebuilt from the persisted provenance dict + metadata, the **SHA-256 checksum surfaces as `provenance.hash`**, and the `integrity {checksum, status}` block is carried onto `EvidenceItem` (new optional field). UI-only link arrays (`links`, `versions`, `timeline`, entity/finding/event ids) stay **empty** — the relational model does not join those yet.
- **Store** — `evidence.store.ts` branches on `isMockData()` exactly like the investigation store: list/detail/selection load through the API adapter, and the demo-surface anchors (`inv-006`, `ev-intel-001`) resolve to the deterministic Operation Meridian ids in API mode.
- **Surfaces** — Context Inspector evidence resolution, the grounded-retrieval panel, and the network mode all branch on `isMockData()`; the retrieval panel maps the API evidence rows into its `AIContextSource` shape with matching evidence-type chips.

### Integrity block

- Every persisted evidence row carries `{checksum, status}` (`RealEvidenceIntegrity`).
- `checksum` is the **SHA-256 digest of the canonical evidence payload** (title/description/type/date + canonical provenance fields), computed by `apps/api/app/services/evidence_integrity.py` at write time and verified against the stored blob digest at ingestion (`EvidenceStorage`).
- Canonicalization normalises datetimes (naive UTC, microsecond-trimmed) so the digest survives SQLite datetime round-trips.

### Phase 17.7 boundary (kept honest)

Coverage, relationship/finding support, entity summaries and collections have **no relational endpoints yet** (the evidence↔entity/finding/event link model is the Phase 17.7 boundary). In API mode those store slices return **empty arrays** — visible as graceful empty states in the workspace, never fabricated from mock data.

## Files

```
packages/types/src/
  evidence-intelligence.ts   # Phase 12 contracts (+ ExtractionMethod.ANALYTICAL, EvidenceItem.integrity)
  index.ts                   # exports evidence-intelligence

apps/api/app/
  services/evidence_integrity.py   # SHA-256 canonical payload digest + status (17.6)
  services/real/investigation.py   # scoped evidence read, create-with-checksum (17.6)
  api/routers/evidence.py          # GET /evidence/{id}, /evidence/{id}/integrity (17.6)
  api/routers/investigation_resources.py  # list returns integrity per row (17.6)
  storage/evidence_storage.py      # deterministic SHA-256 blob digest (17.6)
  db/seed.py                       # Operation Meridian evidence + checksums (17.6)

apps/web/src/
  mock/evidence-intelligence.ts    # 32-item universe + lookup maps + coverage/support
  services/evidence.service.ts     # query + support + coverage + retrieval surface
  lib/api/evidence.ts              # typed /api/v2 client + RealEvidence -> UI mapping (17.6)
  lib/api/investigations.ts        # RealEvidence + RealEvidenceIntegrity types (17.6)
  state/evidence.store.ts          # investigation-scoped state (mock/API branching)
  ai/evidence-retrieval.ts         # grounded retrieval for AI context
  components/evidence/
    evidence-domain.ts             # type/status/support icon + badge variants
    evidence-detail-panel.tsx      # full provenance + links + activity (+ integrity)
    evidence-list-row.tsx          # repository row
    evidence-search-bar.tsx        # query + type/status filter chips
    evidence-coverage-panel.tsx    # coverage model
    evidence-workspace.tsx         # 6-tab workspace host
    support/                       # relationship + finding support lists
    network/                       # evidence projected onto the network
    timeline/                      # chronological evidence timeline
    retrieval/                     # grounded retrieval demo panel
  services/inspector.service.ts    # Context Inspector evidence resolution (API + mock)
  app/(dashboard)/evidence/page.tsx
  lib/api/evidence.test.ts         # mapping + fetch + search semantics (17.6)
  state/evidence.store.api.test.ts # API-mode store routing (17.6)
  services/evidence.service.test.ts
  state/evidence.store.test.ts
  ai/evidence-retrieval.test.ts
```

## Testing

```bash
cd apps/web
npx jest --selectProjects unit --testPathPattern "evidence"
```

Phase 12 adds tests for the service (search/filter/pagination, coverage, support, retrieval budget + scope + truncation), the store (scope, selection, filters, clear), and the grounded retrieval pipeline (budget, truncation, error-safe empty results, references with provenance payloads). Phase 17.6 adds tests for the API adapter (`evidence.test.ts`: mapping, integrity surfacing, fetch layer, deterministic search/pagination, honest non-modeled-filter semantics) and the API-mode store (`evidence.store.api.test.ts`: list/detail routing through the adapter, failure → error state with no mock fallback, empty coverage/support slices, investigation-switch reload). Backend integrity tests live in `apps/api/tests/test_evidence_api.py` and `test_evidence_storage.py`.
