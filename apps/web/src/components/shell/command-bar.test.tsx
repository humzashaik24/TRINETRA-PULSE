import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { CommandBar } from '@/components/shell/command-bar';
import { ThemeProvider } from '@/components/theme-provider';
import { useAppStore } from '@/state/app.store';
import { __setPathname, __resetNavigation } from '@/test/mocks/next-navigation';
import { useShellStore } from '@/state/shell.store';

// ============================================================
// PHASE 3.5 — COMMAND BAR
// ============================================================

afterEach(() => {
  cleanup();
  __resetNavigation();
  act(() => {
    useAppStore.setState({ commandOpen: false, contextLabel: null, activeCaseId: null, language: 'en' });
  });
  useShellStore.setState({ railExpanded: true });
});

function renderBar() {
  return render(
    <ThemeProvider>
      <CommandBar />
    </ThemeProvider>
  );
}

describe('CommandBar', () => {
  it('renders breadcrumbs for the current route', () => {
    __setPathname('/data-intelligence');
    renderBar();
    const nav = screen.getByTestId('live-breadcrumbs');
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Data Intelligence')).toBeInTheDocument();
  });

  it('renders the search trigger and opens the command palette', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('command-bar-search'));
    expect(useAppStore.getState().commandOpen).toBe(true);
  });

  it('renders a context indicator when a case is active', () => {
    act(() => {
      useAppStore.setState({ activeCaseId: 'INV-024' });
    });
    renderBar();
    expect(screen.getByText('Case INV-024')).toBeInTheDocument();
  });

  it('NotificationBell surfaces unread count', () => {
    renderBar();
    const bell = screen.getByRole('button', { name: /Notifications/ });
    expect(bell).toBeInTheDocument();
  });

  it('does not render a language toggle in the command bar (moved to Settings)', () => {
    __setPathname('/data-intelligence');
    renderBar();
    expect(screen.queryByTestId('language-toggle')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'हिंदी' })).not.toBeInTheDocument();
  });
});