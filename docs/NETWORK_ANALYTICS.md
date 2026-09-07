# Network Analytics & Intelligence Engine (Phase 8)

A pure, deterministic **structural analytics layer** on top of the Phase 7 network graph. It computes centrality, connected groups (communities), components, density, bridge entities, temporal snapshots and reproducible structural patterns — and presents them in a dedicated analytics dashboard with live graph overlays.

```
Graph (Phase 7) → Analytics service (cache) → Analytics engine (pure) → Analytics store → Dashboard + overlays + inspector
```

## Scope

| Area | Status |
|---|---|
| Analtyics engine (pure, UI-independent): degree / betweenness / closeness / PageRank | Done |
| Composite **network influence** (0–100 structural importance) | Done |
| Community detection (Louvain) + connected components + density | Done |
| Bridge-entity detection (Tarjan articulation + betweenness) | Done |
| Temporal snapshots + structural pattern detection | Done |
| Filtering, caching strategy, computation states, large-graph strategy | Done |
| `network-analytics.service.ts` + `analytics.store.ts` + inspector views | Done |
| Graph overlays (size / colour / dim) + `/networks/[id]/analytics` page | Done |
| Tests | Done |

Out of scope (explicitly **not** part of Phase 8): AI assistant, end-to-end reporting, guilt / risk scoring, and any criminal classification.

## Terminology

All output is **analytical, never accusatory**. Phase 8 uses connectivity language only:

- **Direct Connections** — the number of ties an entity holds.
- **Bridge Entity / Connector / Network Broker** — an entity linking otherwise-separate parts.
- **Network Influence / Structural Importance** — composite connectivity importance, never guilt.
- **Connected Group / Cluster / Community** — a cluster of entities, not a criminal group.
- **Complexity / severity of a pattern** — **analytical significance**, **not** a probability of guilt.

The graph overlay legend and all UI copy reinforce this distinction. A pattern's `confidence` is confidence the signal was *detected*; `severity` is analytical significance.

## Architecture

The analytics UI never implements graph algorithms. All computation is delegated to a pure engine behind the `NetworkAnalyticsEngine` interface (from `@trinetra-pulse/types`).

```
NetworkAnalyticsEngine (interface)
        ▲
NetworkAnalyticsEngine (class, apps/web/src/analytics/network-analytics-engine.ts)
        ▲
network-analytics.service.ts  (cache + in-flight dedupe + deterministic latency)
        ▲
analytics.store.ts (zustand) ──► analytics UI (dashboard/toolbar/views) + inspector + graph overlays
```

### Files

```
packages/types/src/
  network-analytics.ts        # Phase 8 contracts (bundles, filters, jobs, metadata)

apps/web/src/
  analytics/
    centrality.ts             # buildAdjacency, degree, betweenness (Brandes), closeness, PageRank
    influence.ts              # composite 0-100 network influence
    community.ts              # Louvain community detection
    components.ts             # connected components, density, summary, avg path length/diameter
    bridges.ts                # bridge entities (Tarjan + betweenness) & relationships
    temporal.ts               # period snapshots with cumulative bookkeeping
    patterns.ts               # structural pattern detection (analytical severity)
    filter.ts                 # applyAnalyticsFilter, filtersEqual, filterKey
    graph-overlay.ts          # deterministic per-entity overlay visual mapping
    network-analytics-engine.ts  # orchestrating engine + AnalyticsCache
  services/
    network-analytics.service.ts  # engine-backed cached service
  state/
    analytics.store.ts        # bundle + selection + overlay + computation status
  components/analytics/       # dashboard, toolbar, ranking-table, summary, metric-explorer,
                              # community/component/bridges/patterns/temporal views, legend,
                              # analytics-graph-integration.ts
  app/(dashboard)/networks/[id]/analytics/page.tsx   # analytics dashboard page
```

## Computation model

The store tracks explicit states: `idle → queued → computing → complete`, plus `failed` and `stale` (a filter changed while a bundle was on screen; a background recompute is triggered). `stale` keeps the last-known bundle visible while fresh results are computed, so analysts are never left staring at an empty canvas.

## Caching & large-graph strategy

- **Deterministic latency** + an in-flight map dedupe overlapping requests.
- **Analytics cache** keyed by `networkId + filter + time-range + scope + algorithm + version` (`AnalyticsCache`).
- Algorithms are **memoization-friendly and incremental** (e.g. cumulative temporal snapshots), and the service is designed to be swapped for a non-blocking server-side implementation without UI changes.
- `AnalyticsFilter` scopes by entity type, relationship type, community, component, source, confidence and time range; **community/component scoping is applied post-detection** because membership is only known after the graph is grouped.

## Guarantees

- **Pure & deterministic** — the same network + filter + version always yields the same output (ids and tie-breaking are stable).
- **Analytical framing only** — no criminal classification, no guilt likelihood, no risk score.

> **Phase 12** — analytical findings are grounded in evidence via `FindingEvidenceSupport` (per-item relevance + provenance), and `ExtractionMethod.ANALYTICAL` marks frequency / tower-aggregation / network-analysis evidence as analytical rather than observed. See [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md).
- **UI/algorithm separation** — the UI reads resolved bundles; only the engine computes.

## Testing

Analytics tests run in the `unit` node project (engines, filter, service, store, inspector views, graph-integration) plus one jsdom component test for `RankingTable`.

```bash
cd apps/web
npx jest --selectProjects unit --testPathPattern "analytics|network-analytics.service|analytics.store|analytics-graph-integration|inspector.service"
npx jest --selectProjects components --testPathPattern "ranking-table"
```
