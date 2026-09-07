"""Explainable entity-resolution matching features (Phase 20).

Every matching feature has a stable ``feature`` code, a clear definition, a
weight, and a deterministic ``matched`` boolean (or None when inconclusive).

Features never hide their logic inside an opaque model — the investigator can
inspect exactly which attributes aligned and which conflicted.
"""

from __future__ import annotations

from app.resolution.normalization import (
    NormalizationResult,
    address_is_similar,
    normalize_account,
    normalize_address,
    normalize_date_of_birth,
    normalize_email,
    normalize_identifier,
    normalize_person_name,
    normalize_phone,
    normalize_vehicle,
)


class MatchFeature:
    """A single evaluated matching signal between two records."""

    __slots__ = (
        "feature",
        "label",
        "matched",
        "value",
        "weight",
        "value_1",
        "value_2",
        "normalized_1",
        "normalized_2",
        "source_1",
        "source_2",
    )

    def __init__(
        self,
        feature: str,
        label: str,
        matched: bool | None,
        value: str,
        weight: float,
        value_1=None,
        value_2=None,
        normalized_1=None,
        normalized_2=None,
        source_1: str | None = None,
        source_2: str | None = None,
    ) -> None:
        self.feature = feature
        self.label = label
        self.matched = matched
        self.value = value
        self.weight = weight
        self.value_1 = value_1
        self.value_2 = value_2
        self.normalized_1 = normalized_1
        self.normalized_2 = normalized_2
        self.source_1 = source_1
        self.source_2 = source_2

    def to_dict(self) -> dict:
        return {
            "feature": self.feature,
            "label": self.label,
            "matched": self.matched,
            "value": self.value,
            "weight": self.weight,
            "value_1": self.value_1,
            "value_2": self.value_2,
            "normalized_1": self.normalized_1,
            "normalized_2": self.normalized_2,
            "source_1": self.source_1,
            "source_2": self.source_2,
        }


def _get_attr(attributes: dict, *keys: str) -> str | None:
    for key in keys:
        value = attributes.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _feat(
    features: list[MatchFeature],
    feature: str,
    label: str,
    matched: bool | None,
    value: str,
    weight: float,
    v1=None,
    v2=None,
    n1=None,
    n2=None,
    s1: str | None = None,
    s2: str | None = None,
) -> None:
    if v1 is None and v2 is None:
        return
    features.append(
        MatchFeature(
            feature,
            label,
            matched,
            value,
            weight,
            v1,
            v2,
            n1,
            n2,
            s1,
            s2,
        )
    )


def phone_exact(phone1: str, phone2: str) -> bool:
    n1: NormalizationResult = normalize_phone(phone1)
    n2: NormalizationResult = normalize_phone(phone2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def email_exact(email1: str, email2: str) -> bool:
    n1: NormalizationResult = normalize_email(email1)
    n2: NormalizationResult = normalize_email(email2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def identifier_exact(id1: str, id2: str) -> bool:
    n1: NormalizationResult = normalize_identifier(id1)
    n2: NormalizationResult = normalize_identifier(id2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def vehicle_exact(reg1: str, reg2: str) -> bool:
    n1: NormalizationResult = normalize_vehicle(reg1)
    n2: NormalizationResult = normalize_vehicle(reg2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def account_exact(acc1: str, acc2: str) -> bool:
    n1: NormalizationResult = normalize_account(acc1)
    n2: NormalizationResult = normalize_account(acc2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def dob_exact(dob1: str, dob2: str) -> bool:
    n1: NormalizationResult = normalize_date_of_birth(dob1)
    n2: NormalizationResult = normalize_date_of_birth(dob2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def name_exact(name1: str, name2: str) -> bool:
    n1: NormalizationResult = normalize_person_name(name1)
    n2: NormalizationResult = normalize_person_name(name2)
    return bool(n1.normalized_value) and n1.normalized_value == n2.normalized_value


def _name_similarity(a: str, b: str) -> float:
    import difflib

    na = normalize_person_name(a).normalized_value
    nb = normalize_person_name(b).normalized_value
    if not na or not nb:
        return 0.0
    return difflib.SequenceMatcher(None, na, nb).ratio()


def name_similar(a: str, b: str, threshold: float = 0.7) -> bool:
    return _name_similarity(a, b) >= threshold


def name_overlap(a: str, b: str) -> float:
    """Fraction of tokens in the longer name shared with the shorter one."""
    ta = set(normalize_person_name(a).normalized_value.split(" "))
    tb = set(normalize_person_name(b).normalized_value.split(" "))
    if not ta or not tb:
        return 0.0
    overlap = len(ta & tb) / max(len(ta), len(tb))
    return overlap


def build_match_features(
    a_attributes: dict,
    b_attributes: dict,
    *,
    a_source: str | None = None,
    b_source: str | None = None,
) -> list[MatchFeature]:
    """Evaluate every explainable matching feature between two records.

    Purely deterministic. Features are computed from the attribute dicts as
    stored on the entities; when an attribute is missing on either side the
    feature is simply not emitted (or emitted as inconclusive when useful).
    """
    features: list[MatchFeature] = []

    # --- PERSON attributes ---
    name_a = _get_attr(
        a_attributes, "name", "full_name", "legal_name", "canonical_name", "holder", "owner"
    )
    name_b = _get_attr(
        b_attributes, "name", "full_name", "legal_name", "canonical_name", "holder", "owner"
    )
    if name_a and name_b:
        na = normalize_person_name(name_a)
        nb = normalize_person_name(name_b)
        exact = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "NAME_EXACT",
            "Exact normalized name",
            exact,
            "Exact match" if exact else "Differ",
            0.4,
            name_a,
            name_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )
        if not exact:
            sim = _name_similarity(name_a, name_b)
            overlap = name_overlap(name_a, name_b)
            _feat(
                features,
                "NAME_SIMILARITY",
                "Name similarity",
                sim >= 0.7,
                f"{sim:.0%} similarity, {overlap:.0%} token overlap",
                0.15,
                name_a,
                name_b,
                na.normalized_value,
                nb.normalized_value,
                a_source,
                b_source,
            )

    phone_a = _get_attr(a_attributes, "phone", "phone_number", "alternate_phone", "mobile")
    phone_b = _get_attr(b_attributes, "phone", "phone_number", "alternate_phone", "mobile")
    if phone_a and phone_b:
        na = normalize_phone(phone_a)
        nb = normalize_phone(phone_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "PHONE_EXACT",
            "Exact phone",
            match,
            "Exact match" if match else "Differ",
            0.7,
            phone_a,
            phone_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    email_a = _get_attr(a_attributes, "email")
    email_b = _get_attr(b_attributes, "email")
    if email_a and email_b:
        na = normalize_email(email_a)
        nb = normalize_email(email_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "EMAIL_EXACT",
            "Exact email",
            match,
            "Exact match" if match else "Differ",
            0.75,
            email_a,
            email_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    id_a = _get_attr(a_attributes, "id_number", "identifier", "pan", "aadhaar", "gstin", "passport")
    id_b = _get_attr(b_attributes, "id_number", "identifier", "pan", "aadhaar", "gstin", "passport")
    if id_a and id_b:
        na = normalize_identifier(id_a)
        nb = normalize_identifier(id_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "IDENTIFIER_EXACT",
            "Exact identifier",
            match,
            "Exact match" if match else "Differ",
            0.85,
            id_a,
            id_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    dob_a = _get_attr(a_attributes, "date_of_birth", "dob")
    dob_b = _get_attr(b_attributes, "date_of_birth", "dob")
    if dob_a and dob_b:
        na = normalize_date_of_birth(dob_a)
        nb = normalize_date_of_birth(dob_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "DOB_EXACT",
            "Date of birth",
            match,
            "Exact match" if match else "Differ",
            0.7,
            dob_a,
            dob_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    # --- VEHICLE ---
    veh_a = _get_attr(a_attributes, "vehicle", "vehicle_number", "registration", "reg_number")
    veh_b = _get_attr(b_attributes, "vehicle", "vehicle_number", "registration", "reg_number")
    if veh_a and veh_b:
        na = normalize_vehicle(veh_a)
        nb = normalize_vehicle(veh_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "VEHICLE_EXACT",
            "Exact vehicle registration",
            match,
            "Exact match" if match else "Differ",
            0.8,
            veh_a,
            veh_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    # --- ACCOUNT ---
    acc_a = _get_attr(a_attributes, "account_number", "account")
    acc_b = _get_attr(b_attributes, "account_number", "account")
    if acc_a and acc_b:
        na = normalize_account(acc_a)
        nb = normalize_account(acc_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "ACCOUNT_EXACT",
            "Exact account number",
            match,
            "Exact match" if match else "Differ",
            0.85,
            acc_a,
            acc_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    # --- ADDRESS / LOCATION (conservative) ---
    addr_a = _get_attr(a_attributes, "address")
    addr_b = _get_attr(b_attributes, "address")
    if addr_a and addr_b:
        match = address_is_similar(addr_a, addr_b)
        _feat(
            features,
            "ADDRESS_SIMILAR",
            "Address similarity",
            match,
            "Similar address" if match else "Different address",
            0.25,
            addr_a,
            addr_b,
            normalize_address(addr_a).normalized_value,
            normalize_address(addr_b).normalized_value,
            a_source,
            b_source,
        )

    loc_a = _get_attr(a_attributes, "location", "city")
    loc_b = _get_attr(b_attributes, "location", "city")
    if loc_a and loc_b:
        from app.resolution.normalization import normalize_location

        na = normalize_location(loc_a)
        nb = normalize_location(loc_b)
        match = bool(na.normalized_value) and na.normalized_value == nb.normalized_value
        _feat(
            features,
            "LOCATION_EXACT",
            "Exact location",
            match,
            "Exact match" if match else "Differ",
            0.2,
            loc_a,
            loc_b,
            na.normalized_value,
            nb.normalized_value,
            a_source,
            b_source,
        )

    return features
