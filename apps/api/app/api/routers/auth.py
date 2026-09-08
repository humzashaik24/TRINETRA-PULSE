"""Authentication router (Phase 18.1).

Mounted at ``/api/v2/auth``. ``POST /login`` is the only public endpoint on the
v2 surface (besides ``/health``); everything else requires a verified Bearer
token. Login failure responses are deliberately identical for unknown user,
wrong password and deactivated account to prevent username enumeration, and
never leak whether an email exists.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.api.errors import AuthRequiredError
from app.core.security import create_access_token
from app.models import AuthAuditAction
from app.schemas.real.auth import AuthUserRead, LoginRequest, LoginResponse
from app.services.security import authenticate, record_audit_event

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    session: SessionDep,
) -> LoginResponse:
    email = payload.email.strip().lower()
    user = await authenticate(
        session,
        email=email,
        password=payload.password,
    )
    if user is None:
        # Single safe error for every failure class — no account enumeration.
        await record_audit_event(
            session,
            action=AuthAuditAction.LOGIN_FAILURE,
            email=email,
        )
        raise AuthRequiredError()

    token = create_access_token(
        str(user.id),
        email=user.email,
        role=user.role.value,
    )
    await record_audit_event(
        session,
        action=AuthAuditAction.LOGIN_SUCCESS,
        email=user.email,
        user_id=user.id,
    )
    return LoginResponse(access_token=token, user=AuthUserRead.model_validate(user))


@router.get("/me", response_model=AuthUserRead)
async def me(
    user: CurrentUserDep,
) -> AuthUserRead:
    return AuthUserRead(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
    )
