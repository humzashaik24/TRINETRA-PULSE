import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FindingDetailPanel } from '@/components/investigation/finding-detail-panel';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';
import type { InvestigationFinding } from '@trinetra-pulse/types';

// ============================================================
// FINDING DETAIL PANEL — Phase 28 (Finding & Evidence Intelligence)
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
    events: [...rec.events],
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
  events: [],
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

describe('FindingDetailPanel', () => {
  it('expands a finding into its evidence, entities, relationships and provenance', () => {
    seed('inv-001');
    const finding = mockInvestigationById.get('inv-001')!.findings[0];
    render(<FindingDetailPanel finding={finding} investigationId="inv-001" />);

    expect(screen.getByTestId('finding-detail-panel')).toBeInTheDocument();
    expect(screen.getByText(finding.title)).toBeInTheDocument();
    expect(screen.getByTestId('finding-detail-confidence')).toHaveTextContent(
      `${finding.confidence} confidence`,
    );

    // Grounded supporting evidence resolves from the linked workspace records.
    expect(screen.getByTestId('detail-finding-evidence-ev-004')).toHaveTextContent(
      'CDR subscriber records',
    );

    // Related entities resolve.
    expect(screen.getByTestId('detail-finding-entity-ent-person-001')).toHaveTextContent(
      'Rahul Kumar',
    );
    expect(screen.getByTestId('detail-finding-entity-ent-phone-001')).toBeInTheDocument();

    // Relationships connecting the finding entities surface.
    expect(screen.getByTestId('detail-finding-relationship-rel-001')).toBeInTheDocument();

    // Provenance records who recorded the finding and when.
    expect(screen.getByText(/recorded by analyst singh/i)).toBeInTheDocument();
  });

  it('opens referenced evidence in the context inspector preserving the investigation', () => {
    seed('inv-001');
    const finding = mockInvestigationById.get('inv-001')!.findings[0];
    render(<FindingDetailPanel finding={finding} investigationId="inv-001" />);

    fireEvent.click(screen.getByTestId('detail-finding-evidence-ev-004'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({
        type: 'evidence',
        id: 'ev-004',
        investigationId: 'inv-001',
      }),
    );
  });

  it('opens related entities in the context inspector preserving the investigation', () => {
    seed('inv-001');
    const finding = mockInvestigationById.get('inv-001')!.findings[0];
    render(<FindingDetailPanel finding={finding} investigationId="inv-001" />);

    fireEvent.click(screen.getByTestId('detail-finding-entity-ent-person-001'));
    expect(useShellStore.getState().inspectorContext).toEqual(
      expect.objectContaining({
        type: 'entity',
        id: 'ent-person-001',
        name: 'Rahul Kumar',
        investigationId: 'inv-001',
      }),
    );
  });

  it('links into the evidence, network and timeline tabs of the investigation', () => {
    seed('inv-001');
    const finding = mockInvestigationById.get('inv-001')!.findings[0];
    render(<FindingDetailPanel finding={finding} investigationId="inv-001" />);

    expect(screen.getByTestId('detail-finding-evidence-tab')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=evidence',
    );
    expect(screen.getByTestId('detail-finding-network')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=network',
    );
    expect(screen.getByTestId('detail-finding-timeline')).toHaveAttribute(
      'href',
      '/investigations/inv-001?tab=timeline',
    );
    expect(screen.getByText(/analytical finding supports review/i)).toBeInTheDocument();
  });

  it('shows an honest empty state when a finding has no supporting evidence linked', () => {
    seed('inv-001');
    const noEvidence: InvestigationFinding = {
      id: 'inf-fresh',
      investigation_id: 'inv-001',
      title: 'Fresh ungrounded finding',
      description: 'No evidence has been linked yet.',
      category: 'medium',
      confidence: 'low',
      source: 'Inspector Mehta',
      source_type: 'manual',
      created_by: 'Inspector Mehta',
      created_at: '2026-09-09T10:00:00Z',
      updated_at: '2026-09-09T10:00:00Z',
      entity_ids: [],
      evidence_ids: [],
      tags: [],
    };
    render(<FindingDetailPanel finding={noEvidence} investigationId="inv-001" />);

    expect(screen.getByTestId('finding-evidence-empty')).toHaveTextContent(
      'No supporting evidence linked.',
    );
  });

  it('notes evidence references that do not resolve against the workspace', () => {
    seed('inv-001');
    const dangling: InvestigationFinding = {
      id: 'inf-dangling',
      investigation_id: 'inv-001',
      title: 'Dangling reference finding',
      description: 'References an evidence row outside the linked workspace.',
      category: 'low',
      confidence: 'low',
      source: 'Analyst',
      source_type: 'analysis',
      created_by: 'Analyst Singh',
      created_at: '2026-09-09T10:00:00Z',
      updated_at: '2026-09-09T10:00:00Z',
      entity_ids: [],
      evidence_ids: ['ev-does-not-exist'],
      tags: [],
    };
    render(<FindingDetailPanel finding={dangling} investigationId="inv-001" />);

    expect(screen.getByTestId('finding-evidence-empty')).toBeInTheDocument();
    expect(screen.getByText(/1 evidence reference not linked into this workspace/i)).toBeInTheDocument();
  });
});