/**
 * Component tests for the investigation timeline tab (Phase 29).
 *
 * The tab renders a single unified stream — timeline feed + action log +
 * findings slice + evidence slice — merged, grouped by day and ordered
 * ASCENDING by each record's real temporal field. These tests assert:
 *  - every source slice is represented exactly once (evidence rows render
 *    from the evidence slice; findings from the findings slice),
 *  - the stream is ascending and grouped by day with the honest
 *    "Time unavailable" group LAST (no fabricated dates),
 *  - the time-source label and undated states render correctly,
 *  - loading / error + retry / empty states,
 *  - expanding an event or evidence row opens the TimelineEventDetailPanel,
 *    which resolves the persisted event (entities, relationships, honest
 *    "No linked evidence") or evidence record from workspace data.
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { InvestigationTimelineTab } from '@/components/investigation/investigation-timeline-tab';
import { useInvestigationStore } from '@/state/investigation.store';
import { useShellStore } from '@/state/shell.store';
import { mockInvestigationById } from '@/mock/investigations';
import type { InvestigationWorkspaceData } from '@/state/investigation.store';

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

describe('InvestigationTimelineTab', () => {
  it('renders the merged ascending stream for an investigation', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);
    expect(screen.getByTestId('investigation-timeline-tab')).toBeInTheDocument();

    const state = useInvestigationStore.getState().data;
    const expectedCount =
      state.timeline.length + state.activity.length + state.findings.length + state.evidence.length;
    expect(screen.getAllByTestId('timeline-item')).toHaveLength(expectedCount);

    expect(screen.getByText('Large transfer executed')).toBeInTheDocument();
    expect(screen.getByText('Chennai hub coordination meeting')).toBeInTheDocument();
    expect(screen.getByText('Analytics captured')).toBeInTheDocument();
  });

  it('lists each finding exactly once (no duplication from the timeline feed)', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    for (const finding of useInvestigationStore.getState().data.findings) {
      expect(screen.getAllByText(finding.title)).toHaveLength(1);
    }
  });

  it('lists each evidence record exactly once (deduped against the timeline feed)', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    for (const ev of useInvestigationStore.getState().data.evidence) {
      expect(screen.getAllByText(ev.title)).toHaveLength(1);
    }
  });

  it('orders entries ascending by their real temporal field', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    const items = screen.getAllByTestId('timeline-item');
    // Oldest event in the stream leads (2026-02-05).
    expect(items[0].textContent).toContain('Named in case proceedings');
    // Second event is the 2026-02-14 transfer — ascending, not newest-first.
    expect(items[1].textContent).toContain('Large transfer executed');
  });

  it('groups the stream by day with the undated "Time unavailable" group last', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    const dated = screen.getAllByTestId('timeline-group-date');
    const undated = screen.getByTestId('timeline-group-undated');
    const items = screen.getAllByTestId('timeline-item');

    // Dated day groups render first, ascending; the undated group closes the
    // stream so unknown times are never placed inside the dated timeline.
    expect(dated.length).toBeGreaterThan(3);
    expect(undated.textContent).toContain('Time unavailable');
    expect(items[items.length - 1].textContent).toContain('GST registration');
    expect(items[items.length - 2].textContent).toContain('Flagged transaction record');
  });

  it('renders an honest "Time unavailable" for undated evidence rows', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    // Two undated evidence rows (GST registration, Flagged transaction)
    // each surface "Time unavailable" as their recorded time.
    expect(screen.getAllByText('Time unavailable').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the loading state while the workspace is loading', () => {
    useInvestigationStore.setState({
      investigationId: 'inv-006',
      loading: true,
      error: null,
    });
    render(<InvestigationTimelineTab />);
    expect(screen.getByTestId('timeline-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading timeline…')).toBeInTheDocument();
  });

  it('renders the error state with an actionable retry', () => {
    useInvestigationStore.setState({
      investigationId: 'inv-006',
      loading: false,
      error: 'fetch failed',
    });
    render(<InvestigationTimelineTab />);
    expect(screen.getByTestId('timeline-error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load timeline.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('timeline-retry'));
    expect(screen.getByTestId('timeline-loading')).toBeInTheDocument();
  });

  it('expands an event row into the detail panel with grounded entities', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    fireEvent.click(screen.getByTestId('timeline-expand-int-006-4'));
    expect(screen.getByTestId('timeline-event-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-event-detail-event-001')).toBeInTheDocument();

    // Event location + persisted event details resolve from the events slice.
    expect(screen.getByText('Chennai')).toBeInTheDocument();
    // Related entities resolve from the workspace entities slice.
    expect(screen.getByTestId('timeline-event-entity-ent-person-001')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-event-entity-ent-person-003')).toBeInTheDocument();
    // Relationships touching the event's entities resolve from the graph.
    expect(screen.getByTestId('timeline-event-relationship-rel-001')).toBeInTheDocument();

    // The relational contract defines no event↔evidence link: honest empty.
    expect(screen.getByTestId('timeline-event-evidence-empty')).toBeInTheDocument();
    expect(screen.getByText(/No linked evidence/)).toBeInTheDocument();
  });

  it('opens the context inspector from a grounded event entity', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    fireEvent.click(screen.getByTestId('timeline-expand-int-006-4'));
    fireEvent.click(screen.getByTestId('timeline-event-entity-ent-person-001'));
    expect(useShellStore.getState().inspectorContext).toMatchObject({
      type: 'entity',
      id: 'ent-person-001',
      investigationId: 'inv-006',
    });
  });

  it('expands an evidence row into the detail panel with honest event linkage', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    fireEvent.click(screen.getByTestId('timeline-expand-tl-ev-ev-001'));
    expect(screen.getByTestId('timeline-evidence-detail-ev-001')).toBeInTheDocument();
    // The "Evidence collected" time-source label renders in the row chip and
    // inside the detail panel's TimeLine.
    expect(screen.getAllByText(/Evidence collected/).length).toBeGreaterThanOrEqual(1);
    // Evidence records do not reference timeline events directly.
    expect(screen.getByTestId('timeline-evidence-events-empty')).toBeInTheDocument();
    expect(screen.getByText(/No timeline event linked/)).toBeInTheDocument();
  });

  it('closes the detail panel', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    fireEvent.click(screen.getByTestId('timeline-expand-int-006-4'));
    expect(screen.getByTestId('timeline-event-detail-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('timeline-event-detail-close'));
    expect(screen.queryByTestId('timeline-event-detail-panel')).not.toBeInTheDocument();
  });

  it('renders the empty state when the stream is empty', () => {
    useInvestigationStore.setState({
      investigationId: 'inv-empty',
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
    render(<InvestigationTimelineTab />);
    expect(screen.getByTestId('timeline-empty')).toBeInTheDocument();
    expect(screen.getByText('No timeline events for this investigation.')).toBeInTheDocument();
    expect(screen.queryByTestId('investigation-timeline-tab')).not.toBeInTheDocument();
  });
});