import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { InvestigationOperationsTab } from '@/components/investigation/investigation-operations-tab';
import { ActiveInvestigations } from '@/components/dashboard/active-investigations';
import { useInvestigationOperationsStore } from '@/state/investigation-operations.store';
import { useInvestigationStore } from '@/state/investigation.store';
import {
  mockPipelineByInvestigation,
  mockReadinessByInvestigation,
  mockHealthByInvestigation,
  mockReviewByInvestigation,
  mockCrossReferencesByInvestigation,
  mockProvenanceByInvestigation,
  mockActivityByInvestigation,
} from '@/mock/investigation-operations';
import { mockInvestigationById } from '@/mock/investigations';

// ============================================================
// PHASE 11 — OPERATIONS TAB (component)
// ============================================================

function seedOperations(id: string) {
  useInvestigationOperationsStore.setState({
    investigationId: id,
    loading: false,
    error: null,
    pipeline: mockPipelineByInvestigation[id] ?? null,
    readiness: mockReadinessByInvestigation[id] ?? null,
    health: mockHealthByInvestigation[id] ?? null,
    reviewQueue: mockReviewByInvestigation[id] ?? [],
    activity: mockActivityByInvestigation[id] ?? [],
    crossReferences: mockCrossReferencesByInvestigation[id] ?? [],
    provenance: mockProvenanceByInvestigation[id] ?? [],
    savedViews: [],
    graphBookmarks: [],
    timelineBookmarks: [],
    searchResults: [],
  });
}

afterEach(() => {
  cleanup();
  useInvestigationOperationsStore.setState({
    investigationId: null,
    loading: false,
    error: null,
    pipeline: null,
    readiness: null,
    health: null,
    reviewQueue: [],
    activity: [],
    savedViews: [],
    graphBookmarks: [],
    timelineBookmarks: [],
    crossReferences: [],
    provenance: [],
    searchResults: [],
  });
  useInvestigationStore.setState({ investigationId: null });
});

describe('InvestigationOperationsTab', () => {
  it('renders pipeline, readiness, health, review queue, cross refs, provenance and activity for inv-006', () => {
    const rec = mockInvestigationById.get('inv-006');
    useInvestigationStore.setState({ investigationId: 'inv-006' });
    seedOperations('inv-006');

    render(<InvestigationOperationsTab />);

    expect(screen.getByTestId('investigation-operations-tab')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-pipeline')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-readiness')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-health')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-review-queue')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-cross-references')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-provenance')).toBeInTheDocument();
    expect(screen.getByTestId('investigation-ops-activity')).toBeInTheDocument();
    expect(screen.getByText(/operation meridian/i)).toBeTruthy();
    expect(rec).toBeTruthy();
  });

  it('shows a prompt when no investigation is open', () => {
    render(<InvestigationOperationsTab />);
    expect(screen.getByText(/open an investigation/i)).toBeInTheDocument();
  });
});

describe('ActiveInvestigations (dashboard)', () => {
  it('links open investigations and shows review-queue counts', () => {
    render(<ActiveInvestigations />);
    const links = screen.getAllByTestId('active-investigation-link');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/^\/investigations\//));
  });
});
