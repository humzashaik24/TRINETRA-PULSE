import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { InvestigationFindingsTab } from '@/components/investigation/investigation-findings-tab';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';

// ============================================================
// INVESTIGATION FINDINGS TAB — Phase 28 (Finding & Evidence Intelligence)
// ============================================================

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
  useInvestigationStore.setState({ investigationId: id, data, loading: false, error: null, dirty: false });
}

const emptyData: InvestigationWorkspaceData = {
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
};

afterEach(() => {
  cleanup();
  useInvestigationStore.setState({ investigationId: null, data: emptyData, loading: false, error: null, dirty: false });
  useShellStore.setState({ inspectorContext: null });
});

describe('InvestigationFindingsTab — Phase 28 surface', () => {
  it('renders the persistent findings list with counts, badges and provenance', () => {
    seed('inv-001');
    render(<InvestigationFindingsTab />);

    expect(screen.getByTestId('investigation-findings-tab')).toBeInTheDocument();
    expect(screen.getByText('2 findings')).toBeInTheDocument();
    expect(screen.getByText('Concentrated usage around the primary device')).toBeInTheDocument();
    expect(screen.getByTestId('finding-entities-inf-001-1')).toHaveTextContent('2 entities');
    expect(screen.getByTestId('finding-evidence-inf-001-1')).toHaveTextContent('1 evidence reference');
    expect(screen.getByText(/analytical observations derived from existing investigation data/i)).toBeInTheDocument();
  });

  it('expands a finding into its detail panel with grounded evidence context', () => {
    seed('inv-001');
    render(<InvestigationFindingsTab />);

    fireEvent.click(screen.getByTestId('finding-expand-inf-001-1'));
    expect(screen.getByTestId('finding-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('detail-finding-evidence-ev-004')).toHaveTextContent(
      'CDR subscriber records',
    );
    expect(screen.getByTestId('detail-finding-timeline')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=timeline',
    );
  });

  it('opens linked evidence in the context inspector from the detail panel', () => {
    seed('inv-001');
    render(<InvestigationFindingsTab />);

    fireEvent.click(screen.getByTestId('finding-expand-inf-001-1'));
    fireEvent.click(screen.getByTestId('detail-finding-evidence-ev-004'));

    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({ type: 'evidence', id: 'ev-004', investigationId: 'inv-001' }),
    );
  });

  it('shows an honest empty state for an investigation without findings', () => {
    seed('inv-004');
    render(<InvestigationFindingsTab />);

    expect(screen.getByText('No findings detected for this investigation.')).toBeInTheDocument();
  });

  it('shows a loading state while the workspace is loading', () => {
    useInvestigationStore.setState({ investigationId: 'inv-001', data: emptyData, loading: true, error: null });
    render(<InvestigationFindingsTab />);

    expect(screen.getByText('Loading findings…')).toBeInTheDocument();
  });

  it('shows an error state with a retry that reloads the investigation', () => {
    const retry = jest.fn();
    useInvestigationStore.setState({
      investigationId: 'inv-001',
      data: emptyData,
      loading: false,
      error: 'boom',
      loadInvestigation: retry,
    });
    render(<InvestigationFindingsTab />);

    expect(screen.getByText('Could not load findings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledWith('inv-001');
  });

  it('preserves manual finding creation through the existing form', () => {
    seed('inv-004');
    render(<InvestigationFindingsTab />);

    fireEvent.click(screen.getByTestId('add-finding-button'));
    expect(screen.getByTestId('finding-form')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('finding-title-input'), { target: { value: 'New recorded finding' } });
    fireEvent.click(screen.getByTestId('finding-submit'));

    expect(screen.getByText('New recorded finding')).toBeInTheDocument();
    expect(screen.getByText('1 finding')).toBeInTheDocument();
  });

  it('preserves inline confidence editing', () => {
    seed('inv-001');
    const editFinding = jest.fn();
    useInvestigationStore.setState({ editFinding });
    render(<InvestigationFindingsTab />);

    fireEvent.click(screen.getByTestId('edit-finding-inf-001-2'));
    fireEvent.change(screen.getByLabelText('Edit confidence'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: /save confidence/i }));

    expect(editFinding).toHaveBeenCalledWith('inf-001-2', { confidence: 'high' });
  });
});