"""Password hashing (BCrypt) and JWT access-token primitives (Phase 18.1).

Phase 18.1 replaces the dev-only ``X-User-Id`` header with standards-based
JWT bearer authentication. Passwords are NEVER stored in plaintext: they are
hashed with BCrypt (a strong, deliberately slow adaptive hash). Authentication
secrets come from environment variables (``JWT_SECRET_KEY``) and are never
exposed through ``NEXT_PUBLIC_*`` or API responses.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import jwt

from app.core.config import get_settings

# BCrypt operates on a maximum of 72 bytes (the algorithm ignores the rest and
# the native wrapper raises on longer inputs). Enforce that limit at the edge
# (login / user schemas) so lookalike passwords are never silently truncated.
BCRYPT_MAX_PASSWORD_BYTES = 72

BCRYPT_ROUNDS = 12


def validate_password_length(password: str) -> None:
    """Raise ``ValueError`` when a password exceeds BCrypt's 72-byte limit."""
    if len(password.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError("Password too long (BCrypt supports a maximum of 72 bytes).")


def hash_password(password: str) -> str:
    """Return a ``$2b$`` BCrypt hash for a plaintext password."""
    validate_password_length(password)
    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=BCRYPT_ROUNDS),
    )
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time check of a plaintext password against a BCrypt hash.

    Never raises on malformed stored hashes; returns ``False`` so callers can
    present a single, safe "invalid credentials" error.
    """
    try:
        validate_password_length(password)
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def create_access_token(
    subject: str,
    *,
    email: str,
    role: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed HS256 JWT access token carrying identity claims.

    Only identity metadata lives in the token (subject user id, email, role).
    Role decisions are always re-checked against the persisted ``users`` row at
    request time, so a stale role claim can never outrank a revoked role.
    """
    settings = get_settings()
    minutes = expires_minutes or settings.jwt_access_token_expire_minutes
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=minutes)
    claims: dict[str, Any] = {
        "sub": str(subject),
        "email": email,
        "role": role,
        "iat": now,
        "exp": expires,
        "iss": "trinetra-pulse",
    }
    return jwt.encode(
        claims,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode + verify a JWT access token.

    Raises ``JWTError`` (subclasses: ``ExpiredSignatureError``,
    ``JWTClaimsError``) when the token is invalid, expired or malformed.
    """
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        issuer="trinetra-pulse",
    )
