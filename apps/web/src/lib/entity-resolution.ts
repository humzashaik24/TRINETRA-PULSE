import type {
  EntityCandidate,
  ResolutionDecision,
  ResolutionSignal,
  ResolutionState,
} from '@trinetra-pulse/types';
import { normalizeByType } from './entity-normalization';

// ============================================================
// ENTITY RESOLUTION
// ============================================================
// Deliverable, transparent similarity analysis:
//   candidate A + candidate B -> signals -> confidence -> recommendation
// The system NEVER auto-merges. It produces recommendations that an
// analyst must confirm/reject.
// ============================================================

// ------------------------------------------------------------
// String similarity primitives
// ------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    prev.splice(0, prev.length, ...curr);
  }
  return curr[b.length];
}

/** Normalized Levenshtein similarity in [0,1]. */
export function editSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

/** Jaccard similarity over tokens. */
export function tokenJaccard(a: string, b: string): number {
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let intersection = 0;
  for (const tok of sa) if (sb.has(tok)) intersection++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : intersection / union;
}

function bigrams(s: string): Set<string> {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length < 2) return new Set(clean ? [clean] : []);
  const out = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) out.add(clean.slice(i, i + 2));
  return out;
}

/** Bigram (Sørensen–Dice) similarity in [0,1]. Robust to slight variations. */
export function bigramSimilarity(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (ga.size === 0 || gb.size === 0) return a.toLowerCase().replace(/[^a-z0-9]/g, '') === b.toLowerCase().replace(/[^a-z0-9]/g, '') ? 1 : 0;
  let overlap = 0;
  for (const g of ga) if (gb.has(g)) overlap++;
  return (2 * overlap) / (ga.size + gb.size);
}

/** Best-of composite similarity for names. */
export function nameSimilarity(a: string, b: string): number {
  return Math.max(tokenJaccard(a, b), bigramSimilarity(a, b), editSimilarity(a, b) * 0.9);
}

// ------------------------------------------------------------
// Signal helpers
// ------------------------------------------------------------

function typedKey(type: string, raw: string): string {
  try {
    return normalizeByType(type as never, raw || '').normalizedValue;
  } catch {
    return (raw || '').trim().toLowerCase();
  }
}

function getAttribute(candidate: EntityCandidate, key: string): string | undefined {
  const value = candidate.attributes?.[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function signal(
  id: string,
  label: string,
  value: string,
  weight: number,
  source: string,
  match: boolean | null,
  rawA?: string,
  rawB?: string
): ResolutionSignal {
  return { id, signal: id, displayLabel: label, value, weight, source, match, rawValueA: rawA, rawValueB: rawB };
}

// ------------------------------------------------------------
// Comparison
// ------------------------------------------------------------

export interface CandidateComparison {
  similarity: number;
  confidence: number;
  state: ResolutionState;
  recommendation: ResolutionDecision;
  signals: ResolutionSignal[];
  summaryReason: string;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function recommendationFor(confidence: number): { decision: ResolutionDecision; state: ResolutionState } {
  if (confidence >= 0.82) return { decision: 'MERGE', state: 'PROBABLE' };
  if (confidence >= 0.55) return { decision: 'REVIEW', state: 'NEEDS_REVIEW' };
  return { decision: 'KEEP_SEPARATE', state: 'POSSIBLE' };
}

/**
 * Compares two candidates and produces explainable evidence.
 * Honest weighted signal aggregation — the analyst makes the final call.
 */
export function compareCandidates(a: EntityCandidate, b: EntityCandidate): CandidateComparison {
  const signals: ResolutionSignal[] = [];
  const source = `${a.source} / ${b.source}`;

  // 1. Core value similarity (raw vs normalized)
  if (a.entityType === b.entityType) {
    const aKey = typedKey(a.entityType, a.rawValue);
    const bKey = typedKey(b.entityType, b.rawValue);
    if (aKey && bKey) {
      const exact = aKey === bKey;
      const sim = exact ? 1 : Math.max(nameSimilarity(aKey, bKey), editSimilarity(aKey, bKey));
      signals.push(
        signal(
          'value_similarity',
          a.entityType === 'person' ? 'Name similarity' : 'Value similarity',
          exact ? 'Exact match' : `${Math.round(sim * 100)}%`,
          a.entityType === 'person' ? 0.4 : a.entityType === 'phone' ? 0.7 : 0.5,
          source,
          exact ? true : sim >= 0.6,
          a.rawValue,
          b.rawValue
        )
      );
    }
  } else {
    signals.push(signal('type_mismatch', 'Entity type', `${a.entityType} vs ${b.entityType}`, 0.6, source, false));
  }

  if (a.entityType === 'person' && b.entityType === 'person') {
    // 2. Phone
    const phoneA = getAttribute(a, 'phone');
    const phoneB = getAttribute(b, 'phone');
    if (phoneA && phoneB) {
      const match = typedKey('phone', phoneA) === typedKey('phone', phoneB);
      signals.push(
        signal('shared_phone', 'Shared phone', match ? 'Exact match' : 'Different', 0.3, source, match, phoneA, phoneB)
      );
    } else if (phoneA || phoneB) {
      signals.push(signal('shared_phone', 'Shared phone', 'Not available on both', 0.3, source, null));
    }

    // 3. Location
    const locA = getAttribute(a, 'location') ?? getAttribute(a, 'address');
    const locB = getAttribute(b, 'location') ?? getAttribute(b, 'address');
    if (locA && locB) {
      const match = typedKey('location', locA) === typedKey('location', locB);
      signals.push(
        signal('shared_location', 'Shared location', match ? 'Same location' : 'Different location', 0.2, source, match, locA, locB)
      );
    }

    // 4. Organization
    const orgA = getAttribute(a, 'organization');
    const orgB = getAttribute(b, 'organization');
    if (orgA && orgB) {
      const match = typedKey('organization', orgA) === typedKey('organization', orgB);
      signals.push(
        signal('shared_organization', 'Shared organization', match ? 'Same organization' : 'Different', 0.1, source, match, orgA, orgB)
      );
    }
  }

  if (a.entityType === 'vehicle' || a.entityType === 'account' || a.entityType === 'transaction') {
    const ownerA = getAttribute(a, 'owner') ?? getAttribute(a, 'holder');
    const ownerB = getAttribute(b, 'owner') ?? getAttribute(b, 'holder');
    if (ownerA && ownerB) {
      const match = typedKey('person', ownerA) === typedKey('person', ownerB);
      signals.push(
        signal('shared_owner', 'Shared owner', match ? 'Same owner' : 'Different owner', 0.3, source, match, ownerA, ownerB)
      );
    }
    const locA2 = getAttribute(a, 'location');
    const locB2 = getAttribute(b, 'location');
    if (locA2 && locB2) {
      const match = typedKey('location', locA2) === typedKey('location', locB2);
      signals.push(
        signal('shared_location', 'Shared location', match ? 'Same location' : 'Different', 0.2, source, match, locA2, locB2)
      );
    }
  }

  const sourceConsistency = Math.min(a.source === b.source ? 1 : 0.3, 1);
  if (signals.length > 0) {
    signals.push(
      signal('source_consistency', 'Source consistency', a.source === b.source ? `${a.source} (1 record)` : 'Multiple records', 0.05, source, null)
    );
  }

  // Weighted aggregate
  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0) || 1;
  const weighted = signals.reduce((sum, s) => sum + (s.match === true ? s.weight : s.match === false ? 0 : s.weight * 0.5), 0);
  const similarity = clamp(weighted / totalWeight);

  const { decision, state } = recommendationFor(similarity);

  const summaryReason = buildSummary(similarity, signals);

  return {
    similarity,
    confidence: clamp(similarity * 0.9 + 0.05 + (signals.length / 6) * 0.05),
    state,
    recommendation: decision,
    signals,
    summaryReason,
  };
}

function buildSummary(similarity: number, signals: ResolutionSignal[]): string {
  const matched = signals.filter((s) => s.match === true).length;
  const conflicting = signals.filter((s) => s.match === false).length;
  if (similarity >= 0.82) return `Strong overlap (${Math.round(similarity * 100)}%) — ${matched} supporting signal(s), ${conflicting} conflicting.`;
  if (similarity >= 0.55) return `Partial overlap (${Math.round(similarity * 100)}%) — ${matched} supporting, ${conflicting} conflicting. Analyst review recommended.`;
  return `Weak overlap (${Math.round(similarity * 100)}%) — evidence does not support merging.`;
}

// ------------------------------------------------------------
// Match retrieval helpers
// ------------------------------------------------------------

/**
 * Finds candidate pairs worth reviewing for a given candidate.
 * Returns the top-N resembling candidates for the resolution queue.
 */
export function findPotentialMatches(
  candidate: EntityCandidate,
  pool: EntityCandidate[],
  limit = 4
): Array<{ candidate: EntityCandidate; comparison: CandidateComparison }> {
  return pool
    .filter((c) => c.id !== candidate.id && c.status !== 'REJECTED')
    .map((c) => ({ candidate: c, comparison: compareCandidates(candidate, c) }))
    .filter((r) => r.comparison.similarity >= 0.3)
    .sort((x, y) => y.comparison.similarity - x.comparison.similarity)
    .slice(0, limit);
}