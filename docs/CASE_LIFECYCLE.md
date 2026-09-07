# Case Lifecycle & Intelligence Operations (Phase 11)

An **operational shell** that answers *"which investigation am I viewing and how far has it come?"* — pipeline progress, readiness, health, the review queue, cross-references and provenance chains, operator activity, saved views, graph/timeline bookmarks, investigation-scoped search — layered on top of the Phase 9 investigation workspace and the Phase 0–10 intelligence surfaces.

```
Investigation (Phase 9) ──► operations store ──► operations service (mock) ──► panels
    ▲                             ▲                        │
    └───── cross-references ──────┘                        └──► real canonical ids (ent-/rel-/ev-/ds-/inf-)
```

## Scope

| Area | Status |
|---|---|
| `investigation-operations.ts` types (pipeline, readiness, health, review, activity, views, bookmarks, cross-references, provenance, search) | Done |
| Demo investigation **Operation Meridian** (`inv-006`) with seeded operations data | Done |
| `investigation-operations.service.ts` — query surface + session views/bookmarks + create | Done |
| `investigation-operations.store.ts` — operations state (Zustand + devtools) | Done |
| Operations tab (pipeline / readiness / health / review queue / cross-refs / provenance / activity) | Done |
| Investigation switcher + `DEMO DATA` indicator in the workspace header | Done |
| `/investigations/new` setup page + listing CTA + command-palette entry | Done |
| Dashboard "Active Investigations" panel (link + review counts) | Done |
| Backend endpoints (`/investigation-operations`) + Pydantic schemas + in-memory service + tests | Done |

Out of scope (explicitly **not** part of Phase 11): autonomous investigation, guilt / suspect / criminality scoring, predictive policing, automated case decisions, facial recognition, automated evidence generation, and Phase 12. All lifecycle language stays neutral and operational.

## Lifecycle statuses

The workspace already models `InvestigationStatus` (`draft / active / under_review / suspended / closed / archived`). Phase 11 documents the canonical operational alias **`CaseLifecycleStatus`** (`draft / active / on_hold / review / closed`) while remaining fully **compatible with the existing `Investigation.status` field** — no data migration is required.

## Neutral terminology

- Pipeline stages run `data → extraction → resolution → relationships → network → analytics → evidence → findings → timeline`.
- Readiness is *operational coverage* ("ready / in_progress / not_started / needs_attention"), never a judgement.
- Health is *coverage* (data completeness, resolution coverage, …), never reliability of people.
- Review priorities are `LOW / MEDIUM / HIGH** workflow items awaiting an investigator decision — nothing is auto-judged.

## Identity & provenance

- Cross-references and provenance chains reference **real canonical ids** (entities `ent-…`, relationships `rel-…`, evidence `ev-…`, datasets `ds-…`, findings `inf-…`) — there are **no orphan / fake ids**.
- A provenance chain is `source → dataset → record → entity → relationship → finding`, so every analytical conclusion is traceable.

## Architecture

```
packages/types/src/investigation-operations.ts   # Phase 11 contracts
        ▲
mock/investigation-operations.ts                # deterministic operations (inv-001 & inv-006)
mock/investigations.ts                          # + inv-006 "Operation Meridian" record
        ▲
investigation-operations.service.ts             # query + session-created views/bookmarks
        ▲
investigation-operations.store.ts (zustand)     # pipeline · readiness · health · review · activity ·
                                                #   saved views · bookmarks · cross-refs · provenance
        ▲
investigation-shell.tsx                        # + "Operations" tab
        └─► pipeline / readiness / health / review-queue / cross-refs / provenance / activity panels
```

### Files

```
packages/types/src/
  investigation-operations.ts          # Phase 11 contracts (exported from index)

apps/web/src/
  mock/investigation-operations.ts     # OPERATIONS mock (deterministic, canonical ids)
  mock/investigations.ts               # + inv-006 Operation Meridian
  services/investigation-operations.service.ts   # ops surface + create-from-setup
  state/investigation-operations.store.ts        # ops state (devtools)
  components/investigation/investigation-operations-tab.tsx
  components/investigation/operations/           # pipeline / readiness / health / review /
                                                #   cross-refs / provenance / activity panels
  components/investigation/investigation-switcher.tsx
  components/investigation/demo-data-indicator.tsx
  components/dashboard/active-investigations.tsx
  app/(dashboard)/investigations/new/page.tsx    # setup form → real create flow
  components/search/command-palette.tsx          # + "New Investigation" command
  app/(dashboard)/overview/page.tsx              # + Active Investigations panel

apps/api/app/
  schemas/investigation_operations.py   # Pydantic (snake_case, mirrors the api convention)
  services/investigation_operations.py  # in-memory seed + query/mutation surface
  investigation_operations/router.py    # FastAPI router (registered in main.py)
```

## Backend endpoints

All scoped per investigation under `/api/v1/investigation-operations`:

- `GET /{id}/pipeline`, `GET /{id}/readiness`, `GET /{id}/health`
- `GET /{id}/review-queue[?resolved=]`
- `GET /{id}/activity`
- `GET/POST/DELETE /{id}/saved-views`
- `GET/POST/DELETE /{id}/graph-bookmarks`
- `GET/POST/DELETE /{id}/timeline-bookmarks`
- `GET /{id}/cross-references[?entity_id=]`
- `GET /{id}/provenance[?target_id=]`
- `GET /{id}/search?q=` and `GET /search?q=&kind=` (cross-investigation)

## Testing

```bash
# web — operations service + operations tab + dashboard panel
cd apps/web
npx jest --testPathPattern "investigation-operations"

# api
cd apps/api
venv/Scripts/python.exe -m pytest tests/test_investigation_operations.py -q
```
