import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { CommandPalette } from '@/components/search/command-palette';
import { useAppStore } from '@/state/app.store';

// ============================================================
// PHASE 3.5 — COMMAND PALETTE
// ============================================================

afterEach(() => {
  cleanup();
  act(() => {
    useAppStore.setState({ commandOpen: false });
  });
});

function renderPalette(open: boolean) {
  act(() => {
    useAppStore.setState({ commandOpen: open });
  });
  return render(<CommandPalette />);
}

describe('CommandPalette', () => {
  it('stays closed by default', () => {
    renderPalette(false);
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
  });

  it('opens and closes with Ctrl+K', () => {
    renderPalette(false);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
      );
    });
    expect(useAppStore.getState().commandOpen).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
      );
    });
    expect(useAppStore.getState().commandOpen).toBe(false);
  });

  it('renders grouped navigation entries when opened', () => {
    renderPalette(true);
    expect(screen.getAllByText('Navigation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Entities').length).toBeGreaterThan(0);
  });

  it('filters entries as the user types', () => {
    renderPalette(true);
    const input = screen.getByLabelText('Search') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Rahul' } });
    expect(screen.getAllByText(/Rahul/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'zzz-no-match' } });
    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });

  it('Escape closes the palette', () => {
    renderPalette(true);
    const input = screen.getByLabelText('Search') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useAppStore.getState().commandOpen).toBe(false);
  });

  it('Enter executes the highlighted entry and closes', () => {
    renderPalette(true);
    const input = screen.getByLabelText('Search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Rahul' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useAppStore.getState().commandOpen).toBe(false);
  });

  it('records executed entries into the recents store', () => {
    renderPalette(true);
    const input = screen.getByLabelText('Search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Rahul' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const raw = window.localStorage.getItem('tp:palette-recent');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).length).toBeGreaterThan(0);
  });
});