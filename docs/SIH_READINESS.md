# Trinetra Pulse — SIH Readiness (Phase 14)

Phase 14 is the **hardening, cleanup and SIH-ready** phase. It makes the
existing Trinetra Pulse product reliable, clean, fast, consistent,
demo-ready and safe to hand off. It does **not** add new product features,
does not rewrite working modules, and does not start Phase 15.

---

## Architecture status

Phone the single canonical architecture from Phases 0–13, verified intact:

- **Web** — Next.js 14 App Router + TypeScript + Zustand + `@xyflow/react`
  graph engine + `@trinetra-pulse/types` + `@trinetra-pulse/ui` (design
  system + motion system).
- **API** — FastAPI, in-memory demo (no database required for the demo).
- **One** application shell (Command Rail + Command Bar + Workspace Shell +
  Context Inspector), **one** graph engine (library-agnostic `GraphEngine`
  with the concrete @xyflow/react renderer), **one** AI subsystem, **one**
  evidence subsystem, **one** investigation store, **one** command palette,
  **one** motion system.

Phase 14 verified there is exactly **one canonical implementation** per
concern and removed the small number of provably-dead duplicates (below).

---

## Repository cleanup (Phase 14 removals)

All removals were verified dead before deletion: no imports, dynamic imports,
route references, barrel exports, tests, config or docs relied on them.

| Removed | Reason |
|---|---|
| `apps/web/src/services/api.ts` | `apiClient` was referenced nowhere; web is mock-driven |
| `apps/web/src/hooks/use-journey.ts` | `useJourney` unused; only `use-journey-focus.ts` is live |
| `apps/web/src/ai/tools.ts` | 12 tool helpers exported but imported nowhere |
| `packages/config/` | `@trinetra-pulse/config` never imported; not in tsconfig/jest paths |
| `apps/web/src/components/shell/sidebar.tsx` | Legacy nav sidebar superseded by `command-rail.tsx` |
| `apps/web/src/components/shell/header.tsx` | Legacy header superseded by `command-bar.tsx` |
| `apps/web/src/components/navigation/config.ts` | Legacy `NAVIGATION_ITEMS` config; only dead sidebar/header used it |
| `app.store.ts` sidebar fields | `sidebarExpanded`/`sidebarHovered`/`toggleSidebar`/`setSidebar*` had no consumer after removing the deleted sidebar |
| `shell/index.ts` `Sidebar`/`Header` barrel exports | Exported the deleted components |

**Legacy systems removed:** the pre-Phase-3.5 **Sidebar + Header +
`navigation/config.ts`** shell chrome (functionally duplicated by
CommandRail/CommandBar/`rail-config.ts`). No CRIME-X remnants exist anywhere
(P2 audit: zero brand references).

**Kept (conservatively):** `graph/path.ts` and `lib/entity-resolution.ts` are
only exercised by their own unit tests; deleting them would reduce test
coverage, so per the delete-policy ("when uncertain, KEEP") they are retained.

**Unused exports:** `shell/index.ts` no longer re-exports `Sidebar`/`Header`.

---

## Active modules

- **Investigation workspace** — `/investigations`, `/investigations/[id]`
  (Overview / Network / Entities / Evidence / Timeline / Findings / Notes /
  Activity), `INV-DEMO-001` Operation Meridian.
- **Entity intelligence** — entity list / detail, extraction, resolution,
  audit.
- **Network intelligence** — `/networks`, `/networks/[id]` graph workspace.
- **Network analytics** — `/networks/[id]/analytics` structural dashboard.
- **Evidence intelligence** — `/evidence` workspace (Repository / Coverage /
  Support / Retrieval / Network / Timeline).
- **Grounded AI investigation assistant** — `/ai-assistant`, AI panel with
  investigation-scoped, source-grounded answers.
- **Context inspector** — selection inspector across all domains.
- **Command palette / command bar** — global command interface + context bar.
- **Motion system** — shared transitions with `prefers-reduced-motion`.

---

## Demo environment

Operation Meridian (`inv-006`) is a **deterministic** demo universe: the same
investigation, entities, relationships, evidence, findings, events, network,
analytics and AI context reproduce on every run. There is no randomness in
demo data.

### Launching the demo

```bash
# Web-only (mock-driven)
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000 → **Explore Demo Investigation** → **Operation
Meridian**.

```bash
# Full stack (in-memory API — no database)
cd apps/api
python -m venv venv          # once
venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Resetting demo data

There is no persistent demo state to clear: the web runs on deterministic
in-memory mock modules and the API is in-memory. Restarting either process
returns the demo to its canonical seed. (No real-data ingestion exists.)

---

## Reliability

- **Error resilience**: every workspace has loading, error, empty and
  `not-found` states; the network graph degrades gracefully for graph-only
  nodes (no profile → graceful inspector status).
- **Missing/invalid IDs**: invalid entities, evidence and findings resolve to
  a graceful error/empty inspector rather than a crash.
- **Recovery**: refresh and back-navigation re-seed the active investigation
  via the `?i=&focus=&section=` journey contract.

---

## Investigation isolation

Context is fully investigation-scoped. `investigationId` is carried on every
context type (entity, relationship, evidence, finding, note, event, snapshot).
Switching investigations clears stale selections (selected entity,
relationships, evidence, findings, network focus and the AI conversation) so
no information from Investigation A leaks into Investigation B. This is
locked in by the `demo-e2e` regression suite.

---

## AI grounding

The AI assistant is grounded in the active investigation scope:

- reads the current investigation / network / entity from stores,
- builds contextual starters dynamically,
- retrieves evidence within a budget and returns **provenance references**
  (source chips) that open the real inspector record,
- never invents evidence, never makes guilt conclusions, never ranks people
  as criminals — neutral "Chain / Connector / High Connectivity" language,
- falls back deterministically when the provider/scopeless.

No autonomous agents were added.

---

## Evidence provenance

Evidence journeys only surface relationships backed by real data contracts
(source IDs, timestamps, support levels, investigation scope). Both evidence
namespaces (`ev-*` legacy and `ev-intel-*` Phase 12) and findings (`inf-*`)
resolve through the Context Inspector, so no demo object produces a broken
link.

---

## Performance

- Confirmed single-canonical graph / AI / evidence subsystems — no duplicated
  engines or panels rendering in parallel.
- The React Flow renderer is lazy-mounted and kept out of the failure-prone
  SSR/jsdom path; graph is browser-only and safely isolated.
- Dead code removed reduces bundle surface. No premature optimization;
  existing design-system loading/skeleton states are used.

---

## Responsive

The Command Rail / Command Bar / Workspace / Inspector are responsive
(desktop / tablet / mobile) with no horizontal overflow. The graph workspace
degrades to the list view on constrained widths. (Verified via the existing
responsive workspace architecture.)

---

## Accessibility

- Keyboard-first Command Rail / Palette, Context Inspector, network controls,
  evidence tabs and AI panel.
- Focus management, Escape, focus restoration on the inspector.
- ARIA labels and current-state attributes through the design system.
- `prefers-reduced-motion` respected by the Motion System.

---

## Security

- **No secrets in the repo.** `.env.example` contains placeholders only; the
  only `.env*` file on disk is `.env.example`. `.gitignore` covers all real
  `.env*` variants plus Python caches.
- **No auth** — the API is an in-memory demo and all endpoints are anonymous.
  This is a **documented known limitation** (no new auth architecture was
  introduced in Phase 14); it must be addressed before any real data.
- **Production fail-closed** — `get_settings()` refuses to boot in
  `APP_ENV=production` while default secrets (app/JWT/DB) are still set.
- Error responses are generic (no stack traces). No `dangerouslySetInnerHTML`
  in the web app. CORS is a fixed localhost allow-list.

---

## Known limitations

- The API has **no authentication/authorization** (in-memory demo).
- The API is database-optional and in-memory; PostgreSQL/Neo4j/Redis are
  infrastructure stubs not consumed by the demo runtime.
- `services/` ML packages are placeholder stubs, not wired into the demo.
- `graph/path.ts` and `lib/entity-resolution.ts` are retained solely for
  their unit tests (potential future simplification).
- Google Fonts are loaded from an external CDN in `app/layout.tsx`.

---

## Deployment notes

- `npm run build` (web) produces a clean production build (18 static/dynamic
  pages).
- API deploys with `uvicorn app.main:app`; in-memory, so no migrations are
  needed for the demo.
- For a real deployment, set `APP_ENV=production`, provide real secrets (the
  guard will enforce it), and implement auth before attaching real data.

---

## SIH demo procedure (3–5 minutes)

1. Enter **Operation Meridian** from the investigations list.
2. Read the investigation summary / quick actions.
3. Open an important entity → **Context Inspector**.
4. **View in Network** on the entity.
5. Analyze the network → **/networks/[id]/analytics**.
6. Inspect structural analytics (communities, connectors, bridges).
7. Open a finding → supporting evidence.
8. Review the unified timeline.
9. Open **AI**, ask a grounded question, click an **AI source** → Evidence
   Inspector.
10. Return to the entity/network — context is preserved.

No dead ends, no broken loading states, no stale context, no fake data.

---

## Testing

- **Baseline (Phase 13 end):** 53 suites / 441 Jest tests; API pytest 44; ruff clean.
- **Phase 14 adds** the `demo-e2e` regression expectations (already part of
  the 53/441) and confirms them after cleanup.
- **Final (Phase 14):** see below — no regressions.

---

## Verification (Phase 14)

| Check | Result |
|---|---|
| `npx tsc --noEmit` (web) | clean |
| `next lint` (web) | clean (one pre-existing custom-font warning) |
| `npx jest --silent` (web) | 53 suites / 441 tests pass |
| `next build` (web) | compiled + 18 static pages |
| `pytest tests/ -q` (API, venv) | 44 passed |
| `ruff check .` (API, venv) | clean |
