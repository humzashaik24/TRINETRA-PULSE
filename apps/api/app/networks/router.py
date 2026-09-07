from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_networks():
    return {"networks": [], "message": "Network analytics - Phase 1"}


@router.get("/{network_id}")
async def get_network(network_id: str):
    return {
        "network_id": network_id,
        "nodes": [],
        "edges": [],
        "message": "Network details - Phase 1",
    }
