import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { InvestigationDirectionsTab } from '@/components/investigation/investigation-directions-tab';
import { useInvestigationStore } from '@/state/investigation.store';
import { useDirectionsStore } from '@/state/directions.store';
import { useShellStore } from '@/state/shell.store';
import { getInvestigationDirections } from '@/lib/api/directions';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';
import type { InvestigationDirectionsResponse, InvestigationDirectionType } from '@trinetra-pulse/types';

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
        { fact_type: 'degree_observed', description: 'Recorded relationships.', entity_id: 'ent-person-001', relationship_id: 'rel-001', evidence_id: 'ev-001', value: 6 },
      ],
      related_entity_ids: ['ent-person-001'],
      related_relationship_ids: ['rel-001'],
      related_evidence_ids: ['ev-001'],
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

describe('InvestigationDirectionsTab — detail panel & filters (Phase 27)', () => {
  const seedStore = () => {
    const rec = mockInvestigationById.get('inv-001')!;
    const data: InvestigationWorkspaceData = {
      investigation: rec.investigation,
      entities: [...rec.entities],
      relationships: [...rec.relationships],
      evidence: [...rec.evidence],
      findings: [...rec.findings],
      notes: [...rec.notes],
      timeline: [...rec.timeline],
      activity: [...rec.activity],
      members: [...rec.members],
      networks: [...rec.networks],
      analyticsSnapshots: [...rec.analyticsSnapshots],
    };
    useInvestigationStore.setState({ investigationId: 'inv-001', data });
  };

  it('expands a direction into its grounding facts and related workspace objects', async () => {
    seedStore();
    mockedGet.mockResolvedValue(directionsFixture);

    render(<InvestigationDirectionsTab />);
    await screen.findByTestId('direction-row');

    fireEvent.click(screen.getByTestId('direction-expand-dir-abc'));

    expect(screen.getByTestId('direction-detail-panel')).toBeInTheDocument();
    expect(screen.getByText('Why this lead')).toBeInTheDocument();
    expect(screen.getByText('Degree observed')).toBeInTheDocument();
    expect(screen.getByTestId('fact-entity-ent-person-001')).toBeInTheDocument();
    expect(screen.getByTestId('detail-entity-ent-person-001')).toBeInTheDocument();
    expect(screen.getByTestId('detail-relationship-rel-001')).toBeInTheDocument();
    expect(screen.getByTestId('detail-evidence-ev-001')).toBeInTheDocument();
  });

  it('surfaces findings touching the same entities and opens them in the inspector', async () => {
    seedStore();
    mockedGet.mockResolvedValue(directionsFixture);

    render(<InvestigationDirectionsTab />);
    await screen.findByTestId('direction-row');
    fireEvent.click(screen.getByTestId('direction-expand-dir-abc'));

    expect(screen.getByTestId('detail-finding-inf-001-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('detail-finding-inf-001-1'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({ type: 'finding', id: 'inf-001-1', investigationId: 'inv-001' }),
    );
  });

  it('opens related objects in the context inspector preserving the investigation', async () => {
    seedStore();
    mockedGet.mockResolvedValue(directionsFixture);

    render(<InvestigationDirectionsTab />);
    await screen.findByTestId('direction-row');
    fireEvent.click(screen.getByTestId('direction-expand-dir-abc'));

    fireEvent.click(screen.getByTestId('detail-relationship-rel-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({
        type: 'relationship',
        id: 'rel-001',
        investigationId: 'inv-001',
        sourceEntityName: 'Rahul Kumar',
        targetEntityName: '+91 98765 43210',
      }),
    );

    fireEvent.click(screen.getByTestId('detail-evidence-ev-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({ type: 'evidence', id: 'ev-001', investigationId: 'inv-001' }),
    );
  });

  it('links network-anchored leads into the network tab', async () => {
    seedStore();
    mockedGet.mockResolvedValue(directionsFixture);

    render(<InvestigationDirectionsTab />);
    await screen.findByTestId('direction-row');
    fireEvent.click(screen.getByTestId('direction-expand-dir-abc'));

    expect(screen.getByTestId('detail-network')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=network',
    );
  });

  it('links timeline-gap leads into the timeline tab', async () => {
    seedStore();
    mockedGet.mockResolvedValue({
      investigation_id: 'inv-001',
      computed_at: '2026-09-09T10:00:00Z',
      directions: [
        {
          id: 'dir-tl',
          investigation_id: 'inv-001',
          direction_type: 'timeline_gap',
          title: 'Fill the missing month',
          summary: 'A month has no events.',
          priority: 'high',
          confidence: 0.61,
          rationale: 'No events recorded in the gap window.',
          supporting_facts: [],
          related_entity_ids: [],
          related_relationship_ids: [],
          related_evidence_ids: [],
          status: 'new',
          created_at: '2026-09-09T10:00:00Z',
        },
      ],
    });

    render(<InvestigationDirectionsTab />);
    await screen.findByTestId('direction-row');
    fireEvent.click(screen.getByTestId('direction-expand-dir-tl'));

    expect(screen.getByTestId('detail-timeline')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=timeline',
    );
  });

  it('filters directions by priority client-side without refetching', async () => {
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    mockedGet.mockResolvedValue({
      investigation_id: 'inv-001',
      computed_at: '2026-09-09T10:00:00Z',
      directions: [
        {
          id: 'dir-crit',
          investigation_id: 'inv-001',
          direction_type: 'high_connectivity_entity' as InvestigationDirectionType,
          title: 'Critical lead',
          summary: 'S.',
          priority: 'critical',
          confidence: 0.9,
          rationale: 'R.',
          supporting_facts: [],
          related_entity_ids: [],
          related_relationship_ids: [],
          related_evidence_ids: [],
          status: 'new',
          created_at: '2026-09-09T10:00:00Z',
        },
        {
          id: 'dir-low',
          investigation_id: 'inv-001',
          direction_type: 'evidence_gap',
          title: 'Low lead',
          summary: 'S.',
          priority: 'low',
          confidence: 0.1,
          rationale: 'R.',
          supporting_facts: [],
          related_entity_ids: [],
          related_relationship_ids: [],
          related_evidence_ids: [],
          status: 'new',
          created_at: '2026-09-09T10:00:00Z',
        },
      ],
    });

    render(<InvestigationDirectionsTab />);
    await screen.findAllByTestId('direction-row');
    expect(screen.getByText('Critical lead')).toBeInTheDocument();
    expect(screen.getByText('Low lead')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('direction-filter-priority'), { target: { value: 'critical' } });

    expect(screen.getByText('Critical lead')).toBeInTheDocument();
    expect(screen.queryByText('Low lead')).not.toBeInTheDocument();
  });

  it('filters directions by type client-side', async () => {
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    mockedGet.mockResolvedValue({
      investigation_id: 'inv-001',
      computed_at: '2026-09-09T10:00:00Z',
      directions: [
        {
          id: 'dir-ev',
          investigation_id: 'inv-001',
          direction_type: 'evidence_gap',
          title: 'Evidence gap lead',
          summary: 'S.',
          priority: 'high',
          confidence: 0.7,
          rationale: 'R.',
          supporting_facts: [],
          related_entity_ids: [],
          related_relationship_ids: [],
          related_evidence_ids: [],
          status: 'new',
          created_at: '2026-09-09T10:00:00Z',
        },
        {
          id: 'dir-conn',
          investigation_id: 'inv-001',
          direction_type: 'suspicious_pattern',
          title: 'Pattern lead',
          summary: 'S.',
          priority: 'high',
          confidence: 0.7,
          rationale: 'R.',
          supporting_facts: [],
          related_entity_ids: [],
          related_relationship_ids: [],
          related_evidence_ids: [],
          status: 'new',
          created_at: '2026-09-09T10:00:00Z',
        },
      ],
    });

    render(<InvestigationDirectionsTab />);
    await screen.findAllByTestId('direction-row');
    expect(screen.getByText('Evidence gap lead')).toBeInTheDocument();
    expect(screen.getByText('Pattern lead')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('direction-filter-type'), { target: { value: 'evidence_gap' } });

    expect(screen.getByText('Evidence gap lead')).toBeInTheDocument();
    expect(screen.queryByText('Pattern lead')).not.toBeInTheDocument();
  });
});