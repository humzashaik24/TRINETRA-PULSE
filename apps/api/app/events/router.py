from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_events():
    return {"events": [], "message": "Event tracking - Phase 1"}
