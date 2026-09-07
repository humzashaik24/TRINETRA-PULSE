from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def analytics_overview():
    return {"analytics": {}, "message": "Analytics dashboard - Phase 1"}


@router.get("/entity-stats")
async def entity_statistics():
    return {"total_entities": 0, "by_type": {}, "message": "Entity statistics - Phase 1"}
