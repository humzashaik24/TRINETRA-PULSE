"""Phase 24 — Multimedia Evidence Intelligence.

Server-side AI analysis of IMAGE / VIDEO / AUDIO evidence through the Phase 23
ProviderManager capabilities (``VISION``, ``VIDEO``, ``TRANSCRIPTION``).
"""

from app.evidence_intelligence.service import (
    EvidenceIntelligenceService,
    derive_media_kind,
    understanding_read,
)

__all__ = [
    "EvidenceIntelligenceService",
    "derive_media_kind",
    "understanding_read",
]
