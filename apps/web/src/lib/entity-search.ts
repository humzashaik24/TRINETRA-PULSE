import type {
  EntityIntelligence,
  EntitySearchParams,
  EntityType,
} from '@trinetra-pulse/types';
import { normalizeByType } from './entity-normalization';

// ============================================================
// ENTITY SEARCH
// ============================================================
// Client-side search interface prepared for server-side backfill.
// Searches across name, phone, vehicle, account, location,
// organization, case, event and attributes.
// ============================================================

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Derives a searchable text blob from an entity profile. */
function searchableText(entity: EntityIntelligence): string {
  const parts: string[] = [
    entity.name,
    entity.canonicalName ?? '',
    entity.displayName,
    entity.description ?? '',
    ...(entity.aliases ?? []),
  ];

  const attr = entity.attributes ?? {};
  const attrValues: string[] = [];
  const pushAttr = (key: string) => {
    const v = attr[key];
    if (typeof v === 'string') attrValues.push(v);
    else if (Array.isArray(v)) attrValues.push(...v.filter((x): x is string => typeof x === 'string'));
    else if (v !== null && typeof v === 'object') attrValues.push(JSON.stringify(v));
  };

  ['phone', 'phoneNumber', 'alternate_phone', 'vehicle_number', 'vehicle', 'registration',
    'account_number', 'account', 'location', 'address', 'city', 'organization', 'org',
    'case_number', 'case_id', 'event_type', 'event', 'email', 'id_number'].forEach(pushAttr);

  return normalizeQuery(parts.concat(attrValues).join(' '));
}

/** Matches an entity against a query, returning a relevance score. */
export function matchEntityScore(entity: EntityIntelligence, query: string): number {
  const q = normalizeQuery(query);
  if (!q) return 0;

  const text = searchableText(entity);
  if (text.includes(q)) return 1;

  // Token-based partial score
  const tokens = q.split(' ');
  let matched = 0;
  for (const tok of tokens) if (text.includes(tok)) matched++;
  return tokens.length > 0 ? matched / tokens.length : 0;
}

/**
 * Applies search/filter/sort/pagination to a dataset.
 * Mirrors the eventual server-side contract so the API client can
 * replace this implementation transparently.
 */
export function queryEntities(
  entities: EntityIntelligence[],
  params: EntitySearchParams
): { items: EntityIntelligence[]; total: number } {
  const {
    query,
    entityType,
    confidenceMin,
    resolutionState,
    page,
    pageSize,
    sortBy,
    sortOrder,
  } = params;

  let filtered = entities;

  if (query && query.trim()) {
    const q = query.trim();
    filtered = filtered
      .map((e) => ({ e, score: matchEntityScore(e, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.e);
  }

  if (entityType && entityType !== 'all') {
    filtered = filtered.filter((e) => e.entityType === entityType);
  }

  if (confidenceMin !== undefined && confidenceMin > 0) {
    filtered = filtered.filter((e) => e.confidence >= confidenceMin);
  }

  if (resolutionState && resolutionState !== 'all') {
    filtered = filtered.filter((e) => e.resolutionState === resolutionState);
  }

  // Sorting
  const dir = sortOrder === 'asc' ? 1 : -1;
  const sortKey = sortBy ?? 'updated';
  filtered = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'name':
        return a.displayName.localeCompare(b.displayName) * dir;
      case 'type':
        return (a.entityType.localeCompare(b.entityType)) * dir;
      case 'confidence':
        return (a.confidence - b.confidence) * dir;
      case 'sources':
        return (a.sourcesCount - b.sourcesCount) * dir;
      case 'connections':
        return (a.connectionsCount - b.connectionsCount) * dir;
      case 'activity':
        return (a.activityCount - b.activityCount) * dir;
      case 'resolution':
        return (a.resolutionState.localeCompare(b.resolutionState)) * dir;
      case 'updated':
      default: {
        const timeDiff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        return timeDiff * dir;
      }
    }
  });

  const total = filtered.length;
  const size = pageSize ?? 20;
  const current = page ?? 1;
  const start = (current - 1) * size;
  const items = filtered.slice(start, start + size);

  return { items, total };
}

/** Filters/sorts a set of entity types for the list header. */
export function uniqueEntityTypes(entities: EntityIntelligence[]): EntityType[] {
  const seen = new Set<EntityType>();
  for (const e of entities) seen.add(e.entityType);
  return Array.from(seen);
}