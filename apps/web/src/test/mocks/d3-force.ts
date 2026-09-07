// ============================================================
// jest mock — d3-force
// ============================================================
// d3-force is ESM-only; ts-jest (CJS) cannot import it. This mock
// provides a deterministic, synchronous simulation so layout tests
// run without the real package, while preserving the chainable
// real-API shape that production code relies on.
// ============================================================

type MockNode = {
  [key: string]: number | string | null | undefined;
};

const noop = (): void => {
  /* no-op */
};

// ---- generic chainable force -------------------------------------------------

interface ChainableForce {
  strength(_strength?: number | ((d: MockNode) => number)): ChainableForce;
  initialize(_nodes?: MockNode[]): void;
}

function makeChainableForce(): ChainableForce {
  const force: ChainableForce = {
    strength: () => force,
    initialize: noop,
  };
  return force;
}

// ---- forceSimulation ----------------------------------------------------------

interface MockSimulation<T extends MockNode> {
  nodes: () => T[];
  force: (name: string, force?: unknown) => MockSimulation<T>;
  stop: () => MockSimulation<T>;
  restart: () => MockSimulation<T>;
  alpha: (value?: number) => MockSimulation<T>;
  tick: (iterations?: number) => MockSimulation<T>;
}

function makeSimulation<T extends MockNode>(nodes: T[]): MockSimulation<T> {
  const sim: MockSimulation<T> = {
    nodes: () => nodes,
    force: () => sim,
    stop: () => sim,
    restart: () => sim,
    alpha: () => sim,
    tick: () => sim,
  };
  return sim;
}

// ---- named forces -------------------------------------------------------------

export function forceManyBody(): ChainableForce {
  return makeChainableForce();
}

export function forceCenter(): ChainableForce {
  return makeChainableForce();
}

export function forceX(): ChainableForce {
  return makeChainableForce();
}

export function forceY(): ChainableForce {
  return makeChainableForce();
}

interface ChainableLink {
  id: (_selector?: unknown) => ChainableLink;
  distance: (_value?: number) => ChainableLink;
  strength: (_value?: number) => ChainableLink;
  initialize: () => void;
}

export function forceLink<T extends { source: unknown; target: unknown }>(
  _links?: T[]
): ChainableLink {
  void _links;
  const link: ChainableLink = {
    id: () => link,
    distance: () => link,
    strength: () => link,
    initialize: noop,
  };
  return link;
}

export function forceSimulation<T extends MockNode>(nodes: T[] = []): MockSimulation<T> {
  return makeSimulation(nodes);
}

const d3ForceMock = {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceX,
  forceY,
};

export default d3ForceMock;
