import type { EntityIntelligence, EntityType } from '@trinetra-pulse/types';
import { matchEntityScore, queryEntities, uniqueEntityTypes } from '../entity-search';

function entity(id: string, over: Partial<EntityIntelligence> = {}): EntityIntelligence {
  return {
    id,
    name: 'Rahul Kumar',
    displayName: 'Rahul Kumar',
    entityType: 'person',
    resolutionState: 'CONFIRMED',
    confidence: 0.92,
    sourcesCount: 3,
    connectionsCount: 5,
    eventsCount: 2,
    evidenceCount: 4,
    activityCount: 1,
    isVerified: false,
    isFlagged: false,
    aliases: [],
    attributes: {},
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-25T00:00:00Z',
    ...over,
  };
}

const rahul = entity('ent-1', {
  name: 'Rahul Kumar',
  attributes: { phone: '+91 98765 43210', city: 'Pune' },
  updatedAt: '2026-08-25T00:00:00Z',
});
const priya = entity('ent-2', {
  name: 'Priya Sharma',
  entityType: 'phone',
  attributes: { phone: '+91 98123 45678' },
  resolutionState: 'POSSIBLE',
  confidence: 0.55,
  updatedAt: '2026-08-24T00:00:00Z',
});
const meera = entity('ent-3', {
  name: 'Meera Reddy',
  entityType: 'vehicle',
  attributes: { vehicle: 'MH14BX2231' },
  resolutionState: 'PROBABLE',
  confidence: 0.78,
  updatedAt: '2026-08-23T00:00:00Z',
});

const all = [rahul, priya, meera];

describe('matchEntityScore', () => {
  it('returns 1 for a direct text hit', () => {
    expect(matchEntityScore(rahul, 'rahul kumar')).toBe(1);
  });

  it('matches attribute values like phones', () => {
    expect(matchEntityScore(rahul, '98765 43210')).toBeGreaterThan(0);
  });

  it('returns 0 for an empty query', () => {
    expect(matchEntityScore(rahul, '   ')).toBe(0);
  });
});

describe('queryEntities', () => {
  it('returns everything when no params are supplied', () => {
    const { items, total } = queryEntities(all, {});
    expect(total).toBe(3);
    expect(items.length).toBe(3);
  });

  it('searches and ranks by relevance', () => {
    const { items } = queryEntities(all, { query: 'rahul' });
    expect(items[0].id).toBe('ent-1');
  });

  it('filters by entity type', () => {
    const { items } = queryEntities(all, { entityType: 'phone' });
    expect(items.map((e) => e.id)).toEqual(['ent-2']);
  });

  it('filters by resolution state', () => {
    const { items } = queryEntities(all, { resolutionState: 'PROBABLE' });
    expect(items.map((e) => e.id)).toEqual(['ent-3']);
  });

  it('filters by a confidence floor', () => {
    const { items } = queryEntities(all, { confidenceMin: 0.6 });
    expect(items.map((e) => e.id)).toEqual(['ent-1', 'ent-3']);
  });

  it('sorts by updated descending by default', () => {
    const { items } = queryEntities(all, {});
    expect(items.map((e) => e.id)).toEqual(['ent-1', 'ent-2', 'ent-3']);
  });

  it('sorts by confidence ascending when requested', () => {
    const { items } = queryEntities(all, { sortBy: 'confidence', sortOrder: 'asc' });
    expect(items.map((e) => e.id)).toEqual(['ent-2', 'ent-3', 'ent-1']);
  });

  it('paginates results', () => {
    const { items, total } = queryEntities(all, { page: 2, pageSize: 2 });
    expect(total).toBe(3);
    expect(items.map((e) => e.id)).toEqual(['ent-3']);
  });
});

describe('uniqueEntityTypes', () => {
  it('returns unique types in first-seen order', () => {
    const types = uniqueEntityTypes(all);
    expect(types).toEqual(['person', 'phone', 'vehicle'] as EntityType[]);
  });
});