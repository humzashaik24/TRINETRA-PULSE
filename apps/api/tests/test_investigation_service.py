"""Investigation service & persistence tests (Phase 15).

Exercises the real ``InvestigationService`` against the async SQLAlchemy stack
on throwaway in-memory SQLite (portable types keep the same models running on
PostgreSQL in production). Verifies that investigation **mutations actually
persist** to the database (not just return from memory), the not-found contract,
and paginated listing.
"""

from uuid import UUID

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.errors import InvestigationNotFoundError
from app.models import Base, Investigation
from app.schemas.real.investigation import InvestigationCreate, InvestigationUpdate
from app.services.real.investigation import InvestigationService


def _val(value) -> str:
    """Normalize a status/priority value (enum or plain string) to its string."""
    return value.value if hasattr(value, "value") else value


@pytest.fixture
async def session() -> AsyncSession:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s
    await engine.dispose()


@pytest.mark.anyio
async def test_create_persists_investigation(session: AsyncSession):
    service = InvestigationService(session)
    inv = await service.create(
        InvestigationCreate(
            title="Persistent Case",
            status="active",
            priority="high",
            lead_investigator="Inspector Mehta",
            tags=["import", "persist"],
        )
    )
    await session.commit()

    # Re-read from the database through a fresh query (not the in-memory object).
    stored = (
        await session.execute(select(Investigation).where(Investigation.id == inv.id))
    ).scalar_one()
    assert stored.title == "Persistent Case"
    assert _val(stored.status) == "active"
    assert _val(stored.priority) == "high"
    assert stored.lead_investigator == "Inspector Mehta"


@pytest.mark.anyio
async def test_update_persists_changes(session: AsyncSession):
    service = InvestigationService(session)
    inv = await service.create(
        InvestigationCreate(title="Before Update", status="draft", priority="normal")
    )
    await session.commit()

    updated = await service.update(
        inv.id,
        InvestigationUpdate(title="After Update", status="active", priority="high"),
    )
    await session.commit()

    assert updated.id == inv.id
    assert updated.title == "After Update"

    stored = (
        await session.execute(select(Investigation).where(Investigation.id == inv.id))
    ).scalar_one()
    assert stored.title == "After Update"
    assert _val(stored.status) == "active"
    assert _val(stored.priority) == "high"


@pytest.mark.anyio
async def test_list_returns_paginated_items(session: AsyncSession):
    service = InvestigationService(session)
    for i in range(3):
        await service.create(InvestigationCreate(title=f"Inv {i}"))
    await session.commit()

    items, total = await service.list(page=1, page_size=2)
    assert total == 3
    assert len(items) == 2

    items_page2, total2 = await service.list(page=2, page_size=2)
    assert total2 == 3
    assert len(items_page2) == 1


@pytest.mark.anyio
async def test_get_required_raises_for_unknown(session: AsyncSession):
    service = InvestigationService(session)

    with pytest.raises(InvestigationNotFoundError):
        await service.get_required_investigation(
            UUID("00000000-0000-0000-0000-000000000000")
        )
