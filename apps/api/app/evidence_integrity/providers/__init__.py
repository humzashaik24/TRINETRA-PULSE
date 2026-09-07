"""Blockchain evidence-integrity provider (Phase 21).

Provider-neutral abstraction between Trinetra Pulse and a blockchain anchor
registry. Trinetra Pulse is NOT a blockchain application: the provider stores
ONLY a compact, deterministic anchor digest (SHA-256 of cryptographic/reference
identifiers). Raw evidence, PII, and storage credentials never leave the
application.

The interface is intentionally minimal so the application is never tied to one
provider:
  - ``anchor(digest)``      submit a digest for on-chain anchoring
  - ``verify(digest)``      confirm a previously anchored digest
  - ``get_anchor(digest)``  retrieve the on-chain anchor record for a digest
  - ``health()``            provider/network status

Every provider exposes ``label`` / ``is_mock`` so the UI (and this report) can
always distinguish a real transaction from a deterministic mock.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Protocol


class ProviderError(Exception):
    """Raised when a provider cannot complete an operation (e.g. unreachable)."""


@dataclass(frozen=True)
class AnchorReceipt:
    """Structured result of a successful anchor/verify/get_anchor operation.

    ``status`` values: "confirmed" (final), "pending" (submitted), "failed".
    ``confirmed_at`` is the on-chain block timestamp where available; mock and
    unavailable providers set it to ``None`` rather than guessing.
    """

    network: str
    transaction_id: str | None
    block_number: int | None
    anchor_digest: str
    status: str = "confirmed"
    is_mock: bool = False
    confirmed_at: datetime | None = None
    details: dict = field(default_factory=dict)


@dataclass(frozen=True)
class ProviderHealth:
    provider: str
    network: str
    healthy: bool
    is_mock: bool
    detail: str


class BlockchainAnchorProvider(Protocol):
    """Provider-neutral blockchain anchor interface."""

    provider: str
    network: str
    is_mock: bool

    def anchor(self, digest: str) -> AnchorReceipt: ...

    def verify(self, digest: str) -> AnchorReceipt: ...

    def get_anchor(self, digest: str) -> AnchorReceipt: ...

    def health(self) -> ProviderHealth: ...


def anchor_timestamp() -> datetime:
    """Deterministic timestamp used by the MOCK provider.

    Mock receipts must not silently re-anchor "now" and look like a real
    transaction timing; a fixed reference timestamp keeps local anchors
    reproducible while the UI clearly labels them MOCK.
    """
    return datetime(2026, 9, 6, 0, 0, 0, tzinfo=UTC)


def resolve_provider(provider_name: str) -> BlockchainAnchorProvider:
    """Build a provider by name ("mock" default, "web3" real testnet).

    Lazy imports keep ordinary evidence reads free of blockchain dependencies.
    """
    name = (provider_name or "mock").strip().lower()
    if name == "mock":
        from app.evidence_integrity.providers.mock import MockBlockchainAnchorProvider

        return MockBlockchainAnchorProvider()
    if name in ("web3", "evm"):
        from app.evidence_integrity.providers.web3 import Web3BlockchainAnchorProvider

        return Web3BlockchainAnchorProvider()
    raise ProviderError(f"Unknown blockchain provider: {provider_name}")
