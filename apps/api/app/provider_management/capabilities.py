"""Provider type/capability model and explicit compatibility matrix (Phase 23).

Providers are configured per capability. Not every provider family supports
every capability, so the matrix below is the single source of truth for API
validation, the registry's resolution rules, and the admin UI's picklists.
"""

from __future__ import annotations

from app.models.provider import ProviderCapability, ProviderType

# Explicit provider -- capability compatibility matrix.
#
#   openai      --  a single API key covers chat, vision and audio transcription
#   gemini      --  multi-modal by design (vision + video + audio)
#   openrouter  --  unified gateway for chat / vision models
#   mock        --  deterministic local stand-in for EVERY capability
CAPABILITY_SUPPORT: dict[ProviderType, frozenset[ProviderCapability]] = {
    ProviderType.OPENAI: frozenset(
        {
            ProviderCapability.INVESTIGATION_AI,
            ProviderCapability.VISION,
            ProviderCapability.TRANSCRIPTION,
        }
    ),
    ProviderType.GEMINI: frozenset(
        {
            ProviderCapability.INVESTIGATION_AI,
            ProviderCapability.VISION,
            ProviderCapability.VIDEO,
            ProviderCapability.TRANSCRIPTION,
        }
    ),
    ProviderType.OPENROUTER: frozenset(
        {
            ProviderCapability.INVESTIGATION_AI,
            ProviderCapability.VISION,
        }
    ),
    ProviderType.MOCK: frozenset(
        {
            ProviderCapability.INVESTIGATION_AI,
            ProviderCapability.VISION,
            ProviderCapability.VIDEO,
            ProviderCapability.TRANSCRIPTION,
        }
    ),
    # LOCAL (Phase 25) stands for on-device inference and does not back any
    # server-configured capability; the empty set prevents ``supports()`` from
    # raising a KeyError while keeping LOCAL out of the admin picklists.
    ProviderType.LOCAL: frozenset(),
}

ALL_CAPABILITIES: tuple[ProviderCapability, ...] = tuple(ProviderCapability)
ALL_PROVIDER_TYPES: tuple[ProviderType, ...] = tuple(ProviderType)


def supports(provider_type: ProviderType, capability: ProviderCapability) -> bool:
    return capability in CAPABILITY_SUPPORT[provider_type]


def capabilities_for(provider_type: ProviderType) -> list[ProviderCapability]:
    """Capabilities a provider type can back, in enum order."""
    return [c for c in ALL_CAPABILITIES if supports(provider_type, c)]
