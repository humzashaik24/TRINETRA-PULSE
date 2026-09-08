"""Administrative user/role management + audit access (Phase 18.1 RBAC).

Mounted at ``/api/v2/admin``:

- ``GET /admin/users``     — ADMIN only.
- ``PATCH /admin/users/{id}`` — ADMIN only (role assignment, deactivation).
- ``GET /admin/audit``     — SUPERVISOR / ADMIN / AUDITOR (read).

Every mutation records the matching audit event (``role_changed`` /
``user_deactivated``). Password hashes are never serialized — the response
models below simply do not carry that field.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.deps import AdminDep, CurrentUser, CurrentUserDep, SessionDep
from app.api.errors import NotAuthorizedError, NotFoundError
from app.models import AuthAuditAction, AuthAuditEvent, User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.real.auth import AuditEventRead, UserRead, UserUpdate
from app.services.security import get_user_by_id, record_audit_event

router = APIRouter()


@router.get("/users", response_model=PaginatedResponse[UserRead])
async def list_users(
    session: SessionDep,
    _actor: AdminDep,
    page: int = 1,
    page_size: int = Query(default=50, le=500),
) -> PaginatedResponse[UserRead]:
    total = int((await session.execute(select(func.count(User.id)))).scalar_one())
    stmt = select(User).order_by(User.created_at).limit(page_size).offset((page - 1) * page_size)
    users = list((await session.execute(stmt)).scalars().all())
    return PaginatedResponse[UserRead](
        items=[UserRead.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    session: SessionDep,
    actor: AdminDep,
) -> UserRead:
    target = await get_user_by_id(session, user_id)
    if target is None:
        raise NotFoundError("User", str(user_id))
    if not payload.has_changes:
        return UserRead.model_validate(target)

    if actor.id == str(user_id):
        # Prevent an administrator from locking themselves out: a demotion or
        # deactivation of your own account is refused.
        demoting = payload.role is not None and payload.role != target.role
        deactivating = payload.is_active is False
        if demoting or deactivating:
            raise NotAuthorizedError("Cannot demote or deactivate your own account.")

    prior_role = target.role.value
    role_changed = payload.role is not None and payload.role != target.role
    deactivated = payload.is_active is False and target.is_active

    if role_changed:
        target.role = payload.role  # type: ignore[assignment]
    if payload.is_active is not None:
        target.is_active = payload.is_active
    if payload.display_name is not None:
        target.display_name = payload.display_name

    if role_changed:
        await record_audit_event(
            session,
            action=AuthAuditAction.ROLE_CHANGED,
            email=target.email,
            user_id=target.id,
            details={"from": prior_role, "to": payload.role.value},
            commit=False,
        )
    if deactivated:
        await record_audit_event(
            session,
            action=AuthAuditAction.USER_DEACTIVATED,
            email=target.email,
            user_id=target.id,
            commit=False,
        )

    await session.flush()
    await session.refresh(target)
    return UserRead.model_validate(target)


async def _require_audit_access(
    session: SessionDep,
    user: CurrentUserDep,
) -> CurrentUser:
    if user.role in (UserRole.SUPERVISOR, UserRole.ADMIN, UserRole.AUDITOR):
        return user
    await record_audit_event(
        session,
        action=AuthAuditAction.PERMISSION_DENIED,
        email=user.email,
        details={"required": "supervisor/admin/auditor"},
    )
    raise NotAuthorizedError()


AuditReaderDep = Annotated[CurrentUser, Depends(_require_audit_access)]


@router.get("/audit", response_model=PaginatedResponse[AuditEventRead])
async def list_audit_events(
    session: SessionDep,
    _reader: AuditReaderDep,
    page: int = 1,
    page_size: int = Query(default=50, le=500),
) -> PaginatedResponse[AuditEventRead]:
    total = int((await session.execute(select(func.count(AuthAuditEvent.id)))).scalar_one())
    stmt = (
        select(AuthAuditEvent)
        .order_by(AuthAuditEvent.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    events = list((await session.execute(stmt)).scalars().all())
    return PaginatedResponse[AuditEventRead](
        items=[AuditEventRead.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
