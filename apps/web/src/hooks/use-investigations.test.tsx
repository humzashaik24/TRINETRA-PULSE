/**
 * React Query hook tests for the relational investigation API (Phase 15).
 *
 * These cover API-mode behavior of the hooks in `use-investigations.ts`:
 * successful data, loading, error, empty results, and query invalidation →
 * refetch. They mock the typed `/api/v2` client so the hooks are exercised in
 * isolation from the network.
 *
 * Note: these hooks are an API-mode consumption surface; the live UI
 * investigation-workspace reads flow through the Zustand store + adapter (see
 * `investigation.store.api.test.ts`).
 */

import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

jest.mock('@/lib/api/investigations', () => ({
  listInvestigations: jest.fn(),
  getInvestigation: jest.fn(),
  getInvestigationSummary: jest.fn(),
  listEntitiesForInvestigation: jest.fn(),
  listRelationshipsForInvestigation: jest.fn(),
  listFindingsForInvestigation: jest.fn(),
  listEvidenceForInvestigation: jest.fn(),
  listEventsForInvestigation: jest.fn(),
  listNotesForInvestigation: jest.fn(),
  getTimeline: jest.fn(),
  getNetworkGraph: jest.fn(),
  getNetworkAnalytics: jest.fn(),
}));

import {
  useInvestigations,
  investigationQueryKeys,
  useInvestigation,
} from './use-investigations';
import { listInvestigations, getInvestigation } from '@/lib/api/investigations';

const mockedList = jest.mocked(listInvestigations);
const mockedGet = jest.mocked(getInvestigation);

const paginated = (count: number) => ({
  items: Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    title: `Investigation ${i}`,
    status: 'active',
    priority: 'high',
    description: null,
    lead_investigator: null,
    assigned_team: [],
    tags: [],
    started_at: null,
    closed_at: null,
    metadata: {},
    created_at: '2026-08-18T09:00:00.000Z',
    updated_at: '2026-08-18T09:00:00.000Z',
  })),
  total: count,
  page: 1,
  page_size: 20,
  total_pages: 1,
});

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useInvestigations (API mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data from the relational API', async () => {
    mockedList.mockResolvedValue(paginated(2) as never);
    const { result } = renderHook(() => useInvestigations(), {
      wrapper: wrapper(makeClient()),
    });
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(2);
    expect(mockedList).toHaveBeenCalledWith({ page: 1, page_size: 20 });
  });

  it('surfaces an empty state when the API returns no items', async () => {
    mockedList.mockResolvedValue(paginated(0) as never);
    const { result } = renderHook(() => useInvestigations(), {
      wrapper: wrapper(makeClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  it('surfaces the error when the API call fails', async () => {
    mockedList.mockRejectedValue(new Error('upstream down'));
    const { result } = renderHook(() => useInvestigations(), {
      wrapper: wrapper(makeClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(
      expect.objectContaining({ message: 'upstream down' }),
    );
  });

  it('refetches on query invalidation', async () => {
    mockedList.mockResolvedValue(paginated(1) as never);
    const client = makeClient();
    const { result } = renderHook(() => useInvestigations(), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedList).toHaveBeenCalledTimes(1);

    client.invalidateQueries({ queryKey: investigationQueryKeys.all });
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    expect(result.current.data?.total).toBe(1);
  });

  it('does not run the detail query until an id is provided', () => {
    renderHook(() => useInvestigation(undefined), {
      wrapper: wrapper(makeClient()),
    });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
