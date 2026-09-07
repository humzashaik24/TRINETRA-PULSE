import { createRoot, type Root } from 'react-dom/client';
import type { ReactFlowEngineInstance } from './react-flow-engine';
import { ReactFlowViewport } from './react-flow-viewport';

// ============================================================
// REACT FLOW — MOUNT HELPER
// ============================================================
// Renders the React Flow viewport into an engine's DOM container.
// Loaded lazily so the engine module never hard-depends on
// react-dom in non-browser/test environments.
// ============================================================

let activeRoots = new WeakMap<HTMLElement, Root>();

export function mountReactFlow(container: HTMLElement, engine: ReactFlowEngineInstance): void {
  if (typeof document === 'undefined') return;

  const existing = activeRoots.get(container);
  if (existing) {
    existing.render(<ReactFlowViewport engine={engine} />);
    return;
  }

  const root = createRoot(container);
  activeRoots.set(container, root);
  root.render(<ReactFlowViewport engine={engine} />);
}
