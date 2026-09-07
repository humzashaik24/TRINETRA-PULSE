import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import NetworkPage from '@/app/(dashboard)/networks/[id]/page';
import { useGraphStore } from '@/state/graph.store';
import { useShellStore } from '@/state/shell.store';

// Stub loadNetwork so the page never resolves into the interactive
// graph (which mounts the @xyflow/react renderer — out of scope for
// jsdom). We exercise the loading and error states here; the ready
// state is covered by the list view + listing tests.
const noopLoad = jest.fn(async () => {});

beforeEach(() => {
  useGraphStore.setState({
    loadNetwork: noopLoad,
    clearNetwork: noopLoad,
    loadingState: 'idle',
    error: null,
    networkId: 'NET-001',
    nodes: [],
    edges: [],
  });
  useShellStore.setState({
    inspectorOpen: false,
    inspectorStatus: 'closed',
    inspectorContext: null,
  });
});

afterEach(() => {
  cleanup();
  useGraphStore.setState({ loadingState: 'idle', error: null, nodes: [], edges: [] });
});

function renderPage() {
  return render(<NetworkPage params={{ id: 'NET-001' }} />);
}

describe('NetworkPage — loading / error states', () => {
  it('renders a loading state while the network builds', async () => {
    useGraphStore.setState({ loadingState: 'loading' });
    renderPage();
    expect(screen.getByText(/building network/i)).toBeInTheDocument();
  });

  it('renders an error state when the network fails to load', async () => {
    useGraphStore.setState({ loadingState: 'error', error: 'Network unavailable' });
    renderPage();
    expect(screen.getByText(/could not load network/i)).toBeInTheDocument();
    expect(screen.getByText(/network unavailable/i)).toBeInTheDocument();
  });

  it('renders empty state CTA when network loads with no nodes', () => {
    useGraphStore.setState({
      loadingState: 'ready',
      networkId: 'NET-001',
      nodes: [],
      edges: [],
    });
    renderPage();
    expect(screen.getByText(/no investigation data yet/i)).toBeInTheDocument();
    expect(screen.getByText('Ingest Data')).toBeInTheDocument();
  });
});
