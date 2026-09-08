# Phase 19 — Advanced Network Analytics Engine

## Objective

Phase 19 replaces summary-only network analytics with deterministic,
investigation-scoped analytics computed from persisted entities and
relationships. Analytics identify structural relationships and investigative
leads. They do not establish guilt or criminality.

## Algorithms

- Degree centrality includes total topology degree, directed in-degree,
  directed out-degree, and normalized degree.
- Betweenness uses Brandes shortest-path accumulation over the undirected
  structural graph.
- Closeness uses reachable-node distance and returns zero for entities with no
  reachable peers; disconnected pairs are not treated as reachable.
- PageRank uses a deterministic 0.85 damping factor over persisted relationship
  direction, with dangling-node redistribution.
- Connected components use deterministic breadth-first traversal.
- Communities use deterministic label propagation/modularity improvement over
  the same unweighted structural graph. Community identifiers are assigned in
  stable entity-id order.
- Bridge entities are articulation points from Tarjan's algorithm. Bridge
  relationships are graph edges whose removal separates the topology.
- Density, average degree, average reachable path length, and diameter are
  calculated from unique non-self structural relationships.

Existing relationship weights are exposed by the graph API, but the current
analytics topology is intentionally unweighted. No arbitrary metadata is
interpreted as a strength value.

## Graph semantics

Association-style topology, components, communities, centrality, and shortest
paths are calculated on an undirected graph. Directed in-degree, out-degree,
and PageRank preserve the persisted source-to-target relationship direction.
Self-loops are excluded from topology calculations and duplicate relationships
collapse to one structural edge while persisted relationship counts remain
unchanged.

## Temporal methodology

Temporal snapshots use persisted entity creation times and relationship
start/end times when present. A missing temporal signal produces an empty
timeline rather than fabricated dates. Relationship intervals are evaluated
against deterministic time windows and report node/relationship growth,
components, density, and per-entity structural metrics.

## Persistence, scope, and determinism

`GET /api/v2/networks/{investigation_id}/analytics` computes only the
investigation's persisted rows and stores the latest result in
`network_analytics_snapshots`. A snapshot is refreshed on each analytics
request, so graph mutations cannot return an older cached result. Entity and
relationship lookup is scoped by the requested investigation; cross-
investigation entity IDs do not resolve.

Results are sorted by UUID or metric score with stable UUID tie-breakers.
Algorithm version `19.0.0` is stored with every snapshot.

## API

- `GET /api/v2/networks/{investigation_id}/graph`
- `GET /api/v2/networks/{investigation_id}/analytics`
- `GET /api/v2/networks/{investigation_id}/path`
- `GET /api/v2/networks/{investigation_id}/shortest-path`

All routes require the existing verified JWT dependency. No client identity
headers are trusted. Path queries accept either
`source_entity_id`/`target_entity_id` or the frontend-compatible
`start_entity_id`/`end_entity_id` names. Missing entities return the existing
resource-not-found contract.

The analytics response includes entity and relationship counts, component
membership, isolated entities, largest component, density, average degree,
ranked centrality maps, communities, bridge entities, explanations, temporal
snapshots, and the persisted snapshot timestamp.

## Frontend

API mode now consumes the server analytics bundle without falling back to the
Phase 8 mock engine. Typed adapters map server DTOs into the existing
analytics model. Metrics, Groups, Components, Bridges, Patterns, and Timeline
tabs preserve honest unavailable states. Existing graph overlays, focus
selection, path highlighting, and Context Inspector integration are reused.
Mock mode continues to use the existing deterministic Phase 8 engine.

## Complexity and limitations

The implementation is in-process and bounded to the existing service limits
of 10,000 entities and 20,000 relationships. BFS-based shortest-path and
component calculations are linear in the loaded graph. Brandes betweenness and
the temporal snapshots are more expensive and should be reserved for moderate
investigation graphs. No Redis, Neo4j, Kafka, Docker, or other infrastructure
was added.

Current authorization remains the repository's existing authenticated
resource-access model; investigation assignment is not a separate membership
ACL. The API also does not infer relationship strength where the model does
not define one.

## Security and investigative boundary

Analytics reads are authenticated and investigation-scoped. The feature does
not add mutation routes, criminality scoring, predictive behavior, guilt
claims, or autonomous decisions. Bridge and influence language remains
structural and neutral.

**Network analytics identify structural relationships and investigative leads.
They do not establish guilt or criminality.**

## Verification

Backend lint and Python compilation pass. Frontend type-check, targeted
analytics tests, and source lint pass. Full backend test execution in this
environment initially required the already-declared `email-validator`
dependency to be installed in the local virtual environment; no production
database or live deployment verification is claimed here.

Operation Meridian data was not modified or augmented.

**Phase 20 — NOT STARTED.**
