"""Intelligence status derivation (Phase 21).

Statuses describe how much corroboration the SYSTEM has observed versus what an
INVESTIGATOR has decided:

  - ``observed``: at least one observation from a single source.
  - ``correlated``: observations across >= 2 distinct sources, no conflict.
  - ``review_required``: conflicting observations detected.
  - ``confirmed`` / ``rejected``: human decisions, preserved across evaluation.

``confirmed`` / ``rejected`` are terminal investigator decisions; correlation
never overwrites them.
"""

from __future__ import annotations

from app.models import IntelligenceStatus


def recommended_intelligence_status(
    *,
    source_count: int,
    conflict_count: int,
    current: IntelligenceStatus | None,
) -> IntelligenceStatus:
    if current in (IntelligenceStatus.CONFIRMED, IntelligenceStatus.REJECTED):
        return current
    if conflict_count > 0:
        return IntelligenceStatus.REVIEW_REQUIRED
    if source_count >= 2:
        return IntelligenceStatus.CORRELATED
    return IntelligenceStatus.OBSERVED
