import type { EntityType } from '@trinetra-pulse/types';

// ============================================================
// ENTITY NORMALIZATION
// ============================================================
// Pure functions producing canonical forms for matching while
// always preserving the original (raw) value.
//
// every normalizer returns:
//   rawValue        - the exact source value (never altered)
//   normalizedValue - canonical form used for comparison
//   displayValue    - human-friendly rendering
//   method          - normalization strategy applied
//   warnings        - notes for the investigator
// ============================================================

export interface NormalizationResult {
  rawValue: string;
  normalizedValue: string;
  displayValue: string;
  method: string;
  warnings: string[];
}

const collapseSpaces = (s: string): string => s.replace(/\s+/g, ' ').trim();

const stripPunctuation = (s: string): string => s.replace(/[^\w\s]/g, '').trim();

const toTitleCase = (s: string): string =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 1 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(' ');

/** Token-based name normalization: collapse spaces + lowercase. */
export function normalizePersonName(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  if (!rawValue) {
    return { rawValue, normalizedValue: '', displayValue: '', method: 'none', warnings: ['Empty name'] };
  }
  const collapsed = collapseSpaces(stripPunctuation(rawValue));
  return {
    rawValue,
    normalizedValue: collapsed.toLowerCase(),
    displayValue: toTitleCase(collapsed),
    method: 'person-name',
    warnings: raw !== collapsed ? ['Whitespace/punctuation condensed for matching'] : [],
  };
}

/**
 * Phone normalization into a portable international form.
 * Accepts "+919876543210", "09876543210", "9876543210", formatted strings.
 * Never alters the raw value; normalization only used for matching/display.
 */
export function normalizePhone(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) {
    return { rawValue, normalizedValue: '', displayValue: rawValue, method: 'none', warnings: ['Empty phone value'] };
  }

  let normalized = digits;
  let warnings: string[] = [];

  if (digits.length === 10) {
    normalized = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    normalized = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    normalized = digits;
  } else if (digits.length === 13 && digits.startsWith('971') && rawValue.startsWith('+')) {
    // Leave international numbers as-is if already canonical
    normalized = digits;
  }

  const hasCountryCode =
    digits.length === 12 && digits.startsWith('91') && (rawValue.startsWith('+91') || rawValue.startsWith('91'));

  if (!hasCountryCode && digits.length === 10) {
    warnings.push('Local number formatted with +91 country code for matching');
  }
  if (digits.length !== 10 && digits.length !== 12 && digits.length !== 13) {
    warnings.push(`Unexpected phone digit count (${digits.length})`);
  }

  const displayable = normalized.slice(-10);
  const displayValue = normalized.length >= 12
    ? `+91 ${displayable.slice(0, 5)} ${displayable.slice(5)}`
    : rawValue;

  return {
    rawValue,
    normalizedValue: normalized,
    displayValue,
    method: 'phone-e164',
    warnings,
  };
}

/** Vehicle registration normalization: uppercase, no spaces/punctuation. */
export function normalizeVehicle(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  const cleaned = collapseSpaces(rawValue).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return {
    rawValue,
    normalizedValue: cleaned,
    displayValue: cleaned,
    method: 'vehicle-registration',
    warnings: /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(cleaned) ? [] : ['Registration format not recognized (expected e.g. MH14BX2231)'],
  };
}

/**
 * Location normalization: prepared for aliases/spelling variations.
 * The source value is never altered — only a canonical key is derived.
 */
export function normalizeLocation(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  const collapsed = collapseSpaces(stripPunctuation(rawValue)).toLowerCase();
  return {
    rawValue,
    normalizedValue: collapsed,
    displayValue: rawValue,
    method: 'location-key',
    warnings: [],
  };
}

/** Organization normalization: abbreviation + punctuation handling. */
export function normalizeOrganization(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  const collapsed = collapseSpaces(stripPunctuation(rawValue));
  const words = collapsed.split(/\s+/);
  // Protect legal suffixes from being collapsed lower-cased.
  const suffixMap: Record<string, string> = {
    ltd: 'Ltd',
    limited: 'Ltd',
    llc: 'LLC',
    corp: 'Corp',
    corporation: 'Corp',
    inc: 'Inc',
    incorporated: 'Inc',
    pvt: 'Pvt',
    private: 'Pvt',
  };
  const mapped = words.map((w) => {
    const key = w.toLowerCase();
    if (suffixMap[key]) return suffixMap[key];
    if (/^[A-Z]{2,}$/.test(w)) return w; // keep acronyms uppercase
    return w;
  });
  const displayValue = mapped.join(' ');
  const normalizedValue = collapsed.toLowerCase();
  return {
    rawValue,
    normalizedValue,
    displayValue,
    method: 'organization',
    warnings: normalizedValue !== displayValue.toLowerCase() ? ['Legal suffix standardized for display'] : [],
  };
}

/** Account normalization: digits only. */
export function normalizeAccount(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  const digits = rawValue.replace(/\D/g, '');
  return {
    rawValue,
    normalizedValue: digits,
    displayValue: digits ? digits.replace(/(\d{4})(?=\d)/g, '$1 ') : rawValue,
    method: 'account-id',
    warnings: [],
  };
}

/** Transaction id normalization: collapse + uppercase. */
export function normalizeTransaction(raw: string): NormalizationResult {
  const rawValue = raw.trim();
  const cleaned = collapseSpaces(rawValue).toUpperCase();
  return {
    rawValue,
    normalizedValue: cleaned,
    displayValue: cleaned,
    method: 'transaction-id',
    warnings: [],
  };
}

/** Generic normalization for typed values. */
export function normalizeByType(type: EntityType, raw: string): NormalizationResult {
  switch (type) {
    case 'person':
      return normalizePersonName(raw);
    case 'phone':
      return normalizePhone(raw);
    case 'vehicle':
      return normalizeVehicle(raw);
    case 'location':
      return normalizeLocation(raw);
    case 'organization':
      return normalizeOrganization(raw);
    case 'account':
      return normalizeAccount(raw);
    case 'transaction':
      return normalizeTransaction(raw);
    case 'event':
    case 'case':
    case 'document':
    case 'evidence':
    default:
      return {
        rawValue: raw.trim(),
        normalizedValue: collapseSpaces(raw).toLowerCase(),
        displayValue: raw.trim(),
        method: 'generic',
        warnings: [],
      };
  }
}

/**
 * Compares two typed raw values and returns a similarity in [0,1].
 * Uses normalized forms; never implies equality on its own.
 */
export function normalizedEquivalence(type: EntityType, a: string, b: string): boolean {
  const na = normalizeByType(type, a).normalizedValue;
  const nb = normalizeByType(type, b).normalizedValue;
  return na.length > 0 && na === nb;
}