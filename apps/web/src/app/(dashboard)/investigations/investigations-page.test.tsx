import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import InvestigationsPage from '@/app/(dashboard)/investigations/page';
import { getInvestigations } from '@/services/investigation.service';
import type { Investigation } from '@trinetra-pulse/types';

jest.mock('@/services/investigation.service', () => ({
  getInvestigations: jest.fn(),
}));

const mockGetInvestigations = getInvestigations as jest.MockedFunction<
  typeof getInvestigations
>;

const base: Investigation = {
  id: '',
  title: '',
  description: null,
  status: 'draft',
  priority: 'normal',
  lead_investigator: 'Unassigned',
  assigned: [],
  tags: [],
  case_id: null,
  entity_count: 0,
  evidence_count: 0,
  relationship_count: 0,
  created_at: '2026-08-28T08:00:00Z',
  updated_at: '2026-08-28T08:00:00Z',
  last_activity_at: '2026-08-28T08:00:00Z',
};

const nexus: Investigation = {
  ...base,
  id: 'inv-demo-nexus',
  title: 'Operation Trinetra Nexus',
  status: 'active',
  priority: 'high',
  lead_investigator: 'Inspector Mehta',
  assigned: ['Inspector Mehta', 'Analyst Singh'],
  tags: ['fraud', 'nexus', 'multi-city', 'demo'],
  entity_count: 35,
  evidence_count: 7,
  relationship_count: 60,
  updated_at: '2026-09-08T14:30:00Z',
};

const legacy: Investigation = {
  ...base,
  id: 'inv-001',
  title: 'Operation Clean — Firmware Import Probe',
  status: 'active',
  priority: 'high',
  assigned: ['Inspector Mehta'],
  tags: ['import', 'network'],
  updated_at: '2026-08-26T10:10:00Z',
};

afterEach(() => {
  cleanup();
  mockGetInvestigations.mockReset();
});

describe('InvestigationsPage', () => {
  it('renders an error state when loading fails', async () => {
    mockGetInvestigations.mockRejectedValue(new Error('boom'));
    render(<InvestigationsPage />);
    expect(await screen.findByText(/could not load investigations/i)).toBeInTheDocument();
  });

  it('renders only the Operation Trinetra Nexus investigation', async () => {
    mockGetInvestigations.mockResolvedValue([nexus, legacy]);
    render(<InvestigationsPage />);

    await screen.findByText('Operation Trinetra Nexus');
    expect(await screen.findAllByTestId('investigation-link')).toHaveLength(1);
    expect(screen.queryByText(/Operation Clean/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('links the row to its workspace', async () => {
    mockGetInvestigations.mockResolvedValue([nexus]);
    render(<InvestigationsPage />);

    await screen.findByTestId('investigation-link');
    const table = screen.getByTestId('investigations-table');
    const link = within(table).getByRole('link', { name: /Operation Trinetra Nexus/ });
    expect(link.getAttribute('href')).toBe('/investigations/inv-demo-nexus');
  });

  it('filters rows by search query', async () => {
    mockGetInvestigations.mockResolvedValue([nexus]);
    render(<InvestigationsPage />);
    await screen.findAllByTestId('investigation-link');

    fireEvent.change(screen.getByTestId('investigations-search'), {
      target: { value: 'zzz-nothing' },
    });

    await waitFor(() => {
      expect(screen.getByText(/no investigations match/i)).toBeInTheDocument();
    });
  });

  it('shows an empty message when nothing matches', async () => {
    mockGetInvestigations.mockResolvedValue([nexus]);
    render(<InvestigationsPage />);
    await screen.findAllByTestId('investigation-link');

    fireEvent.change(screen.getByTestId('investigations-search'), {
      target: { value: 'zzz-nothing' },
    });

    await waitFor(() => {
      expect(screen.getByText(/no investigations match/i)).toBeInTheDocument();
    });
  });

  it('labels the single presentation investigation', async () => {
    mockGetInvestigations.mockResolvedValue([nexus]);
    render(<InvestigationsPage />);
    await screen.findByText('Operation Trinetra Nexus');
    expect(await screen.findByText('1 investigation')).toBeInTheDocument();
  });
});