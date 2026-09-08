"""Shared FastAPI dependencies for the real application layer.

Phase 18.1 turns the previous dev-only ``X-User-Id`` identity gate into a
standards-based JWT bearer authentication dependency plus a strict RBAC
hierarchy:

- ``get_current_user`` — reads ``Authorization: Bearer <token>``, verifies the
  signature + expiry, resolves the persisted user, and rejects inactive
  accounts. It NEVER derives identity from ``X-User-Id``, query parameters,
  frontend role fields or client state.
- ``require_role(...)`` — factory for reusable authorization dependencies with
  a hierarchical model (ADMIN > SUPERVISOR > INVESTIGATOR; AUDITOR read-only).
- ``get_session`` — async DB session dependency (proxy over
  ``app.db.session.get_db``).
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AuthRequiredError, NotAuthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import (
    ROLE_RANK,
    AuthAuditAction,
    User,
    UserRole,
)
from app.services.security import get_user_by_id, record_audit_event

logger = logging.getLogger(__name__)


@dataclass
class CurrentUser:
    """The resolved, authenticated actor performing a request."""

    id: str
    email: str
    display_name: str
    role: UserRole
    is_active: bool

    @property
    def rank(self) -> int:
        return ROLE_RANK[self.role]

    @property
    def can_mutate(self) -> bool:
        return self.role != UserRole.AUDITOR


async def _resolve_token_user(session: AsyncSession, token: str) -> User:
    """Decode a Bearer token and load its actor.

    Every failure path raises ``AuthRequiredError`` (401) with the same body so
    callers cannot distinguish valid-but-unknown tokens from malformed ones.
    """
    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if not subject:
            raise AuthRequiredError()
        user = await get_user_by_id(session, UUID(subject))
    except (JWTError, ValueError, TypeError):
        raise AuthRequiredError() from None
    if user is None or not user.is_active:
        raise AuthRequiredError()
    return user


async def get_current_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    session: SessionDep = None,  # type: ignore[assignment]
) -> CurrentUser:
    """Resolve the authenticated user from a verified ``Bearer`` token."""
    if not authorization:
        raise AuthRequiredError()
    scheme, _, token = authorization.partition(" ")
    if scheme.strip().lower() != "bearer" or not token.strip():
        raise AuthRequiredError()
    user = await _resolve_token_user(session, token.strip())
    return CurrentUser(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
    )


async def _record_permission_denied(session: AsyncSession, user: CurrentUser) -> None:
    """Durably record a denied permission (Phase 18.1.14 audit foundation)."""
    try:
        await record_audit_event(
            session,
            action=AuthAuditAction.PERMISSION_DENIED,
            email=user.email,
            user_id=UUID(user.id) if _is_uuid(user.id) else None,
            details={"role": user.role.value, "required_rank_note": "RBAC gate"},
        )
    except Exception:  # noqa: BLE001 - audit must never break authorization
        logger.warning("failed to record permission_denied audit event", exc_info=True)


def _is_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except ValueError:
        return False


def require_role(required: UserRole) -> Callable[..., Awaitable[CurrentUser]]:
    """Build an authorization dependency enforcing ``required`` (or higher).

    Hierarchy: ADMIN (3) > SUPERVISOR (2) > INVESTIGATOR (1). AUDITOR (0) is a
    read-only role: it only satisfies an exact ``require_role(AUDITOR)`` and
    never inherits mutation privileges. Failures return 403 ``forbidden``.
    """

    async def _role_dependency(
        session: SessionDep,  # type: ignore[assignment]
        user: CurrentUserDep,  # type: ignore[assignment]
    ) -> CurrentUser:
        if required == UserRole.AUDITOR:
            if user.role != UserRole.AUDITOR:
                await _record_permission_denied(session, user)
                raise NotAuthorizedError()
            return user
        if user.rank < ROLE_RANK[required]:
            await _record_permission_denied(session, user)
            raise NotAuthorizedError()
        return user

    return _role_dependency


async def get_session() -> AsyncSession:
    """Async DB session dependency (see ``app.db.session.get_db``)."""
    async for session in get_db():
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]

# Forwards-compatible aliases back to CurrentUser (no duplicate system).
require_supervisor = require_role(UserRole.SUPERVISOR)
require_admin = require_role(UserRole.ADMIN)
require_auditor = require_role(UserRole.AUDITOR)

# Convenience dependency aliases for route handlers.
CanMutateDep = Annotated[CurrentUser, Depends(require_role(UserRole.INVESTIGATOR))]
SupervisorDep = Annotated[CurrentUser, Depends(require_supervisor)]
AdminDep = Annotated[CurrentUser, Depends(require_admin)]
AuditorDep = Annotated[CurrentUser, Depends(require_auditor)]
