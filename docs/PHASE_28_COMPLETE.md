# Phase 28 — Investigation Findings & Evidence Intelligence

## Objective

Surface existing persisted findings plus evidence traceability / integrity /
provenance as first-class, grounded context inside the Phase 27 Investigation
Intelligence Workspace:

```
Findings tab (existing) -> count summary + create/edit form preserved
                         -> Finding summary card (severity/confidence/source)
                         -> FindingDetailPanel (expansion)
                              -> Supporting evidence (metadata.evidence_ids resolved)
                              -> Related entities / relationships (grounded intersection)
                              -> Timeline references + tab deep-links
                              -> Provenance (created-by / created-at / updated-at)
                         -> Existing empty/loading/error states retained
```

Phase 28 is a **consumer layer**: no new backend endpoints, no new migration, no
new engine.

**Mandatory statement — Phase 28 surfaces existing persisted findings with
evidence traceability, integrity and provenance context in the investigation
workspace. It does not generate new evidence, determine guilt, or make
autonomous investigative decisions.**

**Do NOT start Phase 29** — no new engines, no autonomous planning, no
predictive/guilt profiling, no schema changes, no new backend endpoints.

## Files created

**Backend**

- `apps/api/tests/test_finding_evidence_intelligence.py` — **8 tests** locking
  the read-only Phase 28 contract against the existing `/api/v2` surface
  (strategically over both seeded investigations):
  1. 401 on every findings/evidence-context read without auth
     (findings list, finding detail, evidence integrity / chain / verify /
     analyses) using the `public_client` fixture.
  2. `GET /investigations/{id}/findings` is scoped and grounded — each
     persisted finding's `metadata.evidence_ids` and `entity_refs` resolve only
     to the owning investigation's evidence / entity ids; nothing leaks into
     the sibling investigation.
  3. Evidence traceability endpoints respond 200 for the owning investigation:
     `/evidence/{id}/integrity`, `/evidence/{id}/chain`,
     `/evidence/{id}/chain/verify` (VALID) and `/analyses`.
  4. Cross-investigation detail reads (`?investigation_id=` of the other case)
     return **404** `code: "not_found"` — no existence leak.
  5. Empty findings list returned honestly for the case with no findings.
  6. Unknown ids → 404; malformed UUIDs → 422 (safe error handling).
  7. No secret or heavyweight payload leak in findings or evidence-context
     responses (`api_key` / `password` / `sk-` / `content_base64` absent).

**Frontend**

- `apps/web/src/lib/findings-labels.ts` — shared badge helpers:
  `FINDING_CONFIDENCE_VARIANT`, `findingSeverityVariant(category)`,
  `findingSeverityLabel(category)`, `findingSourceVariant(sourceType)`.
- `apps/web/src/components/investigation/finding-detail-panel.tsx` —
  `FindingDetailPanel`: header severity/confidence/source badges, description,
  tags, Supporting Evidence section (resolve `evidence_ids` by `id` **or**
  `evidence_id`, so mock `inev-…` and relational `ev-…` universes both resolve;
  honest "No supporting evidence linked." empty state; unresolved references are
  counted, never invented), Related Entities, Related Relationships (workspace
  relationships whose endpoints are finding-referenced entities), Timeline
  Context when refs exist, Provenance (created-by / created-at / updated-at),
  Evidence / Network / Timeline deep-link anchors, and the analytical-review
  disclaimer. Inspector opens always carry the active `investigationId`.
- `apps/web/src/components/investigation/finding-detail-panel.test.tsx` —
  **6 tests**: full expansion with grounded evidence/entity/relationship/
  provenance; evidence opens in context inspector preserving investigation;
  related-entity open preserving investigation; tab deep-link anchors; honest
  empty state for findings with no linked evidence; unresolved reference
  counting for dangling evidence ids.
- `apps/web/src/components/investigation/investigation-findings-tab.test.tsx`
  — **8 tests** (Phase 28): list rendering with counts/badges/provenance
  banner; expanding a finding into its detail panel with grounded evidence;
  evidence opens in context inspector; honest empty state (inv-004); loading
  state; error state with retry that reloads the investigation; preserved
  manual finding creation flow; preserved inline confidence editing.

## Files modified

- `apps/web/src/components/investigation/investigation-findings-tab.tsx` —
  rewritten as the Phase 28 surface: count header, "New finding" form
  (preserved: `add-finding-button`, `finding-form`, `finding-title-input`,
  `finding-confidence-select`, `finding-submit`), summary cards with
  severity/confidence badges and entity/evidence count chips, expand/collapse
  (`finding-expand-{id}` → `FindingDetailPanel`), inline confidence edit
  preserved (`edit-finding-{id}`), loading / error-retry / honest empty states,
  and the "analytical observations derived from existing investigation data"
  banner.
- `apps/web/src/lib/api/adapter.ts` — `mapFinding` now surfaces
  `metadata.evidence_ids` into the client shape via `findingEvidenceIdsFrom`
  (imported from `lib/data-table/utils`-adjacent `findings` module; no import
  cycle).
- `docs/INVESTIGATION_WORKSPACE.md` — Phase 28 section: surface table, files
  list, out-of-scope restatement, and the "findings are analytical
  observations, never proof" framing.

## Design notes

- **No backend change.** Findings, evidence integrity, chain and analyses all
  come from the Phase 17.9/17.6 endpoints as they exist; the backend deliverable
  is the new contract test module.
- **ID resolution is dual-mode.** Entities match `entity_id`, evidence matches
  `id` **or** `evidence_id` — identical results in mock and API modes.
- **Grounding over inference.** The panel renders only workspace rows the
  persisted finding actually references (`metadata.evidence_ids` /
  `entity_refs`). It never synthesises a supporting object to fill layout.
- **Honest states everywhere.** Loading, error-with-retry, "No findings
  detected for this investigation.", and "No supporting evidence linked." are
  all explicit — nothing is faked for demo effect.
- **Investigation context is preserved** across every deep link and inspector
  open (`?tab=evidence|network|timeline`, `useShellStore.selectContext`).
- **Manual flow intact.** Finders can still record and edit their own findings
  through the existing create/edit form and inline confidence edit.

## Kept honest / deferred

- **No new engine and no AI** — phase 28 adds a consumer surface only.
- **Timeline context inside the panel** renders only when the workspace
  timeline has matching `ref_id`s; the map-time-of-evidence-driven timeline
  refinement remains out of scope.
- Live Render deployment / live managed-PostgreSQL verification remain
  **PENDING** (no Render access in the environment); Postgres continues to be
  exercised via the SQLite override + offline `--sql` DDL.

## Test results

- **Backend** — `pytest tests/test_finding_evidence_intelligence.py` → **8
  passed**; `ruff check` + `ruff format` clean on the new module. Full suite →
  **343 passed, 15 warnings** (12:45 elapse; logs captured in
  `apps/api/pytest_full.log`).
- **Web** — `npx jest --silent` → **98 suites / 780 tests passed** (Phase 27:
  96 / 766; +8 across the two new suites plus existing-suite updates to 14 in
  the Phase 28 files). `tsc --noEmit` clean; `next lint` clean (1 pre-existing
  `no-page-custom-font` warning); `next build` green (all 21 routes, mock mode
  default).
- **Migration** — `alembic heads` → single head `50a1b2c3d4e5`; no new
  migration (no schema change).

## Commit

- Git: Phase 28 changes committed as
  `feat: build investigation findings and evidence intelligence`, pushed to
  `origin main`, working tree clean.

## Confirmation

**Phase 29 was NOT started.** No new engines, no autonomous behaviour, no
predictive/guilt features, no schema or API changes; the scope of this phase was
strictly the read-only Phase 28 findings + evidence intelligence surface.