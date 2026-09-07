from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_patterns():
    return {"patterns": [], "message": "Pattern detection - Phase 1"}


@router.get("/anomalies")
async def detect_anomalies():
    return {"anomalies": [], "message": "Anomaly detection - Phase 1"}
