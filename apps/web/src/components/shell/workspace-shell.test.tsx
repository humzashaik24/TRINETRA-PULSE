import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { WorkspaceShell } from '@/components/shell/workspace-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { useShellStore, INSPECTOR_DEFAULT_WIDTH } from '@/state/shell.store';

// ============================================================
// PHASE 3.5 — WORKSPACE SHELL INTEGRATION
// ============================================================

const RECT = {
  width: 1200,
  height: 800,
  left: 0,
  top: 0,
  right: 1200,
  bottom: 800,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1400,
  });
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => RECT,
  });
});

afterEach(() => {
  cleanup();
  useShellStore.setState({
    inspectorOpen: false,
    inspectorStatus: 'closed',
    inspectorContext: null,
    inspectorWidth: INSPECTOR_DEFAULT_WIDTH,
    railExpanded: true,
    viewport: 'desktop',
  });
});

function renderShell() {
  return render(
    <ThemeProvider>
      <WorkspaceShell>
        <div data-testid="workspace-content">Workspace</div>
      </WorkspaceShell>
    </ThemeProvider>
  );
}

describe('WorkspaceShell — layout', () => {
  it('composes rail, command bar and workspace content', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/entities');
    expect(screen.getByTestId('command-bar')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-content')).toBeInTheDocument();
  });

  it('starts with the context inspector closed', () => {
    renderShell();
    expect(screen.queryByTestId('context-inspector')).not.toBeInTheDocument();
  });

  it('selecting a context opens the inspector panel in place', async () => {
    renderShell();
    act(() => {
      useShellStore.getState().selectContext({
        type: 'entity',
        id: 'ent-person-001',
        name: 'Rahul Kumar',
      });
    });

    const inspector = await screen.findByTestId('context-inspector');
    expect(inspector).toHaveAttribute('data-variant', 'panel');
    // Resolved view metrics arrive after the entity service resolves.
    await screen.findByText('Connections');
    expect(screen.getAllByText('Rahul Kumar').length).toBeGreaterThan(0);
    // Workspace content is still mounted — no navigation happened.
    expect(screen.getByTestId('workspace-content')).toBeInTheDocument();
  });

  it('Escape closes the inspector', async () => {
    renderShell();
    act(() => {
      useShellStore.getState().selectContext({
        type: 'entity',
        id: 'ent-person-001',
        name: 'Rahul Kumar',
      });
    });
    await screen.findByTestId('context-inspector');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useShellStore.getState().inspectorOpen).toBe(false);
    expect(screen.queryByTestId('context-inspector')).not.toBeInTheDocument();
  });

  it('resizes the inspector with the arrow keys', async () => {
    renderShell();
    act(() => {
      useShellStore.getState().selectContext({
        type: 'entity',
        id: 'ent-person-001',
        name: 'Rahul Kumar',
      });
    });
    await screen.findByTestId('context-inspector');

    const separator = screen.getByRole('separator', { name: 'Resize panel' });
    separator.focus();
    const widthBefore = useShellStore.getState().inspectorWidth;
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    const widthAfter = useShellStore.getState().inspectorWidth;
    expect(widthAfter).toBe(widthBefore + 24);
  });
});

describe('WorkspaceShell — responsive', () => {
  it('renders the inspector as an overlay drawer on tablet', async () => {
    (window as Window & { innerWidth: number }).innerWidth = 900;
    renderShell();

    act(() => {
      useShellStore.getState().selectContext({
        type: 'network',
        id: 'n1',
        label: 'NETWORK N1',
        nodeLabel: 'Rahul Kumar',
      });
    });

    const inspector = await screen.findByTestId('context-inspector');
    expect(inspector).toHaveAttribute('data-variant', 'drawer');
    // No in-flow separator on drawer layouts.
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    (window as Window & { innerWidth: number }).innerWidth = 1400;
  });
});