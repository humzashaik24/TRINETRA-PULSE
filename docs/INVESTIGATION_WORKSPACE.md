# Investigation Workspace (Phase 9)

A unified **investigation workspace** that brings cases, entities, relationships, networks, analytics, evidence, documents, events, findings, timeline and notes into one working surface with **select → inspect → connect → analyze → document** semantics.

```
Investigation (Phase 9) ──► workspace shell (tabs) ──► store ──► service (mock) ──► inspector + NetworkGraph
```

## Scope

| Area | Status |
|---|---|
| Investigation domain types (lifecycle, identity model, naming) | Done |
| Deterministic mock universe (5 investigations reusing Phase 4–8 ids) | Done |
| `investigation.service.ts` — query + mutation surface | Done |
| `investigation.store.ts` — optimistic workspace state + dirty tracking | Done |
| Shell / inspector wiring (investigation, note, event, analytics snapshot contexts) | Done |
| `/investigations` listing page (search / filter / sort) | Done |
| `/investigations/[id]` workspace (8 tabs) | Done |
| Command-palette + breadcrumb integration | Done |
| Tests | Done |

Out of scope (explicitly **not** part of Phase 9): an AI assistant, automated report generation, predictive crime modelling, and any suspect / guilt / criminality scoring. The workspace is an investigator's tool, not a dashboard and not an oracle.

## Lifecycle

Investigations are **curated** records that *reference* canonical Phase 4–8 objects rather than duplicating them. Status is a lifecycle value, never a criminal assessment:

`draft → active → under_review → suspended → closed → archived`

Priority is **workflow** priority only (`low / normal / high / critical`) — it never denotes criminality.

## Terminology & naming

Neutral investigation language only:

- Observed / Inferred / Linked / Referenced / Detected / Associated
- Structurally important / Bridge entity / Network influence / Analytical finding
- A finding is a *finding*, never "proof".
- Workflow priority (Low/Normal/High/Critical), never criminality.
- A confirmed objective link is only ever stated against an authoritative case reference.

The `InvestigationActivity` type name was already taken by the Phase 8 dashboard, so the per-investigation activity entry is named **`InvestigationActivityEntry`** (categories via `InvestigationActivityType`).

## Identity model & provenance

- Phase 9 introduces **no new Entity / Relationship / Evidence / Network / Analytics types** — it references the canonical ids (`ent-…`, `ev-…`, `rel-…`, `NET-…`, `event-…`).
- Every linked object carries provenance: `sourceType` / `sourceId` / `linkedBy` / `linkedAt`.
- Evidence added live through the UI is clearly flagged demo/mock via `metadata.is_mock`.

## Confidence semantics

Confidence is *extraction / resolution / relationship / analytical / finding* confidence. There is **no** guilt / criminal / suspect / danger probability anywhere in the model or UI.

> **Phase 12** — the lightweight Phase 9 evidence linker is complemented by the full evidence intelligence layer (provenance, coverage, relationship/finding/event support, network + timeline evidence modes, and grounded AI retrieval). See [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md).

## Architecture

```
Investigation domain types (packages/types/src/investigation.ts)
        ▲
mock/investigations.ts             # deterministic 5-investigation universe
        ▲
investigation.service.ts           # query/mutation surface (mock-backed, latency-windowed)
        ▲
investigation.store.ts (zustand)   # optimistic workspace data + `dirty` flag
        ▲
investigation-shell.tsx            # 8-tab workspace chrome
        └─► overview / network / entities / evidence / timeline /
            findings / notes / activity panels
```

### Files

```
packages/types/src/
  investigation.ts               # Phase 9 contracts

apps/web/src/
  mock/investigations.ts         # INV-001..005 deterministic records
  services/investigation.service.ts  # get/update/create + nested resource endpoints
  state/investigation.store.ts   # optimistic edits + unsaved-changes (dirty) flag
  state/shell.store.ts           # + investigation / note / event / analytics_snapshot contexts
  services/inspector.service.ts  # investigation/note/event/analytics-snapshot resolvers
  components/shell/inspector/     # inspector header/content/views for the new contexts
  components/shell/investigation-shell.tsx   # INVESTIGATION_TABS
  components/investigation/       # overview + 7 tab panels + network tab
  app/(dashboard)/investigations/
    page.tsx                     # listing (search/filter/sort)
    [id]/page.tsx                # workspace host (dirty-warn, tab-scoped state)
  lib/workspace.ts               # breadcrumb titles for /investigations/[id]
  components/search/command-palette.tsx  # investigation quick entries
```

## Workspace semantics

- **Select → Inspect** — picking a linked entity (or evidence / event / note) opens it in the shell inspector in place.
- **Connect** — the Entities tab links additional canonical entities; Evidence links demo (is_mock) records.
- **Analyze** — the Network tab reuses the Phase 7 `NetworkGraph`, loads the primary linked network into the graph store, and links out to `/networks/[netId]/analytics`.
- **Document** — findings and notes are created / edited / deleted with inline forms.
- **Unsaved changes** — every optimistic edit sets the store `dirty` flag; the workspace warns before the tab/page is left (`beforeunload`).

## Testing

Phase 9 tests cover the service, the store, the listing page and the interactive tab panels.

```bash
cd apps/web
npx jest --selectProjects unit --testPathPattern "investigation"
npx jest --selectProjects components --testPathPattern "investigation"
```

The Network tab imports the React Flow renderer (`NetworkGraph`), so it is **not exercised in jsdom** — the other tabs and the service/store are.
