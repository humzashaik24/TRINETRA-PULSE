"""Integration tests for the real datasets / ingestion API (/api/v2).

Uses an in-memory SQLite database via ``app.dependency_overrides`` against the
full FastAPI + SQLAlchemy async stack.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.app import create_real_app
from app.db.seed import seed_database
from app.models import Base, Investigation
from tests.auth_stubs import install_auth_stub


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    app = create_real_app()

    async def override_get_session():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    from app.api.deps import get_session

    app.dependency_overrides[get_session] = override_get_session
    install_auth_stub(app)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, factory
    await engine.dispose()


async def _seed(factory):
    async with factory() as session:
        await seed_database(session)
        await session.commit()


async def _inv_id(factory):
    async with factory() as session:
        inv = (
            await session.execute(
                select(Investigation).where(Investigation.title == "Operation Meridian")
            )
        ).scalar_one()
        return str(inv.id)


@pytest.mark.anyio
async def test_list_seeded_datasets(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)

    response = await ac.get("/datasets", params={"investigation_id": inv_id})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    names = {d["name"] for d in data}
    assert names == {
        "FIR Records",
        "CDR Extract - Operation clean",
        "Bank Transaction Log",
    }
    assert all(d["status"] == "ready" for d in data)


@pytest.mark.anyio
async def test_seeded_datasets_via_investigation_resources(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)

    ds = await ac.get(f"/investigations/{inv_id}/datasets")
    assert ds.status_code == 200
    assert len(ds.json()) == 3

    jobs = await ac.get(f"/investigations/{inv_id}/ingestion-jobs")
    assert jobs.status_code == 200
    assert len(jobs.json()) == 3


@pytest.mark.anyio
async def test_create_dataset_and_job_lifecycle(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)

    created_ds = await ac.post(
        "/datasets",
        json={
            "investigation_id": inv_id,
            "name": "New Fin Dataset",
            "source_name": "Test Bank",
            "format": "csv",
            "category": "structured",
            "file_name": "fin.csv",
            "metadata": {"is_demo": True},
        },
    )
    assert created_ds.status_code == 201
    body = created_ds.json()
    assert body["name"] == "New Fin Dataset"
    assert body["status"] == "validating"

    job = await ac.post(
        f"/datasets/{body['id']}/jobs",
        json={"investigation_id": inv_id, "created_by": "Analyst Singh"},
    )
    assert job.status_code == 201
    j = job.json()
    assert j["status"] == "queued"
    assert j["dataset_id"] == body["id"]

    completed = await ac.post(
        f"/datasets/jobs/{j['id']}/complete",
        json={
            "status": "completed",
            "records_processed": 250,
            "entities_extracted": 30,
            "candidates_created": 28,
            "matches_found": 9,
            "warnings": ["dup detected"],
        },
    )
    assert completed.status_code == 200
    jc = completed.json()
    assert jc["status"] == "completed"
    assert jc["progress"] == 100
    assert jc["records_processed"] == 250
    assert jc["warnings"] == ["dup detected"]

    get_job = await ac.get(f"/datasets/jobs/{j['id']}")
    assert get_job.status_code == 200
    assert get_job.json()["status"] == "completed"


@pytest.mark.anyio
async def test_cancel_job(client):
    ac, factory = client
    await _seed(factory)
    inv_id = await _inv_id(factory)
    ds_id = (await ac.get("/datasets", params={"investigation_id": inv_id})).json()[0]["id"]

    job = await ac.post(
        f"/datasets/{ds_id}/jobs",
        json={"investigation_id": inv_id},
    )
    jid = job.json()["id"]

    cancelled = await ac.post(f"/datasets/jobs/{jid}/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


@pytest.mark.anyio
async def test_get_dataset_not_found_contract(client):
    ac, factory = client
    await _seed(factory)
    missing = "00000000-0000-0000-0000-000000000000"
    response = await ac.get(f"/datasets/{missing}")
    assert response.status_code == 404
    body = response.json()
    assert body["code"] == "not_found"
    assert body["details"]["resource"] == "Dataset"


@pytest.mark.anyio
async def test_data_source_create_and_list(client):
    ac, factory = client
    await _seed(factory)

    created = await ac.post(
        "/datasets/sources",
        json={
            "name": "GSTN",
            "description": "GST Network exports",
            "category": "financial",
            "format": "csv",
            "icon": "receipt",
            "accepted_extensions": ["csv", "xlsx"],
            "max_file_size": 5242880,
            "metadata": {"kind": "financial"},
        },
    )
    assert created.status_code == 201
    sid = created.json()["id"]
    assert created.json()["category"] == "financial"

    listed = await ac.get("/datasets/sources")
    assert listed.status_code == 200
    assert any(s["id"] == sid for s in listed.json())

    filtered = await ac.get("/datasets/sources", params={"category": "financial"})
    assert all(s["category"] == "financial" for s in filtered.json())
