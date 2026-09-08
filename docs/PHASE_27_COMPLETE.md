# PHASE 27 COMPLETE

## 1. Objective

Connect existing investigative intelligence into a unified **read-only
investigation workspace** — an analyst-facing navigation and context layer that
turns the already-persisted data (case summary, findings, timeline events,
scoped entity/relationship/evidence lists, grounded investigation directions
and their supporting facts) into one coherent "command center" per
investigation:

```
Workspace tabs (existing) -> Overview command center (counts + directions summary)
                            -> Directions tab (priority/type filters + detail panel)
                            -> Grounded supporting facts (entity/relationship/evidence refs)
                            -> Inspector / Network / Timeline navigation (context preserved)
```

Phase 27 is a **consumer layer**: it adds no new analytics engine and no new
backend endpoints.

**Mandatory statement — Phase 27 connects existing investigative
intelligence into a unified read-only investigation workspace. It does not
generate new evidence, determine guilt, or make autonomous investigative
decisions.**

**Do NOT start Phase 28** — no new engines, no autonomous planning, no
predictive/guilt profiling, no schema changes, no new tables.

## 2. Files created

**Frontend**

- `apps/web/src/lib/directions-labels.ts` — shared label/variant maps and
  helpers: `DIRECTION_TYPE_LABELS`, `DIRECTION_PRIORITY_LABELS`,
  `DIRECTION_PRIORITY_VARIANT`, `FACT_TYPE_LABELS`,
  `networkAnchorForDirection` (high-connectivity / bridge / unresolved /
  relationship-verification leads link to the `?tab=network` anchor),
  `timelineAnchorForDirection` (timeline-gap leads link to `?tab=timeline`),
  `comparePriority` (deterministic critical > high > medium > low ordering).
- `apps/web/src/components/investigation/supporting-fact-list.tsx` —
  `SupportingFactList` / `SupportingFactRow`; renders entity / relationship /
  evidence reference **only when present on the fact** (never invents);
  grounded refs open the existing Context Inspector via the shell store with
  the active `investigationId` preserved. Empty-guidance state when a direction
  has no supporting facts.
- `apps/web/src/components/investigation/direction-detail-panel.tsx` —
  expandable lead detail: type/priority/status badges + detection timestamp,
  summary, "Why this lead" rationale, grounded supporting facts, the related
  entities / relationships / evidence / findings resolved from the workspace
  store (intersection on entity/evidence ids), Network / Timeline deep links
  via the anchor helpers, and the Phase 27 disclaimer.
- `apps/web/src/components/investigation/investigation-directions-summary.tsx`
  — Overview section: total directions + critical/high key figures, top
  high/critical leads, "View all directions" action → opens the Directions tab,
  loading skeleton + `ErrorState` (retry label "Try again").
- `apps/web/src/components/investigation/investigation-overview.test.tsx` —
  4 tests: counters grid incl. `overview-stat-findings` / `overview-stat-events`;
  directions section + error retry; disclaimer rendered; entity/evidence/finding
  quick-open buttons (`overview-entity`, `overview-evidence`, `overview-finding`).
- `apps/web/src/components/investigation/supporting-fact-list.test.tsx` —
  6 tests: label/value rendering for each fact type; refs appear only when the
  fact carries them (a grounded row has zero reference buttons); empty message;
  entity/relationship/evidence opens carry the `investigationId` into the shell
  context.

**Backend**

- `apps/api/tests/test_investigation_workspace.py` — **6 tests** locking the
  consumer-facing contract of the existing `/api/v2` workspace surface:
  1. 401 on every workspace read without auth (summary / investigation /
     directions / timeline / child lists), using the `public_client` fixture
     (no auth stub installed).
  2. Overview summary counts match the seeded rows (entity/relationship/
     evidence/finding/note/event numbers).
  3. Child lists (`entities`, `relationships`, `evidence`, `findings`, `notes`,
     `events`) are scoped per investigation — nothing leaks across the two
     seeded investigations.
  4. Cross-investigation detail reads (`?investigation_id=` of the other case)
     return **404** `code: "not_found"` — no existence leak.
  5. Directions endpoint is scoped and grounded: every supporting fact
     references only the owning investigation's entity ids; a foreign
     `investigation_id` on a direction detail read is 404.
  6. No workspace response leaks secrets or heavyweight payloads (no
     `api_key` / `password` / `sk-` / `content_base64`; evidence rows expose
     `integrity`, raw content stays server-side).

## 3. Files modified

- `packages/types/src/investigation.ts` — `Investigation` gains optional
  `finding_count?` / `event_count?` (overview key figures; not required).
- `apps/web/src/lib/api/adapter.ts` — `mapInvestigation` reads
  `summary?.finding_count ?? 0` / `?? 0`.
- `apps/web/src/mock/investigations.ts` — all 6 demo records carry honest
  `finding_count` / `event_count` matching their real seeded arrays
  (inv-001: 2/2, inv-002: 1/1, inv-003: 1/0, inv-004: 0/0, inv-005: 0/0,
  inv-006: 2/0).
- `apps/web/src/components/investigation/investigation-directions-tab.tsx` —
  rewritten: card-level behaviour and accessibility preserved; added selection
  state, client-side priority/type filters (`direction-filter-priority`,
  `direction-filter-type`), and the expandable detail panel
  (`direction-detail-panel`, `direction-expand-{id}`, `detail-entity-*`,
  `detail-relationship-*`, `detail-evidence-*`, `detail-finding-*`,
  `detail-network`, `detail-timeline`), manual "no analytical leads yet"
  empty state, loading skeleton + `ErrorState` retry.
- `apps/web/src/components/investigation/investigation-overview.tsx` — counters
  grid widened to 6 cards (findings + timeline-events key figures using the
  new optional counts; timeline-events fall back to
  `data.timeline.filter(t => t.category === 'event').length`) and the new
  `InvestigationDirectionsSummary` section.
- `apps/web/src/components/investigation/investigation-tabs.test.tsx` —
  overview tab test updated (async; directions endpoint mocked empty; asserts
  `overview-stat-findings` / `overview-stat-events` = 2 and the manual no-leads
  message).
- `apps/web/src/components/investigation/investigation-directions-tab.test.tsx`
  — fixture evidence ref normalized to `ev-001`; Phase 27 `describe` block
  (+7 tests: overview summary opens Directions tab, filter by direction type,
  filter by priority, no-links lead shows empty guidance, expand detail panel
  showing related objects, network-anchor lead link, timeline-anchor lead
  link).

## 4. Design notes

- **Overview key figures are honest.** The 6-card grid reuses the existing
  per-investigation summary; when a count is unknown it falls back to the
  loaded workspace slice, never to mock fabrication.
- **Detail panel never guesses.** Related entities/relationships/evidence are
  resolved from the workspace store's scoped data; supporting facts render
  only the reference ids the payload actually carries.
- **Filters are client-side** over the already-scoped directions list — no new
  query surface, identical results in mock and API modes.
- **Navigation preserves investigation context** — every Inspector open passes
  the active `investigationId`, and anchor helpers deep-link directly into the
  existing Network / Timeline tabs.
- **Disclaimer stays visible** in the Directions surface: leads are analytical,
  do not establish guilt, and remain an investigator's tool.

## 5. Kept honest / deferred

- **No backend endpoints were added or changed.** The workspace consumes the
  Phase 17.9/17.6 reads exactly as they exist; backend work is a contract test
  module only.
- **Latent timeline sort edge (observed, not "fixed" here).** The combined
  timeline in `app/services/real/investigation.py` sorts entries by
  `at or title`; if persisted evidence lacks a `collected_at`, its key is a
  string while other entries use datetimes, raising `TypeError`. Phase 27's
  tests seed evidence with real collection timestamps (the normal create
  path allows `collected_at`), keeping the suite green without altering
  backend behaviour — the service-level fix belongs to a dedicated phase.
- Live Render deployment and live managed-PostgreSQL verification remain
  **PENDING** (no Render access in the environment); Postgres continues to be
  exercised via the SQLite override + offline `--sql` DDL.
- Full `pytest tests` still hangs on external-provider / POST-geo integration
  tests that require network-ejected providers; the self-contained real-layer
  subset is the reproducible gate.

## 6. Test results

- **Web** — `npx jest --silent` → **96 suites / 766 tests passed**
  (was 93 / 748 before Phase 27; +8 across the three touched/new suites plus
  existing-suite updates). `npx tsc` type-check clean; `npm run lint` clean
  (1 pre-existing `no-page-custom-font` warning); `next build` green (all 20
  routes, mock mode default).
- **Backend** — `pytest tests/test_investigation_workspace.py` → **6 passed**;
  the 16-file self-contained real-layer subset → **188 passed**; `ruff check`
  on the new test file clean (line-length-100 + trailing-newline rules
  applied).
- **Migration** — `alembic heads` → single head `50a1b2c3d4e5`; no new
  migration (no schema change).

## 7. Commit

- Git: Phase 27 changes staged and committed as
  `feat: build investigation intelligence workspace`, pushed to
  `origin main`, working tree clean.

## 8. Confirmation

**Phase 28 was NOT started.** No new engines, no autonomous behaviour, no
predictive/guilt features, no schema or API changes; the scope of this session
was strictly the read-only Phase 27 workspace.