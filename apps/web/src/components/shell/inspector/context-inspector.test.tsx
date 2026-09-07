import React from 'react';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { ContextInspector } from '@/components/shell/inspector/context-inspector';
import { useShellStore } from '@/state/shell.store';
import { resolveInspectorContext } from '@/services/inspector.service';
import type {
  InspectorResolution,
  InspectorEntityView,
} from '@/services/inspector.service';

jest.mock('@/services/inspector.service', () => ({
  resolveInspectorContext: jest.fn(),
}));

const mockResolve = resolveInspectorContext as jest.MockedFunction<
  (ctx: unknown) => Promise<InspectorResolution>
>;

const entityView: InspectorEntityView = {
  kind: 'entity',
  id: 'ent-person-001',
  name: 'Rahul Kumar',
  entityType: 'person',
  resolutionState: 'CONFIRMED',
  confidence: 0.92,
  connections: 14,
  evidence: 6,
  sources: 5,
  events: 3,
  verified: true,
  flagged: false,
  aliases: ['Rahul', 'RK'],
  description: 'Primary suspect in INV-024.',
};

afterEach(() => {
  cleanup();
  mockResolve.mockReset();
  useShellStore.setState({
    inspectorOpen: false,
    inspectorStatus: 'closed',
    inspectorContext: null,
  });
});

function openEntityContext(name = 'Rahul Kumar') {
  act(() => {
    useShellStore.getState().selectContext({
      type: 'entity',
      id: 'ent-person-001',
      name,
    });
  });
}

describe('ContextInspector — rendering', () => {
  it('renders nothing when no context is active', () => {
    render(<ContextInspector />);
    expect(screen.queryByTestId('context-inspector')).not.toBeInTheDocument();
  });

  it('renders the resolved entity view once data arrives', async () => {
    mockResolve.mockResolvedValue({ status: 'ready', view: entityView });
    openEntityContext();
    render(<ContextInspector />);

    await screen.findByText('Open in Analytics');
    expect(screen.getAllByText('Rahul Kumar').length).toBeGreaterThan(0);
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Open in Analytics')).toBeInTheDocument();
  });

  it('surfaces an error view when resolution fails', async () => {
    mockResolve.mockResolvedValue({
      status: 'error',
      message: 'Could not load entity',
      view: entityView,
    });
    openEntityContext();
    render(<ContextInspector />);

    await waitFor(() => {
      expect(screen.getByText(/could not resolve context/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/could not load entity/i)).toBeInTheDocument();
  });

  it('exposes the context as an accessible region', async () => {
    mockResolve.mockResolvedValue({ status: 'ready', view: entityView });
    openEntityContext();
    render(<ContextInspector />);
    const dialog = await screen.findByRole('dialog', { name: 'Rahul Kumar inspector' });
    expect(dialog).toBeInTheDocument();
  });

  it('moves focus into the inspector when it opens', async () => {
    mockResolve.mockResolvedValue({ status: 'ready', view: entityView });
    openEntityContext();
    render(<ContextInspector />);
    const dialog = await screen.findByRole('dialog', { name: 'Rahul Kumar inspector' });
    await waitFor(() => expect(dialog).toHaveFocus());
  });
});

describe('ContextInspector — interaction', () => {
  it('closes on Escape and restores focus to the trigger', async () => {
    mockResolve.mockResolvedValue({ status: 'ready', view: entityView });

    render(
      <>
        <button data-testid="opener">Open</button>
        <ContextInspector />
      </>
    );

    const opener = screen.getByTestId('opener');
    opener.focus();
    openEntityContext();

    await screen.findByRole('dialog', { name: 'Rahul Kumar inspector' });
    await waitFor(() => expect(opener).not.toHaveFocus());

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(useShellStore.getState().inspectorOpen).toBe(false);
    });
    await waitFor(() => expect(opener).toHaveFocus());
    // The standalone panel stays mounted (visibility is owned by the
    // shell layout); the closed state is what matters here.
  });

  it('close button closes the panel', async () => {
    mockResolve.mockResolvedValue({ status: 'ready', view: entityView });
    openEntityContext();
    render(<ContextInspector />);
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    await waitFor(() => {
      expect(useShellStore.getState().inspectorOpen).toBe(false);
    });
  });

  it('clearContext tears the panel down entirely', () => {
    mockResolve.mockResolvedValue({ status: 'ready', view: entityView });
    openEntityContext();
    render(<ContextInspector />);

    act(() => {
      useShellStore.getState().clearContext();
    });
    expect(screen.queryByTestId('context-inspector')).not.toBeInTheDocument();
    expect(useShellStore.getState().inspectorContext).toBeNull();
  });
});