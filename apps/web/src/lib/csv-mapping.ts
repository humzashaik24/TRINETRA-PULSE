// ============================================================
// CSV COLUMN MAPPING SUGGESTIONS
// ============================================================
// Auto-suggests column → target field mappings by matching
// header names against the same keyword heuristics used by the
// backend IngestionPipeline._detect_entity_columns.
// ============================================================

export type EntityTarget =
  | 'person'
  | 'phone'
  | 'vehicle'
  | 'location'
  | 'organization'
  | 'account'
  | 'transaction'
  | 'id'
  | 'skip';

export interface ColumnMappingSuggestion {
  sourceColumn: string;
  target: EntityTarget;
  confidence: number;
}

// Keyword lists mirroring the backend ENTITY_KEYWORD_MAP.
const KEYWORDS: Record<EntityTarget, readonly string[]> = {
  person: ['name', 'person', 'individual', 'suspect', 'accused', 'witness', 'subscriber'],
  phone: ['phone', 'mobile', 'msisdn', 'telephone', 'contact', 'caller', 'callee'],
  vehicle: ['vehicle', 'car', 'registration', 'licence', 'license', 'plate', 'rc_'],
  location: ['location', 'address', 'city', 'district', 'place', 'lat', 'lng', 'tower', 'cell'],
  organization: ['organization', 'company', 'firm', 'entity_name', 'org', 'gstin'],
  account: ['account', 'bank', 'ifsc', 'upi'],
  transaction: ['transaction', 'amount', 'txn', 'transfer', 'payment', 'debit', 'credit'],
  id: ['id', 'record', 'fir', 'case', 'number', 'ref'],
  skip: [],
};

/**
 * Normalise a header string for keyword matching.
 */
function normalise(header: string): string {
  return header.toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Suggest a mapping for a single CSV header.
 */
export function suggestMapping(header: string): ColumnMappingSuggestion {
  const norm = normalise(header);
  let best: EntityTarget = 'skip';
  let bestConfidence = 0;

  for (const [target, keywords] of Object.entries(KEYWORDS) as [EntityTarget, readonly string[]][]) {
    if (target === 'skip') continue;
    for (const kw of keywords) {
      if (norm.includes(kw)) {
        const confidence = kw.length / norm.length;
        const score = Math.min(confidence, 1.0);
        if (score > bestConfidence) {
          bestConfidence = score;
          best = target;
        }
        break;
      }
    }
  }

  return { sourceColumn: header, target: best, confidence: bestConfidence };
}

/**
 * Auto-suggest mappings for all headers in a CSV file.
 * Returns an array of suggestions (one per header).
 */
export function autoSuggestMappings(headers: string[]): ColumnMappingSuggestion[] {
  return headers.map(suggestMapping);
}

/**
 * Returns true if all headers have a high-confidence auto-mapping
 * (confidence >= 0.3, i.e. the keyword matched a non-trivial portion
 * of the header name). This is the "fast path" that skips the UI.
 */
export function allHeadersRecognized(
  suggestions: ColumnMappingSuggestion[],
): boolean {
  return suggestions.every(
    (s) => s.target !== 'skip' && s.confidence >= 0.3,
  );
}

/**
 * Validate that the mapping set has at least one entity-level mapping
 * (not all skipped). Returns true when valid.
 */
export function hasRequiredMappings(
  mappings: ColumnMappingSuggestion[],
): boolean {
  return mappings.some((m) => m.target !== 'skip');
}

/**
 * Human-readable label for an entity target.
 */
export const TARGET_LABELS: Record<EntityTarget, string> = {
  person: 'Person Name',
  phone: 'Phone Number',
  vehicle: 'Vehicle Registration',
  location: 'Location / Address',
  organization: 'Organization',
  account: 'Account / Bank',
  transaction: 'Transaction / Amount',
  id: 'Record ID',
  skip: 'Do not import',
};

/**
 * CSS classes for entity target badge styling.
 */
export const TARGET_BADGE_CLASSES: Record<EntityTarget, string> = {
  person: 'bg-entity-person/10 text-entity-person',
  phone: 'bg-entity-phone/10 text-entity-phone',
  vehicle: 'bg-entity-vehicle/10 text-entity-vehicle',
  location: 'bg-entity-location/10 text-entity-location',
  organization: 'bg-entity-organization/10 text-entity-organization',
  account: 'bg-entity-account/10 text-entity-account',
  transaction: 'bg-entity-transaction/10 text-entity-transaction',
  id: 'bg-evidence/10 text-evidence',
  skip: 'bg-surface-elevated text-foreground-muted',
};
