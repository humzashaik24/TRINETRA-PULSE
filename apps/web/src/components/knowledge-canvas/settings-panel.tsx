'use client';

import { useEffect, useState } from 'react';
import { Button } from '@trinetra-pulse/ui';
import { useCanvasStore } from './canvas-store';
import { isMockData, API_BASE_URL } from '@/lib/api/config';
import { apiFetch } from '@/lib/api/client';

// ============================================================
// KNOWLEDGE CANVAS — SETTINGS
// ============================================================
// Canvas display preferences + a read-only view of AI provider status.
// Provider management and credentials belong to Trinetra settings; the
// Canvas only surfaces availability. No keys are ever typed here.
// ============================================================

interface ProviderStatusRow {
  provider: string;
  model?: string;
  configured: boolean;
  status: string;
}

export function SettingsPanel({ mode }: { mode: 'inline' | 'overlay' }) {
  const setSettingsOpen = useCanvasStore((s) => s.setSettingsOpen);
  const settingsOpen = useCanvasStore((s) => s.settingsOpen);
  const minimap = useCanvasStore((s) => s.minimap);
  const setMinimap = useCanvasStore((s) => s.setMinimap);
  const showLabels = useCanvasStore((s) => s.showLabels);
  const setShowLabels = useCanvasStore((s) => s.setShowLabels);
  const animateNodes = useCanvasStore((s) => s.animateNodes);
  const setAnimateNodes = useCanvasStore((s) => s.setAnimateNodes);
  const dataSource = useCanvasStore((s) => s.dataSource);

  const [providers, setProviders] = useState<ProviderStatusRow[] | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isMockData()) {
        setProviders([
          {
            provider: 'Trinetra mock investigator',
            configured: true,
            status: 'demo (NEXT_PUBLIC_USE_MOCK_API=true)',
          },
        ]);
        return;
      }
      try {
        const raw = (await apiFetch<{ providers?: ProviderStatusRow[] }>(
          API_BASE_URL,
          '/ai/status',
        )) as { providers?: ProviderStatusRow[] };
        if (cancelled) return;
        setProviders(raw.providers ?? []);
        setProviderError(null);
      } catch (err) {
        if (cancelled) return;
        setProviderError(err instanceof Error ? err.message : 'unavailable');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const body = (
    <div className="space-y-5">
      <section>
        <h3 className="text-subheading text-foreground">Rendering</h3>
        <div className="mt-2 grid gap-2">
          <ToggleRow
            label="Minimap"
            checked={minimap}
            onChange={setMinimap}
            hint="Overview panel in the corner of the graph"
          />
          <ToggleRow
            label="Edge labels"
            checked={showLabels}
            onChange={setShowLabels}
            hint="Relationship labels on connections"
          />
          <ToggleRow
            label="Animate node updates"
            checked={animateNodes}
            onChange={setAnimateNodes}
            hint="Animate newly added nodes"
          />
        </div>
      </section>

      <section>
        <h3 className="text-subheading text-foreground">AI provider status</h3>
        <p className="mt-1 text-caption text-foreground-muted">
          The Canvas Investigator routes every query to the Trinetra backend.
          Provider keys and model configuration stay server-side.
        </p>
        {providerError ? (
          <p className="mt-2 text-caption text-danger">Status unavailable: {providerError}</p>
        ) : providers ? (
          <ul className="mt-2 space-y-1">
            {providers.map((p) => (
              <li
                key={p.provider}
                className="flex items-center justify-between gap-2 rounded-md border border-border-subtle px-2.5 py-1.5"
              >
                <span className="font-mono text-caption text-foreground">{p.provider}</span>
                <span
                  className={
                    p.configured
                      ? 'rounded bg-success/10 px-1.5 font-mono text-overline text-success'
                      : 'rounded bg-warning/10 px-1.5 font-mono text-overline text-warning'
                  }
                >
                  {p.configured ? 'configured' : 'not configured'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-caption text-foreground-muted" aria-busy="true">
            Loading provider status…
          </p>
        )}
      </section>

      <section className="rounded-md border border-border-subtle bg-surface-elevated/50 p-3">
        <h3 className="font-mono text-overline uppercase tracking-wider text-foreground-secondary">
          Security posture
        </h3>
        <p className="mt-1 text-caption text-foreground-muted">
          No artificial-intelligence provider keys, Firebase config, or passphrases are stored in
          this browser. Evidence integrity, hash chains and AI provider access are all enforced by
          the Trinetra backend. The Canvas persists no authoritative data on the client.
        </p>
        <p className="mt-2 font-mono text-caption text-foreground-secondary">
          data source: {dataSource}
        </p>
      </section>
    </div>
  );

  if (mode === 'inline') {
    return (
      <div data-testid="canvas-settings-panel-inline" className="max-w-2xl space-y-5">
        <p className="text-caption text-foreground-muted">
          Settings for the Knowledge Canvas. Changes apply to the current canvas session.
        </p>
        {body}
      </div>
    );
  }

  if (!settingsOpen) return null;

  return (
    <div
      data-testid="canvas-settings-panel"
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false);
      }}
    >
      <div className="max-h-[80%] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-subheading text-foreground">Canvas settings</h2>
          <Button
            variant="ghost"
            size="sm"
            data-testid="canvas-settings-close"
            onClick={() => setSettingsOpen(false)}
          >
            Close
          </Button>
        </header>
        {body}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border-subtle px-2.5 py-2">
      <div>
        <span className="block text-label text-foreground">{label}</span>
        <span className="block text-caption text-foreground-muted">{hint}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[hsl(var(--color-brand))]"
      />
    </label>
  );
}