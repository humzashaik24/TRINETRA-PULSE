"""Authentication + RBAC service operations (Phase 18.1).

Sits above ``app.core.security`` (BCrypt + JWT primitives) and the ``users`` /
``auth_audit_events`` tables. Endpoints stay thin; all account logic and the
minimal audit trail live here.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models import AuthAuditAction, AuthAuditEvent, User, UserRole


async def get_user_by_id(session: AsyncSession, user_id: UUID) -> User | None:
    return await session.get(User, user_id)


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == email.strip().lower())
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    display_name: str,
    role: UserRole,
    is_active: bool = True,
) -> User:
    user = User(
        email=email.strip().lower(),
        password_hash=hash_password(password),
        display_name=display_name,
        role=role,
        is_active=is_active,
    )
    session.add(user)
    await session.flush()
    return user


async def authenticate(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> User | None:
    """Return the ``User`` when credentials are valid, else ``None``.

    Unknown user, wrong password and (deliberately) deactivated accounts all
    return ``None`` so callers emit a single safe "invalid credentials"
    response — no username enumeration.
    """
    user = await get_user_by_email(session, email)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def resolve_role_claim(payload: dict) -> str | None:
    """Best-effort role claim from a decoded token (for audit context only)."""
    claim = payload.get("role")
    if isinstance(claim, str) and claim in {role.value for role in UserRole}:
        return claim
    return None


def decode_token_claims(token: str) -> dict:
    """Decode + verify a token; the caller normalizes failures."""
    return decode_access_token(token)


async def record_audit_event(
    session: AsyncSession,
    *,
    action: AuthAuditAction,
    email: str,
    user_id: UUID | None = None,
    details: dict | None = None,
    commit: bool = True,
) -> None:
    """Persist an RBAC audit event.

    ``commit=False`` lets callers fold the event into their own transaction
    (e.g. a successful admin action). ``commit=True`` guarantees durability for
    events emitted before an error bubbles up (login failure, permission
    denied) where the request-level transaction would otherwise roll back.
    """
    event = AuthAuditEvent(
        user_id=user_id,
        email=email.strip().lower(),
        action=action,
        details=details,
    )
    session.add(event)
    await session.flush()
    if commit:
        await session.commit()
