from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter

from app.schemas.entity import EntityCreate, EntityResponse

router = APIRouter()

_entities_store: dict[str, dict] = {}


@router.post("/", response_model=EntityResponse, status_code=201)
async def create_entity(payload: EntityCreate):
    entity_id = uuid4()
    now = datetime.now(UTC)
    entity = {
        "id": entity_id,
        "entity_type": payload.entity_type,
        "name": payload.name,
        "canonical_name": None,
        "description": payload.description,
        "attributes": payload.attributes,
        "risk_score": 0.0,
        "is_verified": False,
        "is_flagged": False,
        "created_at": now,
        "updated_at": now,
    }
    _entities_store[str(entity_id)] = entity
    return EntityResponse(**entity)


@router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: UUID):
    entity = _entities_store.get(str(entity_id))
    if not entity:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponse(**entity)


@router.get("/", response_model=list[EntityResponse])
async def list_entities(entity_type: str | None = None, limit: int = 20):
    items = list(_entities_store.values())
    if entity_type:
        items = [e for e in items if e["entity_type"] == entity_type]
    return [EntityResponse(**e) for e in items[:limit]]
