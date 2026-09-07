import React, { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ResizablePanel } from '@/components/shell/resizable-panel';
import { useShellStore } from '@/state/shell.store';

// ============================================================
// PHASE 3.5 — RESIZABLE PANEL (keyboard resize)
// ============================================================

const RECT = {
  width: 1000,
  height: 600,
  left: 0,
  top: 0,
  right: 1000,
  bottom: 600,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => RECT,
  });
});

afterEach(() => {
  cleanup();
  useShellStore.setState({ viewport: 'desktop' });
});

function PanelHarness() {
  const [width, setWidth] = useState(360);
  return (
    <ResizablePanel
      id="test-panel"
      side="right"
      panelWidth={width}
      onPanelWidthChange={setWidth}
      panel={<div>Inspector content</div>}
    >
      <div>Primary content</div>
    </ResizablePanel>
  );
}

function getSeparator() {
  return screen.getByRole('separator', { name: 'Resize panel' });
}

describe('ResizablePanel', () => {
  it('renders primary and panel content', () => {
    render(<PanelHarness />);
    expect(screen.getByText('Primary content')).toBeInTheDocument();
    expect(screen.getByText('Inspector content')).toBeInTheDocument();
  });

  it('grows the panel when ArrowRight is pressed', () => {
    render(<PanelHarness />);
    const separator = getSeparator();
    separator.focus();
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    fireEvent.keyDown(separator, { key: 'ArrowRight' });
    expect(separator).toHaveAttribute('aria-valuenow', '408');
  });

  it('shrinks the panel with ArrowLeft and clamps to the min width', () => {
    render(<PanelHarness />);
    const separator = getSeparator();
    separator.focus();
    // 360 - 24*5 = 240 -> clamped to min 300
    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(separator, { key: 'ArrowLeft' });
    }
    expect(separator).toHaveAttribute('aria-valuenow', '300');
  });

  it('uses a larger step with Shift and clamps to the max ratio (450px)', () => {
    render(<PanelHarness />);
    const separator = getSeparator();
    separator.focus();
    // 360 + 96 = 456 -> clamped to 0.45 * 1000 = 450
    fireEvent.keyDown(separator, { key: 'ArrowRight', shiftKey: true });
    expect(separator).toHaveAttribute('aria-valuenow', '450');
  });

  it('hides the divider when not in desktop viewport', () => {
    useShellStore.setState({ viewport: 'tablet' });
    render(<PanelHarness />);
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});