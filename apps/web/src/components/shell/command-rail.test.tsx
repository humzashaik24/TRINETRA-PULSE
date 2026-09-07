import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { CommandRail } from '@/components/shell/command-rail';
import { useShellStore } from '@/state/shell.store';
import { __setPathname, __resetNavigation } from '@/test/mocks/next-navigation';

// ============================================================
// PHASE 3.5 — COMMAND RAIL
// ============================================================

afterEach(() => {
  cleanup();
  useShellStore.setState({
    railExpanded: true,
    viewport: 'desktop',
  });
  __resetNavigation();
});

describe('CommandRail (desktop)', () => {
  it('renders the primary workspace links', () => {
    render(<CommandRail />);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/overview');
    expect(screen.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/data-intelligence');
    expect(screen.getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/entities');
    expect(screen.getByRole('link', { name: /Investigations/ })).toHaveAttribute('href', '/investigations');
  });

  it('marks the current route as active', () => {
    __setPathname('/entities');
    render(<CommandRail />);
    expect(screen.getByRole('link', { name: 'Entities' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('collapses and expands via the rail toggle', () => {
    render(<CommandRail />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation rail' }));
    expect(useShellStore.getState().railExpanded).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Expand navigation rail' }));
    expect(useShellStore.getState().railExpanded).toBe(true);
  });
});

describe('CommandRail (mobile)', () => {
  it('renders a compact bottom navigation with 5 destinations', () => {
    act(() => {
      useShellStore.getState().setViewport('mobile');
    });
    render(<CommandRail />);
    const nav = screen.getByTestId('mobile-bottom-nav');
    expect(nav).toBeInTheDocument();
    expect(nav.querySelectorAll('a')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Entities' })).toHaveAttribute('href', '/entities');
  });

  it('highlights the active mobile destination', () => {
    act(() => {
      useShellStore.getState().setViewport('mobile');
    });
    __setPathname('/networks');
    render(<CommandRail />);
    expect(screen.getByRole('link', { name: 'Networks' })).toHaveAttribute('aria-current', 'page');
  });
});