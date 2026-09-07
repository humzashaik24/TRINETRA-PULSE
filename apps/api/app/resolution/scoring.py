"""Deterministic entity-resolution scoring (Phase 20).

The linkage score is a transparent, explainable number that reflects
"confidence that these records refer to the same observed entity". It is NOT
a probability of criminality, guilt, or threat of any kind.

Score model:
  - Deterministic given the same features + same weights.
  - Bounded in [0, 1].
  - Built from differently tiered match features (strong vs weak).
  - Penalized by contradictions.
"""

from __future__ import annotations

from app.models import VerificationState
from app.resolution.matching import MatchFeature

# ---------------------------------------------------------------------------
# Tiers (strong vs weak match features)
# ---------------------------------------------------------------------------

STRONG_FEATURES = frozenset(
    {
        "PHONE_EXACT",
        "EMAIL_EXACT",
        "IDENTIFIER_EXACT",
        "VEHICLE_EXACT",
        "ACCOUNT_EXACT",
        "DOB_EXACT",
    }
)

WEAK_FEATURES = frozenset(
    {
        "NAME_EXACT",
        "NAME_SIMILARITY",
        "ADDRESS_SIMILAR",
        "LOCATION_EXACT",
    }
)


class LinkageScore:
    """Encapsulated, transparent linkage scoring result."""

    __slots__ = (
        "score",
        "label",
        "matched_features",
        "contradictions",
        "tier",
    )

    def __init__(
        self,
        score: float,
        label: str,
        matched_features: list[dict],
        contradictions: list[dict],
        tier: str,
    ) -> None:
        self.score = score
        self.label = label
        self.matched_features = matched_features
        self.contradictions = contradictions
        self.tier = tier


# Weight by feature tier.
STRONG_WEIGHT = 1.0
WEAK_WEIGHT = 0.6

# Penalty for each contradiction.
CONTRADICTION_PENALTY = 0.25


def confidence_label(score: float) -> str:
    """Map a linkage score to a bounded, human confidence tier.

    Terminology is deliberately neutral: the score is presented as a
    *linkage score*, never as a probability or guilt indicator.
    """
    if score >= 0.8:
        return "HIGH"
    if score >= 0.55:
        return "MEDIUM"
    return "LOW"


def apply_contradiction_penalty(score: float, contradiction_count: int) -> float:
    """Reduce confidence when attributes conflict."""

    return max(0.0, round(score - contradiction_count * CONTRADICTION_PENALTY, 4))


def detect_contradictions(
    features: list[MatchFeature],
    *,
    a_attributes: dict,
    b_attributes: dict,
) -> list[dict]:
    """Return explainable contradictions between two records.

    A contradiction is an attribute present on BOTH records that resolves to
    a *different* normalized value, with no ambiguity (i.e. an explicit
    mismatch, not just a missing value).
    """
    contradictions: list[dict] = []

    field_map = {
        "PHONE_EXACT": (
            "phone",
            ["phone", "phone_number", "alternate_phone", "mobile"],
            "phone",
        ),
        "EMAIL_EXACT": ("email", ["email"], "email"),
        "IDENTIFIER_EXACT": (
            "identifier",
            ["id_number", "identifier", "pan", "aadhaar", "gstin", "passport"],
            "identifier",
        ),
        "DOB_EXACT": ("date_of_birth", ["date_of_birth", "dob"], "date_of_birth"),
        "VEHICLE_EXACT": (
            "vehicle",
            ["vehicle", "vehicle_number", "registration", "reg_number"],
            "vehicle_registration",
        ),
        "ACCOUNT_EXACT": ("account", ["account_number", "account"], "account_number"),
        "LOCATION_EXACT": ("location", ["location", "city"], "location"),
    }

    from app.resolution.matching import _get_attr

    for feat in features:
        field, keys, label = field_map.get(feat.feature, (None, [], None))
        if field is None:
            continue
        if feat.matched is False:
            v1 = _get_attr(a_attributes, *keys)
            v2 = _get_attr(b_attributes, *keys)
            contradictions.append(
                {
                    "type": "ATTRIBUTE_CONFLICT",
                    "field": field,
                    "label": label,
                    "values": [v1, v2],
                    "detail": f"{label} present on both records but resolves differently",
                }
            )
    return contradictions


def score_matches(
    features: list[MatchFeature],
    *,
    a_attributes: dict,
    b_attributes: dict,
    a_source: str | None = None,
    b_source: str | None = None,
) -> LinkageScore:
    """Compute a deterministic linkage score from matching features.

    Tiering per Phase 20:
      TIER 1 — at least one strong identifier match (phone/email/identifier/
               vehicle/account/DOB). A single strong match already yields a
               high-confidence candidate; additional strong matches push the
               score toward the ceiling.
      TIER 3 — weak-only matches (exact/edited name + address/location). These
               are capped below HIGH and can never be auto-resolved: weak name
               similarity alone must not merge records.
    Contradictions penalize the score regardless of tier.

    The score is a *linkage score* (confidence these records refer to the same
    observed entity). It is NOT a probability of criminality or guilt.
    """
    matched_strong = [
        f.to_dict()
        for f in features
        if f.matched is True and f.feature in STRONG_FEATURES
    ]
    matched_weak = [
        f.to_dict()
        for f in features
        if f.matched is True and f.feature in WEAK_FEATURES
    ]

    contradictions = detect_contradictions(
        features, a_attributes=a_attributes, b_attributes=b_attributes
    )

    if matched_strong:
        strong_count = len(matched_strong)
        # 1 strong -> 0.82 (decisively HIGH). Each extra strong -> +0.05,
        # ceiling 0.97.
        score = min(0.82 + 0.05 * (strong_count - 1), 0.97)
        # Weak agreement adds a small allowance above the strong anchor but
        # never dominates.
        score = min(score + min(len(matched_weak) * 0.03, 0.12), 1.0)
        tier = "TIER1_STRONG_IDENTIFIER"
    elif matched_weak:
        # Weak-only: monotonic but capped well below HIGH. Multiple weak
        # signals (e.g. exact name + address + location) can approach MEDIUM
        # but always require review.
        score = min(0.15 + len(matched_weak) * 0.12, 0.45)
        tier = "TIER3_NAME_ATTRIBUTE_SIMILARITY"
    else:
        score = 0.0
        tier = "NONE"

    # Contradiction penalty applies in every tier.
    score = apply_contradiction_penalty(score, len(contradictions))

    label = confidence_label(score)

    return LinkageScore(
        score=round(score, 4),
        label=label,
        matched_features=matched_strong + matched_weak,
        contradictions=contradictions,
        tier=tier,
    )


def recommended_state(score: float) -> VerificationState:
    """Map a linkage score to an initial resolution state.

    The auto-engine pre-resolves high-confidence links (AUTO_RESOLVED); medium
    and low scores always require a human decision (NEEDS_REVIEW / POSSIBLE).
    AUTO_RESOLVED merely flags an automatic engine finding — it is never a
    permanent, irreversible merge and is always subject to confirm/reject.
    PROBABLE is reserved for resolutions created by investigators (manual
    method). This keeps the AUTO_RESOLVED / PROBABLE pair coherent: the engine
    asserts, the investigator asserts, and human confirm/reject decides.
    """
    if score >= 0.8:
        return VerificationState.AUTO_RESOLVED
    if score >= 0.5:
        return VerificationState.NEEDS_REVIEW
    return VerificationState.POSSIBLE
