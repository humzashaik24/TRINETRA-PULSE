# SIH Demo Journey — Operation Meridian (Inv-006)

Phase 13 weaves the verified Phases 0–12 into one cohesive, end-to-end
investigation demonstration for Smart India Hackathon. Everything below
fits the existing shell, graph engine and AI architecture — nothing was
rewritten, and no Phase 14 concerns (prediction, culpability, autonomy)
were introduced.

> **Demo universe** — Investigation `inv-006` "Operation Meridian",
> Active / High. Network `NET-001` "Operation Clean — initial
> relationships". Cases flow through neutral terminology
> (Chain / Connector / High Connectivity), never guilt or suspicion.

---

## The journey at a glance

```
Investigations            A single guided, grounded investigation…
    │
    ├─ Overview command center  (quick actions + linked objects)
    ├─ Network workspace        (focus an entity from a deep link)
    │     └─ Analytics          (preserves ?i= & ?focus= params)
    ├─ Timeline                 (unified events+evidence+findings+notes)
    ├─ Findings / Evidence      (breadcrumb-linked back to the case)
    └─ Ask AI                   (contextual, scope-aware starters)
          │
          └─ AI → Source → Inspector  (investigationId preserved
                                       end-to-end via the shell)
```

Every node in this path shares one contract: the journey URL payload and
the investigation's canonical identifiers, so the inspector and the AI
assistant stay grounded on the same case the whole way through.

---

## The URL journey contract

Deep links and in-app navigation share a single, typed contract
(`src/navigation/journey.ts`):

```
?i=<investigationId>&focus=<objectId>&section=<workspaceSection>
```

- `journeyHref(path, payload)` — build a link that carries the journey.
- `parseJourneyPayload(query)` — read the `i`, `focus`, `section` params.
- `DEMO_JOURNEY` — the canned target for the demo investigation.

Any page that receives a journey payload **seeds the active
investigation** (`investigation.store.seedInvestigation(id)`), so the AI
scope and the Context Inspector resolve against the same case even when
you arrive from a deep link rather than the investigation's own page.

---

## Step 1 — Landing: the demo hero

`/investigations` shows a `DemoInvestigationHero` calling out
**Operation Meridian** with an "Explore the demo investigation" CTA
(and a compact variant on the overview). It intentionally makes the
end-to-end walk-through one click away for a judge or reviewer.

---

## Step 2 — Overview: the command center

`investigation-overview.tsx` is a command center, not just a summary:

- **Quick Actions** — Explore network, Analyze network, Timeline,
  Findings, Ask AI. Each jumps straight to the matching workspace tab.
- **Key entities / recent evidence / findings** — each item is clickable
  and opens the Context Inspector *in place* (no page hop), carrying the
  investigation id with it.
- **Demo journey guide** — a short "start here" walk-through for
  Operation Meridian (only rendered for the demo case).

The tab container (`investigations/[id]/page.tsx`) wires these via an
`onOpenTab` callback so a quick action lands on the correct tab.

---

## Step 3 — Entity → Network: focus follows the journey

Two complementary paths get an entity into the graph, focused:

- **Entity Inspector → "View in Network"** — the entity context's footer
  builds a journey link to the network (`?i=inv-006&focus=<entityId>`),
  so selecting any entity and one click lands on it *in* the graph.
- **`/networks/[id]` deep-link focus** — `useGraphJourneyFocus()` reads
  the payload and:
  1. seeds the investigation (AI scope + inspector stay grounded),
  2. selects + centers + expands the focused node,
  3. opens its entity context in the Inspector.

The **analytics** link and its *back* link both preserve `?i=` and
`?focus=`, so the Journey survives navigation between the graph and the
analytics dashboard and returns you to the exact entity you were focused on.

---

## Step 4 — Timeline: one unified stream

`investigation-timeline-tab.tsx` merges events, evidence, findings,
notes and activity into a single chronological stream with a category
legend (EVENT / EVIDENCE / FINDING / NOTE / ACTION / SYSTEM). Findings
are merged from the investigation store so the story reads top-to-bottom.

---

## Step 5 — AI: contextual, grounded starters

`ai/contextual-prompts.ts` builds the AI chat's opening suggestions
_dynamically_ from the current scope:

1. **Entity-first** — a focused entity's name (highest context).
2. **Network** — the active network.
3. **Investigation record** — the real case title and real finding
   titles from the active investigation.
4. **Baseline** — the deterministic defaults when nothing is in scope.

Prompts are deduplicated and capped (max 5), and **every** AI source
chip that opens evidence or a finding now carries the `investigationId`,
so "AI → Source → Inspector" stays on the Operation Meridian case.

---

## Step 6 — Command palette & context

- **Command palette** (`command-palette.tsx`) reaches into the current
  investigation: the investigation itself, its top entities, recent
  evidence, findings and its networks — all as journey links.
- **Command bar** (`command-bar.tsx`) shows the active investigation as
  the persistent context indicator and links to its workspace.

---

## Data consistency (the two broken links Phase 13 repaired)

The investigation's evidence references and the Phase 12 evidence
universe used **two different namespaces** that previously failed to
resolve inside the Context Inspector:

| Namespace | Source | Used by |
|---|---|---|
| `ev-001 … ev-012` | `mockEntityEvidence` | Investigation evidence refs |
| `ev-intel-001 … 032` | `mockEvidenceById` | Phase 12 evidence intelligence |
| `inf-006-1 … n` | `mockInvestigationById` | Investigation findings |

`inspector.service.ts` now resolves **both** namespaces for evidence
(`ev-intel-*` first, then `ev-*`) and resolves investigation findings
(`inf-*`) — so no demo object can produce a broken link. Both evidence
namespaces are stamped with the active `investigationId` when resolved
inside a scoped context, so "AI → Source → Evidence Inspector" keeps the
investigation correct regardless of which namespace the source came from.

The **Entity / Relationship** contexts also carry `investigationId` (matching
Finding / Evidence / Note / Event / Snapshot), so every context type in the
inspector preserves the investigation across transitions, and switching
investigations clears stale selections.

### Coverage note

The knowledge graph (`NET-001`) intentionally contains more nodes than
the canonical entity-profile universe — graph-only nodes have a
label/type but no standalone intelligence profile. They surface from
graph hints. The data-consistency audit therefore asserts that every
**investigation-owned** reference resolves, and every **profile-backed**
network node resolves through the inspector.

---

## Tests & verification

New / extended Phase 13 suites (all green):

- `navigation/journey.test.ts` — URL payload building + parsing.
- `ai/contextual-prompts.test.ts` — scope-aware dynamic starters.
- `services/inspector-journey.test.ts` — both evidence namespaces +
  findings resolve, namespaces don't collide.
- `services/demo-universe.test.ts` — data-consistency audit (investigation
  refs + profile-backed network nodes).
- `components/demo/demo-journey.test.tsx` — hero + overview command
  center + context-preservation E2E flow.
- `components/demo/demo-e2e.test.tsx` — the full Operation Meridian
  journey (investigation → entity → network → analytics → finding →
  evidence → timeline → AI → AI source → evidence inspector) asserting
  `investigationId` stays `inv-006` at every step.

Web baseline: **53 suites / 441 tests** (up from 47 / 394).
API baseline unchanged: **44 passed**, ruff clean.

Verification commands:

```bash
# Web
cd apps/web
npx tsc --noEmit
npm run lint
npx jest --silent
npm run build

# API
cd apps/api
venv\Scripts\python.exe -m pytest tests/ -q
venv\Scripts\python.exe -m ruff check .
```

---

## Scope discipline

Phase 13 adds **cohesion and grounding only**. It did not introduce any
predictive, guilt-based or autonomous capability, did not create a second
app shell / graph engine / AI architecture, and stopped exactly at Phase
13. Chapter docs cover each earlier phase:

- [NETWORK_INTELLIGENCE.md](NETWORK_INTELLIGENCE.md) — Phase 7 graph engine
- [NETWORK_ANALYTICS.md](NETWORK_ANALYTICS.md) — Phase 8 analytics
- [INVESTIGATION_WORKSPACE.md](INVESTIGATION_WORKSPACE.md) — Phase 9 workspace
- [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md) — Phase 12 evidence
