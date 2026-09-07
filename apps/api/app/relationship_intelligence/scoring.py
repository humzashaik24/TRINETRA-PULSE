"""Confidence scoring for relationship intelligence (Phase 21).

The linkage score combines:

  - the base confidence carried by the relationship row,
  - a bounded bonus when the same relationship is observed across multiple
    distinct source datasets (source diversity),
  - a bounded bonus for additional corroborating observations,
  - a penalty for detected conflicts.

The formula is deterministic and clamped to [0, 1]. Labels bucket the score into
a coarse HIGH / MEDIUM / LOW value that the UI renders ahead of human action;
they never overwrite an investigator's confirmed / rejected decision.
"""

from __future__ import annotations

from typing import Any

from app.relationship_intelligence.vocabulary import RELATIONSHIP_CONFLICT

SOURCE_DIVERSITY_BONUS = 0.05
SOURCE_DIVERSITY_CAP = 0.10
OBSERVATION_BONUS = 0.01
OBSERVATION_CAP = 0.05
CONFLICT_PENALTY = 0.20

LABEL_HIGH_THRESHOLD = 0.75
LABEL_MEDIUM_THRESHOLD = 0.50


def clamp(value: float, *, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def linkage_score(
    *,
    base_confidence: float,
    source_count: int,
    observation_count: int,
    conflict_count: int,
) -> float:
    """Deterministic linkage score for a relationship, rounded to 3 decimals."""
    source_bonus = (
        min(SOURCE_DIVERSITY_CAP, SOURCE_DIVERSITY_BONUS * (source_count - 1))
        if source_count > 1
        else 0.0
    )
    observation_bonus = (
        min(OBSERVATION_CAP, OBSERVATION_BONUS * (observation_count - 1))
        if observation_count > 1
        else 0.0
    )
    penalty = CONFLICT_PENALTY * conflict_count
    return round(
        clamp(base_confidence + source_bonus + observation_bonus - penalty), 3
    )


def confidence_label(score: float) -> str:
    if score >= LABEL_HIGH_THRESHOLD:
        return "HIGH"
    if score >= LABEL_MEDIUM_THRESHOLD:
        return "MEDIUM"
    return "LOW"


def detect_conflicts(*, observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Deterministically flag conflicting source records for a relationship.

    Two conflict shapes are recognised:

      1. The same source record appears under more than one dataset
         (``observation.source_record`` reuse).
      2. Observed confidence values across sources diverge by more than 0.15.

    Conflicts never cause silent data changes; they only raise the status to
    ``review_required`` so an investigator can decide.
    """
    conflicts: list[dict[str, Any]] = []
    by_record: dict[str, set[str]] = {}
    confidences: list[float] = []
    sources_with_confidence: list[tuple[str, str]] = []

    for obs in observations:
        dataset = obs.get("source_dataset") or ""
        record = obs.get("source_record")
        if record:
            by_record.setdefault(str(record), set()).add(dataset)
        confidence = obs.get("confidence")
        if isinstance(confidence, (int, float)) and confidence is not None:
            confidences.append(float(confidence))
            sources_with_confidence.append((dataset, f"{float(confidence):.3f}"))

    for record in sorted(by_record):
        datasets = sorted(by_record[record])
        if len(datasets) > 1:
            conflicts.append(
                {
                    "type": RELATIONSHIP_CONFLICT,
                    "field": "observation.source_record",
                    "sources": datasets,
                    "values": [record],
                    "detail": (
                        "The same source record appears under more than one "
                        "dataset for this relationship."
                    ),
                }
            )

    if len(confidences) >= 2 and (max(confidences) - min(confidences)) > 0.15:
        conflicts.append(
            {
                "type": RELATIONSHIP_CONFLICT,
                "field": "observation.confidence",
                "sources": sorted({s for s, _ in sources_with_confidence}),
                "values": sorted({v for _, v in sources_with_confidence}),
                "detail": (
                    "Observed confidence values for this relationship diverge "
                    "across sources by more than 0.15."
                ),
            }
        )

    return conflicts
