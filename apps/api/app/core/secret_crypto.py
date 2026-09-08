"""Server-side secret encryption for provider API credentials (Phase 23).

Provider API keys are sensitive: a single leaked database row would expose
every configured vendor account. Credentials are therefore encrypted at rest
with AES-256-GCM using the ``cryptography`` package (already a dependency of
the installed ``python-jose[cryptography]`` — no new dependency).

Design:

- The master secret is ``PROVIDER_ENCRYPTION_KEY`` (server-side env only). In
  ``APP_ENV=production`` the service refuses to boot without it
  (``config.Settings.enforce_production_defaults``). In development the empty
  default derives a stable key from ``APP_SECRET_KEY`` so local/tests work with
  no extra configuration — but that fallback never guards production secrets.
- The 32-byte AES key is derived with HKDF-SHA256 from the master secret, so the
  stored ciphertext shares only HKDF-derived material with the master value.
- Each ciphertext blob is ``base64(nonce(12) || ciphertext || tag(16))`` — a
  fresh nonce per encryption, GCM-authenticated, and self-contained.
- The plaintext never appears in logs, responses, request models or client
  state. Decryption failures fail closed (return an empty string) instead of
  surfacing raw material.
"""

from __future__ import annotations

import base64
import logging
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_NONCE_LENGTH = 12
_AES_KEY_LENGTH = 32
_HKDF_INFO = b"trinetra-pulse:provider-credentials:v1"

_MASK_BULLETS = "\u2022" * 14  # e.g. "••••••••••••••7A2F"


def _derive_key(master: str) -> bytes:
    hkdf = HKDF(
        algorithm=SHA256(),
        length=_AES_KEY_LENGTH,
        salt=None,
        info=_HKDF_INFO,
    )
    return hkdf.derive(master.encode("utf-8"))


def _encryption_key() -> bytes:
    settings = get_settings()
    master = settings.provider_encryption_key
    if not master:
        # Development/test only. get_settings() already refuses to boot in
        # APP_ENV=production when PROVIDER_ENCRYPTION_KEY is unset, so this
        # fallback can never protect real secrets.
        master = settings.app_secret_key
    return _derive_key(master)


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a plaintext credential; returns a base64 ciphertext blob."""
    if not plaintext:
        return ""
    nonce = os.urandom(_NONCE_LENGTH)
    ciphertext = AESGCM(_encryption_key()).encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")


def decrypt_secret(blob: str | None) -> str:
    """Decrypt a stored credential blob, or ``""`` when absent/corrupt.

    Fails closed: a corrupt blob decrypts to an empty string (treated as
    "no credential") rather than raising and leaking raw material.
    """
    if not blob:
        return ""
    try:
        raw = base64.urlsafe_b64decode(blob.encode("ascii"))
        nonce, payload = raw[:_NONCE_LENGTH], raw[_NONCE_LENGTH:]
        plaintext = AESGCM(_encryption_key()).decrypt(nonce, payload, None)
    except Exception:  # noqa: BLE001 - decrypt failures are reported generically
        logger.warning("failed to decrypt provider credential", exc_info=True)
        return ""
    return plaintext.decode("utf-8")


def mask_credential(secret: str) -> str:
    """Mask a secret for display: bullets followed by the last 4 characters.

    Example: ``"sk-proj-x7A2F"`` becomes ``"••••••••••••••7A2F"``. Short or
    empty values collapse to a fixed bullet mask so no length information leaks.
    """
    if not secret or len(secret) < 8:
        return _MASK_BULLETS if secret else ""
    return _MASK_BULLETS + secret[-4:]
