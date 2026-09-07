# Evidence Intelligence & Grounded Retrieval (Phase 12)

A dedicated **evidence intelligence layer** that turns evidence into the *grounding* for the whole investigation: evidence → entities → relationships → findings → events → network → analytics → AI, with **provenance preserved at every hop**.

```
Evidence domain types (packages/types/src/evidence-intelligence.ts)
        ▲
mock/evidence-intelligence.ts    # deterministic 32-item universe (INV-006 / Operation Meridian)
        ▲
evidence.service.ts              # list / get / coverage / support / retrieval
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
| Evidence workspace UI (Repository / Coverage / Support / Retrieval / Network / Timeline) | Done |
| Tests | Done |

Out of scope (explicitly **not** part of Phase 12): autonomous agents, agentic investigation, suspect ranking, guilt/criminality scoring, predictive policing, and automated enforcement. Evidence intelligence is a **grounded, transparent tool** — never an oracle.

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

## Files

```
packages/types/src/
  evidence-intelligence.ts   # Phase 12 contracts (+ ExtractionMethod.ANALYTICAL)
  index.ts                   # exports evidence-intelligence

apps/web/src/
  mock/evidence-intelligence.ts    # 32-item universe + lookup maps + coverage/support
  services/evidence.service.ts     # query + support + coverage + retrieval surface
  state/evidence.store.ts          # investigation-scoped state
  ai/evidence-retrieval.ts         # grounded retrieval for AI context
  components/evidence/
    evidence-domain.ts             # type/status/support icon + badge variants
    evidence-detail-panel.tsx      # full provenance + links + activity
    evidence-list-row.tsx          # repository row
    evidence-search-bar.tsx        # query + type/status filter chips
    evidence-coverage-panel.tsx    # coverage model
    evidence-workspace.tsx         # 6-tab workspace host
    support/                       # relationship + finding support lists
    network/                       # evidence projected onto the network
    timeline/                      # chronological evidence timeline
    retrieval/                     # grounded retrieval demo panel
  app/(dashboard)/evidence/page.tsx
  services/evidence.service.test.ts
  state/evidence.store.test.ts
  ai/evidence-retrieval.test.ts
```

## Testing

```bash
cd apps/web
npx jest --selectProjects unit --testPathPattern "evidence"
```

Phase 12 adds tests for the service (search/filter/pagination, coverage, support, retrieval budget + scope + truncation), the store (scope, selection, filters, clear), and the grounded retrieval pipeline (budget, truncation, error-safe empty results, references with provenance payloads).
