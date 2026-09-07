import type {
  EntityIntelligence,
  EntityResolutionCandidate,
  MatchFeature,
  ResolutionContradiction,
  ResolutionSourceRef,
} from '@trinetra-pulse/types';
import { normalizeByType } from './entity-normalization';

// ============================================================
// LINKAGE ENGINE (entity-resolution-v1 client mirror)
// ============================================================
// Deterministic mirror of the backend resolution engine so the
// mock workspace can evaluate investigation linkage genuinely.
// Blocking-based (never O(N²)), evidence features only, and the
// analyst always makes the final confirm/reject call.
// ============================================================

export const LINKAGE_ALGORITHM_VERSION = 'entity-resolution-v1';
export const LINKAGE_EPOCH = '2026-09-06T09:00:00Z';

const STRONG_FEATURES: MatchFeature['feature'][] = [
  'PHONE_EXACT',
  'EMAIL_EXACT',
  'IDENTIFIER_EXACT',
  'VEHICLE_EXACT',
  'ACCOUNT_EXACT',
  'DOB_EXACT',
];

const WEAK_FEATURES: MatchFeature['feature'][] = [
  'NAME_EXACT',
  'NAME_SIMILARITY',
  'LOCATION_EXACT',
];

const FEATURE_WEIGHTS: Record<MatchFeature['feature'], number> = {
  PHONE_EXACT: 0.7,
  EMAIL_EXACT: 0.75,
  IDENTIFIER_EXACT: 0.85,
  VEHICLE_EXACT: 0.8,
  ACCOUNT_EXACT: 0.85,
  DOB_EXACT: 0.7,
  NAME_EXACT: 0.4,
  NAME_SIMILARITY: 0.15,
  LOCATION_EXACT: 0.2,
};

const FEATURE_LABELS: Record<MatchFeature['feature'], string> = {
  PHONE_EXACT: 'Exact phone',
  EMAIL_EXACT: 'Exact email',
  IDENTIFIER_EXACT: 'Exact identifier',
  VEHICLE_EXACT: 'Exact vehicle',
  ACCOUNT_EXACT: 'Exact account',
  DOB_EXACT: 'Exact date of birth',
  NAME_EXACT: 'Exact normalized name',
  NAME_SIMILARITY: 'Name similarity',
  LOCATION_EXACT: 'Exact location',
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function attr(entity: EntityIntelligence, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = entity.attributes?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalize(type: string, raw: string): string {
  try {
    return normalizeByType(type as never, raw || '').normalizedValue;
  } catch {
    return (raw || '').trim().toLowerCase();
  }
}

function normalizedName(entity: EntityIntelligence): string {
  const raw =
    attr(entity, 'full_name', 'legal_name') ??
    entity.name ??
    entity.displayName ??
    '';
  return normalize('person', raw);
}

function keyFor(feature: MatchFeature['feature'], raw: string): string {
  switch (feature) {
    case 'PHONE_EXACT':
      return normalize('phone', raw);
    case 'VEHICLE_EXACT':
      return normalize('vehicle', raw);
    case 'ACCOUNT_EXACT':
      return normalize('account', raw);
    case 'EMAIL_EXACT':
      return raw.trim().toLowerCase();
    case 'IDENTIFIER_EXACT':
      return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    case 'DOB_EXACT':
      return raw.trim().replace(/[^0-9]/g, '');
    default:
      return raw.trim().toLowerCase();
  }
}

const isDigitHeavy = (s: string) => {
  const digits = s.replace(/\D/g, '').length;
  return digits > 0 && digits / s.length > 0.5;
};

// Name-recognized attributes. Names come only from explicit name/identity
// keys (name, full_name, legal_name, holder, owner) — never from an entity's
// own identifier value (phone number, account number, vehicle plate).
function nameValues(entity: EntityIntelligence): string[] {
  const fromProfile =
    entity.entityType === 'person' || entity.entityType === 'organization'
      ? [entity.name, entity.displayName].filter((v): v is string => Boolean(v && v.trim()))
      : [];
  return [
    ...fromProfile,
    ...(['full_name', 'legal_name', 'holder', 'owner'] as const)
      .flatMap((k) => (attr(entity, k) ? [attr(entity, k)!] : []))
      .filter((v, i, arr) => arr.indexOf(v) === i),
  ];
}

function nameTokens(entity: EntityIntelligence): string[] {
  return normalizedName(entity)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const nameSimilarity = (a: string, b: string): number => {
  const base = a.trim().toLowerCase();
  const other = b.trim().toLowerCase();
  if (base === other) return 1;
  const la = Math.max(base.length, other.length);
  if (la === 0) return 0;
  let dist = 0;
  const bd = Math.min(base.length, other.length);
  for (let i = 0; i < bd; i++) if (base[i] !== other[i]) dist++;
  dist += Math.abs(base.length - other.length);
  const edit = 1 - dist / la;
  const tokens = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean);
  const sa = new Set(tokens(base));
  const sb = new Set(tokens(other));
  let overlap = 0;
  for (const t of sa) if (sb.has(t)) overlap++;
  const jaccard = new Set([...sa, ...sb]).size === 0 ? 0 : overlap / new Set([...sa, ...sb]).size;
  return Math.max(edit, jaccard);
};

function feature(
  f: MatchFeature['feature'],
  matched: boolean,
  value: string,
  v1: string,
  v2: string,
  source1?: string,
  source2?: string
): MatchFeature {
  return {
    feature: f,
    label: FEATURE_LABELS[f],
    matched,
    value,
    weight: FEATURE_WEIGHTS[f],
    value_1: v1,
    value_2: v2,
    normalized_1: keyFor(f, v1),
    normalized_2: keyFor(f, v2),
    source_1: source1 ?? null,
    source_2: source2 ?? null,
  };
}

interface IdentifierSlot {
  feature: MatchFeature['feature'];
  keys: string[];
  value: string;
}

function identifierSlots(e: EntityIntelligence): IdentifierSlot[] {
  const slots: IdentifierSlot[] = [];
  const phone = attr(e, 'phone', 'phone_number', 'alternate_phone');
  if (phone) slots.push({ feature: 'PHONE_EXACT', keys: ['phone'], value: phone });
  const email = attr(e, 'email');
  if (email) slots.push({ feature: 'EMAIL_EXACT', keys: ['email'], value: email });
  const idNumber = attr(e, 'id_number', 'pan', 'gstin', 'aadhaar', 'passport');
  if (idNumber) slots.push({ feature: 'IDENTIFIER_EXACT', keys: ['id_number'], value: idNumber });
  const vehicle = attr(e, 'vehicle_number');
  if (vehicle) slots.push({ feature: 'VEHICLE_EXACT', keys: ['vehicle'], value: vehicle });
  const account = attr(e, 'account_number');
  if (account) slots.push({ feature: 'ACCOUNT_EXACT', keys: ['account'], value: account });
  const dob = attr(e, 'date_of_birth');
  if (dob) slots.push({ feature: 'DOB_EXACT', keys: ['dob'], value: dob });
  return slots;
}

/** Blocking keys per entity — mirrors the backend (no cross-investigation leak). */
export function blockingKeysFor(entity: EntityIntelligence): Set<string> {
  const keys = new Set<string>();
  for (const slot of identifierSlots(entity)) {
    const k = keyFor(slot.feature, slot.value);
    if (k) keys.add(`${slot.feature}:${k}`);
  }
  for (const name of nameValues(entity)) {
    const n = keyFor('NAME_EXACT', name);
    if (n) keys.add(`name:${n}`);
  }
  return keys;
}

function evaluatePair(a: EntityIntelligence, b: EntityIntelligence): {
  score: number;
  state: EntityResolutionCandidate['verification_state'];
  confidence: EntityResolutionCandidate['confidence'];
  features: MatchFeature[];
  contradictions: ResolutionContradiction[];
} {
  const features: MatchFeature[] = [];
  const contradictions: ResolutionContradiction[] = [];

  const slotsA = identifierSlots(a);
  const slotsB = identifierSlots(b);

  for (const slotA of slotsA) {
    const slotB = slotsB.find((s) => s.feature === slotA.feature);
    if (!slotB) continue;
    const na = keyFor(slotA.feature, slotA.value);
    const nb = keyFor(slotA.feature, slotB.value);
    if (na && na === nb) {
      features.push(feature(slotA.feature, true, 'Exact match', slotA.value, slotB.value));
    } else {
      contradictions.push({
        type: 'conflict',
        field: slotA.feature,
        values: [slotA.value, slotB.value],
        detail: `Conflicting ${FEATURE_LABELS[slotA.feature].toLowerCase()}`,
        label: FEATURE_LABELS[slotA.feature],
      });
    }
  }

  const namesA = nameValues(a);
  const namesB = nameValues(b);
  if (namesA.length && namesB.length) {
    let exact: string | undefined;
    let bestSim = 0;
    for (const na of namesA) {
      for (const nb of namesB) {
        if (keyFor('NAME_EXACT', na) === keyFor('NAME_EXACT', nb)) {
          exact = `${na} ↔ ${nb}`;
          break;
        }
      }
      if (exact) break;
    }
    if (exact) {
      features.push(feature('NAME_EXACT', true, 'Exact match', namesA[0], namesB[0]));
    } else {
      for (const na of namesA) {
        for (const nb of namesB) {
          if (na === nb || isDigitHeavy(na) || isDigitHeavy(nb)) continue;
          const sim = nameSimilarity(na, nb);
          if (sim >= 0.6 && sim > bestSim) bestSim = sim;
        }
      }
      if (bestSim >= 0.6) {
        features.push(feature('NAME_SIMILARITY', true, `${Math.round(bestSim * 100)}%`, namesA[0], namesB[0]));
      }
    }
  }

  const [locA, locB] = [attr(a, 'location', 'city'), attr(b, 'location', 'city')];
  if (locA && locB) {
    const nl = normalize('location', locA);
    const nl2 = normalize('location', locB);
    if (nl && nl === nl2) features.push(feature('LOCATION_EXACT', true, 'Exact match', locA, locB));
  }

  const strongCount = features.filter((f) => STRONG_FEATURES.includes(f.feature)).length;
  const weakCount = features.filter((f) => WEAK_FEATURES.includes(f.feature)).length;

  let score = 0;
  if (strongCount > 0) {
    score = Math.min(0.82 + 0.05 * (strongCount - 1), 0.97) + Math.min(weakCount * 0.03, 0.12);
  } else {
    score = Math.min(0.15 + weakCount * 0.12, 0.45);
  }

  score = clamp(score - contradictions.length * 0.25);

  let state: EntityResolutionCandidate['verification_state'] = 'possible';
  if (score >= 0.8) state = 'auto_resolved';
  else if (score >= 0.5) state = 'needs_review';

  let confidence: EntityResolutionCandidate['confidence'] = 'LOW';
  if (score >= 0.8) confidence = 'HIGH';
  else if (score >= 0.55) confidence = 'MEDIUM';

  return { score, state, confidence, features, contradictions };
}

function sourceRefsFor(entity: EntityIntelligence): ResolutionSourceRef[] {
  const refs: ResolutionSourceRef[] = [];
  const name = entity.name ?? entity.displayName ?? '';
  refs.push({
    source_dataset: 'CDR Extract',
    source_record: `${entity.id} (profile)`,
    source_type: 'structured_mapping',
    original_value: name,
    normalized_value: normalizedName(entity),
    dataset_id: null,
    evidence_refs: [],
  });
  const holder = attr(entity, 'holder', 'owner');
  if (holder) {
    refs.push({
      source_dataset: 'Registry Extract',
      source_record: null,
      source_type: 'structured_mapping',
      original_value: holder,
      normalized_value: normalize('person', holder),
      dataset_id: null,
      evidence_refs: [],
    });
  }
  return refs;
}

/** Deterministic blocking-based candidate generation for a set of entities. */
export function buildLinkageCandidates(
  entities: EntityIntelligence[],
  investigationId: string,
  now = LINKAGE_EPOCH
): EntityResolutionCandidate[] {
  const index = new Map<string, EntityIntelligence[]>();
  const sorted = [...entities].sort((a, b) => a.id.localeCompare(b.id));
  for (const e of sorted) {
    for (const key of blockingKeysFor(e)) {
      const list = index.get(key) ?? [];
      list.push(e);
      index.set(key, list);
    }
  }

  const seen = new Set<string>();
  const candidates: EntityResolutionCandidate[] = [];

  for (const list of index.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.id === b.id) continue;
        const pairKey = [a.id, b.id].sort().join('::');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        const { score, state, confidence, features, contradictions } = evaluatePair(a, b);
        if (score <= 0) continue;

        const blockingKeysA = blockingKeysFor(a);
const blockingKeysB = blockingKeysFor(b);
const sharedKeys = Array.from(blockingKeysA).filter((k) => blockingKeysB.has(k)).sort();

        candidates.push({
          id: `cand-${pairKey.replace(/[^a-z0-9]/gi, '-')}`,
          investigation_id: investigationId,
          entity_id_1: a.id,
          entity_id_2: b.id,
          entity_1_name: a.displayName ?? a.name,
          entity_2_name: b.displayName ?? b.name,
          entity_1_type: a.entityType,
          entity_2_type: b.entityType,
          confidence,
          linkage_score: Math.round(score * 100) / 100,
          resolution_version: LINKAGE_ALGORITHM_VERSION,
          resolution_method: 'auto',
          matched_features: features,
          contradictions,
          source_refs: [...sourceRefsFor(a), ...sourceRefsFor(b)],
          matching_attributes: features,
          evidence: features.filter((f) => f.matched).map((f) => f.label),
          verification_state: state,
          last_evaluated_at: now,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          metadata: {
            tier: score >= 0.8 ? 'TIER1_STRONG_IDENTIFIER' : 'TIER3_NAME_ATTRIBUTE_SIMILARITY',
            blocking_keys: sharedKeys,
          },
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  return candidates.sort((a, b) => {
    const key = (c: EntityResolutionCandidate) => `${c.entity_id_1}::${c.entity_id_2}`;
    return key(a).localeCompare(key(b)) || b.linkage_score - a.linkage_score;
  });
}