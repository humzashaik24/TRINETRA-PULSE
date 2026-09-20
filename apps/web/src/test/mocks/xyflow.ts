import React from 'react';

/** jest mock for @xyflow/react (React Flow). The canvas graph is a
 *  heavyweight visualizer; tests replace it with a shallow renderer that
 *  preserves children (panels) and the API surface components use. */

export const BackgroundVariant = {};
export const Position = { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' };
export const MarkerType = { ArrowClosed: 'arrowclosed' };

const noop = (): void => {
  /* noop */
};

export function Handle(): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-handle' });
}

export function BaseEdge(): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-base-edge' });
}

export function ControlComponent(): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-control' });
}

export function ReactFlow({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-react-flow' }, children);
}

export function ReactFlowProvider({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  return React.createElement(React.Fragment, null, children);
}

export function Background(): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-background' });
}

export function Controls(): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-controls' });
}

export function MiniMap(): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-minimap' });
}

export function getBezierPath(): [string, number, number] {
  return ['M0,0', 0, 0];
}

export function EdgeLabelRenderer({
  children,
}: {
  children?: React.ReactNode;
}): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'mock-edge-label-renderer' }, children);
}

export function useReactFlow() {
  return { fitView: noop };
}