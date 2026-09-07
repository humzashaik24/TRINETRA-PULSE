"""Entity resolution domain service (real application layer, Phase 20).

Deterministic, explainable, investigation-scoped record linkage.

Guarantees:
  - Investigation isolation: candidates and resolutions always scoped to one
    investigation; cross-investigation resolution is impossible.
  - Determinism: same data + same algorithm version => same result.
  - Provenance: every resolution preserves source dataset/record/values.
  - Reversibility: no irreversible autonomous merging; confirm/reject are
    audit-trailed and actor-scoped.

Entity resolution identifies potential identity equivalence between source
records. It does not establish criminality or guilt.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import (
    EntityNotFoundError,
    InvestigationNotFoundError,
    NotAuthorizedError,
)
from app.models import (
    DataProvenance,
    Entity,
    EntityResolution,
    Investigation,
    ResolutionMethod,
    VerificationState,
)
from app.repositories.investigation import EntityRepository, InvestigationRepository
from app.repositories.resolution import EntityResolutionRepository
from app.resolution.candidates import generate_candidates
from app.resolution.matching import build_match_features
from app.resolution.normalization import RESOLUTION_VERSION
from app.resolution.scoring import recommended_state, score_matches


class ResolutionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.resolutions = EntityResolutionRepository(session)

    @staticmethod
    def _algorithm_version() -> str:
        return RESOLUTION_VERSION

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    # ------------------------------------------------------------------
    # Scoping helpers
    # ------------------------------------------------------------------
    async def _require_investigation(self, investigation_id: UUID) -> Investigation:
        inv = await self.investigations.get(investigation_id)
        if not inv:
            raise InvestigationNotFoundError(str(investigation_id))
        return inv

    async def _require_entity(self, entity_id: UUID) -> Entity:
        entity = await self.entities.get(entity_id)
        if not entity:
            raise EntityNotFoundError(str(entity_id))
        return entity

    def _assert_actor_can_review(self, actor) -> None:
        """RBAC guard: only investigator/analyst roles may confirm/reject.

        Auditors remain read-only. Dev identity maps to inspector by default.
        """
        role = (getattr(actor, "role", None) or "inspector").lower()
        if role == "auditor":
            raise NotAuthorizedError("Auditors cannot modify resolution decisions")

    # ------------------------------------------------------------------
    # Source records -> resolution input
    # ------------------------------------------------------------------
    async def _source_refs_for_entity(
        self, entity: Entity
    ) -> list[dict]:
        """Attach provenance (dataset, record, original/normalized value) for an entity."""
        refs: list[dict] = []
        result = await self.session.execute(
            select(DataProvenance).where(DataProvenance.entity_id == entity.id)
        )
        for prov in result.scalars().all():
            refs.append(
                {
                    "source_dataset": prov.source_name or "",
                    "source_record": str(prov.ingestion_job_id) if prov.ingestion_job_id else None,
                    "source_type": (
                        prov.source_type.value
                        if hasattr(prov.source_type, "value")
                        else str(prov.source_type)
                    ),
                    "original_value": entity.name,
                    "normalized_value": entity.canonical_name,
                    "dataset_id": str(prov.dataset_id) if prov.dataset_id else None,
                    "evidence_refs": list(prov.evidence_refs or []),
                }
            )

        # If no provenance row exists, still provide a best-effort source ref.
        if not refs:
            attrs = entity.attributes or {}
            refs.append(
                {
                    "source_dataset": (attrs.get("source_column") or attrs.get("_source") or ""),
                    "source_record": None,
                    "source_type": None,
                    "original_value": entity.name,
                    "normalized_value": entity.canonical_name,
                    "dataset_id": None,
                    "evidence_refs": [],
                }
            )
        return refs

    def _build_source_refs(
        self, entity_a: Entity, entity_b: Entity, refs_a: list[dict], refs_b: list[dict]
    ) -> list[dict]:
        combined = list(refs_a) + list(refs_b)
        # Deterministically merge / dedupe by dataset name.
        seen: dict[str, dict] = {}
        for ref in combined:
            key = ref["source_dataset"]
            if key and key not in seen:
                seen[key] = ref
        return list(seen.values())

    # ------------------------------------------------------------------
    # Core evaluation
    # ------------------------------------------------------------------
    def _evaluate_pair(
        self, entity_a: Entity, entity_b: Entity, source_refs: list[dict]
    ) -> EntityResolution:
        """Deterministically evaluate a single entity pair and build a resolution."""
        attrs_a = entity_a.attributes or {}
        attrs_b = entity_b.attributes or {}

        features = build_match_features(
            attrs_a,
            attrs_b,
            a_source=entity_a.metadata_.get("source") if entity_a.metadata_ else None,
            b_source=entity_b.metadata_.get("source") if entity_b.metadata_ else None,
        )

        result = score_matches(
            features,
            a_attributes=attrs_a,
            b_attributes=attrs_b,
        )

        state = recommended_state(result.score)

        evidence = [
            f"{ref['source_dataset']} / {ref['original_value']}"
            for ref in source_refs
            if ref.get("original_value")
        ]

        resolution = EntityResolution(
            investigation_id=entity_a.investigation_id,
            entity_id_1=entity_a.id,
            entity_id_2=entity_b.id,
            confidence=result.label,
            linkage_score=result.score,
            resolution_version=RESOLUTION_VERSION,
            resolution_method=ResolutionMethod.AUTO,
            matched_features=result.matched_features,
            contradictions=result.contradictions,
            source_refs=source_refs,
            matching_attributes=result.matched_features,
            evidence=evidence,
            verification_state=state,
            last_evaluated_at=datetime.now(UTC),
            metadata_={
                "tier": result.tier,
                "algorithm": RESOLUTION_VERSION,
            },
        )
        return resolution

    # ------------------------------------------------------------------
    # API surface
    # ------------------------------------------------------------------
    async def evaluate_investigation(
        self, investigation_id: UUID
    ) -> dict:
        """Generate and persist resolutions for an investigation.

        Uses blocking to avoid O(N^2). Existing resolution pairs are kept.
        """
        await self._require_investigation(investigation_id)

        entities = await self.entities.list_for_investigation(investigation_id, limit=2000)
        existing_resolutions = await self.resolutions.list_for_investigation(
            investigation_id, limit=1000
        )

        already_resolved = set()
        for res in existing_resolutions:
            already_resolved.add((res.entity_id_1, res.entity_id_2))

        candidates = generate_candidates(
            entities, already_resolved=already_resolved
        )

        created = 0
        skipped = 0
        for entity_a, entity_b in candidates:
            refs_a = await self._source_refs_for_entity(entity_a)
            refs_b = await self._source_refs_for_entity(entity_b)
            source_refs = self._build_source_refs(entity_a, entity_b, refs_a, refs_b)
            resolution = self._evaluate_pair(entity_a, entity_b, source_refs)
            self.session.add(resolution)
            created += 1

        await self.session.flush()

        return {
            "investigation_id": investigation_id,
            "evaluated_pairs": len(candidates),
            "created_resolutions": created,
            "skipped_existing": skipped,
            "algorithm_version": RESOLUTION_VERSION,
            "evaluated_at": datetime.now(UTC),
        }

    async def list_for_investigation(self, investigation_id: UUID) -> list[EntityResolution]:
        await self._require_investigation(investigation_id)
        return await self.resolutions.list_for_investigation(investigation_id)

    async def list_for_entity(
        self, entity_id: UUID, investigation_id: UUID | None = None
    ) -> list[EntityResolution]:
        entity = await self._require_entity(entity_id)
        results = await self.resolutions.list_for_entity(entity_id)

        # Enforce investigation isolation.
        if investigation_id is not None and entity.investigation_id != investigation_id:
            raise InvestigationNotFoundError(str(investigation_id))

        return results

    async def get(self, resolution_id: UUID) -> EntityResolution:
        resolution = await self.resolutions.get(resolution_id)
        if not resolution:
            from app.api.errors import NotFoundError

            raise NotFoundError("EntityResolution", str(resolution_id))
        return resolution

    # ------------------------------------------------------------------
    # Confirm / reject
    # ------------------------------------------------------------------
    async def confirm(
        self,
        resolution_id: UUID,
        *,
        actor,
        reason: str | None = None,
    ) -> EntityResolution:
        self._assert_actor_can_review(actor)

        resolution = await self.get(resolution_id)
        previous_state = resolution.verification_state

        resolution.verification_state = VerificationState.CONFIRMED
        resolution.verified_by = actor.id
        resolution.verified_at = datetime.now(UTC)
        resolution.rejection_reason = None
        meta = dict(resolution.metadata_ or {})
        event_log = list(meta.get("audit_events", []))
        event_log.append(
            {
                "action": "CONFIRMED",
                "actor": actor.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "previous_state": previous_state.value
                if hasattr(previous_state, "value")
                else str(previous_state),
                "new_state": "confirmed",
                "reason": reason,
            }
        )
        meta["audit_events"] = event_log
        resolution.metadata_ = meta

        await self.session.flush()
        await self.session.refresh(resolution)
        return resolution

    async def reject(
        self,
        resolution_id: UUID,
        *,
        actor,
        reason: str | None = None,
    ) -> EntityResolution:
        self._assert_actor_can_review(actor)

        resolution = await self.get(resolution_id)
        previous_state = resolution.verification_state

        resolution.verification_state = VerificationState.REJECTED
        resolution.verified_by = actor.id
        resolution.verified_at = datetime.now(UTC)
        resolution.rejection_reason = reason

        meta = dict(resolution.metadata_ or {})
        event_log = list(meta.get("audit_events", []))
        event_log.append(
            {
                "action": "REJECTED",
                "actor": actor.id,
                "timestamp": datetime.now(UTC).isoformat(),
                "previous_state": previous_state.value
                if hasattr(previous_state, "value")
                else str(previous_state),
                "new_state": "rejected",
                "reason": reason,
            }
        )
        meta["audit_events"] = event_log
        resolution.metadata_ = meta

        await self.session.flush()
        await self.session.refresh(resolution)
        return resolution

    # ------------------------------------------------------------------
    # Decoration for API reads
    # ------------------------------------------------------------------
    async def decorate(self, resolution: EntityResolution) -> dict:
        """Attach human-readable entity names for API responses."""
        entity_a = await self.entities.get(resolution.entity_id_1)
        entity_b = await self.entities.get(resolution.entity_id_2)
        return {
            "id": resolution.id,
            "investigation_id": resolution.investigation_id,
            "entity_id_1": resolution.entity_id_1,
            "entity_id_2": resolution.entity_id_2,
            "entity_1_name": entity_a.name if entity_a else None,
            "entity_2_name": entity_b.name if entity_b else None,
            "entity_1_type": entity_a.entity_type.value if entity_a else None,
            "entity_2_type": entity_b.entity_type.value if entity_b else None,
            "confidence": resolution.confidence,
            "linkage_score": resolution.linkage_score,
            "resolution_version": resolution.resolution_version,
            "resolution_method": resolution.resolution_method.value
            if hasattr(resolution.resolution_method, "value")
            else str(resolution.resolution_method),
            "matched_features": resolution.matched_features or [],
            "contradictions": resolution.contradictions or [],
            "source_refs": resolution.source_refs or [],
            "matching_attributes": resolution.matching_attributes or [],
            "evidence": resolution.evidence or [],
            "verification_state": resolution.verification_state.value
            if hasattr(resolution.verification_state, "value")
            else str(resolution.verification_state),
            "last_evaluated_at": resolution.last_evaluated_at,
            "verified_by": resolution.verified_by,
            "verified_at": resolution.verified_at,
            "rejection_reason": resolution.rejection_reason,
            "metadata": resolution.metadata_ or {},
            "created_at": resolution.created_at,
            "updated_at": resolution.updated_at,
        }
