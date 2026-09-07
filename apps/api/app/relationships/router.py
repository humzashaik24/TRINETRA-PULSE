from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter

from app.schemas.relationship import RelationshipCreate, RelationshipResponse

router = APIRouter()

_relationships_store: dict[str, dict] = {}


@router.post("/", response_model=RelationshipResponse, status_code=201)
async def create_relationship(payload: RelationshipCreate):
    rel_id = uuid4()
    now = datetime.now(UTC)
    rel = {
        "id": rel_id,
        "source_entity_id": payload.source_entity_id,
        "target_entity_id": payload.target_entity_id,
        "relationship_type": payload.relationship_type,
        "confidence": payload.confidence,
        "source": payload.source,
        "evidence_refs": payload.evidence_refs,
        "extraction_method": payload.extraction_method,
        "verification_status": "needs_review",
        "description": payload.description,
        "weight": payload.weight,
        "created_at": now,
        "updated_at": now,
    }
    _relationships_store[str(rel_id)] = rel
    return RelationshipResponse(**rel)


@router.get("/{relationship_id}", response_model=RelationshipResponse)
async def get_relationship(relationship_id: UUID):
    rel = _relationships_store.get(str(relationship_id))
    if not rel:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Relationship not found")
    return RelationshipResponse(**rel)


@router.get("/", response_model=list[RelationshipResponse])
async def list_relationships(entity_id: UUID | None = None, limit: int = 20):
    items = list(_relationships_store.values())
    if entity_id:
        items = [
            r for r in items
            if r["source_entity_id"] == entity_id
            or r["target_entity_id"] == entity_id
        ]
    return [RelationshipResponse(**r) for r in items[:limit]]
