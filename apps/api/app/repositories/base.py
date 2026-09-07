"""Generic async base repository."""

from __future__ import annotations

from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import BaseModel

M = TypeVar("M", bound=BaseModel)


class BaseRepository(Generic[M]):
    """Thin async wrapper over SQLAlchemy for a single model type."""

    model: type[M]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, item_id: UUID) -> M | None:
        return await self.session.get(self.model, item_id)

    async def list(self, *, limit: int = 100, offset: int = 0) -> list[M]:
        stmt = select(self.model).order_by(self.model.created_at).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        result = await self.session.execute(
            select(self.model.id).with_only_columns(self.model.id)
        )
        return len(result.all())

    async def add(self, instance: M) -> M:
        self.session.add(instance)
        await self.session.flush()
        return instance

    async def delete(self, instance: M) -> None:
        await self.session.delete(instance)
        await self.session.flush()
