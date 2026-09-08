import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { InvestigationOverview } from '@/components/investigation/investigation-overview';
import { InvestigationEntitiesTab } from '@/components/investigation/investigation-entities-tab';
import { InvestigationNotesTab } from '@/components/investigation/investigation-notes-tab';
import { useInvestigationStore } from '@/state/investigation.store';
import { useDirectionsStore } from '@/state/directions.store';
import { useShellStore } from '@/state/shell.store';
import { getInvestigationDirections } from '@/lib/api/directions';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';

jest.mock('@/lib/api/directions', () => ({
  getInvestigationDirections: jest.fn(),
}));

const mockedGetDirections = jest.mocked(getInvestigationDirections);

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
    activity: [...rec.activity],
    members: [...rec.members],
    networks: [...rec.networks],
    analyticsSnapshots: [...rec.analyticsSnapshots],
  };
  useInvestigationStore.setState({
    investigationId: id,
    data,
    loading: false,
    error: null,
    dirty: false,
  });
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
      activity: [],
      members: [],
      networks: [],
      analyticsSnapshots: [],
    },
    loading: false,
    error: null,
    dirty: false,
  });
  useShellStore.setState({ inspectorContext: null });
  useDirectionsStore.setState({ investigationId: null, data: null, loading: false, error: null });
});

describe('InvestigationOverview', () => {
  it('renders status, priority, tags, linked counts and the directions section', async () => {
    mockedGetDirections.mockResolvedValue({
      investigation_id: 'inv-001',
      computed_at: '2026-09-09T10:00:00Z',
      directions: [],
    });
    const rec = mockInvestigationById.get('inv-001')!;
    render(<InvestigationOverview investigation={rec.investigation} />);
    expect(screen.getByTestId('investigation-overview')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('High priority')).toBeInTheDocument();
    expect(screen.getByText('Linked entities')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    // Phase 27 — findings + timeline event counters join the overview grid.
    expect(screen.getByTestId('overview-stat-findings')).toHaveTextContent('2');
    expect(screen.getByTestId('overview-stat-events')).toHaveTextContent('2');
    // Phase 27 — available-directions section stays empty-safe.
    await screen.findByTestId('overview-directions');
    expect(screen.getByTestId('overview-directions-critical')).toHaveTextContent('0');
    expect(
      screen.getByText(/no analytical leads yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Lead investigator')).toBeInTheDocument();
    expect(screen.getByText('Inspector Mehta')).toBeInTheDocument();
  });
});

describe('InvestigationEntitiesTab', () => {
  it('lists linked entities with provenance', () => {
    seed('inv-001');
    render(<InvestigationEntitiesTab />);
    expect(screen.getByTestId('investigation-entities-tab')).toBeInTheDocument();
    expect(screen.getByText(/6 linked entities/i)).toBeInTheDocument();
    expect(screen.getByText('Rahul Kumar')).toBeInTheDocument();
    expect(screen.getByText('Primary person of interest')).toBeInTheDocument();
    expect(screen.getAllByText('Inspector Mehta').length).toBeGreaterThan(0);
  });

  it('links an additional canonical entity and reflects the change', () => {
    seed('inv-002');
    render(<InvestigationEntitiesTab />);
    const before = useInvestigationStore.getState().data.entities.length;

    fireEvent.click(screen.getByTestId('add-entity-button'));
    expect(screen.getByTestId('entity-picker')).toBeInTheDocument();

    // Meera Reddy is not yet linked in inv-002, so it offers a Link action.
    const linkBtn = screen.getByTestId('link-entity-ent-person-005');
    fireEvent.click(linkBtn);

    const state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.entities.length).toBe(before + 1);
    expect(state.data.entities[0].name).toBe('Meera Reddy');
  });

  it('unlinks an existing entity', () => {
    seed('inv-002');
    render(<InvestigationEntitiesTab />);
    const before = useInvestigationStore.getState().data.entities.length;

    fireEvent.click(screen.getByTestId('unlink-entity-ent-vehicle-001'));

    const state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.entities.length).toBe(before - 1);
    expect(
      state.data.entities.some((e) => e.entity_id === 'ent-vehicle-001')
    ).toBe(false);
  });

  it('opens the shell inspector when a linked entity is selected', () => {
    seed('inv-001');
    render(<InvestigationEntitiesTab />);
    fireEvent.click(screen.getByTestId('entity-row-ent-person-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({ type: 'entity', id: 'ent-person-001' })
    );
  });
});

describe('InvestigationNotesTab', () => {
  it('displays existing notes', () => {
    seed('inv-001');
    render(<InvestigationNotesTab />);
    expect(screen.getByTestId('investigation-notes-tab')).toBeInTheDocument();
    expect(screen.getByText(/1 note/i)).toBeInTheDocument();
    expect(screen.getByText(/Probe scope:/i)).toBeInTheDocument();
    expect(screen.getByText(/Inspector Mehta/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no notes', () => {
    seed('inv-005');
    render(<InvestigationNotesTab />);
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('adds a note through the compose form', () => {
    seed('inv-005');
    render(<InvestigationNotesTab />);
    const before = useInvestigationStore.getState().data.notes.length;

    fireEvent.click(screen.getByTestId('add-note-button'));
    fireEvent.change(screen.getByTestId('note-body-input'), {
      target: { value: 'A working hypothesis' },
    });
    fireEvent.click(screen.getByTestId('note-submit'));

    const state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.notes.length).toBe(before + 1);
    expect(state.data.notes[0].body).toBe('A working hypothesis');
  });

  it('deletes a note', async () => {
    seed('inv-001');
    render(<InvestigationNotesTab />);
    const before = useInvestigationStore.getState().data.notes.length;
    const noteId = useInvestigationStore.getState().data.notes[0].id;

    fireEvent.click(screen.getByTestId(`delete-note-${noteId}`));

    const state = useInvestigationStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.data.notes.length).toBe(before - 1);
  });
});
