// ============================================================
// KNOWLEDGE CANVAS — MERGE SUGGESTIONS (PORT)
// ============================================================
// Deterministic candidate-entity merge suggestions over the current
// visual layer (Jaccard label overlap + shared distinctive tokens such
// as contract / account numbers). Suggestions are advisory only — the
// authoritative entity-resolution workflow lives in Trinetra.
// ============================================================

export interface MergeSuggestion {
  a: string;
  b: string;
  score: number;
  reason: string;
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'ltd',
  'pvt',
  'mrs',
  'mr',
  'shri',
]);

export function labelTokens(label: string): string[] {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : inter / union;
}

function sharesDistinctiveToken(a: string[], b: string[]): boolean {
  const distinctive = (arr: string[]) =>
    arr.filter((t) => /[0-9]{4,}/.test(t) || /[ivx]+|\b\d+\b/.test(t));
  const setB = new Set(distinctive(b));
  return distinctive(a).some((t) => setB.has(t));
}

/** Advisory merge candidates; threshold applied to reduce noise. */
export function mergeSuggestions(
  items: { id: string; label: string; kind: string }[],
  threshold = 0.5,
): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = [];
  const ids = [...items.map((i) => i.id)].sort();
  const byId = new Map(items.map((i) => [i.id, i]));
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = byId.get(ids[i])!;
      const b = byId.get(ids[j])!;
      if (a.kind !== b.kind) continue;
      const ta = labelTokens(a.label);
      const tb = labelTokens(b.label);
      if (ta.length === 0 || tb.length === 0) continue;
      const jac = jaccard(ta, tb);
      const distinctive = sharesDistinctiveToken(ta, tb);
      if (jac <= 0 || (jac < 1 && !distinctive)) continue; // keep exact-near-dupes + identifier matches
      const score = distinctive ? 0.9 : Math.min(jac + 0.4, 0.95);
      if (score < threshold) continue;
      suggestions.push({
        a: a.id,
        b: b.id,
        score: Number(score.toFixed(2)),
        reason: distinctive ? 'shared distinctive identifier' : 'matching name tokens',
      });
    }
  }
  return suggestions.sort((x, y) => y.score - x.score || x.a.localeCompare(y.a));
}