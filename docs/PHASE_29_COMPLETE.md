# Phase 29 — Investigation Timeline Intelligence

## Objective

Strengthen the existing investigation timeline into a single honest,
entity-grounded surface:

```
Timeline tab          -> unified, ascending, day-grouped stream
   (event / evidence / finding / note / activity / system)
   + row expansion -> TimelineEventDetailPanel (inspector)
   (honest "Time unavailable" for unknown timestamps)
Evidence rows        -> real collected_at surfaced in timeline + Evidence tab
Finding detail       -> "Relevant timeline events" (grounded, evidence_ids +
                        entity-shared events)
Backend              -> deterministic null-safe timeline sort + contract tests
```

Phase 29 is a **presentation + service-logic layer**: no new endpoint, no new
migration, no new engine.

**Mandatory statement — Phase 29 displays recorded investigation data and its
recorded timestamps. It generates no new evidence, assigns no fault, and makes
no autonomous investigative decisions.**

**Do NOT start Phase 30** — no new engines, no autonomous planning, no
predictive/guilt profiling, no schema changes, no new backend endpoints.

## Files created

**Backend**

- `apps/api/tests/test_investigation_timeline.py` — **9 tests** locking the
  timeline contract (auth required; 404 on unknown investigation; relative/gut
  timestamps preserved; untimed entries sort first deterministically; the
  deeper-timestamps bleed case where copies carry known `at` but the original
  does not, so originals proven to rank before copies; event + note + activity
  rows present; findings/evidence/history excluded from the feed contract).

**Frontend**

- `apps/web/src/lib/timeline.ts` — shared row model (`TimelineRow`),
  `TimelineCategory`, category order, `timestampSourceLabel` (provenance labels:
  "Event time" / "Evidence collected" / "Finding created" / "Note created" /
  "Action time" / "Record time"), `compareTimelineAsc` (ascending, timeless
  rows LAST, deterministic tie-breaks), `groupTimelineRows` (day groups +
  undated "Time unavailable" group last), `evidenceTimelineRow`,
  `buildUnifiedTimeline` (feed minus finding/evidence kinds + activity +
  findings + evidence), `relevantTimelineForFinding` (grounding).
- `apps/web/src/lib/timeline.test.ts` — unit suite: ascending order, null-last,
  day grouping with undated last, category tie-breaks, unified merge, evidence
  row mapping, finding grounding (evidence-only, entity-shared events only when
  an events slice exists).
- `apps/web/src/components/investigation/timeline-event-detail-panel.tsx` —
  `TimelineEventDetailPanel` row inspector: event (type badge, id, occurred-at,
  location, description, related entities/relationships via context inspector,
  honest "No linked evidence" from the schema's missing FKs), evidence (type,
  collected-at, linked-by/at, summary, "No timeline event linked", Evidence-tab
  deep link), finding (severity/confidence badges, created-at, provenance),
  note / activity / system detail blocks.

## Files modified

**Backend**

- `apps/api/app/services/real/investigation.py` — `timeline()` now sorts
  untimed entries first with an epoch marker, then kind/title/ref-id, so
  comparison is fully deterministic and null-safe.

**Types**

- `packages/types/src/investigation.ts` — `InvestigationTimelineItem.timestamp`
  → `string | null`; `InvestigationEvidence.collected_at` → `string | null`;
  `InvestigationEvent` gains `occurred_at`/`location` (nullable).

**Adapter / data layer**

- `apps/web/src/lib/api/adapter.ts` — `toIsoOrNull`; `mapEvents`
  (`occurred_at`, `location`); `mapEvidence` surfaces `collected_at`;
  `mapTimeline` now **filters finding AND evidence feed kinds** (both enter the
  unified timeline from their own slices) and maps missing `at` to
  `timestamp: null` honestly; `MappedWorkspace` / `loadInvestigationWorkspace`
  add the `events` slice.
- `apps/web/src/mock/investigations.ts` — `evidenceRef(...)` accepts
  `collectedAt`; inv-001 / inv-006 evidence get real collected times; inv-006
  gains an events slice (three grounded events incl. shared-frame events);
  inv-006 feed includes the "Named in case proceedings" entry; inv-002 movement
  event gains `location: 'Route NH-48'`; inv-001 events gain locations.
- `apps/web/src/state/investigation.store.ts` — workspace data gains `events`;
  `emptyData()` seeds `events: []`.
- `apps/web/src/services/investigation.service.ts` — `getInvestigationEvents`;
  timeline mock sort made null-safe (newest-first preserved, `-Infinity` for
  null timestamps); `addEvidenceToInvestigation` sets `collected_at: null`.

**AI context**

- `apps/web/src/ai/context-builder.ts` — timeline context items carry
  `timestamp: string | null`; formatting guard renders "Time unavailable".
- `apps/web/src/lib/api/assistant.ts` — `SerializedContextBundle.timeline`
  `timestamp` widened to `string | null` (resolves the retrieval-layer type).
- `apps/web/src/lib/api/retrieval.ts` — timeline items now pass nullable
  timestamps through (type-checked via the widened bundle type).

**UI**

- `apps/web/src/components/investigation/investigation-timeline-tab.tsx` —
  rewritten on `lib/timeline.ts`: unified stream, ascending day groups, undated
  "Time unavailable" group last, provenance time-source chips, category chips,
  legend, loading / error+retry / honest empty states, row expansion →
  `TimelineEventDetailPanel`.
- `apps/web/src/components/investigation/finding-detail-panel.tsx` — "Relevant
  timeline events" replaces the ad-hoc timeline references: grounded evidence
  and entity-shared event rows with provenance captions, honest empty state,
  collected-time chips on supporting evidence.
- `apps/web/src/components/investigation/investigation-evidence-tab.tsx` —
  evidence rows surface `collected_at` with "Time unavailable" on null.

**Tests**

- `apps/web/src/lib/api/adapter.timeline.test.ts` — rewritten for the new
  contract: event+note preserved, finding AND evidence deduped, null timestamp
  honest, ref id/type preserved, investigation stamping, `tl-0`/`tl-1` fallback
  ids, empty input, workspace error propagation.
- `apps/web/src/services/investigation.service.test.ts` — newest-first
  assertion made null-safe against nullable timestamps.
- `apps/web/src/components/investigation/investigation-timeline-tab.test.tsx` —
  rewritten: 13 tests covering loading, error+retry, empty, legend, unified
  ordering/grouping, undated group, expansion into the detail panel.
- `events: []` added to workspace fixtures across
  `demo-journey`, `supporting-fact-list`, `investigation-findings-tab`,
  `investigation-directions-tab`, `investigation-overview`, `finding-detail-panel`,
  `investigation-tabs`, `investigation-timeline-tab`, `investigation.store` test
  modules (given the new events slice on the workspace).
- `docs/timeline-architecture.md` — architectural + timestamp-semantics
  reference (see below).

## Design notes

- **One source of truth for "when".** Every timeline row derives its timestamp
  from its own recorded field (`occurred_at`, `collected_at`, `created_at`,
  activity timestamp); `created_at` is never substituted for an event or
  collection time.
- **Honest nulls.** A row whose timestamp is genuinely unknown renders
  "Time unavailable" and sorts into the last (undated) group. No timestamp is
  ever synthesised to fill layout.
- **Grounding over inference.** Finding→timeline wiring only shows rows the
  finding actually references (`evidence_ids`) or is entity-shared with (event
  `entity_ids` ∩ finding `entity_refs`, only when an events slice exists).
- **Dedup by construction.** Adapter drops finding/evidence feed kinds so each
  object appears exactly once in the unified stream regardless of feed contents.
- **RNPI-safe sort.** `new Date(…)` comparison is banned in the hot path;
  backend uses a sort-key epoch, frontend uses null-last ascending comparison —
  both static, deterministic and documented.

## Kept honest / deferred

- **No new endpoint / no migration.** The feed contract, evidence, events, and
  findings all flow through existing endpoints; a new test module locks the
  strengthened contract.
- **Event inspector related-entity/evidence lists are honest empties** where the
  relational schema has no linking FKs — enrichment is deferred to a future
  phase with schema support.
- **Live Render deployment / managed-PostgreSQL verification remain PENDING**
  (no Render access in the environment); Postgres continues to be exercised via
  the SQLite override + offline `--sql` DDL.
- **Pre-existing flake (not Phase 29):** at full Jest parallelism the
  investigations **listing** page suite intermittently fails on worker
  contention (renders demo hero instead of the mocked list / error). It passes
  deterministically in isolation and with `--maxWorkers=50%`; Phase 29 files
  are not involved.

## Test results

- **Backend** — `pytest apps/api/tests` → **352 passed, 16 warnings**; `ruff
  check` clean on the two touched backend files (repo-wide rerun surfaces only
  pre-existing Phase 20 `candidate_resolution` lines — out of scope); `alembic
  heads` → single head `50a1b2c3d4e5` (no migration).
- **Web** — `npx jest --silent` → **99 suites / 799 tests passed** (Phase 28:
  98 / 780; +19 across the new unit suite, rewritten adapter + timeline-tab
  suites, and existing-suite updates). `tsc --noEmit` clean; `next lint` clean
  (1 pre-existing `no-page-custom-font` warning); `next build` green (21 routes).
- **Secrets scan** — no source hits; all matches are bundled 3rd-party
  `venv/site-packages` fixtures, none in repo source.

## Commit

- Git: Phase 29 changes committed as
  `feat: strengthen investigation timeline intelligence`, pushed to `origin main`,
  working tree clean.

## Confirmation

**Phase 30 was NOT started.** No new engines, no autonomous behaviour, no
predictive/guilt features, no schema or API changes; the scope of this phase was
strictly the timeline intelligence surface described above.