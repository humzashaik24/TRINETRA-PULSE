from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_reports():
    return {"reports": [], "message": "Report generation - Phase 1"}


@router.post("/generate")
async def generate_report():
    return {"report_id": None, "message": "Report generation - Phase 1"}
