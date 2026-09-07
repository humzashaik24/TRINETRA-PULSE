import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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

const investigations: Investigation[] = [
  {
    ...base,
    id: 'inv-001',
    title: 'Operation Clean — Firmware Import Probe',
    status: 'active',
    priority: 'high',
    lead_investigator: 'Inspector Mehta',
    assigned: ['Inspector Mehta', 'Analyst Singh'],
    tags: ['import', 'network'],
    entity_count: 6,
    evidence_count: 5,
    relationship_count: 5,
    updated_at: '2026-08-26T10:10:00Z',
  },
  {
    ...base,
    id: 'inv-003',
    title: 'Import Fraud Review',
    status: 'under_review',
    priority: 'critical',
    assigned: ['Inspector Mehta'],
    tags: ['import', 'fraud'],
    entity_count: 5,
    evidence_count: 4,
    relationship_count: 3,
    updated_at: '2026-08-25T18:00:00Z',
  },
  {
    ...base,
    id: 'inv-004',
    title: 'Telecom Data Review',
    status: 'draft',
    priority: 'low',
    assigned: ['Analyst Singh'],
    tags: ['telecom'],
    entity_count: 2,
    evidence_count: 1,
    relationship_count: 0,
    updated_at: '2026-08-28T08:00:00Z',
  },
];

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

  it('renders the investigation table rows', async () => {
    mockGetInvestigations.mockResolvedValue(investigations);
    render(<InvestigationsPage />);

    await screen.findByText('Operation Clean — Firmware Import Probe');
    expect(await screen.findAllByTestId('investigation-link')).toHaveLength(3);
    // "Under Review" appears both as a filter option and as a row badge.
    expect(screen.getAllByText('Under Review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
  });

  it('links each row to its workspace', async () => {
    mockGetInvestigations.mockResolvedValue(investigations);
    render(<InvestigationsPage />);

    const link = (await screen.findByText('Import Fraud Review')).closest('a');
    expect(link?.getAttribute('href')).toBe('/investigations/inv-003');
  });

  it('filters rows by search query', async () => {
    mockGetInvestigations.mockResolvedValue(investigations);
    render(<InvestigationsPage />);
    await screen.findAllByTestId('investigation-link');

    fireEvent.change(screen.getByTestId('investigations-search'), {
      target: { value: 'telecom' },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('investigation-link')).toHaveLength(1);
      expect(screen.getByText('Telecom Data Review')).toBeInTheDocument();
    });
    expect(screen.queryByText('Import Fraud Review')).not.toBeInTheDocument();
  });

  it('filters rows by status', async () => {
    mockGetInvestigations.mockResolvedValue(investigations);
    render(<InvestigationsPage />);
    await screen.findAllByTestId('investigation-link');

    fireEvent.change(screen.getByTestId('investigations-status-filter'), {
      target: { value: 'under_review' },
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('investigation-link')).toHaveLength(1);
    });
    expect(screen.getByText('Import Fraud Review')).toBeInTheDocument();
    expect(screen.queryByText('Telecom Data Review')).not.toBeInTheDocument();
  });

  it('shows an empty message when nothing matches', async () => {
    mockGetInvestigations.mockResolvedValue(investigations);
    render(<InvestigationsPage />);
    await screen.findAllByTestId('investigation-link');

    fireEvent.change(screen.getByTestId('investigations-search'), {
      target: { value: 'zzz-nothing' },
    });

    await waitFor(() => {
      expect(screen.getByText(/no investigations match/i)).toBeInTheDocument();
    });
  });
});
