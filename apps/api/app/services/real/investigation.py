"""Investigation domain service (real application layer)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import (
    EntityNotFoundError,
    EventNotFoundError,
    EvidenceNotFoundError,
    FindingNotFoundError,
    InvestigationNotFoundError,
    NoteNotFoundError,
    RelationshipNotFoundError,
)
from app.models import Investigation
from app.repositories.investigation import (
    EntityRepository,
    EventRepository,
    EvidenceRepository,
    FindingRepository,
    InvestigationRepository,
    NoteRepository,
    RelationshipRepository,
    cleanup_investigation,
)
from app.schemas.real.investigation import (
    EntityCreate,
    EvidenceCreate,
    FindingCreate,
    InvestigationCreate,
    InvestigationUpdate,
    NoteCreate,
)
from app.schemas.real.summary import InvestigationSummary, TimelineEntry


class InvestigationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.investigations = InvestigationRepository(session)
        self.entities = EntityRepository(session)
        self.relationships = RelationshipRepository(session)
        self.findings = FindingRepository(session)
        self.evidence = EvidenceRepository(session)
        self.events = EventRepository(session)
        self.notes = NoteRepository(session)

    async def get_required_investigation(self, investigation_id: UUID) -> Investigation:
        investigation = await self.investigations.get(investigation_id)
        if not investigation:
            raise InvestigationNotFoundError(str(investigation_id))
        return investigation

    # ------------------------------------------------------------------
    # Investigation CRUD
    # ------------------------------------------------------------------
    async def create(self, payload: InvestigationCreate) -> Investigation:
        investigation = Investigation(
            title=payload.title,
            description=payload.description,
            status=payload.status or "draft",
            priority=payload.priority or "normal",
            lead_investigator=payload.lead_investigator,
            assigned_team=payload.assigned_team,
            tags=payload.tags,
            started_at=payload.started_at,
            metadata_=payload.metadata_,
        )
        return await self.investigations.add(investigation)

    async def update(
        self, investigation_id: UUID, payload: InvestigationUpdate
    ) -> Investigation:
        investigation = await self.get_required_investigation(investigation_id)
        changes = payload.model_dump(exclude_unset=True, exclude={"metadata"})
        for key, value in changes.items():
            if value is not None:
                setattr(investigation, key, value)
        if payload.metadata_ is not None:
            investigation.metadata_ = payload.metadata_
        await self.session.flush()
        return investigation

    async def delete(self, investigation_id: UUID) -> None:
        investigation = await self.get_required_investigation(investigation_id)
        await cleanup_investigation(self.session, investigation_id)
        await self.investigations.delete(investigation)

    async def list(
        self, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[Investigation], int]:
        items = await self.investigations.list(
            limit=page_size, offset=(page - 1) * page_size
        )
        total = await self.investigations.count()
        return items, total

    # ------------------------------------------------------------------
    # Summary / detail
    # ------------------------------------------------------------------
    async def summary(self, investigation_id: UUID) -> InvestigationSummary:
        investigation = await self.get_required_investigation(investigation_id)
        return InvestigationSummary(
            id=investigation.id,
            title=investigation.title,
            status=investigation.status.value,
            priority=investigation.priority.value,
            entity_count=await self.entities.count_for_investigation(investigation_id),
            relationship_count=await self.relationships.count_for_investigation(
                investigation_id
            ),
            evidence_count=await self.evidence.count_for_investigation(investigation_id),
            finding_count=await self.findings.count_for_investigation(investigation_id),
            event_count=await self.events.count_for_investigation(investigation_id),
            note_count=await self.notes.count_for_investigation(investigation_id),
            updated_at=investigation.updated_at,
        )

    # ------------------------------------------------------------------
    # Entities
    # ------------------------------------------------------------------
    async def create_entity(self, payload: EntityCreate):
        await self.get_required_investigation(payload.investigation_id)
        return await self.entities.add(
            self.entities.model(
                investigation_id=payload.investigation_id,
                entity_type=payload.entity_type,
                canonical_name=payload.canonical_name or payload.name,
                name=payload.name,
                description=payload.description,
                attributes=payload.attributes,
                confidence=payload.confidence,
                is_verified=payload.is_verified,
                is_flagged=payload.is_flagged,
                metadata_=payload.metadata_,
            )
        )

    async def get_entity(self, entity_id: UUID):
        entity = await self.entities.get(entity_id)
        if not entity:
            raise EntityNotFoundError(str(entity_id))
        return entity

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    async def get_relationship(self, relationship_id: UUID):
        relationship = await self.relationships.get(relationship_id)
        if not relationship:
            raise RelationshipNotFoundError(str(relationship_id))
        return relationship

    # ------------------------------------------------------------------
    # Findings
    # ------------------------------------------------------------------
    async def create_finding(self, payload: FindingCreate):
        await self.get_required_investigation(payload.investigation_id)
        data = payload.model_dump(exclude={"metadata"})
        data["metadata_"] = payload.metadata_
        finding = self.findings.model(**data)
        return await self.findings.add(finding)

    async def get_finding(self, finding_id: UUID):
        finding = await self.findings.get(finding_id)
        if not finding:
            raise FindingNotFoundError(str(finding_id))
        return finding

    # ------------------------------------------------------------------
    # Evidence
    # ------------------------------------------------------------------
    async def create_evidence(self, payload: EvidenceCreate):
        await self.get_required_investigation(payload.investigation_id)
        data = payload.model_dump(exclude={"metadata"})
        data["metadata_"] = payload.metadata_
        item = self.evidence.model(**data)
        return await self.evidence.add(item)

    async def get_evidence(self, evidence_id: UUID):
        item = await self.evidence.get(evidence_id)
        if not item:
            raise EvidenceNotFoundError(str(evidence_id))
        return item

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------
    async def get_event(self, event_id: UUID):
        item = await self.events.get(event_id)
        if not item:
            raise EventNotFoundError(str(event_id))
        return item

    # ------------------------------------------------------------------
    # Notes
    # ------------------------------------------------------------------
    async def create_note(self, payload: NoteCreate):
        await self.get_required_investigation(payload.investigation_id)
        data = payload.model_dump(exclude={"metadata"})
        data["metadata_"] = payload.metadata_
        note = self.notes.model(**data)
        return await self.notes.add(note)

    async def get_note(self, note_id: UUID):
        note = await self.notes.get(note_id)
        if not note:
            raise NoteNotFoundError(str(note_id))
        return note

    # ------------------------------------------------------------------
    # Timeline (merged chronological feed)
    # ------------------------------------------------------------------
    async def timeline(self, investigation_id: UUID) -> list[TimelineEntry]:
        await self.get_required_investigation(investigation_id)

        entries: list[TimelineEntry] = []

        for event in await self.events.list_for_investigation(investigation_id):
            entries.append(
                TimelineEntry(
                    kind="event",
                    at=event.timestamp,
                    title=event.event_type,
                    ref_id=event.id,
                    description=event.description,
                )
            )
        for note in await self.notes.list_for_investigation(investigation_id):
            entries.append(
                TimelineEntry(
                    kind="note",
                    at=note.created_at,
                    title="Note",
                    ref_id=note.id,
                    actor=note.author,
                    description=note.content,
                )
            )
        for finding in await self.findings.list_for_investigation(investigation_id):
            entries.append(
                TimelineEntry(
                    kind="finding",
                    at=finding.created_at,
                    title=finding.title,
                    ref_id=finding.id,
                    description=finding.description,
                )
            )
        for evidence in await self.evidence.list_for_investigation(investigation_id):
            entries.append(
                TimelineEntry(
                    kind="evidence",
                    at=evidence.collected_at,
                    title=evidence.title,
                    ref_id=evidence.id,
                    description=evidence.description,
                )
            )
        # Relationship intelligence entries are gated on a concrete observed
        # timestamp so we never invent temporal claims: relationships whose
        # observation time is unknown do not appear on the timeline.
        for rel in await self.relationships.list_for_investigation(investigation_id):
            if rel.first_observed_at is None:
                continue
            entries.append(
                TimelineEntry(
                    kind="relationship",
                    at=rel.first_observed_at,
                    title=f"{rel.relationship_type.value} relationship observed",
                    ref_id=rel.id,
                    description=(
                        f"{rel.observation_count or 0} observation(s) from "
                        f"{rel.source_count or 0} source(s)"
                    ),
                )
            )

        entries.sort(key=lambda e: e.at or e.title or "")
        return entries
