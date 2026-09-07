"""Relationship intelligence service (real application layer, Phase 21).

Guarantees (mirroring the Phase 20 resolution philosophy):

  - Investigation isolation: evaluation, listing and confirmation are always
    scoped to one investigation; cross-investigation reads are impossible.
  - Determinism: same data + same algorithm version => same result.
  - Observation preservation: individual source observations are derived from
    ``data_provenance`` (or un-flattened evidence references) and are never
    collapsed; CALL vs TRANSFER stay distinguishable.
  - Reversibility: confirm/reject are audit-trailed and actor-scoped; the
    system never overwrites investigator decisions.

Relationship intelligence describes how corroborated a relationship is. It does
not establish criminality or guilt.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import (
    InvestigationNotFoundError,
    NotAuthorizedError,
    RelationshipNotFoundError,
)
from app.models import (
    IntelligenceStatus,
    Investigation,
    InvestigationEvidence,
    Relationship,
)
from app.relationship_intelligence import (
    CORRELATION_VERSION,
    derive_observations,
    derive_observations_bulk,
    evaluate_relationship,
    is_directed,
)
from app.repositories.investigation import (
    EntityRepository,
    EvidenceRepository,
    InvestigationRepository,
    RelationshipRepository,
)


class RelationshipIntelligenceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.relationships = RelationshipRepository(session)
        self.evidence = EvidenceRepository(session)

    @staticmethod
    def _algorithm_version() -> str:
        return CORRELATION_VERSION

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    # ------------------------------------------------------------------
    # Scoping / RBAC
    # ------------------------------------------------------------------
    async def _require_investigation(self, investigation_id: UUID) -> Investigation:
        investigation = await self.investigations.get(investigation_id)
        if not investigation:
            raise InvestigationNotFoundError(str(investigation_id))
        return investigation

    async def _require_relationship(self, relationship_id: UUID) -> Relationship:
        relationship = await self.relationships.get(relationship_id)
        if not relationship:
            raise RelationshipNotFoundError(str(relationship_id))
        return relationship

    def _assert_actor_can_review(self, actor) -> None:
        """Read-only auditors may not confirm/reject relationship intelligence."""
        role = (getattr(actor, "role", None) or "inspector").lower()
        if role == "auditor":
            raise NotAuthorizedError(
                "Auditors cannot modify relationship intelligence decisions"
            )

    # ------------------------------------------------------------------
    # Evidence linkage
    # ------------------------------------------------------------------
    async def _evidence_rows(self, investigation_id: UUID) -> list[InvestigationEvidence]:
        result = await self.session.execute(
            select(InvestigationEvidence)
            .where(InvestigationEvidence.investigation_id == investigation_id)
            .order_by(InvestigationEvidence.created_at)
            .limit(1000)
        )
        return list(result.scalars().all())

    @staticmethod
    def _evidence_for(
        evidence_rows: list[InvestigationEvidence], relationship: Relationship
    ) -> dict:
        """Link real evidence records to a relationship.

        An evidence record is linked when its ``source`` matches the
        relationship's source (case-insensitive) or when its record identifier
        appears in the relationship's evidence references. Absence of linked
        evidence is reported honestly (never treated as disproof).
        """
        rel_source = (relationship.source or "").strip().lower()
        refs = {(r or "").strip().lower() for r in (relationship.evidence_refs or [])}
        matched: list[InvestigationEvidence] = []
        for row in evidence_rows:
            ev_source = (row.source or "").strip().lower()
            record_id = ""
            meta = row.metadata_ or {}
            if isinstance(meta, dict):
                record_id = str(meta.get("record_identifier") or "").strip().lower()
            if not record_id:
                provenance = row.provenance or {}
                if isinstance(provenance, dict):
                    record_id = str(
                        provenance.get("record_identifier") or ""
                    ).strip().lower()
            source_id = ""
            provenance = row.provenance or {}
            if isinstance(provenance, dict):
                source_id = str(provenance.get("source_id") or "").strip().lower()
            if (rel_source and ev_source == rel_source) or (
                record_id and record_id in refs
            ) or (source_id and source_id in refs):
                matched.append(row)

        datasets = sorted({row.source for row in matched if row.source})
        evidence_ids = [row.id for row in matched]
        return {
            "relationship_id": str(relationship.id),
            "evidence_count": len(evidence_ids),
            "evidence_ids": evidence_ids,
            "datasets": datasets,
            "linked": bool(evidence_ids),
            "message": (
                f"{len(evidence_ids)} linked evidence record(s)"
                if evidence_ids
                else "No linked evidence"
            ),
        }

    # ------------------------------------------------------------------
    # Evaluation (persists aggregates, idempotent)
    # ------------------------------------------------------------------
    async def evaluate_investigation(self, investigation_id: UUID) -> dict:
        await self._require_investigation(investigation_id)

        relationships = await self.relationships.list_for_investigation(
            investigation_id, limit=2000
        )
        observations_by_relationship = await derive_observations_bulk(
            self.session, relationships
        )

        group_count: set[str] = set()
        correlated_count = 0
        conflict_count_total = 0

        for relationship in relationships:
            observations = observations_by_relationship[relationship.id]
            evals = evaluate_relationship(relationship, observations)

            relationship.intelligence_status = evals["intelligence_status"]
            relationship.linkage_score = evals["linkage_score"]
            relationship.correlation_version = evals["correlation_version"]
            relationship.correlation_key = evals["correlation_key"]
            relationship.observation_count = evals["observation_count"]
            relationship.source_count = evals["source_count"]
            relationship.first_observed_at = evals["first_observed_at"]
            relationship.last_observed_at = evals["last_observed_at"]
            relationship.conflict_flags = evals["conflict_flags"]

            if evals["correlation_key"]:
                group_count.add(evals["correlation_key"])
            if evals["intelligence_status"] == IntelligenceStatus.CORRELATED:
                correlated_count += 1
            conflict_count_total += len(evals["conflict_flags"])

        await self.session.flush()

        return {
            "investigation_id": investigation_id,
            "evaluated_relationships": len(relationships),
            "correlation_groups": len(group_count),
            "correlated_relationships": correlated_count,
            "conflicts_detected": conflict_count_total,
            "algorithm_version": CORRELATION_VERSION,
            "evaluated_at": datetime.now(UTC),
        }

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------
    async def evidence_for(self, relationship_id: UUID) -> dict:
        relationship = await self._require_relationship(relationship_id)
        evidence_rows = await self._evidence_rows(relationship.investigation_id)
        return self._evidence_for(evidence_rows, relationship)

    async def intelligence_for(
        self, relationship_id: UUID, *, actor=None
    ) -> dict:
        relationship = await self._require_relationship(relationship_id)
        observations = await derive_observations(self.session, relationship)
        evals = evaluate_relationship(relationship, observations)
        evidence = await self.evidence_for(relationship_id)
        source = await self.entities.get(relationship.source_entity_id)
        target = await self.entities.get(relationship.target_entity_id)
        return self._decorate(
            relationship,
            observations=observations,
            evals=evals,
            evidence=evidence,
            source=source,
            target=target,
        )

    async def observations_summary_for(self, relationship_id: UUID) -> tuple[list[dict], int]:
        intelligence = await self.intelligence_for(relationship_id)
        return intelligence["observations"], len(intelligence["conflict_flags"])

    async def list_for_investigation(self, investigation_id: UUID) -> list[dict]:
        await self._require_investigation(investigation_id)
        relationships = await self.relationships.list_for_investigation(
            investigation_id, limit=2000
        )
        observations_by_relationship = await derive_observations_bulk(
            self.session, relationships
        )
        evidence_rows = await self._evidence_rows(investigation_id)
        entities = {
            entity.id: entity
            for entity in await self.entities.list_for_investigation(
                investigation_id, limit=2000
            )
        }

        items: list[dict] = []
        for relationship in relationships:
            observations = observations_by_relationship[relationship.id]
            evals = evaluate_relationship(relationship, observations)
            evidence = self._evidence_for(evidence_rows, relationship)
            source = entities.get(relationship.source_entity_id)
            target = entities.get(relationship.target_entity_id)
            items.append(
                {
                    "relationship_id": relationship.id,
                    "investigation_id": investigation_id,
                    "source_entity_id": relationship.source_entity_id,
                    "source_entity_name": source.name if source else None,
                    "source_entity_type": (
                        source.entity_type.value if source else None
                    ),
                    "target_entity_id": relationship.target_entity_id,
                    "target_entity_name": target.name if target else None,
                    "target_entity_type": (
                        target.entity_type.value if target else None
                    ),
                    "relationship_type": relationship.relationship_type.value,
                    "direction": (
                        "directed" if is_directed(relationship.relationship_type) else "undirected"
                    ),
                    "confidence": relationship.confidence,
                    "verification_status": (
                        relationship.verification_status.value
                        if relationship.verification_status is not None
                        else None
                    ),
                    "extraction_method": (
                        relationship.extraction_method.value
                        if relationship.extraction_method is not None
                        else None
                    ),
                    "intelligence_status": evals["intelligence_status"].value,
                    "linkage_score": evals["linkage_score"],
                    "confidence_label": evals["confidence_label"],
                    "correlation_version": evals["correlation_version"],
                    "correlation_key": evals["correlation_key"],
                    "observation_count": evals["observation_count"],
                    "source_count": evals["source_count"],
                    "observation_predicate": evals["observation_predicate"],
                    "first_observed_at": evals["first_observed_at"],
                    "last_observed_at": evals["last_observed_at"],
                    "conflict_count": len(evals["conflict_flags"]),
                    "evidence_count": evidence["evidence_count"],
                    "verified_by": relationship.verified_by,
                    "verified_at": relationship.verified_at,
                    "rejection_reason": relationship.rejection_reason,
                }
            )
        return items

    def _decorate(
        self,
        relationship: Relationship,
        *,
        observations: list[dict],
        evals: dict,
        evidence: dict,
        source,
        target,
    ) -> dict:
        return {
            "relationship_id": relationship.id,
            "investigation_id": relationship.investigation_id,
            "source_entity_id": relationship.source_entity_id,
            "source_entity_name": source.name if source else None,
            "source_entity_type": source.entity_type.value if source else None,
            "target_entity_id": relationship.target_entity_id,
            "target_entity_name": target.name if target else None,
            "target_entity_type": target.entity_type.value if target else None,
            "relationship_type": relationship.relationship_type.value,
            "direction": (
                "directed" if is_directed(relationship.relationship_type) else "undirected"
            ),
            "confidence": relationship.confidence,
            "source": relationship.source,
            "evidence_refs": list(relationship.evidence_refs or []),
            "verification_status": (
                relationship.verification_status.value
                if relationship.verification_status is not None
                else None
            ),
            "extraction_method": (
                relationship.extraction_method.value
                if relationship.extraction_method is not None
                else None
            ),
            "intelligence_status": evals["intelligence_status"].value,
            "linkage_score": evals["linkage_score"],
            "confidence_label": evals["confidence_label"],
            "correlation_version": evals["correlation_version"],
            "correlation_key": evals["correlation_key"],
            "observation_count": evals["observation_count"],
            "source_count": evals["source_count"],
            "observation_predicate": evals["observation_predicate"],
            "first_observed_at": evals["first_observed_at"],
            "last_observed_at": evals["last_observed_at"],
            "conflict_flags": evals["conflict_flags"],
            "observations": observations,
            "evidence": evidence,
            "verified_by": relationship.verified_by,
            "verified_at": relationship.verified_at,
            "rejection_reason": relationship.rejection_reason,
            "metadata_": relationship.metadata_ or {},
            "created_at": relationship.created_at,
            "updated_at": relationship.updated_at,
        }

    # ------------------------------------------------------------------
    # Confirm / reject
    # ------------------------------------------------------------------
    async def confirm(
        self,
        relationship_id: UUID,
        *,
        actor,
        reason: str | None = None,
    ) -> dict:
        self._assert_actor_can_review(actor)
        relationship = await self._require_relationship(relationship_id)
        previous = relationship.intelligence_status

        relationship.intelligence_status = IntelligenceStatus.CONFIRMED
        relationship.verified_by = actor.id
        relationship.verified_at = datetime.now(UTC)
        relationship.rejection_reason = None
        self._append_audit(relationship, "CONFIRMED", actor, previous, reason)

        await self.session.flush()
        # updated_at is server-rendered (onupdate=func.now()); refresh so the
        # attribute value is loaded before it is re-read below.
        await self.session.refresh(relationship)
        return await self.intelligence_for(relationship_id)

    async def reject(
        self,
        relationship_id: UUID,
        *,
        actor,
        reason: str | None = None,
    ) -> dict:
        self._assert_actor_can_review(actor)
        relationship = await self._require_relationship(relationship_id)
        previous = relationship.intelligence_status

        relationship.intelligence_status = IntelligenceStatus.REJECTED
        relationship.verified_by = actor.id
        relationship.verified_at = datetime.now(UTC)
        relationship.rejection_reason = reason
        self._append_audit(relationship, "REJECTED", actor, previous, reason)

        await self.session.flush()
        await self.session.refresh(relationship)
        return await self.intelligence_for(relationship_id)

    def _append_audit(
        self,
        relationship: Relationship,
        action: str,
        actor,
        previous,
        reason: str | None,
    ) -> None:
        meta = dict(relationship.metadata_ or {})
        event_log = list(meta.get("audit_events", []))
        event_log.append(
            {
                "action": action,
                "actor": actor.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "previous_state": previous.value
                if hasattr(previous, "value")
                else str(previous),
                "new_state": "confirmed" if action == "CONFIRMED" else "rejected",
                "reason": reason,
            }
        )
        meta["audit_events"] = event_log
        relationship.metadata_ = meta
