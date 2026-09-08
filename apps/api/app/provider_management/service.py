"""Admin service operations for AI/media provider configuration (Phase 23).

All mutation rules live here so the router stays thin:

- explicit provider/capability compatibility (see ``capabilities``)
- at most one default per capability; a disabled provider can never be default
- credential lifecycle: encrypt on create, replace/keep/clear on update,
  never echo the plaintext, mask for reads
- every mutation/test records the matching audit event (secrets excluded)
"""

from __future__ import annotations

from uuid import UUID

from fastapi import status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import AppError, ConflictError, NotFoundError
from app.core.secret_crypto import decrypt_secret, encrypt_secret, mask_credential
from app.models import AIConfigProvider, AuthAuditAction
from app.models.provider import ProviderCapability, ProviderType
from app.provider_management.capabilities import supports
from app.provider_management.connections import test_connection
from app.provider_management.registry import binding_from_row
from app.services.security import record_audit_event


class IncompatibleProviderError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "incompatible_provider"
    default_message = "Provider type does not support the requested capability."


class DisabledDefaultError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "disabled_default_provider"
    default_message = "A disabled provider cannot be the default for its capability."


def provider_digest(provider: AIConfigProvider) -> dict:
    """Safe serializable view of a provider row: masked credential only.

    The plaintext credential is decrypted server-side solely to derive the
    masked digest; it never appears in the returned dict.
    """
    secret = decrypt_secret(provider.encrypted_api_key)
    return {
        "id": provider.id,
        "provider_name": provider.provider_name,
        "provider_type": provider.provider_type,
        "capability": provider.capability,
        "model": provider.model,
        "base_url": provider.base_url,
        "enabled": provider.enabled,
        "is_default": provider.is_default,
        "configuration": provider.configuration,
        "has_credential": bool(secret),
        "credential_masked": mask_credential(secret) if secret else "",
        "created_at": provider.created_at,
        "updated_at": provider.updated_at,
        "created_by": provider.created_by,
        "updated_by": provider.updated_by,
    }


async def get_provider_by_id(
    session: AsyncSession, provider_id: UUID
) -> AIConfigProvider:
    provider = await session.get(AIConfigProvider, provider_id)
    if provider is None:
        raise NotFoundError("Provider", str(provider_id))
    return provider


async def list_providers(session: AsyncSession) -> list[AIConfigProvider]:
    stmt = select(AIConfigProvider).order_by(
        AIConfigProvider.capability.asc(),
        AIConfigProvider.created_at.asc(),
    )
    return list((await session.execute(stmt)).scalars())


def _audit_details(provider: AIConfigProvider, **extra: object) -> dict:
    details: dict = {
        "provider_name": provider.provider_name,
        "provider_type": provider.provider_type.value,
        "capability": provider.capability.value,
        "is_default": provider.is_default,
    }
    details.update(extra)
    return details


async def _note(
    session: AsyncSession,
    *,
    action: AuthAuditAction,
    actor: object,
    details: dict,
) -> None:
    await record_audit_event(
        session,
        action=action,
        email=getattr(actor, "email", ""),
        user_id=UUID(getattr(actor, "id", "")) if getattr(actor, "id", None) else None,
        details=details,
        commit=False,
    )


def _actor_id(actor: object) -> UUID | None:
    actor_id = getattr(actor, "id", None)
    if not actor_id:
        return None
    try:
        return UUID(str(actor_id))
    except ValueError:
        return None


async def _clear_default_for_capability(
    session: AsyncSession, capability: ProviderCapability
) -> str | None:
    """Return the previous default's name after clearing defaults for a capability."""
    rows = list(
        (
            await session.execute(
                select(AIConfigProvider).where(
                    AIConfigProvider.capability == capability,
                    AIConfigProvider.is_default.is_(True),
                )
            )
        ).scalars()
    )
    for previous in rows:
        previous.is_default = False
    return rows[0].provider_name if rows else None


async def create_provider(
    session: AsyncSession,
    *,
    actor: object,
    provider_name: str,
    provider_type: ProviderType,
    capability: ProviderCapability,
    model: str,
    base_url: str | None,
    enabled: bool,
    is_default: bool,
    configuration: dict | None,
    credential: str | None,
) -> AIConfigProvider:
    if not supports(provider_type, capability):
        raise IncompatibleProviderError()
    if is_default and not enabled:
        raise DisabledDefaultError()

    previous_default = None
    if is_default:
        previous_default = await _clear_default_for_capability(session, capability)

    provider = AIConfigProvider(
        provider_name=provider_name.strip(),
        provider_type=provider_type,
        capability=capability,
        model=model.strip(),
        base_url=base_url.strip() if base_url else None,
        enabled=enabled,
        is_default=is_default,
        configuration=configuration,
        encrypted_api_key=encrypt_secret(credential) if credential else None,
        created_by=_actor_id(actor),
        updated_by=_actor_id(actor),
    )
    session.add(provider)
    await _flush_or_conflict(session)

    await _note(
        session,
        action=AuthAuditAction.PROVIDER_CREATED,
        actor=actor,
        details=_audit_details(provider),
    )
    if is_default and previous_default:
        await _note(
            session,
            action=AuthAuditAction.PROVIDER_DEFAULT_CHANGED,
            actor=actor,
            details=_audit_details(
                provider,
                previous_default=previous_default,
            ),
        )
    await session.flush()
    return provider


async def _flush_or_conflict(session: AsyncSession) -> None:
    try:
        await session.flush()
    except IntegrityError as exc:
        raise ConflictError(
            "A provider with this name already exists for the capability.",
            details={"constraint": "capability + provider_name must be unique"},
        ) from exc


async def update_provider(
    session: AsyncSession,
    *,
    provider: AIConfigProvider,
    actor: object,
    changes: dict,
) -> AIConfigProvider:
    """Apply an explicit change set (``exclude_unset`` dump) to a provider row."""
    if not changes:
        return provider

    if changes.get("clear_credential"):
        provider.encrypted_api_key = None
    elif changes.get("credential"):
        provider.encrypted_api_key = encrypt_secret(changes["credential"])

    final_type = changes.get("provider_type", provider.provider_type)
    final_capability = changes.get("capability", provider.capability)
    if not supports(final_type, final_capability):
        raise IncompatibleProviderError()

    prior_enabled = provider.enabled
    prior_default = provider.is_default
    prior_capability = provider.capability

    final_enabled = changes.get("enabled", prior_enabled)
    # An EXPLICIT request to make this the default while also disabling it is
    # contradictory and rejected. Merely disabling an existing default is fine:
    # the flag is auto-cleared below so "disabled providers are never default".
    if changes.get("is_default") is True and not final_enabled:
        raise DisabledDefaultError()

    # A default cannot survive a disable or a capability move (the partial
    # unique index would otherwise reject the row). Clearing is automatic;
    # making a NEW default requires an explicit is_default=true.
    capability_changed = changes.get("capability", prior_capability) != prior_capability
    force_clear = (final_enabled is False and prior_default) or (
        capability_changed and "is_default" not in changes and prior_default
    )
    default_lost = not force_clear and prior_default and not changes.get(
        "is_default", prior_default
    )
    default_gained = (
        changes.get("is_default", prior_default)
        and not prior_default
        and not force_clear
    )
    previous_default = None
    if default_gained:
        previous_default = await _clear_default_for_capability(session, final_capability)

    if "provider_name" in changes:
        provider.provider_name = changes["provider_name"].strip()
    if "provider_type" in changes:
        provider.provider_type = changes["provider_type"]
    if "capability" in changes:
        provider.capability = changes["capability"]
    if "model" in changes:
        provider.model = changes["model"].strip()
    if "base_url" in changes:
        provider.base_url = changes["base_url"].strip() if changes["base_url"] else None
    if "enabled" in changes:
        provider.enabled = changes["enabled"]
    if "is_default" in changes:
        provider.is_default = changes["is_default"]
    if "configuration" in changes:
        provider.configuration = changes["configuration"]
    if force_clear:
        provider.is_default = False
    provider.updated_by = _actor_id(actor)

    await _flush_or_conflict(session)
    # onupdate=func.now() expires updated_at after the flush; reload the row so
    # the caller (and provider_digest) can read it without a lazy async load.
    await session.refresh(provider)

    details = _audit_details(provider)
    await _note(
        session,
        action=AuthAuditAction.PROVIDER_UPDATED,
        actor=actor,
        details=details,
    )
    if default_gained:
        await _note(
            session,
            action=AuthAuditAction.PROVIDER_DEFAULT_CHANGED,
            actor=actor,
            details=_audit_details(
                provider,
                previous_default=previous_default if previous_default else None,
            ),
        )
    if default_lost:
        await _note(
            session,
            action=AuthAuditAction.PROVIDER_DEFAULT_CHANGED,
            actor=actor,
            details=_audit_details(provider, default_cleared="explicit"),
        )
    if force_clear and final_enabled is False:
        await _note(
            session,
            action=AuthAuditAction.PROVIDER_DISABLED,
            actor=actor,
            details=_audit_details(provider, default_cleared=True),
        )
    elif "enabled" in changes and changes["enabled"] is not prior_enabled:
        action = (
            AuthAuditAction.PROVIDER_ENABLED
            if changes["enabled"]
            else AuthAuditAction.PROVIDER_DISABLED
        )
        await _note(session, action=action, actor=actor, details=details)
    await session.flush()
    return provider


async def delete_provider(
    session: AsyncSession,
    *,
    provider: AIConfigProvider,
    actor: object,
) -> None:
    details = _audit_details(provider)
    await session.delete(provider)
    await _note(
        session,
        action=AuthAuditAction.PROVIDER_DELETED,
        actor=actor,
        details=details,
    )
    await session.flush()


async def test_provider(
    session: AsyncSession,
    *,
    provider: AIConfigProvider,
    actor: object,
) -> dict:
    """Run a connection test and record the outcome. Never leaks secrets."""
    binding = binding_from_row(provider)
    outcome = await test_connection(binding)
    await _note(
        session,
        action=AuthAuditAction.PROVIDER_CONNECTION_TESTED,
        actor=actor,
        details={
            **_audit_details(provider),
            "status": outcome,
            "mode": "MOCK" if binding.is_mock else "EXTERNAL",
        },
    )
    await session.flush()
    return {
        "status": outcome,
        "provider": provider.provider_name,
        "capability": provider.capability,
        "mode": "MOCK" if binding.is_mock else "EXTERNAL",
    }
