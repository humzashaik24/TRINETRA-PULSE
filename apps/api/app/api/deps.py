"""Shared FastAPI dependencies for the real application layer.

Provides:
- ``CurrentUser`` identity model
- ``get_current_user`` dev-identity authentication dependency
- ``get_session`` async DB session dependency (proxy over ``app.db.session.get_db``)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AuthRequiredError
from app.core.config import get_settings
from app.db.session import get_db

DEFAULT_DEV_USER = "inspector.mehta@trinetra.local"


@dataclass
class CurrentUser:
    """Identifies the actor performing an action."""

    id: str
    name: str = "Inspector Mehta"
    email: str = DEFAULT_DEV_USER
    role: str = "inspector"
    groups: list[str] = field(default_factory=list)


async def get_current_user(
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> CurrentUser:
    """Return an identity.

    In a fully deployed system this would validate a JWT/bearer token; for the
    SIH demonstration it maps the ``X-User-Id`` header (or a default dev
    inspector) to a ``CurrentUser``.

    Production hardening (Phase 22): the client-supplied header is NOT trusted
    as an arbitrary identity. Production only accepts the single server-configured
    actor (``AUTH_ACTOR_EMAIL``, default ``inspector.mehta@trinetra.local``),
    so a caller can not impersonate another user by sending an arbitrary
    ``X-User-Id``. Requests without the header are still rejected with 401.
    """
    settings = get_settings()
    if settings.app_env == "production":
        expected = settings.auth_actor_email or DEFAULT_DEV_USER
        if x_user_id != expected:
            raise AuthRequiredError()
        return CurrentUser(id=expected)
    user_id = x_user_id or DEFAULT_DEV_USER
    return CurrentUser(id=user_id)


async def get_session() -> AsyncSession:
    """Async DB session dependency (see ``app.db.session.get_db``)."""
    async for session in get_db():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
