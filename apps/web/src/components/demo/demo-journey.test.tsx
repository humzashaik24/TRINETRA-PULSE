import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { DemoInvestigationHero } from '@/components/demo/demo-investigation-hero';
import { InvestigationOverview } from '@/components/investigation/investigation-overview';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 13 — DEMO END-TO-END FLOW (component-level)
// ============================================================
// Verifies the cohesive demonstration journey: the hero links to the
// canonical demo investigation, the overview command center exposes
// quick actions + linked objects, and selecting an object opens the
// Context Inspector with investigation scope preserved.
// ============================================================

const DEMO = 'inv-006';

function seedDemo() {
  const rec = mockInvestigationById.get(DEMO)!;
  useInvestigationStore.setState({
    investigationId: DEMO,
    data: {
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
    },
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
  useShellStore.setState({ inspectorContext: null });
});

describe('DemoInvestigationHero', () => {
  it('renders the canonical demo investigation entry point', () => {
    render(<DemoInvestigationHero />);
    expect(screen.getByTestId('demo-investigation-hero')).toBeInTheDocument();
    expect(screen.getByText('Operation Meridian')).toBeInTheDocument();
    expect(screen.getByTestId('demo-investigation-open')).toBeInTheDocument();
  });

  it('links the CTA to the demo investigation workspace', () => {
    render(<DemoInvestigationHero />);
    const link = screen.getByTestId('demo-investigation-open').closest('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toContain('/investigations/inv-006');
  });
});

describe('InvestigationOverview command center', () => {
  it('seeds the store and renders quick actions for the demo', () => {
    seedDemo();
    const rec = mockInvestigationById.get(DEMO)!;
    render(<InvestigationOverview investigation={rec.investigation} onOpenTab={() => undefined} />);
    expect(screen.getByTestId('overview-quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('overview-action-network')).toBeInTheDocument();
    expect(screen.getByTestId('overview-action-ai')).toBeInTheDocument();
  });

  it('renders linked entities that can be inspected in place', () => {
    seedDemo();
    const rec = mockInvestigationById.get(DEMO)!;
    const { getAllByTestId } = render(
      <InvestigationOverview investigation={rec.investigation} onOpenTab={() => undefined} />
    );
    fireEvent.click(getAllByTestId('overview-entity')[0]);
    const ctx = useShellStore.getState().inspectorContext;
    expect(ctx?.type).toBe('entity');
    expect(ctx?.id).toBe(rec.entities[0].entity_id);
    if (ctx?.type === 'entity') {
      expect(ctx.investigationId).toBe(DEMO);
    }
  });

  it('surfaces the demonstration journey guide for the demo case', () => {
    seedDemo();
    const rec = mockInvestigationById.get(DEMO)!;
    render(<InvestigationOverview investigation={rec.investigation} onOpenTab={() => undefined} />);
    expect(screen.getByTestId('overview-demo-guide')).toBeInTheDocument();
    expect(screen.getByText(/Demonstration journey/)).toBeInTheDocument();
  });

  it('does not render the demo guide for a non-demo investigation', () => {
    const rec = mockInvestigationById.get('inv-001')!;
    seedDemo();
    useInvestigationStore.setState({ investigationId: 'inv-001' });
    render(<InvestigationOverview investigation={rec.investigation} onOpenTab={() => undefined} />);
    expect(screen.queryByTestId('overview-demo-guide')).not.toBeInTheDocument();
  });

  it('invokes onOpenTab when a quick action navigates the workspace', () => {
    seedDemo();
    const rec = mockInvestigationById.get(DEMO)!;
    const onOpenTab = jest.fn();
    const { getByTestId } = render(
      <InvestigationOverview investigation={rec.investigation} onOpenTab={onOpenTab} />
    );
    fireEvent.click(getByTestId('overview-action-timeline'));
    expect(onOpenTab).toHaveBeenCalledWith('timeline');
  });
});

describe('Context preservation across the journey', () => {
  it('selecting an evidence object carries the investigation scope into the inspector context', () => {
    seedDemo();
    const rec = mockInvestigationById.get(DEMO)!;
    const { getAllByTestId } = render(
      <InvestigationOverview investigation={rec.investigation} onOpenTab={() => undefined} />
    );
    fireEvent.click(getAllByTestId('overview-evidence')[0]);
    const ctx = useShellStore.getState().inspectorContext;
    expect(ctx?.type).toBe('evidence');
    if (ctx?.type === 'evidence') {
      expect(ctx.investigationId).toBe(DEMO);
    }
  });

  it('selecting a finding carries the investigation scope', () => {
    seedDemo();
    const rec = mockInvestigationById.get(DEMO)!;
    const { getAllByTestId } = render(
      <InvestigationOverview investigation={rec.investigation} onOpenTab={() => undefined} />
    );
    fireEvent.click(getAllByTestId('overview-finding')[0]);
    const ctx = useShellStore.getState().inspectorContext;
    expect(ctx?.type).toBe('finding');
    if (ctx?.type === 'finding') {
      expect(ctx.investigationId).toBe(DEMO);
    }
  });
});