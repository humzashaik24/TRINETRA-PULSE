/**
 * Tests for the Finding detail adapter (Phase 17.9).
 *
 * Covers the deterministic vocabulary translation (severity / confidence /
 * source / evidence ids), the RealFinding -> inspector finding mapping with
 * entity-name resolution, and the scoped / unscoped / failure loads of
 * finding detail. API failures propagate (never a mock fallback).
 */

import {
  findingCategoryFrom,
  findingConfidenceFrom,
  findingEvidenceIdsFrom,
  findingSourceFrom,
  loadFindingDetail,
  mapApiFinding,
} from '@/lib/api/findings';
import type { RealEntity, RealFinding } from '@/lib/api/investigations';

jest.mock('@/lib/api/investigations', () => ({
  getFinding: jest.fn(),
  getFindingScoped: jest.fn(),
  listEntitiesForInvestigation: jest.fn(),
  getEntity: jest.fn(),
}));

import {
  getEntity,
  getFinding,
  getFindingScoped,
  listEntitiesForInvestigation,
} from '@/lib/api/investigations';

const mockedGetFinding = jest.mocked(getFinding);
const mockedGetFindingScoped = jest.mocked(getFindingScoped);
const mockedListEntities = jest.mocked(listEntitiesForInvestigation);
const mockedGetEntity = jest.mocked(getEntity);

const INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';
const FINDING_ID = '11111111-1111-5111-8111-111111111111';

const PERSON: RealEntity = {
  id: '22222222-2222-5222-8222-222222222222',
  investigation_id: INVESTIGATION_ID,
  entity_type: 'person',
  canonical_name: 'Rahul Kumar',
  name: 'Rahul Kumar',
  description: null,
  attributes: {},
  confidence: 0.9,
  risk_score: 0.2,
  is_verified: false,
  is_flagged: false,
  metadata: {},
  created_at: '2026-08-18T09:00:00Z',
  updated_at: '2026-08-18T09:00:00Z',
};

const PHONE: RealEntity = {
  id: '33333333-3333-5333-8333-333333333333',
  investigation_id: INVESTIGATION_ID,
  entity_type: 'phone',
  canonical_name: '+91 98765 43210',
  name: '+91 98765 43210',
  description: null,
  attributes: {},
  confidence: 0.8,
  risk_score: 0.1,
  is_verified: false,
  is_flagged: false,
  metadata: {},
  created_at: '2026-08-18T09:00:00Z',
  updated_at: '2026-08-18T09:00:00Z',
};

const FINDING: RealFinding = {
  id: FINDING_ID,
  investigation_id: INVESTIGATION_ID,
  title: 'Coordinate cluster around the primary device',
  description: 'Multiple source records associate the primary device.',
  severity: 'medium',
  confidence: 'inferred',
  status: 'open',
  entity_refs: [PERSON.id, PHONE.id],
  metadata: {
    canonical_id: 'inf-006-1',
    evidence_ids: ['ev-004'],
    source_type: 'manual',
  },
  created_at: '2026-08-18T09:30:00Z',
  updated_at: '2026-08-18T09:30:00Z',
};

const entityById = new Map<string, RealEntity>([
  [PERSON.id, PERSON],
  [PHONE.id, PHONE],
]);

describe('finding vocabulary translation (Phase 17.9)', () => {
  it('maps persisted confidence enums to deterministic numeric confidence', () => {
    expect(findingConfidenceFrom('observed')).toBe(0.9);
    expect(findingConfidenceFrom('analytical')).toBe(0.8);
    expect(findingConfidenceFrom('inferred')).toBe(0.6);
    expect(findingConfidenceFrom('unknown')).toBe(0.4);
    expect(findingConfidenceFrom('nonsense-value')).toBe(0.5);
    expect(findingConfidenceFrom(null)).toBe(0.5);
  });

  it('derives the UI category from the persisted severity', () => {
    expect(findingCategoryFrom('CRITICAL')).toBe('critical');
    expect(findingCategoryFrom('medium')).toBe('medium');
    expect(findingCategoryFrom(null)).toBe('info');
  });

  it('prefers metadata.source_type for the finding source label', () => {
    expect(findingSourceFrom(FINDING)).toBe('manual');
    const noSource = { ...FINDING, metadata: {} };
    expect(findingSourceFrom(noSource)).toBe('Relational analysis');
  });

  it('reads evidence ids from metadata.evidence_ids only when structured', () => {
    expect(findingEvidenceIdsFrom(FINDING)).toEqual(['ev-004']);
    expect(findingEvidenceIdsFrom({ ...FINDING, metadata: {} })).toEqual([]);
  });
});

describe('mapApiFinding (Phase 17.9)', () => {
  it('maps a persisted finding into the inspector finding shape', () => {
    const detail = mapApiFinding(FINDING, entityById);
    expect(detail.kind).toBe('finding');
    expect(detail.id).toBe(FINDING_ID);
    expect(detail.title).toBe(FINDING.title);
    expect(detail.description).toBe(FINDING.description);
    expect(detail.type).toBe('medium');
    expect(detail.confidence).toBe(0.6);
    expect(detail.severity).toBe('medium');
    expect(detail.source).toBe('manual');
    expect(detail.timestamp).toBe(FINDING.created_at);
    expect(detail.investigationId).toBe(INVESTIGATION_ID);
    expect(detail.evidenceIds).toEqual(['ev-004']);
  });

  it('resolves entity_refs to names and types from the scoped entity rows', () => {
    const detail = mapApiFinding(FINDING, entityById);
    expect(detail.entities).toEqual([
      { id: PERSON.id, name: 'Rahul Kumar', type: 'person' },
      { id: PHONE.id, name: '+91 98765 43210', type: 'phone' },
    ]);
  });

  it('falls back to the raw id and unknown type for unresolvable refs', () => {
    const detail = mapApiFinding(FINDING, new Map());
    expect(detail.entities).toEqual([
      { id: PERSON.id, name: PERSON.id, type: 'unknown' },
      { id: PHONE.id, name: PHONE.id, type: 'unknown' },
    ]);
  });
});

describe('loadFindingDetail (Phase 17.9)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads a scoped finding resolving entities via the scoped lookup', async () => {
    mockedGetFindingScoped.mockResolvedValue(FINDING);
    mockedListEntities.mockResolvedValue([PERSON, PHONE]);

    const detail = await loadFindingDetail(FINDING_ID, INVESTIGATION_ID);

    expect(mockedGetFindingScoped).toHaveBeenCalledWith(
      FINDING_ID,
      INVESTIGATION_ID,
    );
    expect(mockedListEntities).toHaveBeenCalledWith(INVESTIGATION_ID);
    expect(mockedGetFinding).not.toHaveBeenCalled();
    expect(detail.entities[0].name).toBe('Rahul Kumar');
    expect(detail.investigationId).toBe(INVESTIGATION_ID);
  });

  it('loads an unscoped finding resolving each referenced entity directly', async () => {
    mockedGetFinding.mockResolvedValue(FINDING);
    mockedGetEntity.mockImplementation(async (id) =>
      id === PERSON.id ? PERSON : PHONE,
    );

    const detail = await loadFindingDetail(FINDING_ID);

    expect(mockedGetFinding).toHaveBeenCalledWith(FINDING_ID);
    expect(mockedGetEntity).toHaveBeenCalledWith(PERSON.id);
    expect(mockedGetEntity).toHaveBeenCalledWith(PHONE.id);
    expect(detail.entities).toHaveLength(2);
    expect(detail.entities[1].name).toBe('+91 98765 43210');
  });

  it('surfaces an API failure without any mock fallback', async () => {
    mockedGetFindingScoped.mockRejectedValue(new Error('not_found'));

    await expect(
      loadFindingDetail(FINDING_ID, INVESTIGATION_ID),
    ).rejects.toThrow('not_found');
    expect(mockedGetFinding).not.toHaveBeenCalled();
  });
});