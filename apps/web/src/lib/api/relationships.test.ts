/**
 * Tests for the Phase 17.8 typed relationship API adapter.
 *
 * Covers the deterministic vocabulary translation (relationship_type →
 * RelationshipKind, verification_status → RelationshipCandidateStatus,
 * extraction_method → ExtractionMethod), the mapping of persisted
 * ``RealRelationship`` rows into the ``EntityRelationship`` UI shape with
 * resolved entity names, the scoped detail read, the entity-scoped
 * relationship loader, and the no-silent-fallback guarantee.
 */

import {
  relationshipKindFrom,
  verificationStatusFrom,
  extractionMethodFrom,
  canonicalRelationshipId,
  mapApiRelationship,
  loadRelationshipDetail,
  loadEntityRelationships,
} from './relationships';
import type { RealEntity, RealRelationship } from './investigations';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
  API_BASE_URL: '/api/v2',
}));

jest.mock('./investigations', () => ({
  getRelationship: jest.fn(),
  getRelationshipScoped: jest.fn(),
  listRelationshipsForInvestigation: jest.fn(),
  listEntitiesForInvestigation: jest.fn(),
  getEntity: jest.fn(),
  getEntityScoped: jest.fn(),
}));

import {
  getRelationship,
  getRelationshipScoped,
  listRelationshipsForInvestigation,
  listEntitiesForInvestigation,
  getEntity,
  getEntityScoped,
} from './investigations';

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

const mockedApi = jest.mocked({
  getRelationship,
  getRelationshipScoped,
  listRelationshipsForInvestigation,
  listEntitiesForInvestigation,
  getEntity,
  getEntityScoped,
});

const RAHUL_ID = '11111111-1111-5111-8111-111111111111';
const PHONE_ID = '22222222-2222-5222-8222-222222222222';
const REL_ID = '33333333-3333-5333-8333-333333333333';

const rahul: RealEntity = {
  id: RAHUL_ID,
  investigation_id: INVESTIGATION_ID,
  entity_type: 'person',
  canonical_name: 'rahul kumar',
  name: 'Rahul Kumar',
  description: null,
  attributes: {},
  confidence: 0.95,
  risk_score: 0.8,
  is_verified: true,
  is_flagged: true,
  metadata: {},
  created_at: '2026-08-18T09:00:00',
  updated_at: '2026-08-18T09:00:00',
};

const phone: RealEntity = {
  id: PHONE_ID,
  investigation_id: INVESTIGATION_ID,
  entity_type: 'phone',
  canonical_name: 'phone',
  name: '+91 98765 43210',
  description: null,
  attributes: {},
  confidence: 1,
  risk_score: 0.5,
  is_verified: false,
  is_flagged: false,
  metadata: {},
  created_at: '2026-08-18T09:00:00',
  updated_at: '2026-08-18T09:00:00',
};

const rel001 = (overrides: Partial<RealRelationship> = {}): RealRelationship => ({
  id: REL_ID,
  investigation_id: INVESTIGATION_ID,
  source_entity_id: RAHUL_ID,
  target_entity_id: PHONE_ID,
  relationship_type: 'associated_with',
  confidence: 0.98,
  source: 'CDR Extract - Operation clean',
  evidence_refs: ['cdr_extract.csv #2241'],
  extraction_method: 'manual',
  verification_status: 'confirmed',
  description: 'Subscriber link between person of interest and primary device.',
  weight: 1,
  metadata: { is_demo: true },
  created_at: '2026-08-18T10:20:00',
  updated_at: '2026-08-18T10:20:00',
  ...overrides,
});

describe('vocabulary translation', () => {
  it('maps known_associiate (documented spelling) / family to KNOWS', () => {
    expect(relationshipKindFrom('known_associiate')).toBe('KNOWS');
    expect(relationshipKindFrom('known_associate')).toBe('KNOWS');
    expect(relationshipKindFrom('family')).toBe('KNOWS');
  });

  it('maps transaction / owns / located_at / communicates', () => {
    expect(relationshipKindFrom('transaction')).toBe('SENT_TRANSACTION');
    expect(relationshipKindFrom('owns')).toBe('OWNS');
    expect(relationshipKindFrom('located_at')).toBe('LOCATED_AT');
    expect(relationshipKindFrom('communicates')).toBe('USES');
    expect(relationshipKindFrom('contacts')).toBe('USES');
    expect(relationshipKindFrom('member_of')).toBe('PART_OF');
  });

  it('maps associated_with to USES for person↔device links', () => {
    expect(relationshipKindFrom('associated_with', 'person', 'phone')).toBe('USES');
    expect(relationshipKindFrom('associated_with', 'person', 'person')).toBe('INVOLVED_IN');
  });

  it('maps other to WORKS_FOR for organization links, PART_OF otherwise', () => {
    expect(relationshipKindFrom('other', 'person', 'organization')).toBe('WORKS_FOR');
    expect(relationshipKindFrom('other', 'person', 'person')).toBe('PART_OF');
  });

  it('falls back to the neutral PART_OF for unknown types', () => {
    expect(relationshipKindFrom('whatever')).toBe('PART_OF');
  });

  it('maps verification statuses including possible → CANDIDATE', () => {
    expect(verificationStatusFrom('confirmed')).toBe('CONFIRMED');
    expect(verificationStatusFrom('probable')).toBe('PROBABLE');
    expect(verificationStatusFrom('possible')).toBe('CANDIDATE');
    expect(verificationStatusFrom('rejected')).toBe('REJECTED');
    expect(verificationStatusFrom('needs_review')).toBe('NEEDS_REVIEW');
    expect(verificationStatusFrom(undefined)).toBe('NEEDS_REVIEW');
    expect(verificationStatusFrom('bogus')).toBe('NEEDS_REVIEW');
  });

  it('maps extraction methods deterministically', () => {
    expect(extractionMethodFrom('manual')).toBe('MANUAL');
    expect(extractionMethodFrom('ai_nlp')).toBe('NLP');
    expect(extractionMethodFrom('database_import')).toBe('STRUCTURED_MAPPING');
    expect(extractionMethodFrom('ai_cv')).toBe('ANALYTICAL');
    expect(extractionMethodFrom('ai_audio')).toBe('ANALYTICAL');
    expect(extractionMethodFrom('network_analysis')).toBe('ANALYTICAL');
    expect(extractionMethodFrom('document_parse')).toBe('RULE_BASED');
    expect(extractionMethodFrom(undefined)).toBe('MANUAL');
  });
});

describe('mapApiRelationship', () => {
  it('resolves entity names/types and flattens the persisted row', () => {
    const byId = new Map<string, RealEntity>([
      [RAHUL_ID, rahul],
      [PHONE_ID, phone],
    ]);
    const mapped = mapApiRelationship(rel001(), byId);
    expect(mapped).toMatchObject({
      id: REL_ID,
      sourceEntityId: RAHUL_ID,
      sourceEntityName: 'Rahul Kumar',
      sourceEntityType: 'person',
      targetEntityId: PHONE_ID,
      targetEntityName: '+91 98765 43210',
      targetEntityType: 'phone',
      type: 'USES',
      confidence: 0.98,
      source: 'CDR Extract - Operation clean',
      evidence: ['cdr_extract.csv #2241'],
      extractionMethod: 'MANUAL',
      verificationStatus: 'CONFIRMED',
    });
    expect(mapped.timestamp).toBe('2026-08-18T10:20:00');
    expect(mapped.metadata).toEqual({ is_demo: true });
  });

  it('keeps the persisted uuid when no canonical id is stored', () => {
    expect(canonicalRelationshipId(rel001())).toBe(REL_ID);
    expect(
      canonicalRelationshipId(rel001({ metadata: { canonical_id: 'rel-001' } })),
    ).toBe('rel-001');
  });

  it('surfaces the raw uuid as a name when the entity lookup misses', () => {
    const byId = new Map<string, RealEntity>();
    const mapped = mapApiRelationship(rel001(), byId);
    expect(mapped.sourceEntityName).toBe(RAHUL_ID);
    expect(mapped.sourceEntityType).toBe('person');
  });
});

describe('loadRelationshipDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the scoped read and resolves entity names', async () => {
    mockedApi.getRelationshipScoped.mockResolvedValue(rel001() as never);
    mockedApi.getEntityScoped.mockResolvedValueOnce(rahul as never);
    mockedApi.getEntityScoped.mockResolvedValueOnce(phone as never);

    const rel = await loadRelationshipDetail(REL_ID, INVESTIGATION_ID);

    expect(mockedApi.getRelationshipScoped).toHaveBeenCalledWith(
      REL_ID,
      INVESTIGATION_ID,
    );
    expect(mockedApi.getEntityScoped).toHaveBeenCalledTimes(2);
    expect(rel.sourceEntityName).toBe('Rahul Kumar');
    expect(rel.targetEntityName).toBe('+91 98765 43210');
    expect(rel.type).toBe('USES');
  });

  it('falls back to the unscoped read when no investigation id is given', async () => {
    mockedApi.getRelationship.mockResolvedValue(rel001() as never);
    mockedApi.getEntity.mockResolvedValue(rahul as never);

    await loadRelationshipDetail(REL_ID);

    expect(mockedApi.getRelationship).toHaveBeenCalledWith(REL_ID);
    expect(mockedApi.getRelationshipScoped).not.toHaveBeenCalled();
  });

  it('surfaces API failures without a mock fallback', async () => {
    mockedApi.getRelationshipScoped.mockRejectedValue(new Error('not found'));
    await expect(
      loadRelationshipDetail(REL_ID, INVESTIGATION_ID),
    ).rejects.toThrow('not found');
  });
});

describe('loadEntityRelationships', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns only the relationships touching the entity, sorted by confidence', async () => {
    mockedApi.listRelationshipsForInvestigation.mockResolvedValue([
      rel001({ id: 'a', confidence: 0.3, source: 's1' }),
      rel001({ id: 'b', confidence: 0.98, source: 's2' }),
      rel001({ id: 'c', confidence: 0.9 }),
    ] as never);
    mockedApi.listEntitiesForInvestigation.mockResolvedValue([
      rahul,
      phone,
    ] as never);

    const result = await loadEntityRelationships(RAHUL_ID, INVESTIGATION_ID);

    expect(mockedApi.listRelationshipsForInvestigation).toHaveBeenCalledWith(
      INVESTIGATION_ID,
    );
    expect(result.relationships.map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(result.count).toBe(3);

    // related excludes the focus entity itself; other-side is derived.
    expect(result.related).toHaveLength(3);
    const first = result.related[0];
    expect(first.id).toBe(PHONE_ID);
    expect(first.name).toBe('+91 98765 43210');
    expect(first.entityType).toBe('phone');
    expect(first.relationshipType).toBe('USES');
  });

  it('returns empty slices when the entity has no relationships', async () => {
    mockedApi.listRelationshipsForInvestigation.mockResolvedValue([] as never);
    mockedApi.listEntitiesForInvestigation.mockResolvedValue([] as never);

    const result = await loadEntityRelationships(RAHUL_ID, INVESTIGATION_ID);
    expect(result.relationships).toEqual([]);
    expect(result.related).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('surfaces API failures without a mock fallback', async () => {
    mockedApi.listRelationshipsForInvestigation.mockRejectedValue(
      new Error('fetch failed'),
    );
    await expect(
      loadEntityRelationships(RAHUL_ID, INVESTIGATION_ID),
    ).rejects.toThrow('fetch failed');
  });
});