"""Administrative AI/media provider management (Phase 23).

Mounted at ``/api/v2/admin/providers``:

- ``GET    /api/v2/admin/providers``            — ADMIN only (masked reads).
- ``POST   /api/v2/admin/providers``            — ADMIN only.
- ``PATCH  /api/v2/admin/providers/{id}``       — ADMIN only.
- ``DELETE /api/v2/admin/providers/{id}``       — ADMIN only.
- ``POST   /api/v2/admin/providers/{id}/test``  — ADMIN only.

AUDITOR / SUPERVISOR / INVESTIGATOR are denied at the dependency level
(403 ``forbidden``), matching "auditors may read the audit trail but must
never modify provider configuration". Credentials are write-only: read
responses carry ``has_credential`` + a masked digest, never plaintext.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import AdminDep, SessionDep
from app.provider_management import service
from app.schemas.real.provider import (
    ProviderCreate,
    ProviderRead,
    ProviderTestResult,
    ProviderUpdate,
)

router = APIRouter(prefix="/admin/providers", tags=["admin-providers"])


@router.get("", response_model=list[ProviderRead])
async def list_providers(
    session: SessionDep,
    _actor: AdminDep,
) -> list[ProviderRead]:
    providers = await service.list_providers(session)
    return [ProviderRead(**service.provider_digest(p)) for p in providers]


@router.post("", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
async def create_provider(
    payload: ProviderCreate,
    session: SessionDep,
    actor: AdminDep,
) -> ProviderRead:
    provider = await service.create_provider(
        session,
        actor=actor,
        provider_name=payload.provider_name,
        provider_type=payload.provider_type,
        capability=payload.capability,
        model=payload.model,
        base_url=payload.base_url,
        enabled=payload.enabled,
        is_default=payload.is_default,
        configuration=payload.configuration,
        credential=payload.credential,
    )
    return ProviderRead(**service.provider_digest(provider))


@router.patch("/{provider_id}", response_model=ProviderRead)
async def update_provider(
    provider_id: UUID,
    payload: ProviderUpdate,
    session: SessionDep,
    actor: AdminDep,
) -> ProviderRead:
    provider = await service.get_provider_by_id(session, provider_id)
    changes = payload.model_dump(exclude_unset=True)
    updated = await service.update_provider(
        session, provider=provider, actor=actor, changes=changes
    )
    return ProviderRead(**service.provider_digest(updated))


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: UUID,
    session: SessionDep,
    actor: AdminDep,
) -> None:
    provider = await service.get_provider_by_id(session, provider_id)
    await service.delete_provider(session, provider=provider, actor=actor)


@router.post("/{provider_id}/test", response_model=ProviderTestResult)
async def test_provider(
    provider_id: UUID,
    session: SessionDep,
    actor: AdminDep,
) -> ProviderTestResult:
    provider = await service.get_provider_by_id(session, provider_id)
    result = await service.test_provider(session, provider=provider, actor=actor)
    return ProviderTestResult(**result)
