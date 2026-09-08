"""Investigation Direction Intelligence tests (Phase 26).

Covers the deterministic pure engine (all nine grounded direction types,
clamping, prioritisation, determinism, no fabrication / no out-of-scope
leakage) and the read-only API surface (shape, filters, scoping, 404).
"""

from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.intelligence.directions import generate_directions
from app.models import Base, Relationship, RelationshipType, VerificationStatus
from tests.auth_stubs import install_auth_stub

NOW = datetime(2026, 1, 1, tzinfo=UTC)


def entity(name: str = "Entity", **kwargs) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        entity_type=kwargs.pop("entity_type", "person"),
        name=name,
        canonical_name=None,
        **kwargs,
    )


def relationship(
    source,
    target,
    *,
    verification_status="needs_review",
    evidence_refs=None,
    confidence=0.0,
    **kwargs,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        source_entity_id=source.id,
        target_entity_id=target.id,
        relationship_type="transaction",
        confidence=confidence,
        evidence_refs=list(evidence_refs or []),
        verification_status=verification_status,
        **kwargs,
    )


def evidence_item(*, evidence_type: str = "DOCUMENT", title: str = "Document") -> SimpleNamespace:
    return SimpleNamespace(id=uuid4(), evidence_type=evidence_type, title=title)


def event_item(*, event_type: str = "meeting", timestamp=None) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        event_type=event_type,
        timestamp=timestamp,
        description="desc",
    )


def resolution(
    *,
    state: str = "needs_review",
    entity_type: str = "person",
    confidence: float = 0.7,
    matched=None,
    reasons=None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        resolution_type="candidate_match",
        entity_type=entity_type,
        state=state,
        confidence=confidence,
        matched_entity_id=matched,
        reasons=list(reasons or []),
    )


def pattern(
    *,
    pattern_type="BRIDGE_ENTITY",
    severity="HIGH",
    confidence=0.8,
    title="Observed structural pattern",
    entity_ids=(),
    relationship_ids=(),
    evidence_ids=(),
):
    return SimpleNamespace(
        pattern_type=pattern_type,
        severity=severity,
        confidence=confidence,
        title=title,
        description="A deterministic detector matched this pattern.",
        entity_ids=list(entity_ids),
        relationship_ids=list(relationship_ids),
        evidence_ids=list(evidence_ids),
    )


def generate(
    *,
    entities=None,
    relationships=None,
    evidence=None,
    events=None,
    patterns=None,
    resolutions=None,
):
    return generate_directions(
        uuid4(),
        now=NOW,
        entities=entities or [],
        relationships=relationships or [],
        evidence=evidence or [],
        events=events or [],
        patterns=patterns or [],
        resolutions=resolutions or [],
    )


def types_of(directions):
    return {direction.direction_type for direction in directions}


# ---------------------------------------------------------------------------
# high_connectivity_entity
# ---------------------------------------------------------------------------


def test_hub_entity_detects_high_connectivity_from_real_degree():
    hub = entity("Hub")
    leaves = [entity(f"Leaf {index}") for index in range(3)]
    edges = [relationship(hub, leaf) for leaf in leaves]

    directions = generate(entities=[hub, *leaves], relationships=edges)

    hubs = [d for d in directions if d.direction_type == "high_connectivity_entity"]
    assert len(hubs) == 1
    assert hubs[0].related_entity_ids == [hub.id]
    assert hubs[0].supporting_facts[0].value == 3
    assert hubs[0].title == "Follow connections around Hub"
    assert hubs[0].related_relationship_ids == sorted((edge.id for edge in edges), key=str)
    assert 0 <= hubs[0].confidence <= 1


def test_isolated_entity_generates_no_high_connectivity_lead():
    directions = generate(entities=[entity("Lonely")], relationships=[])
    assert "high_connectivity_entity" not in types_of(directions)


# ---------------------------------------------------------------------------
# unresolved_connection
# ---------------------------------------------------------------------------


def test_shared_neighbors_without_direct_edge_are_flagged():
    hub = entity("Hub")
    left, right = entity("Left"), entity("Right")
    shared = evidence_item()
    edges = [
        relationship(hub, left, evidence_refs=[str(shared.id)]),
        relationship(hub, right, evidence_refs=[str(shared.id)]),
    ]

    directions = generate(entities=[hub, left, right], relationships=edges)

    unresolved = [d for d in directions if d.direction_type == "unresolved_connection"]
    assert len(unresolved) == 1
    assert set(unresolved[0].related_entity_ids) == {left.id, right.id, hub.id}
    assert unresolved[0].related_evidence_ids == [shared.id]
    assert any(fact.fact_type == "shared_evidence" for fact in unresolved[0].supporting_facts)


def test_directly_connected_pair_is_not_reported_as_unresolved():
    hub = entity("Hub")
    left, right = entity("Left"), entity("Right")
    edges = [
        relationship(hub, left),
        relationship(hub, right),
        relationship(left, right),
    ]

    directions = generate(entities=[hub, left, right], relationships=edges)

    unresolved = [d for d in directions if d.direction_type == "unresolved_connection"]
    assert unresolved == []


# ---------------------------------------------------------------------------
# bridge_entity
# ---------------------------------------------------------------------------


def test_chain_topology_flags_middle_node_as_bridge():
    a, b, c = entity("A"), entity("B"), entity("C")
    edges = [relationship(a, b), relationship(b, c)]

    directions = generate(entities=[a, b, c], relationships=edges)

    bridges = [d for d in directions if d.direction_type == "bridge_entity"]
    assert len(bridges) == 1
    assert bridges[0].related_entity_ids == [b.id]
    articulation = next(
        fact
        for fact in bridges[0].supporting_facts
        if fact.fact_type == "articulation_point"
    )
    assert articulation.value == 2


def test_triangle_has_no_bridge_direction():
    a, b, c = entity("A"), entity("B"), entity("C")
    edges = [relationship(a, b), relationship(b, c), relationship(c, a)]

    directions = generate(entities=[a, b, c], relationships=edges)

    assert "bridge_entity" not in types_of(directions)


# ---------------------------------------------------------------------------
# suspicious_pattern
# ---------------------------------------------------------------------------


def test_suspicious_pattern_carries_confidence_and_related_ids():
    a, b = entity("A"), entity("B")
    rel = relationship(a, b)
    ev = evidence_item()

    directions = generate(
        entities=[a, b],
        relationships=[rel],
        patterns=[
            pattern(
                confidence=0.62,
                entity_ids=[a.id],
                relationship_ids=[rel.id],
                evidence_ids=[ev.id],
            )
        ],
    )

    suspicious = [d for d in directions if d.direction_type == "suspicious_pattern"]
    assert len(suspicious) == 1
    assert suspicious[0].confidence == 0.62
    assert suspicious[0].related_entity_ids == [a.id]
    assert suspicious[0].related_relationship_ids == [rel.id]
    assert suspicious[0].related_evidence_ids == [ev.id]
    assert suspicious[0].priority == "high"


def test_low_confidence_low_severity_pattern_is_skipped():
    directions = generate(patterns=[pattern(severity="LOW", confidence=0.2)])
    assert "suspicious_pattern" not in types_of(directions)


# ---------------------------------------------------------------------------
# evidence_gap + relationship_verification
# ---------------------------------------------------------------------------


def test_relationship_without_evidence_becomes_evidence_gap():
    a, b = entity("A"), entity("B")
    rel = relationship(a, b, verification_status="needs_review", confidence=0.3)

    directions = generate(entities=[a, b], relationships=[rel])

    gaps = [d for d in directions if d.direction_type == "evidence_gap"]
    assert len(gaps) == 1
    assert gaps[0].related_relationship_ids == [rel.id]
    assert set(gaps[0].related_entity_ids) == {a.id, b.id}
    assert gaps[0].supporting_facts[0].value == 0


def test_relationship_with_evidence_becomes_verification_direction():
    a, b = entity("A"), entity("B")
    rel = relationship(a, b, verification_status="needs_review", evidence_refs=["doc-1"])

    directions = generate(entities=[a, b], relationships=[rel])

    verifications = [d for d in directions if d.direction_type == "relationship_verification"]
    assert len(verifications) == 1
    assert verifications[0].related_relationship_ids == [rel.id]
    assert verifications[0].supporting_facts[0].value == 1


def test_verified_relationship_generates_no_gap_or_verification_direction():
    a, b = entity("A"), entity("B")
    rel = relationship(a, b, verification_status="confirmed")

    directions = generate(entities=[a, b], relationships=[rel])

    assert "evidence_gap" not in types_of(directions)
    assert "relationship_verification" not in types_of(directions)


# ---------------------------------------------------------------------------
# entity_resolution
# ---------------------------------------------------------------------------


def test_pending_resolution_becomes_entity_resolution_direction():
    matched = entity("Matched", entity_type="phone")
    pending = resolution(
        state="needs_review",
        entity_type="phone",
        confidence=0.62,
        matched=matched.id,
    )

    directions = generate(resolutions=[pending])

    resolutions = [d for d in directions if d.direction_type == "entity_resolution"]
    assert len(resolutions) == 1
    assert resolutions[0].confidence == 0.62
    assert resolutions[0].related_entity_ids == [matched.id]


def test_auto_resolved_resolutions_are_excluded():
    pending = resolution(state="needs_review")
    auto = resolution(state="auto_resolved")

    directions = generate(resolutions=[pending, auto])

    entity_resolutions = [d for d in directions if d.direction_type == "entity_resolution"]
    assert len(entity_resolutions) == 1


# ---------------------------------------------------------------------------
# timeline_gap
# ---------------------------------------------------------------------------


def test_events_without_timestamp_produce_timeline_gap():
    directions = generate(events=[event_item(timestamp=None), event_item(timestamp=None)])

    gaps = [d for d in directions if d.direction_type == "timeline_gap"]
    assert len(gaps) == 1
    assert "2" in gaps[0].title
    assert gaps[0].supporting_facts[0].value == 2


def test_long_calendar_gap_is_reported_with_day_count():
    first = event_item(timestamp=datetime(2026, 1, 1, tzinfo=UTC))
    second = event_item(timestamp=datetime(2026, 7, 1, tzinfo=UTC))

    directions = generate(events=[first, second])

    gaps = [d for d in directions if d.direction_type == "timeline_gap"]
    assert len(gaps) >= 1
    day_gap = next(d for d in gaps if d.supporting_facts[0].fact_type == "timeline_gap")
    assert day_gap.supporting_facts[0].value == 181
    assert "181-day gap" in day_gap.title


def test_short_gap_below_threshold_is_not_reported():
    first = event_item(timestamp=datetime(2026, 1, 1, tzinfo=UTC))
    second = event_item(timestamp=datetime(2026, 1, 21, tzinfo=UTC))

    directions = generate(events=[first, second])

    assert "timeline_gap" not in types_of(directions)


# ---------------------------------------------------------------------------
# follow_up_evidence
# ---------------------------------------------------------------------------


def test_dangling_evidence_reference_becomes_follow_up():
    a, b = entity("A"), entity("B")
    missing = uuid4()
    rel = relationship(a, b, evidence_refs=[str(missing)])

    directions = generate(entities=[a, b], relationships=[rel], evidence=[evidence_item()])

    follow_ups = [d for d in directions if d.direction_type == "follow_up_evidence"]
    assert len(follow_ups) == 1
    assert follow_ups[0].related_relationship_ids == [rel.id]
    assert follow_ups[0].supporting_facts[0].value == str(missing)


def test_resolved_evidence_reference_yields_no_follow_up():
    a, b = entity("A"), entity("B")
    present = evidence_item()
    rel = relationship(a, b, evidence_refs=[str(present.id)])

    directions = generate(entities=[a, b], relationships=[rel], evidence=[present])

    assert "follow_up_evidence" not in types_of(directions)


# ---------------------------------------------------------------------------
# scoring, priority, determinism, caps
# ---------------------------------------------------------------------------


def test_confidence_is_clamped_into_canonical_range():
    directions = generate(patterns=[pattern(confidence=1.9)])
    suspicious = next(d for d in directions if d.direction_type == "suspicious_pattern")
    assert suspicious.confidence == 1.0


def test_priority_mapping_is_deterministic():
    high_conf = generate(patterns=[pattern(confidence=0.9)])
    mid_conf = generate(patterns=[pattern(confidence=0.5)])
    low_conf = generate(patterns=[pattern(confidence=0.3)])

    def priority_of(candidate):
        return next(
            item for item in candidate if item.direction_type == "suspicious_pattern"
        ).priority

    assert priority_of(high_conf) == "critical"
    assert priority_of(mid_conf) == "medium"
    assert priority_of(low_conf) == "low"


def test_stable_ids_are_deterministic_across_runs():
    a, b = entity("A"), entity("B")
    rel = relationship(a, b, evidence_refs=[])

    first = generate(entities=[a, b], relationships=[rel])
    second = generate(entities=[a, b], relationships=[rel])

    assert [(d.id, d.direction_type) for d in first] == [
        (d.id, d.direction_type) for d in second
    ]


def test_empty_investigation_produces_no_fabricated_directions():
    assert generate() == []


def test_result_is_sorted_by_priority_then_confidence():
    directions = generate(
        patterns=[
            pattern(confidence=0.6, severity="MEDIUM", title="P1"),
            pattern(confidence=0.95, severity="HIGH", title="P2"),
        ]
    )
    rank = {d.title: index for index, d in enumerate(directions)}
    assert rank["Review detected pattern: P2"] < rank["Review detected pattern: P1"]


def test_total_result_is_capped():
    hub = entity("Hub")
    leaves = [entity(f"Leaf {index}") for index in range(30)]
    edges = [relationship(hub, leaf) for leaf in leaves]

    directions = generate(entities=[hub, *leaves], relationships=edges)

    assert len(directions) <= 12


def test_related_ids_are_drawn_only_from_provided_records():
    a, b = entity("A"), entity("B")
    third = entity("Third")
    edges = [relationship(a, b), relationship(a, third)]

    directions = generate(entities=[a, b], relationships=edges)

    provided_entity_ids = {a.id, b.id, third.id}
    provided_relationship_ids = {edge.id for edge in edges}
    for direction in directions:
        assert set(direction.related_entity_ids) <= provided_entity_ids
        assert set(direction.related_relationship_ids) <= provided_relationship_ids


def test_supporting_fact_holds_a_measured_value_not_an_invention():
    hub = entity("Hub")
    leaves = [entity(f"Leaf {index}") for index in range(5)]
    edges = [relationship(hub, leaf) for leaf in leaves]

    directions = generate(entities=[hub, *leaves], relationships=edges)

    degree_facts = [
        fact.value
        for direction in directions
        for fact in direction.supporting_facts
        if fact.fact_type == "degree_observed"
    ]
    assert set(degree_facts) == {5}


# ---------------------------------------------------------------------------
# API surface (read-only, scoped, filterable)
# ---------------------------------------------------------------------------


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    app = create_real_app()

    async def override_get_session():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    from app.api.deps import get_session

    app.dependency_overrides[get_session] = override_get_session
    install_auth_stub(app)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, factory
    await engine.dispose()


async def _create_investigation(ac) -> str:
    response = await ac.post(
        "/investigations",
        json={"title": "Directions test", "status": "active", "priority": "high"},
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _create_entity(ac, investigation_id, name):
    response = await ac.post(
        "/entities",
        json={
            "investigation_id": investigation_id,
            "entity_type": "person",
            "name": name,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


async def _seed_relationship(factory, investigation_id, source_id, target_id) -> str:
    async with factory() as session:
        rel = Relationship(
            investigation_id=UUID(investigation_id),
            source_entity_id=UUID(source_id),
            target_entity_id=UUID(target_id),
            relationship_type=RelationshipType.TRANSACTION,
            verification_status=VerificationStatus.NEEDS_REVIEW,
            evidence_refs=[],
            confidence=0.0,
        )
        session.add(rel)
        await session.commit()
        return str(rel.id)


@pytest.mark.anyio
async def test_directions_endpoint_is_readonly_and_well_shaped(client):
    ac, factory = client
    investigation_id = await _create_investigation(ac)
    hub = await _create_entity(ac, investigation_id, "Hub")
    leaf_one = await _create_entity(ac, investigation_id, "Leaf One")
    leaf_two = await _create_entity(ac, investigation_id, "Leaf Two")
    await _seed_relationship(factory, investigation_id, hub, leaf_one)
    await _seed_relationship(factory, investigation_id, hub, leaf_two)

    response = await ac.get(f"/investigations/{investigation_id}/directions")

    assert response.status_code == 200
    body = response.json()
    assert body["investigation_id"] == investigation_id
    assert isinstance(body["computed_at"], str)
    assert body["directions"]
    for direction in body["directions"]:
        assert 0.0 <= direction["confidence"] <= 1.0
        assert direction["status"] == "new"
        assert direction["id"].startswith("dir-")
        assert direction["investigation_id"] == investigation_id
    types_from_api = {direction["direction_type"] for direction in body["directions"]}
    assert "evidence_gap" in types_from_api
    assert "high_connectivity_entity" in types_from_api


@pytest.mark.anyio
async def test_directions_endpoint_404_for_missing_investigation(client):
    ac, _ = client
    response = await ac.get(f"/investigations/{uuid4()}/directions")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


@pytest.mark.anyio
async def test_directions_endpoint_supports_type_and_priority_filters(client):
    ac, factory = client
    investigation_id = await _create_investigation(ac)
    hub = await _create_entity(ac, investigation_id, "Hub")
    leaf_one = await _create_entity(ac, investigation_id, "Leaf One")
    leaf_two = await _create_entity(ac, investigation_id, "Leaf Two")
    await _seed_relationship(factory, investigation_id, hub, leaf_one)
    await _seed_relationship(factory, investigation_id, hub, leaf_two)

    filtered = await ac.get(
        f"/investigations/{investigation_id}/directions?direction_type=high_connectivity_entity"
    )
    assert filtered.status_code == 200
    assert {item["direction_type"] for item in filtered.json()["directions"]} == {
        "high_connectivity_entity"
    }

    invalid = await ac.get(
        f"/investigations/{investigation_id}/directions?direction_type=not_a_direction"
    )
    assert invalid.status_code == 422


@pytest.mark.anyio
async def test_directions_are_scoped_per_investigation(client):
    ac, factory = client
    inv_a = await _create_investigation(ac)
    inv_b = await _create_investigation(ac)
    a_hub = await _create_entity(ac, inv_a, "Hub A")
    a_leaf = await _create_entity(ac, inv_a, "Leaf A")
    b_hub = await _create_entity(ac, inv_b, "Hub B")
    b_leaf = await _create_entity(ac, inv_b, "Leaf B")
    await _seed_relationship(factory, inv_a, a_hub, a_leaf)
    await _seed_relationship(factory, inv_b, b_hub, b_leaf)

    response_a = await ac.get(f"/investigations/{inv_a}/directions")

    referenced_a = {
        entity_id
        for direction in response_a.json()["directions"]
        for entity_id in direction["related_entity_ids"]
    }
    assert referenced_a and b_hub not in referenced_a and b_leaf not in referenced_a


@pytest.mark.anyio
async def test_get_single_direction_by_stable_id(client):
    ac, factory = client
    investigation_id = await _create_investigation(ac)
    a = await _create_entity(ac, investigation_id, "Hub")
    b = await _create_entity(ac, investigation_id, "Leaf")
    await _seed_relationship(factory, investigation_id, a, b)

    listing = (await ac.get(f"/investigations/{investigation_id}/directions")).json()
    sample = listing["directions"][0]

    single = await ac.get(
        f"/investigations/{investigation_id}/directions/{sample['id']}"
    )
    assert single.status_code == 200
    assert single.json()["id"] == sample["id"]

    missing = await ac.get(f"/investigations/{investigation_id}/directions/dir-missing")
    assert missing.status_code == 404
