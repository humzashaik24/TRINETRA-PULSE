from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

from app.intelligence.anomaly_detection import detect_patterns


def entity(entity_type: str = "person") -> SimpleNamespace:
    return SimpleNamespace(id=uuid4(), entity_type=entity_type)


def relationship(source, target, **kwargs) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        source_entity_id=source.id,
        target_entity_id=target.id,
        relationship_type="transaction",
        evidence_refs=[],
        metadata_=kwargs.pop("metadata_", {}),
        start_date=kwargs.pop("start_date", None),
        end_date=kwargs.pop("end_date", None),
        **kwargs,
    )


def test_three_node_cycle_is_unique_and_does_not_fabricate_amounts():
    investigation_id = uuid4()
    a, b, c = entity(), entity(), entity()
    edges = [relationship(a, b), relationship(b, c), relationship(c, a)]

    results = detect_patterns(
        investigation_id,
        datetime(2026, 1, 1, tzinfo=UTC),
        [a, b, c],
        edges,
        [],
    )

    cycles = [result for result in results if result.pattern_type.value == "CIRCULAR_FUND_FLOW"]
    assert len(cycles) == 1
    assert cycles[0].metadata["total_observed_amount"] is None
    assert len(cycles[0].relationship_ids) == 3
    assert 0 <= cycles[0].confidence <= 1


def test_investigation_data_isolation_is_preserved_by_detector_inputs():
    investigation_id = uuid4()
    a, b, c = entity(), entity(), entity()
    in_scope = [relationship(a, b), relationship(b, c)]
    out_of_scope = relationship(c, a)

    results = detect_patterns(
        investigation_id,
        datetime(2026, 1, 1, tzinfo=UTC),
        [a, b, c],
        in_scope,
        [],
    )

    assert not any(out_of_scope.id in result.relationship_ids for result in results)


def test_phone_switching_supports_multiple_numbers_and_timestamps():
    person = entity("person")
    phone_a, phone_b = entity("phone"), entity("phone")
    first = datetime(2026, 1, 1, tzinfo=UTC)
    edges = [
        relationship(person, phone_a, start_date=first),
        relationship(person, phone_b, start_date=first + timedelta(days=2)),
    ]

    results = detect_patterns(uuid4(), first, [person, phone_a, phone_b], edges, [])

    phone_results = [result for result in results if result.pattern_type.value == "BURNER_SIM"]
    assert len(phone_results) == 1
    assert phone_results[0].metadata["rapid_switching_supported"] is True
    assert "Potential phone switching pattern" in phone_results[0].description


def test_hub_and_bridge_are_observed_structural_signals():
    hub = entity()
    left_a, left_b, right_a, right_b = (entity() for _ in range(4))
    edges = [
        relationship(hub, left_a),
        relationship(hub, left_b),
        relationship(hub, right_a),
        relationship(hub, right_b),
        relationship(left_a, left_b),
        relationship(right_a, right_b),
    ]

    results = detect_patterns(
        uuid4(),
        datetime(2026, 1, 1, tzinfo=UTC),
        [hub, left_a, left_b, right_a, right_b],
        edges,
        [],
    )

    assert any(
        result.pattern_type.value == "NETWORK_HUB" and result.entity_ids == [hub.id]
        for result in results
    )
    assert any(result.pattern_type.value == "BRIDGE_ENTITY" for result in results)


def test_expansion_requires_real_relationship_timestamps():
    person = entity()
    others = [entity() for _ in range(4)]
    start = datetime(2026, 1, 1, tzinfo=UTC)
    edges = [
        relationship(person, others[0], start_date=start),
        relationship(person, others[1], start_date=start + timedelta(days=10)),
        relationship(person, others[2], start_date=start + timedelta(days=11)),
        relationship(person, others[3], start_date=start + timedelta(days=12)),
    ]

    results = detect_patterns(uuid4(), start, [person, *others], edges, [])

    assert any(result.pattern_type.value == "RAPID_RELATIONSHIP_EXPANSION" for result in results)
