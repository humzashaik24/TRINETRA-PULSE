import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import NetworksPage from '@/app/(dashboard)/networks/page';
import { getNetworks } from '@/services/network.service';
import type { NetworkSummary } from '@trinetra-pulse/types';

jest.mock('@/services/network.service', () => ({
  getNetworks: jest.fn(),
}));

const mockGetNetworks = getNetworks as jest.MockedFunction<typeof getNetworks>;

const summaries: NetworkSummary[] = [
  {
    id: 'NET-001',
    name: 'Clean Harbour',
    description: 'Transshipment coordination network.',
    status: 'ready',
    nodeCount: 12,
    relationshipCount: 18,
    clusterCount: 3,
    connectedComponents: 1,
    sources: ['FIR-2026-001'],
    dateRange: { start: '2026-01-01T00:00:00Z', end: '2026-06-01T00:00:00Z' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    caseId: 'FIR-2026-001',
    seedEntityId: 'ent-person-001',
  },
  {
    id: 'NET-002',
    name: 'Skyline',
    description: 'Communications hub analysis.',
    status: 'building',
    nodeCount: 5,
    relationshipCount: 7,
    clusterCount: 2,
    connectedComponents: 1,
    sources: [],
    dateRange: { start: null, end: null },
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
];

afterEach(() => {
  cleanup();
  mockGetNetworks.mockReset();
});

describe('NetworksPage', () => {
  it('renders an error state when loading networks fails', async () => {
    mockGetNetworks.mockRejectedValue(new Error('boom'));
    render(<NetworksPage />);
    expect(await screen.findByText(/could not load networks/i)).toBeInTheDocument();
  });

  it('renders network cards from getNetworks', async () => {
    mockGetNetworks.mockResolvedValue(summaries);
    render(<NetworksPage />);

    await screen.findByRole('heading', { name: 'Networks' });
    await screen.findByText('Clean Harbour');
    expect(screen.getByText('Skyline')).toBeInTheDocument();

    const opens = screen.getAllByText('Open graph');
    expect(opens).toHaveLength(2);
  });

  it('links each card to its graph workspace', async () => {
    mockGetNetworks.mockResolvedValue(summaries);
    render(<NetworksPage />);

    const link = (await screen.findByText('Clean Harbour')).closest('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/networks/NET-001');
  });

  it('shows empty message when there are no networks', async () => {
    mockGetNetworks.mockResolvedValue([]);
    render(<NetworksPage />);
    await screen.findByText(/no networks available yet/i);
  });
});
