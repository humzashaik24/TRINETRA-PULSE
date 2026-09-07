"""Evidence integrity service (real application layer, Phase 21).

Guarantees (mirroring the relationship-intelligence/reporting philosophy):

  - Investigation/evidence isolation: every operation is scoped to one evidence
    record; integrity is always recomputed from the persisted record, never from
    cached values.
  - Determinism: same evidence + same chain version => same custody chain and
    same anchor digest. Anchoring is idempotent (re-anchoring the same state
    returns the existing anchor).
  - No duplication: the custody chain is DERIVED (see ``evidence_integrity.ledger``)
    — the only persisted ledger of record is the blockchain anchor row.
  - Integrity, not truth: verification reports the integrity state of a
    cryptographic digest. It never asserts evidence content is truthful.
  - Honest availability: if the provider cannot be reached the state is
    ``UNAVAILABLE`` — never silently "verified".

Only the anchor digest (a SHA-256 over reference identifiers) ever leaves the
service. Raw evidence, FIR/CDR content, PII and storage credentials never cross
the provider boundary.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.api.errors import ConflictError, EvidenceNotFoundError, NotAuthorizedError
from app.core.config import get_settings
from app.evidence_integrity import anchor_digest
from app.evidence_integrity.ledger import (
    append_anchor_event,
    chain_head_hash,
    derive_upload_chain,
    integrity_version,
)
from app.evidence_integrity.providers import (
    ProviderError,
    ProviderHealth,
    resolve_provider,
)
from app.models import EvidenceBlockchainAnchor, InvestigationEvidence
from app.repositories.investigation import EvidenceRepository

HEX_64 = frozenset("0123456789abcdef")

VERIFIED = "VERIFIED"
MISMATCH = "MISMATCH"
NOT_ANCHORED = "NOT_ANCHORED"
PENDING = "PENDING"
UNAVAILABLE = "UNAVAILABLE"


class EvidenceIntegrityService:
    def __init__(self, session) -> None:
        self.session = session
        self.evidence = EvidenceRepository(session)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    @staticmethod
    def _normalise_checksum(value) -> str | None:
        if not value:
            return None
        checksum = str(value).strip().lower()
        if checksum.startswith("sha256:"):
            checksum = checksum.split(":", 1)[1].strip().lower()
        if len(checksum) == 64 and all(c in HEX_64 for c in checksum):
            return checksum
        return None

    async def _require_evidence(self, evidence_id: UUID) -> InvestigationEvidence:
        evidence = await self.evidence.get(evidence_id)
        if not evidence:
            raise EvidenceNotFoundError(str(evidence_id))
        return evidence

    def _assert_actor_can_anchor(self, actor) -> None:
        """Read-only auditors may view/verify integrity but never anchor."""
        role = (getattr(actor, "role", None) or "inspector").lower()
        if role == "auditor":
            raise NotAuthorizedError("Auditors cannot anchor evidence to a blockchain")

    @staticmethod
    def _checksum_from_record(evidence: InvestigationEvidence) -> str | None:
        """Checksum resolvable without I/O (persisted checksum or provenance hash)."""
        return EvidenceIntegrityService._normalise_checksum(evidence.checksum) or (
            EvidenceIntegrityService._normalise_checksum(
                (evidence.provenance or {}).get("hash")
                if isinstance(evidence.provenance, dict)
                else None
            )
        )

    async def _resolve_checksum(self, evidence: InvestigationEvidence) -> str:
        """Full checksum resolution (payload read only at mutation time)."""
        from_record = self._checksum_from_record(evidence)
        if from_record:
            return from_record
        # Payload fallback: hashing evidence payload bytes at anchor time is the
        # strongest available check. Missing blob => cannot anchor honestly.
        storage_ref = (evidence.storage_ref or "").strip()
        if not storage_ref:
            raise ConflictError(
                "Evidence payload checksum is unavailable; nothing to anchor",
                {"evidence_id": str(evidence.id)},
            )
        try:
            from app.storage.evidence_storage import EvidenceStorage

            store = EvidenceStorage(get_settings().evidence_storage_dir)
            blob = store.load(evidence.id)
        except Exception as exc:  # pragma: no cover - env-dependent
            raise ConflictError(
                "Evidence payload could not be read; cannot compute checksum",
                {"evidence_id": str(evidence.id), "detail": str(exc)},
            ) from exc
        import hashlib

        return hashlib.sha256(blob.data).hexdigest()

    # ------------------------------------------------------------------
    # Deterministic chain + digest
    # ------------------------------------------------------------------
    def _chain_for(
        self,
        evidence: InvestigationEvidence,
        checksum: str,
        anchor: EvidenceBlockchainAnchor | None = None,
    ) -> list[dict]:
        provenance = evidence.provenance or {}
        chain = derive_upload_chain(
            evidence_id=evidence.id,
            investigation_id=evidence.investigation_id,
            evidence_checksum=checksum,
            created_at=evidence.created_at,
            source=evidence.source,
            source_type=None,
            provenance=provenance,
            actor=self._upload_actor(evidence),
        )
        if anchor is not None:
            metadata = {
                "action": "blockchain-anchored",
                "network": anchor.network,
                "provider": anchor.provider,
                "is_mock": bool(anchor.is_mock),
                "transaction_id": anchor.transaction_id,
                "block_number": anchor.block_number,
                "contract_address": anchor.contract_address,
                "anchor_digest": anchor.anchor_digest,
            }
            chain = append_anchor_event(
                chain=chain,
                anchor_event_timestamp=anchor.anchored_at or self._now(),
                evidence_checksum=checksum,
                actor=(anchor.metadata_ or {}).get("actor") or "system",
                metadata=metadata,
            )
        return chain

    @staticmethod
    def _upload_actor(evidence: InvestigationEvidence) -> str:
        provenance = evidence.provenance or {}
        meta = evidence.metadata_ or {}
        uploaded_by = None
        if isinstance(provenance, dict):
            uploaded_by = provenance.get("uploaded_by")
        if not uploaded_by and isinstance(meta, dict):
            uploaded_by = meta.get("uploaded_by")
        return str(uploaded_by or "system")

    @staticmethod
    def _digest_for(evidence: InvestigationEvidence, checksum: str, chain: list[dict]) -> str:
        head_sequence = chain[-1]["sequence"]
        return anchor_digest(
            investigation_id=str(evidence.investigation_id),
            evidence_id=str(evidence.id),
            evidence_checksum=checksum,
            custody_chain_hash=chain_head_hash(chain),
            sequence=head_sequence,
        )

    async def _latest_anchor(self, evidence_id: UUID) -> EvidenceBlockchainAnchor | None:
        result = await self.session.execute(
            select(EvidenceBlockchainAnchor)
            .where(EvidenceBlockchainAnchor.evidence_id == evidence_id)
            .order_by(EvidenceBlockchainAnchor.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    def _anchor_dict(anchor: EvidenceBlockchainAnchor) -> dict:
        return {
            "anchor_id": anchor.id,
            "evidence_id": anchor.evidence_id,
            "investigation_id": anchor.investigation_id,
            "custody_chain_hash": anchor.custody_chain_hash,
            "anchor_digest": anchor.anchor_digest,
            "network": anchor.network,
            "provider": anchor.provider,
            "is_mock": bool(anchor.is_mock),
            "status": anchor.status,
            "transaction_id": anchor.transaction_id,
            "block_number": anchor.block_number,
            "contract_address": anchor.contract_address,
            "anchored_at": anchor.anchored_at,
            "verified_at": anchor.verified_at,
            "reason": anchor.reason,
            "metadata": anchor.metadata_ or {},
        }

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------
    async def integrity_for(self, evidence_id: UUID) -> dict:
        evidence = await self._require_evidence(evidence_id)
        checksum = self._checksum_from_record(evidence)
        anchor = await self._latest_anchor(evidence_id)

        underlying_checksum = checksum or await self._soft_resolve(evidence)
        if not underlying_checksum:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "evidence_checksum": None,
                "custody_chain_hash": None,
                "associated_anchor_digest": anchor.anchor_digest if anchor else None,
                "status": "CHECKSUM_UNAVAILABLE",
                "status_detail": "Evidence checksum unknown; cannot derive the custody chain.",
                "algorithm_version": integrity_version(),
                "custody_events": [],
                "generated_at": self._now(),
            }

        upload_only = self._chain_for(evidence, underlying_checksum)
        expected_digest = self._digest_for(evidence, underlying_checksum, upload_only)
        display_chain = self._chain_for(evidence, underlying_checksum, anchor=anchor)

        if anchor is not None and anchor.anchor_digest == expected_digest:
            status = "ANCHORED"
            detail = f"Integrity state anchored on {anchor.network}"
        else:
            status = "NOT_ANCHORED"
            detail = (
                "Custody chain derived; no blockchain anchor exists for this state."
                if anchor is None
                else "Custody chain derived; current state differs from the anchored state."
            )

        return {
            "evidence_id": evidence.id,
            "investigation_id": evidence.investigation_id,
            "evidence_checksum": underlying_checksum,
            "custody_chain_hash": chain_head_hash(display_chain),
            "associated_anchor_digest": anchor.anchor_digest if anchor else None,
            "status": status,
            "status_detail": detail,
            "algorithm_version": integrity_version(),
            "custody_events": display_chain,
            "generated_at": self._now(),
        }

    async def _soft_resolve(self, evidence: InvestigationEvidence) -> str | None:
        """Best-effort non-persisting checksum for thin reads (record only)."""
        try:
            return await self._resolve_checksum(evidence)
        except ConflictError:
            return None

    async def provider_view(self) -> ProviderHealth:
        provider = resolve_provider(get_settings().blockchain_provider)
        try:
            return provider.health()
        except ProviderError as exc:  # pragma: no cover - env-dependent
            return ProviderHealth(
                provider=getattr(provider, "provider", "unknown"),
                network=getattr(provider, "network", "unknown"),
                healthy=False,
                is_mock=getattr(provider, "is_mock", False),
                detail=str(exc),
            )

    async def blockchain_for(self, evidence_id: UUID) -> dict:
        evidence = await self._require_evidence(evidence_id)
        integrity = await self.integrity_for(evidence_id)
        anchor = await self._latest_anchor(evidence_id)
        provider = await self.provider_view()

        verification_state, message, last_verified_at = self._evaluate_local_state(
            evidence, integrity, anchor
        )
        return {
            "evidence_id": evidence.id,
            "investigation_id": evidence.investigation_id,
            "integrity": integrity,
            "anchor": self._anchor_dict(anchor) if anchor else None,
            "provider": {
                "provider": provider.provider,
                "network": provider.network,
                "healthy": provider.healthy,
                "is_mock": provider.is_mock,
                "detail": provider.detail,
            },
            "verification_state": verification_state,
            "last_verified_at": last_verified_at,
            "message": message,
            "generated_at": self._now(),
        }

    def _evaluate_local_state(
        self,
        evidence: InvestigationEvidence,
        integrity: dict,
        anchor: EvidenceBlockchainAnchor | None,
    ) -> tuple[str, str | None, datetime | None]:
        if integrity["status"] == "CHECKSUM_UNAVAILABLE":
            return UNAVAILABLE, integrity["status_detail"], None
        if anchor is None:
            return (
                NOT_ANCHORED,
                "Evidence is not anchored; its custody chain is derived locally only.",
                None,
            )
        if anchor.status == "PENDING":
            return PENDING, "Anchor transaction is pending on-chain confirmation.", None
        if anchor.status == "UNAVAILABLE":
            return UNAVAILABLE, anchor.reason or "Anchor record marked UNAVAILABLE.", None
        if integrity["status"] == "NOT_ANCHORED":
            return MISMATCH, "Current custody state differs from the anchored state.", None
        return VERIFIED, "Integrity state matches the anchored digest", anchor.verified_at

    # ------------------------------------------------------------------
    # Anchor (mutation, idempotent)
    # ------------------------------------------------------------------
    async def anchor(
        self,
        evidence_id: UUID,
        *,
        actor,
        message: str | None = None,
    ) -> dict:
        self._assert_actor_can_anchor(actor)
        evidence = await self._require_evidence(evidence_id)
        checksum = await self._resolve_checksum(evidence)

        # Persist the resolved checksum so the chain head is anchored state.
        if not evidence.checksum:
            evidence.checksum = checksum
            await self.session.flush()

        chain = self._chain_for(evidence, checksum)
        expected_digest = self._digest_for(evidence, checksum, chain)

        existing = await self._latest_anchor(evidence_id)
        if existing is not None:
            if existing.anchor_digest == expected_digest:
                verify_state = (
                    "VERIFIED"
                    if existing.status == "ANCHORED"
                    else (PENDING if existing.status == "PENDING" else UNAVAILABLE)
                )
                return {
                    "evidence_id": evidence.id,
                    "investigation_id": evidence.investigation_id,
                    "anchor": self._anchor_dict(existing),
                    "verification_state": verify_state,
                    "message": "Already anchored; returning the existing anchor (idempotent).",
                    "anchored": True,
                    "already_anchored": True,
                }
            raise ConflictError(
                "Evidence is already anchored to a different integrity state",
                {
                    "evidence_id": str(evidence.id),
                    "existing_digest": existing.anchor_digest,
                    "expected_digest": expected_digest,
                },
            )

        settings = get_settings()
        provider = resolve_provider(settings.blockchain_provider)
        try:
            receipt = provider.anchor(expected_digest)
        except ProviderError as exc:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "anchor": None,
                "verification_state": UNAVAILABLE,
                "message": f"Blockchain provider unavailable: {exc}",
                "anchored": False,
                "already_anchored": False,
            }

        anchor_row = EvidenceBlockchainAnchor(
            investigation_id=evidence.investigation_id,
            evidence_id=evidence.id,
            custody_chain_hash=chain_head_hash(chain),
            anchor_digest=expected_digest,
            network=receipt.network,
            transaction_id=receipt.transaction_id,
            block_number=receipt.block_number,
            contract_address=(
                settings.blockchain_contract_address or None
            ),
            status=("ANCHORED" if receipt.status == "confirmed" else "PENDING"),
            provider=provider.provider,
            is_mock=provider.is_mock,
            reason=None if receipt.status == "confirmed" else "pending confirmation",
            anchored_at=receipt.confirmed_at or self._now(),
            metadata_={
                "actor": actor.id,
                "message": message,
                "confirmations": settings.blockchain_confirmations,
            },
        )
        self.session.add(anchor_row)
        await self.session.flush()
        await self.session.commit()

        return {
            "evidence_id": evidence.id,
            "investigation_id": evidence.investigation_id,
            "anchor": self._anchor_dict(anchor_row),
            "verification_state": "ANCHORED" if receipt.status == "confirmed" else PENDING,
            "message": (
                "Anchored successfully on the configured provider."
                if receipt.status == "confirmed"
                else "Anchor submitted; awaiting confirmation."
            ),
            "anchored": True,
            "already_anchored": False,
        }

    # ------------------------------------------------------------------
    # Verify (mutation of verification timestamps only)
    # ------------------------------------------------------------------
    async def verify(self, evidence_id: UUID) -> dict:
        evidence = await self._require_evidence(evidence_id)
        checksum = await self._soft_resolve(evidence)
        anchor = await self._latest_anchor(evidence_id)

        if not checksum:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": UNAVAILABLE,
                "detail": "Evidence payload checksum is unavailable; cannot verify.",
                "verified_at": None,
                "anchor": self._anchor_dict(anchor) if anchor else None,
                "message": "Verification unavailable: no checksum for the evidence payload.",
            }
        if anchor is None:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": NOT_ANCHORED,
                "detail": "No anchor exists for this evidence.",
                "verified_at": None,
                "anchor": None,
                "message": "Anchor the evidence before verifying on-chain integrity.",
            }
        if anchor.status != "ANCHORED":
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": (
                    PENDING if anchor.status == "PENDING" else UNAVAILABLE
                ),
                "detail": anchor.reason or f"Anchor status is {anchor.status}.",
                "verified_at": None,
                "anchor": self._anchor_dict(anchor),
                "message": "Verification unavailable: anchor is not in a confirmed state.",
            }

        chain = self._chain_for(evidence, checksum)
        current_digest = self._digest_for(evidence, checksum, chain)

        if current_digest != anchor.anchor_digest:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": MISMATCH,
                "current_custody_chain_hash": chain_head_hash(chain),
                "anchored_custody_chain_hash": anchor.custody_chain_hash,
                "on_chain_digest": anchor.anchor_digest,
                "detail": (
                    "Current custody chain does not match the anchored chain. "
                    "Content likely changed after anchoring."
                ),
                "verified_at": None,
                "anchor": self._anchor_dict(anchor),
                "message": "Integrity mismatch detected.",
            }

        # Local digest matches the anchored digest — confirm on-chain.
        provider = resolve_provider(anchor.provider or get_settings().blockchain_provider)
        try:
            on_chain = provider.get_anchor(anchor.anchor_digest)
            healthy = provider.health().healthy
        except ProviderError as exc:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": UNAVAILABLE,
                "current_custody_chain_hash": chain_head_hash(chain),
                "anchored_custody_chain_hash": anchor.custody_chain_hash,
                "on_chain_digest": anchor.anchor_digest,
                "detail": f"Blockchain provider unavailable: {exc}",
                "verified_at": None,
                "anchor": self._anchor_dict(anchor),
                "message": "Verification unavailable: blockchain provider unreachable.",
            }

        if not healthy:
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": UNAVAILABLE,
                "current_custody_chain_hash": chain_head_hash(chain),
                "anchored_custody_chain_hash": anchor.custody_chain_hash,
                "on_chain_digest": anchor.anchor_digest,
                "detail": "Blockchain provider reports unhealthy.",
                "verified_at": None,
                "anchor": self._anchor_dict(anchor),
                "message": "Verification unavailable: blockchain provider unhealthy.",
            }

        if on_chain.status != "confirmed":
            return {
                "evidence_id": evidence.id,
                "investigation_id": evidence.investigation_id,
                "verification_state": NOT_ANCHORED,
                "current_custody_chain_hash": chain_head_hash(chain),
                "anchored_custody_chain_hash": anchor.custody_chain_hash,
                "on_chain_digest": anchor.anchor_digest,
                "detail": (
                    f"Digest not found on {on_chain.network}. "
                    "The local record exists but the chain does not."
                ),
                "verified_at": None,
                "anchor": self._anchor_dict(anchor),
                "message": "On-chain anchor not found for this digest.",
            }

        anchor.verified_at = self._now()
        anchor.reason = None
        await self.session.flush()
        await self.session.commit()

        return {
            "evidence_id": evidence.id,
            "investigation_id": evidence.investigation_id,
            "verification_state": VERIFIED,
            "current_custody_chain_hash": chain_head_hash(chain),
            "anchored_custody_chain_hash": anchor.custody_chain_hash,
            "on_chain_digest": anchor.anchor_digest,
            "detail": f"Digest confirmed on {on_chain.network}.",
            "verified_at": anchor.verified_at,
            "anchor": self._anchor_dict(anchor),
            "message": "Integrity verified on-chain.",
        }
