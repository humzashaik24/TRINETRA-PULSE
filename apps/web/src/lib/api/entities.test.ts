/**
 * Tests for the Phase 17.7 typed entity API adapter.
 *
 * Covers the mapping of persisted ``RealEntity`` rows into the Phase 6
 * ``EntityIntelligence`` shape (resolution state derivation, aliases,
 * provenance preservation), the fetch layer, the deterministic search /
 * sort / pagination semantics over the API row set, and the honest empty
 * detail bundle.
 */

import {
  canonicalEntityId,
  mapEntityIntelligence,
  loadEntityList,
  loadEntityDetailBundle,
  apiEntityOverviewSummary,
} from './entities';
import type { RealEntity } from './investigations';
import type { EntityIntelligence } from '@trinetra-pulse/types';

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
  API_BASE_URL: '/api/v2',
}));

jest.mock('./investigations', () => ({
  getEntity: jest.fn(),
  getEntityScoped: jest.fn(),
  listEntitiesForInvestigation: jest.fn(),
  listRelationshipsForInvestigation: jest.fn(),
}));

jest.mock('@/services/entity.service', () => ({}));

import {
  getEntity,
  getEntityScoped,
  listEntitiesForInvestigation,
  listRelationshipsForInvestigation,
} from './investigations';

const mockedApi = jest.mocked({
  getEntity,
  getEntityScoped,
  listEntitiesForInvestigation,
  listRelationshipsForInvestigation,
});

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

const row = (overrides: Partial<RealEntity> = {}): RealEntity => ({
  id: '11111111-1111-5111-8111-111111111111',
  investigation_id: INVESTIGATION_ID,
  entity_type: 'person',
  canonical_name: 'rahul kumar',
  name: 'Rahul Kumar',
  description: 'Individual connected to FIR-2026-001.',
  attributes: {
    full_name: 'Rahul Kumar',
    phone: '+91 98765 43210',
  },
  confidence: 0.95,
  risk_score: 0.8,
  is_verified: true,
  is_flagged: true,
  metadata: { canonical_id: 'ent-person-001', is_demo: true },
  created_at: '2026-08-18T09:00:00.000000',
  updated_at: '2026-08-18T09:00:00.000000',
  ...overrides,
});

describe('mapEntityIntelligence', () => {
  it('maps a persisted row into the UI shape preserving provenance', () => {
    const entity = mapEntityIntelligence(row());
    expect(entity).toMatchObject<Partial<EntityIntelligence>>({
      id: '11111111-1111-5111-8111-111111111111',
      name: 'Rahul Kumar',
      canonicalName: 'rahul kumar',
      displayName: 'Rahul Kumar',
      entityType: 'person',
      description: 'Individual connected to FIR-2026-001.',
      confidence: 0.95,
      isVerified: true,
      isFlagged: true,
    });
    expect(entity.aliases).toEqual(['rahul kumar']);
    expect(entity.attributes?.full_name).toBe('Rahul Kumar');
    expect(entity.createdAt).toBe('2026-08-18T09:00:00.000000');
  });

  it('derives CONFIRMED only for verified rows, NEEDS_REVIEW otherwise', () => {
    expect(mapEntityIntelligence(row()).resolutionState).toBe('CONFIRMED');
    expect(
      mapEntityIntelligence(row({ is_verified: false })).resolutionState,
    ).toBe('NEEDS_REVIEW');
  });

  it('keeps relational counts honestly at 0 (later-phase surfaces)', () => {
    const entity = mapEntityIntelligence(row());
    expect(entity.sourcesCount).toBe(0);
    expect(entity.connectionsCount).toBe(0);
    expect(entity.eventsCount).toBe(0);
    expect(entity.evidenceCount).toBe(0);
    expect(entity.activityCount).toBe(0);
  });

  it('pulls aliases from attributes and metadata', () => {
    const withAttrs = mapEntityIntelligence(
      row({ attributes: { aliases: ['Rahul', 'RK'] } }),
    );
    expect(withAttrs.aliases).toEqual(['Rahul', 'RK']);

    const withMeta = mapEntityIntelligence(
      row({ metadata: { aliases: ['Rahul Kumar Jr'] } }),
    );
    expect(withMeta.aliases).toEqual(['Rahul Kumar Jr']);
  });

  it('uses canonical_name as an alias only when it differs from the name', () => {
    const scoped = mapEntityIntelligence(
      row({ id: 'x', canonical_name: 'rk', name: 'Rahul Kumar' }),
    );
    expect(scoped.aliases).toEqual(['rk']);

    // Seeded entities are stored as lowercase canonical + title-case name,
    // so the different canonical spelling surfaces as a real alias.
    expect(mapEntityIntelligence(row()).aliases).toEqual(['rahul kumar']);
    // Identical canonical and display names produce no alias.
    expect(
      mapEntityIntelligence(
        row({ canonical_name: 'Rahul Kumar', name: 'Rahul Kumar' }),
      ).aliases,
    ).toEqual([]);
  });

  it('canonicalEntityId reconciles seeded metadata ids', () => {
    expect(canonicalEntityId(row())).toBe('ent-person-001');
    expect(canonicalEntityId(row({ metadata: {} }))).toBe(
      '11111111-1111-5111-8111-111111111111',
    );
  });
});

describe('loadEntityList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the investigation-scoped set and applies local search semantics', async () => {
    mockedApi.listEntitiesForInvestigation.mockResolvedValue([
      row({ id: 'a', name: 'Rahul Kumar', entity_type: 'person' }),
      row({ id: 'b', name: 'Vikram Patel', entity_type: 'person' }),
      row({ id: 'c', name: 'Mumbai Trading Corp', entity_type: 'organization' }),
    ] as never);

    const result = await loadEntityList(INVESTIGATION_ID, {
      query: 'vikram',
      page: 1,
      pageSize: 20,
    });

    expect(mockedApi.listEntitiesForInvestigation).toHaveBeenCalledWith(
      INVESTIGATION_ID,
    );
    expect(result.all).toHaveLength(3);
    expect(result.response.items).toHaveLength(1);
    expect(result.response.items[0].name).toBe('Vikram Patel');
    expect(result.response.total).toBe(1);
  });

  it('returns the full set with the response for the whole scoped list', async () => {
    mockedApi.listEntitiesForInvestigation.mockResolvedValue([
      row({ id: 'a', name: 'A' }),
      row({ id: 'b', name: 'B' }),
    ] as never);

    const result = await loadEntityList(INVESTIGATION_ID, { page: 1, pageSize: 2 });
    expect(result.all).toHaveLength(2);
    expect(result.response.items).toHaveLength(2);
    expect(result.response.totalPages).toBe(1);
  });

  it('surfaces API failures without falling back to mock rows', async () => {
    mockedApi.listEntitiesForInvestigation.mockRejectedValue(
      new Error('fetch failed'),
    );
    await expect(loadEntityList(INVESTIGATION_ID)).rejects.toThrow(
      'fetch failed',
    );
  });
});

describe('loadEntityDetailBundle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the scoped entity and populates real relationship slices', async () => {
    mockedApi.getEntityScoped.mockResolvedValue(row() as never);
    mockedApi.listEntitiesForInvestigation.mockResolvedValue([
      row({ id: 'phone-1111', entity_type: 'phone', name: '+91 98765 43210' }),
      row(),
    ] as never);
    mockedApi.listRelationshipsForInvestigation.mockResolvedValue([
      {
        id: 'rel-1',
        investigation_id: INVESTIGATION_ID,
        source_entity_id: '11111111-1111-5111-8111-111111111111',
        target_entity_id: 'phone-1111',
        relationship_type: 'associated_with',
        confidence: 0.98,
        source: 'CDR Extract - Operation clean',
        evidence_refs: ['cdr_extract.csv #2241'],
        extraction_method: 'manual',
        verification_status: 'confirmed',
        description: null,
        weight: 1,
        metadata: {},
        created_at: '2026-08-18T10:20:00',
        updated_at: '2026-08-18T10:20:00',
      },
    ] as never);

    const bundle = await loadEntityDetailBundle(
      '11111111-1111-5111-8111-111111111111',
      INVESTIGATION_ID,
    );

    expect(mockedApi.getEntityScoped).toHaveBeenCalledWith(
      '11111111-1111-5111-8111-111111111111',
      INVESTIGATION_ID,
    );
    expect(bundle.entity.name).toBe('Rahul Kumar');
    expect(bundle.entity.resolutionState).toBe('CONFIRMED');
    expect(bundle.relationships).toHaveLength(1);
    expect(bundle.relationships[0]).toMatchObject({
      sourceEntityId: '11111111-1111-5111-8111-111111111111',
      sourceEntityName: 'Rahul Kumar',
      targetEntityId: 'phone-1111',
      targetEntityName: '+91 98765 43210',
      type: 'USES',
      verificationStatus: 'CONFIRMED',
    });
    expect(bundle.related).toHaveLength(1);
    expect(bundle.related[0]).toMatchObject({
      id: 'phone-1111',
      name: '+91 98765 43210',
      entityType: 'phone',
    });
    expect(bundle.evidence).toEqual([]);
    expect(bundle.events).toEqual([]);
    expect(bundle.activity).toEqual([]);
    expect(bundle.sources).toEqual([]);
    expect(bundle.resolutionHistory).toEqual([]);
    expect(bundle.summary).toEqual({
      entityId: '11111111-1111-5111-8111-111111111111',
      connections: 1,
      sources: 0,
      events: 0,
      relationships: 1,
      evidence: 0,
      activity: 0,
      resolutionConfidence: 0.95,
      resolutionState: 'CONFIRMED',
    });
  });

  it('keeps slices honest and counts at 0 when investigation scope is absent', async () => {
    mockedApi.getEntity.mockResolvedValue(row() as never);

    const bundle = await loadEntityDetailBundle(
      '11111111-1111-5111-8111-111111111111',
    );

    expect(bundle.relationships).toEqual([]);
    expect(bundle.related).toEqual([]);
    expect(bundle.summary.connections).toBe(0);
    expect(bundle.summary.relationships).toBe(0);
    expect(mockedApi.listRelationshipsForInvestigation).not.toHaveBeenCalled();
  });

  it('does not fabricate rows when the relationship fetch fails', async () => {
    mockedApi.getEntityScoped.mockResolvedValue(row() as never);
    mockedApi.listRelationshipsForInvestigation.mockRejectedValue(
      new Error('fetch failed'),
    );

    const bundle = await loadEntityDetailBundle(
      '11111111-1111-5111-8111-111111111111',
      INVESTIGATION_ID,
    );

    expect(bundle.entity.name).toBe('Rahul Kumar');
    expect(bundle.relationships).toEqual([]);
    expect(bundle.related).toEqual([]);
    expect(bundle.summary.connections).toBe(0);
  });
});

describe('apiEntityOverviewSummary', () => {
  it('reports only the persisted entity count honestly', () => {
    expect(apiEntityOverviewSummary(6)).toEqual({
      entities: 6,
      candidates: 0,
      pendingResolutions: 0,
      jobsRunning: 0,
    });
  });
});