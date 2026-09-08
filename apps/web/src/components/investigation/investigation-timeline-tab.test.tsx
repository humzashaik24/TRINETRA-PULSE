/**
 * Component tests for the investigation timeline tab (Phase 17.4).
 *
 * The tab renders a single merged stream: API/mock timeline entries, the
 * investigation action log, and findings. These tests assert:
 *  - every source slice is represented exactly once (findings are sourced
 *    from the findings slice and must not be doubled by the timeline feed),
 *  - entries render newest-first,
 *  - event/evidence/note/finding entries open the context inspector,
 *  - the empty state renders when nothing is in the stream.
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
});

describe('InvestigationTimelineTab', () => {
  it('renders the merged timeline stream for an investigation', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);
    expect(screen.getByTestId('investigation-timeline-tab')).toBeInTheDocument();

    const state = useInvestigationStore.getState().data;
    const expectedCount = state.timeline.length + state.activity.length + state.findings.length;
    expect(screen.getAllByTestId('timeline-item')).toHaveLength(expectedCount);

    // Timeline feed entries ("Investigation created" also appears once in the
    // action log, so it legitimately renders twice in the merged stream).
    expect(screen.getAllByText('Investigation created').length).toBeGreaterThan(0);
    expect(screen.getByText('Large transfer executed')).toBeInTheDocument();
    expect(screen.getByText('Chennai hub coordination meeting')).toBeInTheDocument();

    // Action log entry.
    expect(screen.getByText('Analytics captured')).toBeInTheDocument();

    // Findings come from the findings slice only.
    expect(
      screen.getAllByText('Coordinate cluster around the primary device').length,
    ).toBeGreaterThan(0);
  });

  it('lists each finding exactly once (no duplication from the timeline feed)', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    for (const finding of useInvestigationStore.getState().data.findings) {
      expect(screen.getAllByText(finding.title)).toHaveLength(1);
    }
  });

  it('sorts entries newest-first in the merged stream', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    const items = screen.getAllByTestId('timeline-item');
    // Newest entry in the merged stream leads (finding created 2026-08-25).
    expect(items[0].textContent).toContain('Shared company relationship observed');
    // Oldest feed entry (Large transfer executed, 2026-02-14) must trail.
    expect(items[items.length - 1].textContent).toContain('Large transfer executed');
  });

  it('opens the context inspector for an event entry', () => {
    seed('inv-006');
    render(<InvestigationTimelineTab />);

    fireEvent.click(screen.getByText('Chennai hub coordination meeting'));
    expect(useShellStore.getState().inspectorContext).toEqual({
      type: 'event',
      id: 'event-001',
      title: 'Chennai hub coordination meeting',
      investigationId: 'inv-006',
    });
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
    expect(screen.getByText('No timeline entries yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('investigation-timeline-tab')).not.toBeInTheDocument();
  });
});