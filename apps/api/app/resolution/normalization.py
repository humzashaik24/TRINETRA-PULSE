"""Deterministic entity normalization utilities (Phase 20).

Mirrors the frontend ``entity-normalization.ts`` contract so normalization is
consistent across the API and the web layer. Every normalizer preserves the
original (raw) value and derives a canonical form used only for comparison.

These functions are pure, deterministic and independent of any data store.
Same input + same version -> same output.
"""

from __future__ import annotations

import re

from app.models import EntityType

RESOLUTION_VERSION = "entity-resolution-v1"

# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------


class NormalizationResult:
    __slots__ = ("raw_value", "normalized_value", "display_value", "method", "warnings")

    def __init__(
        self,
        raw_value: str,
        normalized_value: str,
        display_value: str,
        method: str,
        warnings: list[str] | None = None,
    ) -> None:
        self.raw_value = raw_value
        self.normalized_value = normalized_value
        self.display_value = display_value
        self.method = method
        self.warnings = warnings or []

    def to_dict(self) -> dict:
        return {
            "raw_value": self.raw_value,
            "normalized_value": self.normalized_value,
            "display_value": self.display_value,
            "method": self.method,
            "warnings": self.warnings,
        }


def _collapse_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _strip_punctuation(s: str) -> str:
    return re.sub(r"[^\w\s]", "", s).strip()


def _to_title_case(s: str) -> str:
    words = [w for w in _collapse_spaces(s).split(" ") if w]
    out = []
    for w in words:
        out.append(w.capitalize() if len(w) > 1 else w.upper())
    return " ".join(out)


# ---------------------------------------------------------------------------
# Type-specific normalizers
# ---------------------------------------------------------------------------


def normalize_person_name(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    if not raw_value:
        return NormalizationResult(raw_value, "", "", "none", ["Empty name"])
    collapsed = _collapse_spaces(_strip_punctuation(raw_value))
    return NormalizationResult(
        raw_value,
        collapsed.lower(),
        _to_title_case(collapsed),
        "person-name",
        [] if raw == collapsed else ["Whitespace/punctuation condensed for matching"],
    )


def normalize_phone(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    digits = re.sub(r"\D", "", raw_value)
    if not digits:
        return NormalizationResult(raw_value, "", raw_value, "none", ["Empty phone value"])

    normalized = digits
    warnings: list[str] = []
    has_country_code = bool(
        digits.startswith("91") and (raw_value.startswith("+91") or raw_value.startswith("91"))
    )

    if len(digits) == 10:
        normalized = f"91{digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        normalized = f"91{digits[1:]}"
    elif len(digits) == 13 and digits.startswith("971") and raw_value.startswith("+"):
        normalized = digits

    if not has_country_code and len(digits) == 10:
        warnings.append("Local number formatted with +91 country code for matching")
    if len(digits) not in (10, 12, 13):
        warnings.append(f"Unexpected phone digit count ({len(digits)})")

    displayable = normalized[-10:]
    display_value = (
        f"+91 {displayable[:5]} {displayable[5:]}" if len(normalized) >= 12 else raw_value
    )

    return NormalizationResult(raw_value, normalized, display_value, "phone-e164", warnings)


def normalize_email(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    cleaned = _collapse_spaces(raw_value).lower()
    return NormalizationResult(
        raw_value,
        cleaned,
        cleaned,
        "email",
        [] if "@" in cleaned else ["Email format not recognized"],
    )


def normalize_vehicle(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    cleaned = _collapse_spaces(raw_value).replace(r"[^A-Za-z0-9]", "").upper()
    return NormalizationResult(
        raw_value,
        cleaned,
        cleaned,
        "vehicle-registration",
        (
            []
            if re.match(r"^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$", cleaned)
            else ["Registration format not recognized (expected e.g. MH14BX2231)"]
        ),
    )


def normalize_location(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    collapsed = _collapse_spaces(_strip_punctuation(raw_value)).lower()
    return NormalizationResult(raw_value, collapsed, raw_value, "location-key", [])


def normalize_organization(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    collapsed = _collapse_spaces(_strip_punctuation(raw_value))
    normalized_value = collapsed.lower()
    display_value = _to_title_case(collapsed)
    return NormalizationResult(
        raw_value,
        normalized_value,
        display_value,
        "organization",
        (
            []
            if normalized_value == display_value.lower()
            else ["Legal suffix standardized for display"]
        ),
    )


def normalize_account(raw: str) -> NormalizationResult:
    raw_value = raw.strip()
    digits = re.sub(r"\D", "", raw_value)
    display = " ".join(digits[i : i + 4] for i in range(0, len(digits), 4)) if digits else raw_value
    return NormalizationResult(raw_value, digits, display, "account-id", [])


def normalize_identifier(raw: str) -> NormalizationResult:
    """Conservative identifier normalization: collapse spaces + uppercase.

    Deliberately does NOT strip alphanumeric meaning — PAN/Aadhaar/GST etc.
    retain their internal structure so meaningful identifiers survive intact.
    """
    raw_value = raw.strip()
    cleaned = _collapse_spaces(raw_value).upper()
    return NormalizationResult(
        raw_value,
        cleaned,
        cleaned,
        "identifier",
        [] if cleaned == raw_value else ["Identifier whitespace condensed for matching"],
    )


def normalize_date_of_birth(raw: str) -> NormalizationResult:
    """Conservative DOB normalization into ISO-ish form where safely inferable."""
    raw_value = raw.strip()
    cleaned = raw_value
    m = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", raw_value)
    if m:
        cleaned = f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m2 = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$", raw_value)
    if m2:
        cleaned = f"{m2.group(3)}-{int(m2.group(2)):02d}-{int(m2.group(1)):02d}"
    return NormalizationResult(
        raw_value,
        cleaned,
        cleaned,
        "dob-iso",
        [] if cleaned == raw_value else ["Date of birth reformatted to YYYY-MM-DD where inferable"],
    )


def normalize_address(raw: str) -> NormalizationResult:
    """Conservative address normalization.

    Only condenses whitespace and lowercases for a search-friendly key; it
    does NOT strip street numbers or tokens so false matches are avoided.
    """
    raw_value = raw.strip()
    collapsed = _collapse_spaces(raw_value).lower()
    return NormalizationResult(raw_value, collapsed, raw_value, "address-key", [])


def normalize_by_type(entity_type: EntityType | str, raw: str) -> NormalizationResult:
    etype = entity_type.value if isinstance(entity_type, EntityType) else str(entity_type)
    etype = etype.lower()
    if etype in ("person", "individual"):
        return normalize_person_name(raw)
    if etype in ("phone", "mobile", "msisdn"):
        return normalize_phone(raw)
    if etype in ("email",):
        return normalize_email(raw)
    if etype in ("vehicle", "car", "registration"):
        return normalize_vehicle(raw)
    if etype in ("location", "address"):
        if "address" in etype:
            return normalize_address(raw)
        return normalize_location(raw)
    if etype in ("organization", "org", "company"):
        return normalize_organization(raw)
    if etype in ("account", "bank_account"):
        return normalize_account(raw)
    if etype in ("identifier", "id_number", "pan", "aadhaar", "gstin"):
        return normalize_identifier(raw)
    if etype in ("date_of_birth", "dob", "birth_date"):
        return normalize_date_of_birth(raw)
    return NormalizationResult(
        raw.strip(), _collapse_spaces(raw).lower(), raw.strip(), "generic", []
    )


# ---------------------------------------------------------------------------
# Address-level helpers
# ---------------------------------------------------------------------------


def address_is_similar(a: str, b: str, threshold: float = 0.85) -> bool:
    """Deterministic address similarity using bigram overlap.

    Conservative: only returns True when the two addresses are near-identical
    after whitespace/punctuation cleanup. Used as supporting evidence only —
    never a standalone match signal.
    """
    na = normalize_address(a).normalized_value
    nb = normalize_address(b).normalized_value
    if not na or not nb:
        return False
    if na == nb:
        return True
    ga = _bigrams(na)
    gb = _bigrams(nb)
    if not ga or not gb:
        return na == nb
    overlap = sum(1 for g in ga if g in gb)
    dice = (2 * overlap) / (len(ga) + len(gb))
    return dice >= threshold


def _bigrams(s: str) -> set[str]:
    s = re.sub(r"[^a-z0-9]", "", s)
    if len(s) < 2:
        return {s} if s else set()
    return {s[i : i + 2] for i in range(len(s) - 1)}
