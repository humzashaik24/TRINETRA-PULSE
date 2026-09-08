import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SupportingFactList } from '@/components/investigation/supporting-fact-list';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';
import type { InvestigationSupportingFact } from '@trinetra-pulse/types';

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
  useInvestigationStore.setState({ investigationId: id, data });
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
  });
  useShellStore.setState({ inspectorContext: null });
});

const degreeFact: InvestigationSupportingFact = {
  fact_type: 'degree_observed',
  description: 'Rahul Kumar has recorded relationships.',
  entity_id: 'ent-person-001',
  relationship_id: 'rel-001',
  evidence_id: 'ev-001',
  value: 6,
};

const groundedFact: InvestigationSupportingFact = {
  fact_type: 'pattern_detected',
  description: 'A pattern is detected.',
  entity_id: null,
  relationship_id: null,
  evidence_id: null,
  value: 'n/a',
};

describe('SupportingFactList', () => {
  it('renders typed, described facts with grounded values', () => {
    seed('inv-001');
    render(<SupportingFactList facts={[degreeFact]} investigationId="inv-001" />);

    expect(screen.getByTestId('supporting-fact-list')).toBeInTheDocument();
    expect(screen.getByText('Degree observed')).toBeInTheDocument();
    expect(screen.getByTestId('supporting-fact-type')).toHaveTextContent('degree_observed');
    expect(
      screen.getByText('Rahul Kumar has recorded relationships.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('supporting-fact-value')).toHaveTextContent('6');
  });

  it('renders reference navigation only for references that exist on the fact', () => {
    seed('inv-001');
    render(<SupportingFactList facts={[degreeFact, groundedFact]} investigationId="inv-001" />);

    const rows = screen.getAllByTestId('supporting-fact-row');
    expect(rows).toHaveLength(2);

    expect(screen.getByTestId('fact-entity-ent-person-001')).toBeInTheDocument();
    expect(screen.getByTestId('fact-relationship-rel-001')).toBeInTheDocument();
    expect(screen.getByTestId('fact-evidence-ev-001')).toBeInTheDocument();

    // The grounded fact carries no references — nothing may be rendered for it.
    expect(screen.queryByTestId('fact-entity-')).not.toBeInTheDocument();
    const groundedRefs = rows[1].querySelectorAll('[data-testid^="fact-"]');
    expect(groundedRefs).toHaveLength(0);
  });

  it('opens entity context in the inspector preserving the investigation', () => {
    seed('inv-001');
    render(<SupportingFactList facts={[degreeFact]} investigationId="inv-001" />);

    fireEvent.click(screen.getByTestId('fact-entity-ent-person-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({ type: 'entity', id: 'ent-person-001', investigationId: 'inv-001', name: 'Rahul Kumar' }),
    );
  });

  it('opens relationship context resolving the linked pair from the workspace', () => {
    seed('inv-001');
    render(<SupportingFactList facts={[degreeFact]} investigationId="inv-001" />);

    fireEvent.click(screen.getByTestId('fact-relationship-rel-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({
        type: 'relationship',
        id: 'rel-001',
        investigationId: 'inv-001',
        sourceEntityName: 'Rahul Kumar',
      }),
    );
  });

  it('opens evidence context in the inspector', () => {
    seed('inv-001');
    render(<SupportingFactList facts={[degreeFact]} investigationId="inv-001" />);

    fireEvent.click(screen.getByTestId('fact-evidence-ev-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({ type: 'evidence', id: 'ev-001', investigationId: 'inv-001' }),
    );
  });

  it('shows an empty message when no facts are recorded', () => {
    seed('inv-001');
    render(<SupportingFactList facts={[]} investigationId="inv-001" />);
    expect(screen.getByTestId('supporting-facts-empty')).toHaveTextContent(
      'No supporting facts recorded for this direction.',
    );
  });
});