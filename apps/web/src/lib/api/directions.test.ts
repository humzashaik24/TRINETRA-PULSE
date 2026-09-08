import { apiFetch } from './client';
import {
  buildDemoDirections,
  getInvestigationDirections,
} from './directions';
import type { InvestigationDirectionsResponse } from '@trinetra-pulse/types';
import { isMockData } from './config';

jest.mock('./client', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('./config', () => ({
  API_BASE_URL: '/api/v2',
  isMockData: jest.fn(() => true),
}));

const mockedApiFetch = jest.mocked(apiFetch);
const mockedIsMockData = jest.mocked(isMockData);

function expectDirectionInvariants(response: InvestigationDirectionsResponse): void {
  expect(response.investigation_id).toBeTruthy();
  expect(response.computed_at).toBeTruthy();
  expect(response.directions.length).toBeLessThanOrEqual(12);
  for (const direction of response.directions) {
    expect(direction.id.startsWith('dir-')).toBe(true);
    expect(direction.confidence).toBeGreaterThanOrEqual(0);
    expect(direction.confidence).toBeLessThanOrEqual(1);
    expect(direction.status).toBe('new');
  }
}

describe('directions API adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the investigation-scoped directions endpoint in API mode', async () => {
    mockedIsMockData.mockReturnValue(false);
    mockedApiFetch.mockResolvedValue({ investigation_id: 'inv-001', computed_at: '', directions: [] });

    await getInvestigationDirections('inv-001');

    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/api/v2',
      '/investigations/inv-001/directions',
    );
  });

  it('returns deterministic demo directions in mock mode', async () => {
    mockedIsMockData.mockReturnValue(true);

    const first = await getInvestigationDirections('inv-001');
    const second = await getInvestigationDirections('inv-001');

    expectDirectionInvariants(first);
    expect(first.investigation_id).toBe('inv-001');
    expect(first.directions.length).toBeGreaterThan(0);
    expect(first.directions.map((d) => d.id)).toEqual(second.directions.map((d) => d.id));
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it('returns an empty set for an investigation with no linked network', async () => {
    const built = buildDemoDirections('inv-999');
    expect(built.investigation_id).toBe('inv-999');
    expect(built.directions).toEqual([]);
  });
});