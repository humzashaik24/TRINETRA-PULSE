"""Real EVM (web3.py) blockchain anchor provider — testnet capable.

Anchors the compact digest through a minimal immutable anchor registry contract
(``contracts/AnchorRegistry.sol``) using the standard ``web3`` library. This
module is imported LAZILY from the provider registry so ordinary evidence reads
never depend on web3 being installed.

Configuration is server-side only (see ``Settings``):

    BLOCKCHAIN_PROVIDER=mock|web3
    BLOCKCHAIN_NETWORK=
    BLOCKCHAIN_RPC_URL=
    BLOCKCHAIN_PRIVATE_KEY=
    BLOCKCHAIN_CONTRACT_ADDRESS=
    BLOCKCHAIN_CHAIN_ID=

Security rules enforced here and documented in Phase 21:
  - Credentials come from the environment, never from ``NEXT_PUBLIC_*`` and
    never from client-supplied values.
  - The ONLY on-chain payload is the 64-character anchor digest. Raw evidence,
    FIR/CDR content, PII, and storage credentials never reach the provider.
  - When web3 is missing or the RPC is unreachable, the provider raises
    ``ProviderError`` so the service reports ``UNAVAILABLE`` — it never invents
    a transaction id or block number.
"""

from __future__ import annotations

from app.evidence_integrity.providers import (
    AnchorReceipt,
    ProviderError,
    ProviderHealth,
)


class Web3BlockchainAnchorProvider:
    """Web3-backed provider backed by an AnchorRegistry contract."""

    provider = "web3"
    is_mock = False

    def __init__(self) -> None:
        # Lazy import: web3 is an optional runtime dependency for the real
        # testnet path only.
        try:
            from web3 import Web3  # noqa: PLC0415
        except Exception as exc:  # pragma: no cover - environment dependent
            raise ProviderError(
                "web3 is not installed; install the `blockchain` extra to use "
                "the real testnet provider"
            ) from exc

        from app.core.config import get_settings  # noqa: PLC0415

        settings = get_settings()
        rpc_url = settings.blockchain_rpc_url
        private_key = settings.blockchain_private_key
        contract_address = settings.blockchain_contract_address

        if not rpc_url:
            raise ProviderError("BLOCKCHAIN_RPC_URL is not configured (server-side env)")
        if not private_key:
            raise ProviderError("BLOCKCHAIN_PRIVATE_KEY is not configured (server-side env)")
        if not contract_address:
            raise ProviderError("BLOCKCHAIN_CONTRACT_ADDRESS is not configured (server-side env)")

        self.network = settings.blockchain_network or "evm-testnet"
        self._web3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 15}))
        if not self._web3.is_connected():
            raise ProviderError("Blockchain RPC is unreachable")
        try:
            self._acct = self._web3.eth.account.from_key(private_key)
        except Exception as exc:  # pragma: no cover - invalid key formatting
            raise ProviderError("BLOCKCHAIN_PRIVATE_KEY could not be decoded") from exc

        self._contract = self._web3.eth.contract(
            address=self._web3.to_checksum_address(contract_address),
            abi=ANCHOR_ABI,
        )
        self._chain_id = getattr(settings, "blockchain_chain_id", None) or self._web3.eth.chain_id

    # ------------------------------------------------------------------
    # Provider surface
    # ------------------------------------------------------------------
    @staticmethod
    def _checksum_digest(digest: str) -> str:
        if not digest or len(digest) != 64:
            raise ProviderError("Anchor digest must be a 64-character SHA-256 hex digest")
        return "0x" + digest

    def anchor(self, digest: str) -> AnchorReceipt:
        bytes32digest = self._checksum_digest(digest)
        base = self._web3.eth.get_transaction_count(self._acct.address, "pending")
        tx = self._contract.functions.anchor(bytes32digest).build_transaction(
            {"from": self._acct.address, "nonce": base, "chainId": self._chain_id}
        )
        signed = self._acct.sign_transaction(tx)
        raw = signed.raw_transaction
        tx_hash = self._web3.eth.send_raw_transaction(raw)
        tx_id = self._web3.to_hex(tx_hash)
        receipt = self._web3.eth.wait_for_transaction_receipt(tx_hash, timeout=90)
        block = int(receipt["blockNumber"])
        return AnchorReceipt(
            network=self.network,
            transaction_id=tx_id,
            block_number=block,
            anchor_digest=digest,
            status="confirmed" if receipt["status"] == 1 else "failed",
            is_mock=False,
            confirmed_at=None,
            details={"chain_id": self._chain_id, "gas_used": int(receipt["gasUsed"])},
        )

    def verify(self, digest: str) -> AnchorReceipt:
        get_anchor = self.get_anchor(digest)
        if get_anchor.status != "confirmed":
            raise ProviderError("Digest is not anchored on the configured network")
        return get_anchor

    def get_anchor(self, digest: str) -> AnchorReceipt:
        bytes32digest = self._checksum_digest(digest)
        record = self._contract.functions.getAnchor(bytes32digest).call()
        exists = bool(record[0])
        if not exists:
            return AnchorReceipt(
                network=self.network,
                transaction_id=None,
                block_number=None,
                anchor_digest=digest,
                status="not_anchored",
                is_mock=False,
                confirmed_at=None,
                details={"chain_id": self._chain_id, "found": False},
            )
        return AnchorReceipt(
            network=self.network,
            transaction_id=None,
            block_number=int(record[1]),
            anchor_digest=digest,
            status="confirmed",
            is_mock=False,
            confirmed_at=None,
            details={"chain_id": self._chain_id, "found": True},
        )

    def health(self) -> ProviderHealth:
        try:
            connected = bool(self._web3.is_connected())
            if not connected:
                raise ProviderError("not connected")
            chain = self._web3.eth.chain_id
        except Exception:  # noqa: BLE001 - any connectivity issue = unhealthy
            return ProviderHealth(
                provider=self.provider,
                network=self.network,
                healthy=False,
                is_mock=False,
                detail="blockchain RPC unreachable",
            )
        return ProviderHealth(
            provider=self.provider,
            network=self.network,
            healthy=True,
            is_mock=False,
            detail=f"connected (chain id {chain})",
        )


# Minimal AnchorRegistry ABI (see contracts/AnchorRegistry.sol).
ANCHOR_ABI = [
    {
        "type": "function",
        "name": "anchor",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "digest", "type": "bytes32"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "getAnchor",
        "stateMutability": "view",
        "inputs": [{"name": "digest", "type": "bytes32"}],
        "outputs": [
            {"name": "exists", "type": "bool"},
            {"name": "blockNumber", "type": "uint256"},
            {"name": "timestamp", "type": "uint256"},
        ],
    },
    {
        "type": "event",
        "name": "EvidenceAnchored",
        "inputs": [
            {"name": "digest", "type": "bytes32", "indexed": True},
            {"name": "timestamp", "type": "uint256", "indexed": False},
            {"name": "blockNumber", "type": "uint256", "indexed": False},
        ],
    },
]
