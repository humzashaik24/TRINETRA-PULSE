"""Entity resolution & identity correlation intelligence (Phase 20).

Deterministic, explainable record linkage that identifies when records from
different sources may refer to the SAME observed entity.

Entity resolution identifies potential identity equivalence between source
records. It does NOT establish criminality or guilt.
"""

from app.resolution.candidates import blocking_index, generate_candidates
from app.resolution.matching import MatchFeature, build_match_features
from app.resolution.normalization import (
    RESOLUTION_VERSION,
    NormalizationResult,
    normalize_by_type,
)
from app.resolution.scoring import (
    confidence_label,
    detect_contradictions,
    recommended_state,
    score_matches,
)

__all__ = [
    "RESOLUTION_VERSION",
    "NormalizationResult",
    "normalize_by_type",
    "build_match_features",
    "MatchFeature",
    "score_matches",
    "detect_contradictions",
    "confidence_label",
    "recommended_state",
    "blocking_index",
    "generate_candidates",
]
