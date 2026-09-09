import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { InvestigationOverview } from '@/components/investigation/investigation-overview';
import { useInvestigationStore } from '@/state/investigation.store';
import { useDirectionsStore } from '@/state/directions.store';
import { useShellStore } from '@/state/shell.store';
import { getInvestigationDirections } from '@/lib/api/directions';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';
import type {
  InvestigationDirectionType,
  InvestigationDirectionsResponse,
} from '@trinetra-pulse/types';

jest.mock('@/lib/api/directions', () => ({
  getInvestigationDirections: jest.fn(),
}));

const mockedGetDirections = jest.mocked(getInvestigationDirections);

const directionsFixture: InvestigationDirectionsResponse = {
  investigation_id: 'inv-001',
  computed_at: '2026-09-09T10:00:00Z',
  directions: [
    {
      id: 'dir-overview-crit',
      investigation_id: 'inv-001',
      direction_type: 'high_connectivity_entity' as InvestigationDirectionType,
      title: 'Critical follow-through lead',
      summary: 'A critical summary.',
      priority: 'critical',
      confidence: 0.9,
      rationale: 'Connected to many records.',
      supporting_facts: [],
      related_entity_ids: [],
      related_relationship_ids: [],
      related_evidence_ids: [],
      status: 'new',
      created_at: '2026-09-09T10:00:00Z',
    },
    {
      id: 'dir-overview-high',
      investigation_id: 'inv-001',
      direction_type: 'evidence_gap',
      title: 'High evidence-gap lead',
      summary: 'A high summary.',
      priority: 'high',
      confidence: 0.62,
      rationale: 'A relationship lacks evidence.',
      supporting_facts: [],
      related_entity_ids: [],
      related_relationship_ids: [],
      related_evidence_ids: [],
      status: 'new',
      created_at: '2026-09-09T10:00:00Z',
    },
  ],
};

function seed(id: string) {
  const rec = mockInvestigationById.get(id);
  if (!rec) throw new Error(`no mock: ${id}`);
  const data: InvestigationWorkspaceData = {
    investigation: rec.investigation,
    entities: [...rec.entities],
    relationships: [...rec.relationships],
    evidence: [...rec.evidence],
    findings: [...rec.findings],
    notes: [...rec.notes],
    timeline: [...rec.timeline],
    events: [],
    activity: [...rec.activity],
    members: [...rec.members],
    networks: [...rec.networks],
    analyticsSnapshots: [...rec.analyticsSnapshots],
  };
  useInvestigationStore.setState({ investigationId: id, data, loading: false, error: null, dirty: false });
}

afterEach(() => {
  cleanup();
  useInvestigationStore.setState({
    investigationId: null,
    data: {
      investigation: null,
      entities: [],
      relationships: [],
      evidence: [],
      findings: [],
      notes: [],
      timeline: [],
      events: [],
      activity: [],
      members: [],
      networks: [],
      analyticsSnapshots: [],
    },
    loading: false,
    error: null,
    dirty: false,
  });
  useDirectionsStore.setState({ investigationId: null, data: null, loading: false, error: null });
  useShellStore.setState({ inspectorContext: null });
});

describe('InvestigationOverview (Phase 27 workspace)', () => {
  it('renders findings and timeline event counters alongside the core counters', () => {
    seed('inv-001');
    const rec = mockInvestigationById.get('inv-001')!;
    render(<InvestigationOverview investigation={rec.investigation} />);

    expect(screen.getByTestId('investigation-overview')).toBeInTheDocument();
    expect(screen.getByTestId('overview-stat-findings')).toHaveTextContent('2');
    expect(screen.getByTestId('overview-stat-events')).toHaveTextContent('2');
    expect(screen.getAllByTestId('overview-entity').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('overview-finding').length).toBeGreaterThan(0);
  });

  it('surfaces available directions with critical/high counts and top leads', async () => {
    const rec = mockInvestigationById.get('inv-001')!;
    mockedGetDirections.mockResolvedValue(directionsFixture);
    const onOpenTab = jest.fn();

    render(<InvestigationOverview investigation={rec.investigation} onOpenTab={onOpenTab} />);

    await screen.findByTestId('overview-directions');
    expect(screen.getByTestId('overview-directions-critical')).toHaveTextContent('1');
    expect(screen.getByTestId('overview-directions-high')).toHaveTextContent('1');
    expect(screen.getByText('Critical follow-through lead')).toBeInTheDocument();
    expect(screen.getByTestId('overview-direction-dir-overview-crit')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('overview-action-directions'));
    expect(onOpenTab).toHaveBeenCalledWith('directions');
  });

  it('keeps the analytical-leads disclaimer visible', async () => {
    const rec = mockInvestigationById.get('inv-001')!;
    mockedGetDirections.mockResolvedValue(directionsFixture);

    render(<InvestigationOverview investigation={rec.investigation} />);

    await screen.findByTestId('overview-directions');
    expect(
      screen.getByText(/analytical leads derived from existing investigation data/i),
    ).toBeInTheDocument();
  });

  it('handles a directions failure with a retry action instead of crashing the overview', async () => {
    const rec = mockInvestigationById.get('inv-001')!;
    mockedGetDirections.mockRejectedValue(new Error('boom'));

    render(<InvestigationOverview investigation={rec.investigation} />);

    expect(
      await screen.findByTestId('overview-directions-error'),
    ).toHaveTextContent('Could not compute directions.');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});