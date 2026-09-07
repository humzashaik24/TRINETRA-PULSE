"""Relationship intelligence (Phase 21).

Deterministic, explainable, investigation-scoped relationship correlation.

Guarantees:
  - Investigation isolation: evaluation and reads are always scoped to one
    investigation.
  - Determinism: same data + same algorithm version => same result.
  - Observation preservation: every individual source observation is preserved
    and never flattened; CALL vs TRANSFER never merge.
  - Reversibility: confirm/reject are audit-trailed and actor-scoped; the
    system never silently overwrites investigator decisions.

Relationship intelligence describes how corroborated a relationship is. It does
not establish criminality or guilt.
"""

from app.relationship_intelligence.compute import evaluate_relationship
from app.relationship_intelligence.correlation import (
    canonical_pair,
    relationship_correlation_key,
)
from app.relationship_intelligence.observations import (
    derive_observations,
    derive_observations_bulk,
)
from app.relationship_intelligence.scoring import (
    confidence_label,
    detect_conflicts,
    linkage_score,
)
from app.relationship_intelligence.states import recommended_intelligence_status
from app.relationship_intelligence.vocabulary import (
    CORRELATION_VERSION,
    RELATIONSHIP_CONFLICT,
    is_directed,
    is_symmetric,
    observation_predicate,
)

__all__ = [
    "CORRELATION_VERSION",
    "RELATIONSHIP_CONFLICT",
    "canonical_pair",
    "confidence_label",
    "derive_observations",
    "derive_observations_bulk",
    "detect_conflicts",
    "evaluate_relationship",
    "is_directed",
    "is_symmetric",
    "linkage_score",
    "observation_predicate",
    "recommended_intelligence_status",
    "relationship_correlation_key",
]
