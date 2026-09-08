import { render, screen, cleanup } from '@testing-library/react';
import { InvestigationDirectionsTab } from '@/components/investigation/investigation-directions-tab';
import { useInvestigationStore } from '@/state/investigation.store';
import { useDirectionsStore } from '@/state/directions.store';
import { getInvestigationDirections } from '@/lib/api/directions';
import type { InvestigationDirectionsResponse } from '@trinetra-pulse/types';

jest.mock('@/lib/api/directions', () => ({
  getInvestigationDirections: jest.fn(),
}));

const mockedGet = jest.mocked(getInvestigationDirections);

const directionsFixture: InvestigationDirectionsResponse = {
  investigation_id: 'inv-001',
  computed_at: '2026-09-09T10:00:00Z',
  directions: [
    {
      id: 'dir-abc',
      investigation_id: 'inv-001',
      direction_type: 'high_connectivity_entity',
      title: 'Follow connections around Rahul Kumar',
      summary: 'Rahul Kumar has 6 recorded relationships.',
      priority: 'critical',
      confidence: 0.82,
      rationale: 'Rahul Kumar is connected to 6 other entities.',
      supporting_facts: [
        { fact_type: 'degree_observed', description: 'Recorded relationships.', entity_id: 'ent-person-001', relationship_id: null, evidence_id: null, value: 6 },
      ],
      related_entity_ids: ['ent-person-001'],
      related_relationship_ids: ['rel-001'],
      related_evidence_ids: ['ev-1'],
      status: 'new',
      created_at: '2026-09-09T10:00:00Z',
    },
  ],
};

afterEach(() => {
  cleanup();
  useDirectionsStore.setState({ investigationId: null, data: null, loading: false, error: null });
  useInvestigationStore.setState({ investigationId: null, data: {} as never });
});

describe('InvestigationDirectionsTab', () => {
  it('shows a loading state while directions are being computed', () => {
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    mockedGet.mockReturnValue(new Promise(() => {}));

    render(<InvestigationDirectionsTab />);

    expect(screen.getByText('Computing directions…')).toBeInTheDocument();
  });

  it('renders computed directions with priority, confidence, facts and navigation', async () => {
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    mockedGet.mockResolvedValue(directionsFixture);

    render(<InvestigationDirectionsTab />);

    const row = await screen.findByTestId('direction-row');
    expect(row).toBeInTheDocument();
    expect(screen.getByTestId('investigation-directions-tab')).toBeInTheDocument();
    expect(screen.getByText('Follow connections around Rahul Kumar')).toBeInTheDocument();
    expect(screen.getByTestId('direction-priority')).toHaveTextContent('critical');
    expect(screen.getByTestId('direction-confidence')).toHaveTextContent('82%');
    expect(screen.getByText('degree_observed')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByTestId('direction-entity-ent-person-001')).toHaveAttribute(
      'href',
      '/entities/ent-person-001',
    );
    expect(screen.getByTestId('direction-relationships')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=network',
    );
    expect(screen.getByTestId('direction-evidence')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=evidence',
    );
    expect(screen.getByText(/analytical leads derived from existing investigation data/i)).toBeInTheDocument();
  });

  it('shows an empty state when no leads exist', async () => {
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    mockedGet.mockResolvedValue({
      investigation_id: 'inv-001',
      computed_at: '2026-09-09T10:00:00Z',
      directions: [],
    });

    render(<InvestigationDirectionsTab />);

    expect(
      await screen.findByText(/no analytical leads yet/i),
    ).toBeInTheDocument();
  });

  it('shows an error state with a retry action when computation fails', async () => {
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    mockedGet.mockRejectedValue(new Error('boom'));

    render(<InvestigationDirectionsTab />);

    expect(await screen.findByText('Could not compute directions')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();
  });
});