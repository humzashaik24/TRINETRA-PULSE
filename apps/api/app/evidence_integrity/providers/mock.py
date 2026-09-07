"""Deterministic MOCK blockchain anchor provider.

The mock provider is for local development and tests ONLY. It returns the same
structured shape a real provider returns (network, transaction id, block,
digest, timestamp, status) but every receipt is explicitly flagged ``is_mock``
and the network is ``"trinetra-mock-chain"``. Mock transactions are never
presented as real blockchain transactions.
"""

from __future__ import annotations

import hashlib

from app.evidence_integrity.providers import (
    AnchorReceipt,
    ProviderError,
    ProviderHealth,
    anchor_timestamp,
)

MOCK_NETWORK = "trinetra-mock-chain"


class MockBlockchainAnchorProvider:
    """Deterministic on-device anchor registry keyed by digest.

    Determinism: the same digest always yields the same transaction id, block
    number, timestamp and status across processes. No randomness, no network,
    no latency. ``is_mock`` is always True.

    The registry is class-wide so anchors persist across API requests within an
    application process (mirroring a real chain's finality): an anchor produced
    by one request is re-readable/verifiable by a later request.
    """

    provider = "mock"
    network = MOCK_NETWORK
    is_mock = True

    # Process-wide deterministic registry: digest -> receipt.
    _store: dict[str, AnchorReceipt] = {}

    @staticmethod
    def _tx_id(digest: str) -> str:
        seed = hashlib.sha256(("mock:" + digest).encode("utf-8")).hexdigest()
        return "0x" + seed[:64]

    @staticmethod
    def _block_number(digest: str) -> int:
        seed = int(hashlib.sha256(("mock:" + digest).encode("utf-8")).hexdigest()[:8], 16)
        return 3_000_000 + (seed % 10_000_000)  # deterministic, no network claim

    def _receipt(self, digest: str, status: str = "confirmed") -> AnchorReceipt:
        return AnchorReceipt(
            network=self.network,
            transaction_id=self._tx_id(digest),
            block_number=self._block_number(digest),
            anchor_digest=digest,
            status=status,
            is_mock=True,
            confirmed_at=anchor_timestamp(),
            details={"provider": "mock", "resource": "deterministic-local-anchor-registry"},
        )

    def anchor(self, digest: str) -> AnchorReceipt:
        if not digest or len(digest) != 64:
            raise ProviderError("Anchor digest must be a 64-character SHA-256 hex digest")
        receipt = self._receipt(digest)
        type(self)._store[digest] = receipt
        return receipt

    def verify(self, digest: str) -> AnchorReceipt:
        if digest not in type(self)._store:
            raise ProviderError("Digest has no anchor in the mock registry")
        return type(self)._store[digest]

    def get_anchor(self, digest: str) -> AnchorReceipt:
        if digest not in type(self)._store:
            return AnchorReceipt(
                network=self.network,
                transaction_id=None,
                block_number=None,
                anchor_digest=digest,
                status="not_anchored",
                is_mock=True,
                confirmed_at=None,
                details={"provider": "mock", "found": False},
            )
        return type(self)._store[digest]

    def health(self) -> ProviderHealth:
        return ProviderHealth(
            provider=self.provider,
            network=self.network,
            healthy=True,
            is_mock=True,
            detail="deterministic local mock provider — not a real blockchain",
        )
