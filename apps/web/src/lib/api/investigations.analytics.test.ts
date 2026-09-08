import { getNetworkAnalytics } from './investigations';
import { apiFetch } from './client';

jest.mock('./client', () => ({
  apiFetch: jest.fn(),
}));

const mockedApiFetch = jest.mocked(apiFetch);

describe('network analytics API adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApiFetch.mockResolvedValue({ investigation_id: 'inv-1' });
  });

  it('serializes supported filter and path scopes', async () => {
    await getNetworkAnalytics('inv-1', {
      filter: {
        entityTypes: ['person'],
        relationshipTypes: ['KNOWS' as any],
        communityIds: ['community-1'],
        componentIds: [],
        sources: ['registry'],
        from: '2026-01-01',
        to: '2026-02-01',
        minConfidence: 0.75,
      },
      path: { from: 'entity-a', to: 'entity-b' },
    });

    const path = mockedApiFetch.mock.calls[0][1] as string;
    const query = new URLSearchParams(path.split('?')[1]);
    expect(path.startsWith('/networks/inv-1/analytics?')).toBe(true);
    expect(query.get('entity_types')).toBe('person');
    expect(query.get('relationship_types')).toBe('KNOWS');
    expect(query.get('community_ids')).toBe('community-1');
    expect(query.get('path')).toBe(JSON.stringify({ from: 'entity-a', to: 'entity-b' }));
  });

  it('does not append a query for an unscoped request', async () => {
    await getNetworkAnalytics('inv-1');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      '/api/v2',
      '/networks/inv-1/analytics',
    );
  });
});
