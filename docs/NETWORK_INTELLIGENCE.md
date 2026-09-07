# Network Intelligence (Phase 7)

Interactive knowledge-graph workspace that lets investigators explore the entity / relationship network built on top of the Phase 6 entities and relationships.

```
Entities → Relationships → Networks (graph workspace) → Path exploration → Evidence
```

## Scope

Phase 7 delivers the **UI / rendering layer** for network exploration. The data, state, services, mocks and engine-abstraction already existed; this phase wires a concrete renderer (**@xyflow/react**) and the full workspace chrome around them.

| Area | Status |
|---|---|
| Concrete graph engine (React Flow) on the library-agnostic `GraphEngine` contract | Done |
| Graph workspace components (canvas, controls, stats, search, filters, timeline, path, depth, list view, legend) | Done |
| `/networks` listing + `/networks/[id]` workspace pages | Done |
| Inspector integration (node/edge → `EntityContext` / `RelationshipContext`) | Done |
| Reduced-motion + accessibility | Done |
| Tests (engine-independent) | Done |

## Terminology

The graph uses **neutral, evidence-based** language — never a claim about criminality:

- **Observed relationship** — extracted directly from source data (`RULE_BASED`, `STRUCTURED_MAPPING`, `REGEX`, `MANUAL`).
- **Inferred relationship** — derived by a model (`ML`, `LLM`, `NLP`).
- **Confidence** — confidence in extraction / entity resolution, not in guilt.
- **Connected entity / Potential match / Investigative relevance** — objective statements, not judgement.

## Architecture

The workspace never depends on a specific graph library. Application logic talks only to the `GraphEngine` interface; the React Flow binding is an interchangeable implementation.

```
GraphEngine (abstraction) ── implemented by ──> ReactFlowEngine (registerGraphEngine)
        ▲                                            │ mounts
        │                                            ▼
   workspace                                    ReactFlowViewport
        │                                            │
        └── derived RenderNode/RenderEdge ───────────► xyflow state
```

### Files

```
apps/web/src/
  engine/
    graph-engine.ts          # abstraction: GraphEngine, createGraphEngine, registerGraphEngine
    react-flow-engine.ts     # concrete @xyflow/react engine + registerReactFlowEngine()
    react-flow-types.ts      # typed FlowNode/FlowEdge helper types
    react-flow-viewport.tsx  # bridges engine <-> xyflow, reports selection
    mount-react-flow.tsx     # lazy createRoot mount (browser only)
  graph/
    transform.ts             # GraphNode/GraphEdge -> RenderNode/RenderEdge (+ colour)
    selectors.ts             # selectVisible (filters/depth/timeline/expansion), selectionVisuals
    layout.ts                # force / hierarchical / radial layout (d3-force)
    path.ts                  # shortest-path between entities
  state/graph.store.ts       # zustand: network, selection, depth, layout, filters, timeline, search, path, engine
  services/network.service.ts# getNetworks/getNetwork/searchNetwork/findPath/computeStatistics/...
  components/network/
    network-graph.tsx        # hero: engine <-> store <-> inspector wiring
    use-network-render.ts    # pure derivation: visible + laid out + visuals
    graph-controls.tsx       # zoom / fit / layout cycle / minimap / fullscreen
    graph-stats.tsx          # neutral structural counts overlay
    graph-search.tsx         # debounced search + result picker
    graph-filters.tsx        # entity / relationship / confidence filters
    graph-timeline.tsx       # date-range filter
    graph-path-explorer.tsx  # A→B path search + highlight
    depth-control.tsx        # 1/2/3-hop or full neighbourhood
    graph-node-list.tsx      # entity rows (list view)
    graph-relationship-list.tsx # relationship rows (observed/inferred)
    network-list-view.tsx    # combined list view
    network-summary.tsx      # header counts
    graph-legend.tsx         # entity colour + edge legend
    graph-inspector.ts       # graph node/edge -> InspectorContext
  app/(dashboard)/networks/
    page.tsx                 # network listing -> /networks/:id
    [id]/page.tsx            # interactive graph workspace
```

## The graph store

`useGraphStore` owns all interactive workspace state:

- **Network** — `networkId`, `summary`, canonical `nodes`/`edges`/`clusters`, `loadingState`, `error`.
- **Selection** — `selectedNodeId`, `selectedEdgeId`, `focusedNodeId`.
- **View** — `depth` (`hop` or `full`), `layout` (force/hierarchical/radial), `interactionMode`.
- **Filtering** — `filters` (types, confidence, statuses, sources, activity), `timeline` range.
- **Search / path** — `searchQuery`, `searchResults`, `path`, `pathLoading`.
- **Chrome** — `minimapVisible`, `fullscreen`.
- **Engine** — the `GraphEngine` instance (`setEngine`).

Actions are thin and react to store state; the heavy derived logic lives in the pure `graph/*` modules and in `useNetworkRender`.

## Rendering pipeline

`useNetworkRender` (`use-network-render.ts`) derives the render set with no side effects:

1. `selectVisible(...)` — apply filters + depth + timeline + expansion → visible nodes/edges.
2. `layoutNodes(layout, visible…)` — compute positions (d3-force).
3. `transformNodes/Edges` → `RenderNode`/`RenderEdge` with colour.
4. `selectionVisuals(...)` → focused/dimmed sets.
5. `computeStatistics(...)` → structural counts.

`NetworkGraph` pushes `renderNodes`/`renderEdges` into the engine; the engine reports selection back through `onSelectionChange`, which updates the store and opens the inspector.

## Inspector integration

Selecting a node/edge maps the graph element to a shell inspector context:

- `graphNodeToContext(node)` → `EntityContext` (id = canonical `entityId`, plus confidence/connections/sources/activity/status hints).
- `graphEdgeToContext(edge, nodeLabels)` → `RelationshipContext` (source/target names, relationship type, confidence, source, evidence, timestamp, direction, extraction kind, verification status).

`inspector.service.resolveInspectorContext` uses those graph hints as an **instant-render fallback** when a canonical Phase 6 profile / relationship record is unavailable (`hasGraphEntityHints` / `hasGraphRelationshipHints`), instead of erroring.

## Engine abstraction

`GraphEngine` is renderer-agnostic:

```ts
interface GraphEngine {
  id: string;
  setNodes(nodes: RenderNode[]): void;
  setEdges(edges: RenderEdge[]): void;
  setNodePositions(positions: Map<string, Point>): void;
  clearSelection(): void;
  viewport: { zoomIn; zoomOut; fitView; centerOn; getBoundingBox };
  onSelectionChange(cb): () => void;
  getVisibleNodeIds(): string[];
  getVisibleEdgeIds(): string[];
  destroy(): void;
}
```

`registerReactFlowEngine()` registers the concrete React Flow factory; `createGraphEngine('react-flow', container, onChange)` instantiates it. The React Flow module is **lazy-imported** so tests and SSR never pull in the library.

## Accessibility & motion

- Respects `prefers-reduced-motion` (`useReducedMotion`) — decorative panel motion is disabled when reduced.
- Toolbars/controls expose `aria-label`s; list rows use `aria-pressed`; the inspector is a labelled `dialog`.
- Colours come from the Phase 6 entity palette; relationship confidence is encoded as stroke opacity, never colour-only.

## Out of scope (this phase)

Per the Phase 7 boundary, the following are **not** implemented here: PageRank / centrality, community detection, anomaly detection, an AI assistant, criminal classification, and report generation. The mock service and existing analytics surface remain available for later phases.

> **Phase 12** — relationship/edge grounding is extended by `RelationshipEvidenceSupport` (direct vs contextual evidence per link) and the network evidence mode, which projects evidence onto network nodes and edges. See [EVIDENCE_INTELLIGENCE.md](EVIDENCE_INTELLIGENCE.md).

## Testing

- `src/components/network/graph-inspector.test.ts` — node/edge → context mapping.
- `src/components/network/network-list-view.test.tsx` — list view rendering + selection.
- `src/app/(dashboard)/networks/networks-page.test.tsx` — listing page.
- `src/app/(dashboard)/networks/[id]/network-page.test.tsx` — loading/error states.

The React Flow renderer is intentionally **not** unit-tested in jsdom (it mounts via lazy dynamic import); the engine contract and derived logic are.
