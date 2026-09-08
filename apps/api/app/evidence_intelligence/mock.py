"""Deterministic local analyzer for the Phase 24 mock provider.

Produces a canonical, neutral-language result for IMAGE / VIDEO / AUDIO payloads
WITHOUT decoding media. It derives stable observations from the payload digest
and byte metadata only and deliberately never invents visible content — this is
what makes the mock honest: output is presented as a placeholder observation,
never as a genuine read of the media.

Used by ``clients.execute_capability_call`` when the resolved provider binding
is the built-in mock (or an explicitly configured mock provider).
"""

from __future__ import annotations

import hashlib

from app.models.evidence_understanding import AnalysisMediaKind


def run_mock_analysis(
    kind: AnalysisMediaKind,
    payload: bytes,
    content_type: str,
) -> dict:
    """Return the canonical Phase 24 result shape for a mock analysis."""
    checksum = hashlib.sha256(payload).hexdigest()
    short = checksum[:12]
    size = len(payload)
    content_type = content_type or "unknown"

    base_warnings = [
        "Deterministic mock provider: media content was not decoded; "
        "this output is a placeholder, not an analysis.",
    ]

    if kind == AnalysisMediaKind.IMAGE:
        return {
            "summary": (
                f"Observed an image payload ({content_type}, {size} bytes, sha256 {short}). "
                "No pixel content was decoded by the mock provider."
            ),
            "observations": [
                {
                    "text": (
                        f"An image payload of {size} bytes ({content_type}) is stored with a "
                        "verified payload digest."
                    )
                }
            ],
            "entities": [],
            "locations": [],
            "warnings": base_warnings,
        }

    if kind == AnalysisMediaKind.VIDEO:
        return {
            "summary": (
                f"Observed a video payload ({content_type}, {size} bytes, sha256 {short}). "
                "No frames were decoded by the mock provider."
            ),
            "observations": [
                {
                    "text": (
                        f"A video payload of {size} bytes ({content_type}) is stored with a "
                        "verified payload digest."
                    )
                }
            ],
            "entities": [],
            "locations": [],
            "timestamps": [
                {
                    "start_seconds": 0.0,
                    "end_seconds": 1.0,
                    "description": (
                        "A synthetic boundary observation for the stored video payload."
                    ),
                }
            ],
            "warnings": base_warnings,
        }

    transcript = (
        f"Deterministic mock transcript placeholder for a {size}-byte {content_type} file."
    )
    return {
        "summary": (
            f"Observed an audio payload ({content_type}, {size} bytes, sha256 {short}). "
            "No audio was decoded by the mock provider."
        ),
        "transcript": transcript,
        "segments": [
            {
                "start_seconds": 0.0,
                "end_seconds": 1.0,
                "text": transcript,
            }
        ],
        "entities": [],
        "locations": [],
        "warnings": base_warnings,
    }
