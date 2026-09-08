"""Auth + RBAC request/response schemas (Phase 18.1)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AuthAuditAction, UserRole


def _password_constraint() -> Field:
    # BCrypt operates on a maximum of 72 bytes; enforce it here so the
    # validation contract is identical for login and user admin.
    return Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., max_length=320)
    password: str = _password_constraint()


class AuthUserRead(BaseModel):
    """Safe user identity — never carries password or password_hash."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    role: UserRole
    is_active: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserRead


class UserRead(AuthUserRead):
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """Admin-managed user fields (role assignment / account state)."""

    role: UserRole | None = None
    is_active: bool | None = None
    display_name: str | None = Field(default=None, max_length=120)

    @property
    def has_changes(self) -> bool:
        return any(
            (
                self.role is not None,
                self.is_active is not None,
                self.display_name is not None,
            )
        )


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None
    email: str
    action: AuthAuditAction
    details: dict | None
    created_at: datetime
