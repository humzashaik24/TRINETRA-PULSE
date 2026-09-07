from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_evidence():
    return {"evidence": [], "message": "Evidence management - Phase 1"}
