'use client';

import { useGraphStore } from '@/state/graph.store';

// ============================================================
// DEPTH CONTROL
// ============================================================
// Controls the neighbourhood depth (1/2/3 hops or full graph)
// around the focused entity. Higher depth shows more of the
// network; "full" reveals the entire connected component.
// ============================================================

const DEPTHS: { value: number | 'full'; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 'full', label: 'All' },
];

export function DepthControl() {
  const depth = useGraphStore((s) => s.depth);
  const setDepth = useGraphStore((s) => s.setDepth);
  const setDepthFull = useGraphStore((s) => s.setDepthFull);

  const current =
    depth.kind === 'full'
      ? 'full'
      : depth.depth > 3
        ? 'full'
        : depth.depth;

  const select = (value: number | 'full') => {
    if (value === 'full') setDepthFull();
    else setDepth(value);
  };

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
      data-testid="depth-control"
      role="group"
      aria-label="Neighbourhood depth"
    >
      {DEPTHS.map((d) => (
        <button
          key={String(d.value)}
          onClick={() => select(d.value)}
          aria-pressed={current === d.value}
          title={d.value === 'full' ? 'Full network' : `${d.value} hop${d.value === 1 ? '' : 's'}`}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            current === d.value
              ? 'bg-brand-subtle text-brand font-medium'
              : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
