"""Application user + auth/RBAC audit models (Phase 18.1).

The repository previously relied on a dev-only ``X-User-Id`` header for
identity. Phase 18.1 introduces a persisted ``users`` table with role-based
access control and a minimal audit trail for authentication / RBAC events so
Phase 18.2 (blockchain / evidence chain-of-custody) can build its own layer on
top. No organization table is created: an organization is modelled as an
``entity_type`` (see Phase 14.2) and identity lives in ``users``.
"""

from __future__ import annotations

import enum

from sqlalchemy import Boolean, Column, Enum, ForeignKey, String
from sqlalchemy.orm import relationship

from app.db.types import JSONB, Uuid
from app.models.base import BaseModel


class UserRole(enum.StrEnum):
    """Application roles with a strict hierarchy.

    ADMIN > SUPERVISOR > INVESTIGATOR. AUDITOR is a distinct, read-only role
    and does NOT inherit mutation privileges.
    """

    INVESTIGATOR = "investigator"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"
    AUDITOR = "auditor"


ROLE_RANK: dict[UserRole, int] = {
    UserRole.AUDITOR: 0,
    UserRole.INVESTIGATOR: 1,
    UserRole.SUPERVISOR: 2,
    UserRole.ADMIN: 3,
}


class User(BaseModel):
    """Application user with a BCrypt password hash and a single role."""

    __tablename__ = "users"

    email = Column(
        String(320),
        nullable=False,
        unique=True,
        index=True,
    )
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(120), nullable=False)
    role = Column(
        Enum(UserRole, name="user_role", native_enum=False, length=32),
        nullable=False,
        default=UserRole.INVESTIGATOR,
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    metadata_ = Column("metadata", JSONB, nullable=True)

    audit_events = relationship(
        "AuthAuditEvent",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class AuthAuditAction(enum.StrEnum):
    """Minimal audit vocabulary for authentication/RBAC events (Phase 18.1.14).

    Phase 18.2 adds three chain-of-custody actions for the tamper-evident
    evidence ledger. The column is ``Enum(..., native_enum=False, length=32)``
    so every value must fit within 32 characters.
    """

    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    ROLE_CHANGED = "role_changed"
    USER_DEACTIVATED = "user_deactivated"
    PERMISSION_DENIED = "permission_denied"
    # Phase 18.2 — evidence chain-of-custody verification events.
    EVIDENCE_CHAIN_CREATED = "evidence_chain_created"
    EVIDENCE_CHAIN_VERIFIED = "evidence_chain_verified"
    EVIDENCE_CHAIN_VERIFY_FAILED = "evidence_chain_verify_failed"
    EVIDENCE_UPLOADED = "evidence_uploaded"
    EVIDENCE_ACCESSED = "evidence_accessed"
    EVIDENCE_VERIFIED = "evidence_verified"
    EVIDENCE_EXPORTED = "evidence_exported"
    # Phase 23 — AI/media provider configuration events. The detail payloads
    # never carry credentials or any derived secret (masked digests only).
    PROVIDER_CREATED = "provider_created"
    PROVIDER_UPDATED = "provider_updated"
    PROVIDER_ENABLED = "provider_enabled"
    PROVIDER_DISABLED = "provider_disabled"
    PROVIDER_DEFAULT_CHANGED = "provider_default_changed"
    PROVIDER_DELETED = "provider_deleted"
    PROVIDER_CONNECTION_TESTED = "provider_connection_tested"
    # Phase 24 — multimedia evidence intelligence events. Details never carry
    # provider credentials, media contents or full transcripts.
    EVIDENCE_ANALYSIS_REQUESTED = "evidence_analysis_requested"
    EVIDENCE_ANALYSIS_STARTED = "evidence_analysis_started"
    EVIDENCE_ANALYSIS_COMPLETED = "evidence_analysis_completed"
    EVIDENCE_ANALYSIS_FAILED = "evidence_analysis_failed"
    EVIDENCE_ANALYSIS_INTEGRITY_FAIL = "evidence_analysis_integrity_fail"
    # Phase 25 — local (in-browser) transcription events. Details never carry
    # the full transcript, segments, keys, or storage URLs.
    LOCAL_TRANSCRIPTION_REQUESTED = "local_transcription_requested"
    LOCAL_TRANSCRIPTION_STARTED = "local_transcription_started"
    LOCAL_TRANSCRIPTION_COMPLETED = "local_transcription_completed"
    LOCAL_TRANSCRIPTION_FAILED = "local_transcription_failed"


class AuthAuditEvent(BaseModel):
    """A durable record of an authentication / RBAC event.

    Deliberately NOT a general event platform — Phase 18.2 (chain-of-custody)
    will add its own infrastructure. This table only carries the RBAC events
    Phase 18.1 needs (login success/failure, role change, deactivation and
    permission denials).
    """

    __tablename__ = "auth_audit_events"

    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    email = Column(String(320), nullable=False, index=True)
    action = Column(
        Enum(AuthAuditAction, name="auth_audit_action", native_enum=False, length=32),
        nullable=False,
    )
    details = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="audit_events")
