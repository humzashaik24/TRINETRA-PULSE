"""Deterministic persisted candidate resolution (Phase 20).

The resolver deliberately uses blocking keys instead of comparing every pair.
Raw values are never overwritten; normalized values and explanations are
stored alongside their provenance and algorithm version.

Phase 20 introduces a tiered, explainable matching strategy:

* TIER 1 - strong identifier match.
* TIER 2 - multi-attribute match.
* TIER 3 - name-only similarity.

Confidence: HIGH / MEDIUM / LOW linkage confidence.
It does NOT mean probability of criminality, guilt, or threat.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import UTC, datetime
from difflib import SequenceMatcher
from typing import Any
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import ConflictError, EntityNotFoundError, InvestigationNotFoundError
from app.models import (
    CandidateObservation,
    CandidateObservationState,
    CandidateResolution,
    CandidateResolutionAudit,
    CandidateResolutionState,
    Entity,
    EntityType,
    MatchFeatureType,
    ResolutionConfidenceLevel,
    ResolutionTier,
)
from app.repositories.investigation import InvestigationRepository

ALGORITHM_VERSION = "20.0.0"
FEATURE_WEIGHTS: dict[str, float] = {
    MatchFeatureType.PHONE_EXACT.value: 0.55,
    MatchFeatureType.EMAIL_EXACT.value: 0.55,
    MatchFeatureType.IDENTIFIER_EXACT.value: 0.55,
    MatchFeatureType.VEHICLE_EXACT.value: 0.50,
    MatchFeatureType.ACCOUNT_EXACT.value: 0.55,
    MatchFeatureType.NAME_EXACT.value: 0.35,
    MatchFeatureType.DATE_OF_BIRTH_MATCH.value: 0.20,
    MatchFeatureType.SHARED_SOURCE_IDENTIFIER.value: 0.30,
    MatchFeatureType.ALIAS_MATCH.value: 0.20,
    MatchFeatureType.NAME_SIMILARITY.value: 0.15,
    MatchFeatureType.ADDRESS_SIMILARITY.value: 0.10,
}

CONTRADICTION_KEYS = {
    "date_of_birth", "dob", "birth_date",
    "phone", "phone_number", "msisdn", "mobile", "alternate_phone",
    "email",
    "id_number", "identifier", "pan",
    "vehicle_number", "vehicle_registration", "registration_number",
    "account_number", "account", "imei",
}

MULTI_ATTRIBUTE_KEYS = {
    "name", "full_name",
    "phone", "phone_number", "msisdn", "alternate_phone",
    "email", "id_number",
    "address", "location",
    "vehicle_number", "vehicle_registration",
    "account_number", "holder",
}

HIGH_CONFIDENCE_THRESHOLD = 0.70
MEDIUM_CONFIDENCE_THRESHOLD = 0.45

def normalize_value(raw_value: str, entity_type: str | EntityType) -> str:
    """Return a stable, type-aware comparison value while preserving raw input."""
    value = unicodedata.normalize("NFKC", str(raw_value)).strip().casefold()
    kind = entity_type.value if isinstance(entity_type, EntityType) else str(entity_type).casefold()
    if kind in {"phone", "msisdn"}:
        digits = re.sub(r"\D", "", value)
        return f"+{digits}" if digits else ""
    if kind in {"email", "account", "transaction"}:
        return re.sub(r"[^a-z0-9@._+-]", "", value)
    if kind in {"vehicle"}:
        return re.sub(r"[^a-z0-9]", "", value)
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()


def blocking_key(normalized_value: str, entity_type: str | EntityType) -> str:
    """Build a deterministic blocking key for candidate generation."""
    kind = entity_type.value if isinstance(entity_type, EntityType) else str(entity_type).casefold()
    if kind in {"phone", "msisdn"}:
        return f"{kind}:{normalized_value[-10:]}"
    if kind in {"email"}:
        return f"{kind}:{normalized_value}"
    if kind in {"vehicle"}:
        return f"{kind}:{normalized_value[:64]}"
    tokens = normalized_value.split()
    token = max(tokens, key=len) if tokens else normalized_value
    return f"{kind}:{token[:64]}"

def _attribute_values(attributes: dict[str, Any]) -> dict[str, str]:
    result: dict[str, str] = {}
    for key, value in (attributes or {}).items():
        if value is None or isinstance(value, (dict, list)):
            continue
        result[str(key).casefold()] = normalize_value(str(value), key)
    return result


def _right_entity_type(right: CandidateObservation | Entity) -> str:
    et = getattr(right, "entity_type", None)
    if et is None:
        return ""
    return getattr(et, "value", str(et))


def _right_raw_value(right: CandidateObservation | Entity) -> str:
    return str(getattr(right, "raw_value", None) or getattr(right, "name", "") or "")


def _right_normalized_value(right: CandidateObservation | Entity, left_entity_type: str) -> str:
    stored = getattr(right, "normalized_value", None)
    if isinstance(stored, str) and stored:
        return stored
    return normalize_value(_right_raw_value(right), left_entity_type)


def _attribute_similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    return round(SequenceMatcher(None, left, right).ratio(), 6)


def _detect_contradictions(left_attrs: dict[str, str], right_attrs: dict[str, str]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for key in CONTRADICTION_KEYS:
        l = left_attrs.get(key)
        r = right_attrs.get(key)
        if l and r and l != r:
            out.append({"field": key, "left": l, "right": r})
    return out


def _tier_for(features: dict[str, bool], contradictions: list[dict[str, str]]) -> ResolutionTier:
    """Classify the resolution into a matching tier."""
    tier1_keys = {
        MatchFeatureType.PHONE_EXACT.value,
        MatchFeatureType.EMAIL_EXACT.value,
        MatchFeatureType.IDENTIFIER_EXACT.value,
        MatchFeatureType.VEHICLE_EXACT.value,
        MatchFeatureType.ACCOUNT_EXACT.value,
    }
    contradicted_fields = {c["field"] for c in contradictions}
    for key in tier1_keys:
        if features.get(key):
            base_field = {
                MatchFeatureType.PHONE_EXACT.value: "phone",
                MatchFeatureType.EMAIL_EXACT.value: "email",
                MatchFeatureType.IDENTIFIER_EXACT.value: "id_number",
                MatchFeatureType.VEHICLE_EXACT.value: "vehicle_number",
                MatchFeatureType.ACCOUNT_EXACT.value: "account_number",
            }.get(key)
            if base_field and base_field in contradicted_fields:
                continue
            return ResolutionTier.TIER_1_STRONG_IDENTIFIER
    multi_attr_hits = [k for k in features if features.get(k) and k in (
        MatchFeatureType.NAME_EXACT.value,
        MatchFeatureType.DATE_OF_BIRTH_MATCH.value,
        MatchFeatureType.SHARED_SOURCE_IDENTIFIER.value,
        MatchFeatureType.ALIAS_MATCH.value,
        MatchFeatureType.ADDRESS_SIMILARITY.value,
    )]
    if len(multi_attr_hits) >= 2:
        return ResolutionTier.TIER_2_MULTI_ATTRIBUTE
    if features.get(MatchFeatureType.NAME_EXACT.value) and (
        features.get(MatchFeatureType.DATE_OF_BIRTH_MATCH.value)
        or features.get(MatchFeatureType.SHARED_SOURCE_IDENTIFIER.value)
        or features.get(MatchFeatureType.ALIAS_MATCH.value)
    ):
        return ResolutionTier.TIER_2_MULTI_ATTRIBUTE
    return ResolutionTier.TIER_3_NAME_SIMILARITY


def _confidence_level(score: float) -> ResolutionConfidenceLevel:
    if score >= HIGH_CONFIDENCE_THRESHOLD:
        return ResolutionConfidenceLevel.HIGH
    if score >= MEDIUM_CONFIDENCE_THRESHOLD:
        return ResolutionConfidenceLevel.MEDIUM
    return ResolutionConfidenceLevel.LOW


def explain_match(left: CandidateObservation, right: CandidateObservation | Entity) -> dict[str, Any]:
    """Build a deterministic, JSON-serializable match explanation."""
    left_entity_type = left.entity_type
    right_normalized = _right_normalized_value(right, left_entity_type)
    left_normalized = left.normalized_value
    type_match = str(left_entity_type) == _right_entity_type(right)
    left_attrs = _attribute_values(left.attributes or {})
    right_attrs = _attribute_values(getattr(right, "attributes", {}) or {})

    features: dict[str, bool] = {f.value: False for f in MatchFeatureType}

    if (left_attrs.get("phone") and right_attrs.get("phone") and left_attrs["phone"] == right_attrs["phone"]):
        features[MatchFeatureType.PHONE_EXACT.value] = True
    if (left_attrs.get("alternate_phone") and right_attrs.get("alternate_phone") and left_attrs["alternate_phone"] == right_attrs["alternate_phone"]):
        features[MatchFeatureType.PHONE_EXACT.value] = True

    if (left_attrs.get("email") and right_attrs.get("email") and left_attrs["email"] == right_attrs["email"]):
        features[MatchFeatureType.EMAIL_EXACT.value] = True

    for id_key in ("id_number", "identifier", "pan", "aadhaar", "gstin"):
        if (left_attrs.get(id_key) and right_attrs.get(id_key) and left_attrs[id_key] == right_attrs[id_key]):
            features[MatchFeatureType.IDENTIFIER_EXACT.value] = True
            break

    for v_key in ("vehicle_number", "vehicle_registration", "registration_number"):
        if (left_attrs.get(v_key) and right_attrs.get(v_key) and left_attrs[v_key] == right_attrs[v_key]):
            features[MatchFeatureType.VEHICLE_EXACT.value] = True
            break

    for a_key in ("account_number", "account", "imei"):
        if (left_attrs.get(a_key) and right_attrs.get(a_key) and left_attrs[a_key] == right_attrs[a_key]):
            features[MatchFeatureType.ACCOUNT_EXACT.value] = True
            break

    if left_normalized and left_normalized == right_normalized:
        features[MatchFeatureType.NAME_EXACT.value] = True

    if (left_attrs.get("date_of_birth") and right_attrs.get("date_of_birth") and left_attrs["date_of_birth"] == right_attrs["date_of_birth"]):
        features[MatchFeatureType.DATE_OF_BIRTH_MATCH.value] = True

    left_source = getattr(left, "source", "") or ""
    right_source = getattr(right, "source", "") or ""
    if (left_source and right_source and left_source == right_source and str(left_normalized) == str(right_normalized)):
        features[MatchFeatureType.SHARED_SOURCE_IDENTIFIER.value] = True

    similarity = _attribute_similarity(left_normalized, right_normalized)
    if similarity >= 0.80 and not features[MatchFeatureType.NAME_EXACT.value]:
        features[MatchFeatureType.NAME_SIMILARITY.value] = True

    address_sim = _attribute_similarity(left_attrs.get("address", ""), right_attrs.get("address", ""))
    if address_sim >= 0.85:
        features[MatchFeatureType.ADDRESS_SIMILARITY.value] = True

    if (left_attrs.get("alias") and right_attrs.get("alias") and left_attrs["alias"] == right_attrs["alias"]):
        features[MatchFeatureType.ALIAS_MATCH.value] = True

    contradictions = _detect_contradictions(left_attrs, right_attrs)

    matching_attributes = sorted(key for key in MULTI_ATTRIBUTE_KEYS if key in left_attrs and key in right_attrs and left_attrs[key] == right_attrs[key] and left_attrs[key])

    tier = _tier_for(features, contradictions)

    raw_score = sum(FEATURE_WEIGHTS[name] for name, enabled in features.items() if enabled and name in FEATURE_WEIGHTS)
    raw_score = max(0.0, min(1.0, raw_score))

    if tier == ResolutionTier.TIER_3_NAME_SIMILARITY:
        score = min(raw_score, MEDIUM_CONFIDENCE_THRESHOLD - 0.01)
    else:
        score = raw_score

    if contradictions:
        score = min(score, 0.2)

    confidence_level = _confidence_level(score)

    reasons: list[str] = []
    if features[MatchFeatureType.PHONE_EXACT.value]:
        reasons.append("Phone numbers agree")
    if features[MatchFeatureType.EMAIL_EXACT.value]:
        reasons.append("Email addresses agree")
    if features[MatchFeatureType.IDENTIFIER_EXACT.value]:
        reasons.append("Government/official identifier agrees")
    if features[MatchFeatureType.VEHICLE_EXACT.value]:
        reasons.append("Vehicle registration agrees")
    if features[MatchFeatureType.ACCOUNT_EXACT.value]:
        reasons.append("Account/IMEI agrees")
    if features[MatchFeatureType.NAME_EXACT.value]:
        reasons.append("Normalized primary value matches exactly")
    if features[MatchFeatureType.NAME_SIMILARITY.value]:
        reasons.append(f"Name similarity {similarity:.2f}")
    if features[MatchFeatureType.ADDRESS_SIMILARITY.value]:
        reasons.append(f"Address similarity {address_sim:.2f}")
    if features[MatchFeatureType.DATE_OF_BIRTH_MATCH.value]:
        reasons.append("Date of birth agrees")
    if features[MatchFeatureType.SHARED_SOURCE_IDENTIFIER.value]:
        reasons.append("Same source identifier")
    if features[MatchFeatureType.ALIAS_MATCH.value]:
        reasons.append("Alias agrees")
    if matching_attributes and not any(features[MatchFeatureType.PHONE_EXACT.value], features[MatchFeatureType.EMAIL_EXACT.value], features[MatchFeatureType.IDENTIFIER_EXACT.value], features[MatchFeatureType.VEHICLE_EXACT.value], features[MatchFeatureType.ACCOUNT_EXACT.value]):
        reasons.append("Multiple matching attributes: " + ", ".join(matching_attributes))
    if contradictions:
        reasons.append("Conflicting attributes reduce confidence: " + ", ".join(sorted(c["field"] for c in contradictions)))
    if not reasons:
        reasons.append("No explainable match signal")

    return {
        "type_match": type_match,
        "features": {k: bool(v) for k, v in features.items()},
        "matching_attributes": matching_attributes,
        "contradictions": contradictions,
        "similarity": similarity,
        "tier": tier.value,
        "score": round(score, 6),
        "confidence_level": confidence_level.value,
        "reasons": reasons,
    }


class CandidateResolutionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)

    async def _require_investigation(self, investigation_id: UUID) -> None:
        if not await self.investigations.get(investigation_id):
            raise InvestigationNotFoundError(str(investigation_id))

    async def _require_entity_in_investigation(self, investigation_id: UUID, entity_id: UUID) -> Entity:
        entity = await self.session.get(Entity, entity_id)
        if entity is None or entity.investigation_id != investigation_id:
            raise EntityNotFoundError(str(entity_id))
        return entity

    async def create_observation(self, *, investigation_id: UUID, entity_type: str, raw_value: str, source: str, source_record: str, row_identity: str, dataset_id: UUID | None = None, ingestion_job_id: UUID | None = None, attributes: dict[str, Any] | None = None, provenance: dict[str, Any] | None = None) -> CandidateObservation:
        await self._require_investigation(investigation_id)
        normalized = normalize_value(raw_value, entity_type)
        key_input = "|".join([str(investigation_id), str(dataset_id or ""), row_identity, entity_type, source, normalized])
        key = hashlib.sha256(key_input.encode()).hexdigest()
        existing = await self.session.scalar(select(CandidateObservation).where(CandidateObservation.investigation_id == investigation_id, CandidateObservation.observation_key == key))
        if existing:
            return existing
        observation = CandidateObservation(
            investigation_id=investigation_id,
            dataset_id=dataset_id,
            ingestion_job_id=ingestion_job_id,
            entity_type=entity_type,
            raw_value=raw_value,
            display_value=raw_value.strip(),
            normalized_value=normalized,
            block_key=blocking_key(normalized, entity_type),
            source=source,
            source_record=source_record,
            row_identity=row_identity,
            observation_key=key,
            attributes=attributes or {},
            provenance=provenance or {},
            features={"normalization": "NFKC/casefold/type-aware", "raw_preserved": True},
            algorithm_version=ALGORITHM_VERSION,
        )
        self.session.add(observation)
        await self.session.flush()
        return observation


    async def generate_resolutions(self, investigation_id: UUID, observation: CandidateObservation, *, limit: int = 100) -> list[CandidateResolution]:
        """Compare only same-block observations and entities (bounded, not O(N^2))."""
        peers = list((await self.session.execute(select(CandidateObservation).where(CandidateObservation.investigation_id == investigation_id, CandidateObservation.block_key == observation.block_key, CandidateObservation.id != observation.id).order_by(CandidateObservation.id).limit(limit))).scalars().all())
        entities = list((await self.session.execute(select(Entity).where(Entity.investigation_id == investigation_id, Entity.entity_type == observation.entity_type, or_(Entity.canonical_name == observation.normalized_value, Entity.canonical_name.like(f"%{observation.normalized_value[:32]}%"))).order_by(Entity.id).limit(limit))).scalars().all())
        created: list[CandidateResolution] = []
        for peer in peers:
            if str(observation.id) > str(peer.id):
                continue
            features = explain_match(observation, peer)
            created.append(await self._upsert_resolution(investigation_id=investigation_id, observation_id=observation.id, matched_observation_id=peer.id, matched_entity_id=None, entity_type=observation.entity_type, features=features, provenance=observation.provenance))
        for entity in entities:
            features = explain_match(observation, entity)
            created.append(await self._upsert_resolution(investigation_id=investigation_id, observation_id=observation.id, matched_observation_id=None, matched_entity_id=entity.id, entity_type=observation.entity_type, features=features, provenance=observation.provenance))
        return created

    async def _upsert_resolution(self, **kwargs: Any) -> CandidateResolution:
        where = [CandidateResolution.investigation_id == kwargs["investigation_id"], CandidateResolution.candidate_observation_id == kwargs["observation_id"]]
        if kwargs["matched_observation_id"] is not None:
            where.append(CandidateResolution.matched_observation_id == kwargs["matched_observation_id"])
        else:
            where.append(CandidateResolution.matched_entity_id == kwargs["matched_entity_id"])
        existing = await self.session.scalar(select(CandidateResolution).where(*where))
        features = kwargs["features"]
        contradictions = features["contradictions"]
        tier = features["tier"]
        confidence_level = features["confidence_level"]
        if existing:
            existing.tier = tier
            existing.confidence_level = confidence_level
            existing.features = features
            existing.reasons = features["reasons"]
            existing.contradictions = contradictions
            existing.confidence = features["score"]
            existing.provenance = kwargs["provenance"] or {}
            existing.algorithm_version = ALGORITHM_VERSION
            await self.session.flush()
            return existing
        if contradictions:
            initial_state = CandidateResolutionState.CONTRADICTED
            decision = "contradicted"
        elif tier == ResolutionTier.TIER_1_STRONG_IDENTIFIER.value:
            initial_state = CandidateResolutionState.AUTO_RESOLVED
            decision = "auto_resolved"
        else:
            initial_state = CandidateResolutionState.NEEDS_REVIEW
            decision = "review"
        row = CandidateResolution(investigation_id=kwargs["investigation_id"], candidate_observation_id=kwargs["observation_id"], matched_observation_id=kwargs["matched_observation_id"], matched_entity_id=kwargs["matched_entity_id"], entity_type=kwargs["entity_type"], resolution_type="candidate_match", tier=tier, state=initial_state, decision=decision, confidence=features["score"], confidence_level=confidence_level, features=features, reasons=features["reasons"], contradictions=contradictions, provenance=kwargs["provenance"] or {}, algorithm_version=ALGORITHM_VERSION)
        self.session.add(row)
        await self.session.flush()
        return row


    async def list_observations(self, investigation_id: UUID, *, state: str | None = None):
        await self._require_investigation(investigation_id)
        stmt = select(CandidateObservation).where(CandidateObservation.investigation_id == investigation_id)
        if state and state != "all":
            stmt = stmt.where(CandidateObservation.state == state)
        return list((await self.session.execute(stmt.order_by(CandidateObservation.created_at))).scalars())

    async def list_resolutions(self, investigation_id: UUID, *, state: str | None = None):
        await self._require_investigation(investigation_id)
        stmt = select(CandidateResolution).where(CandidateResolution.investigation_id == investigation_id)
        if state and state != "all":
            stmt = stmt.where(CandidateResolution.state == state)
        return list((await self.session.execute(stmt.order_by(CandidateResolution.updated_at.desc()))).scalars())

    async def list_resolutions_for_entity(self, investigation_id: UUID, entity_id: UUID) -> list[CandidateResolution]:
        """Return every resolution row whose candidate or target touches entity_id."""
        await self._require_entity_in_investigation(investigation_id, entity_id)
        stmt = select(CandidateResolution).where(CandidateResolution.investigation_id == investigation_id, or_(CandidateResolution.matched_entity_id == entity_id, CandidateResolution.candidate_observation_id.in_(select(CandidateObservation.id).where(CandidateObservation.investigation_id == investigation_id, CandidateObservation.resolved_entity_id == entity_id)))).order_by(CandidateResolution.updated_at.desc())
        return list((await self.session.execute(stmt)).scalars())

    async def entity_resolution_summary(self, investigation_id: UUID, entity_id: UUID) -> dict[str, Any]:
        """Return a deterministic resolution summary for the entity detail UI."""
        await self._require_entity_in_investigation(investigation_id, entity_id)
        observations = list((await self.session.execute(select(CandidateObservation).where(CandidateObservation.investigation_id == investigation_id, CandidateObservation.resolved_entity_id == entity_id).order_by(CandidateObservation.created_at))).scalars().all())
        resolutions = await self.list_resolutions_for_entity(investigation_id, entity_id)
        matched_observation_ids = {r.candidate_observation_id for r in resolutions if r.matched_entity_id == entity_id}
        matched_observations = list((await self.session.execute(select(CandidateObservation).where(CandidateObservation.investigation_id == investigation_id, CandidateObservation.id.in_(matched_observation_ids)))).scalars().all())
        matched_entities: dict[UUID, Entity] = {}
        for r in resolutions:
            if r.matched_entity_id and r.matched_entity_id != entity_id:
                e = await self.session.get(Entity, r.matched_entity_id)
                if e is not None:
                    matched_entities[e.id] = e
        highest = max((r.confidence for r in resolutions), default=0.0)
        contradiction_count = sum(1 for r in resolutions if r.state == CandidateResolutionState.CONTRADICTED)
        last_evaluated = max(((r.updated_at for r in resolutions) or (datetime.now(UTC),)), default=datetime.now(UTC))
        confidence_level = ResolutionConfidenceLevel.LOW.value
        if resolutions:
            top = max(resolutions, key=lambda r: r.confidence)
            confidence_level = top.confidence_level
        return {
            "entity_id": str(entity_id),
            "investigation_id": str(investigation_id),
            "algorithm_version": ALGORITHM_VERSION,
            "highest_linkage_score": round(float(highest), 6),
            "confidence_level": confidence_level,
            "observation_count": len(observations),
            "resolution_count": len(resolutions),
            "contradiction_count": contradiction_count,
            "last_evaluated_at": last_evaluated.isoformat() if hasattr(last_evaluated, "isoformat") else str(last_evaluated),
            "observations": [self._serialize_observation(o) for o in observations],
            "matched_observations": [self._serialize_observation(o) for o in matched_observations],
            "matched_entities": [self._serialize_entity(e) for e in sorted(matched_entities.values(), key=str)],
            "resolutions": [self._serialize_resolution(r) for r in resolutions],
        }


    @staticmethod
    def _serialize_observation(o: CandidateObservation) -> dict[str, Any]:
        return {
            "id": str(o.id),
            "entity_type": o.entity_type,
            "raw_value": o.raw_value,
            "display_value": o.display_value,
            "normalized_value": o.normalized_value,
            "source": o.source,
            "source_record": o.source_record,
            "row_identity": o.row_identity,
            "attributes": dict(o.attributes or {}),
            "provenance": dict(o.provenance or {}),
            "state": o.state.value if hasattr(o.state, "value") else str(o.state),
            "resolved_entity_id": str(o.resolved_entity_id) if o.resolved_entity_id else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }

    @staticmethod
    def _serialize_entity(e: Entity) -> dict[str, Any]:
        return {
            "id": str(e.id),
            "entity_type": e.entity_type.value if hasattr(e.entity_type, "value") else str(e.entity_type),
            "canonical_name": e.canonical_name,
            "name": e.name,
            "description": e.description,
            "attributes": dict(e.attributes or {}),
            "confidence": e.confidence,
            "is_verified": e.is_verified,
            "is_flagged": e.is_flagged,
        }

    @staticmethod
    def _serialize_resolution(r: CandidateResolution) -> dict[str, Any]:
        return {
            "id": str(r.id),
            "candidate_observation_id": str(r.candidate_observation_id),
            "matched_observation_id": str(r.matched_observation_id) if r.matched_observation_id else None,
            "matched_entity_id": str(r.matched_entity_id) if r.matched_entity_id else None,
            "entity_type": r.entity_type,
            "tier": r.tier,
            "state": r.state.value if hasattr(r.state, "value") else str(r.state),
            "decision": r.decision,
            "confidence": round(float(r.confidence), 6),
            "confidence_level": r.confidence_level,
            "features": dict(r.features or {}),
            "reasons": list(r.reasons or []),
            "contradictions": list(r.contradictions or []),
            "provenance": dict(r.provenance or {}),
            "algorithm_version": r.algorithm_version,
            "reviewed_by": str(r.reviewed_by) if r.reviewed_by else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "review_reason": r.review_reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }

    async def decide(self, investigation_id: UUID, resolution_id: UUID, *, actor_id: UUID, actor_email: str, decision: CandidateResolutionState, reason: str | None) -> CandidateResolution:
        await self._require_investigation(investigation_id)
        row = await self.session.scalar(select(CandidateResolution).where(CandidateResolution.id == resolution_id, CandidateResolution.investigation_id == investigation_id))
        if row is None:
            raise EntityNotFoundError(str(resolution_id))
        if row.state == CandidateResolutionState.CONFIRMED and decision == CandidateResolutionState.REJECTED:
            raise ConflictError("A confirmed resolution cannot be rejected.")
        row.state = decision
        row.decision = decision.value
        row.reviewed_by = actor_id
        row.reviewed_at = datetime.now(UTC)
        row.review_reason = reason
        observation = await self.session.get(CandidateObservation, row.candidate_observation_id)
        if observation and decision in (CandidateResolutionState.CONFIRMED, CandidateResolutionState.REJECTED):
            observation.state = CandidateObservationState.ACCEPTED if decision == CandidateResolutionState.CONFIRMED else CandidateObservationState.REJECTED
            observation.reviewed_by = actor_id
            observation.reviewed_at = row.reviewed_at
            observation.review_reason = reason
            if decision == CandidateResolutionState.CONFIRMED:
                observation.resolved_entity_id = row.matched_entity_id
        audit = CandidateResolutionAudit(investigation_id=investigation_id, observation_id=row.candidate_observation_id, resolution_id=row.id, actor_id=actor_id, actor_email=actor_email, action=f"resolution_{decision.value}", object_type="candidate_resolution", object_id=str(row.id), reason=reason, details={"algorithm_version": row.algorithm_version, "decision": decision.value, "tier": row.tier, "confidence_level": row.confidence_level})
        self.session.add(audit)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def confirm_for_entity(self, investigation_id: UUID, entity_id: UUID, *, actor_id: UUID, actor_email: str, reason: str | None, resolution_id: UUID | None = None) -> CandidateResolution:
        """Confirm the highest-priority resolution for an entity."""
        await self._require_entity_in_investigation(investigation_id, entity_id)
        target_id = resolution_id
        if target_id is None:
            top = await self.session.scalar(select(CandidateResolution).where(CandidateResolution.investigation_id == investigation_id, CandidateResolution.matched_entity_id == entity_id).order_by(CandidateResolution.confidence.desc()).limit(1))
            if top is None:
                raise EntityNotFoundError(f"No resolution to confirm for entity {entity_id}")
            target_id = top.id
        return await self.decide(investigation_id, target_id, actor_id=actor_id, actor_email=actor_email, decision=CandidateResolutionState.CONFIRMED, reason=reason)

    async def reject_for_entity(self, investigation_id: UUID, entity_id: UUID, *, actor_id: UUID, actor_email: str, reason: str | None, resolution_id: UUID | None = None) -> CandidateResolution:
        """Reject the specified (or highest-scoring) resolution for an entity."""
        await self._require_entity_in_investigation(investigation_id, entity_id)
        target_id = resolution_id
        if target_id is None:
            top = await self.session.scalar(select(CandidateResolution).where(CandidateResolution.investigation_id == investigation_id, CandidateResolution.matched_entity_id == entity_id).order_by(CandidateResolution.confidence.desc()).limit(1))
            if top is None:
                raise EntityNotFoundError(f"No resolution to reject for entity {entity_id}")
            target_id = top.id
        return await self.decide(investigation_id, target_id, actor_id=actor_id, actor_email=actor_email, decision=CandidateResolutionState.REJECTED, reason=reason)

    async def list_audit(self, investigation_id: UUID):
        await self._require_investigation(investigation_id)
        return list((await self.session.execute(select(CandidateResolutionAudit).where(CandidateResolutionAudit.investigation_id == investigation_id).order_by(CandidateResolutionAudit.created_at.desc()))).scalars())
