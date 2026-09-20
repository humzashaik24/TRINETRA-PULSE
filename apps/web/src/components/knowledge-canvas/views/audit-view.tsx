'use client';

import { useCanvasStore } from '../canvas-store';
import { useInvestigationStore } from '@/state/investigation.store';

// ============================================================
// KNOWLEDGE CANVAS — AUDIT LOG
// ============================================================
// Canvas-local activity journal (UI provenance: node/edge placement,
// device transcription, imports, AI queries, removals) combined with the
// canonical investigation activity feed. This is an observability surface,
// NOT a second security system — evidence integrity and chain of custody
// remain authoritative in Trinetra.
// ============================================================

export function AuditView() {
  const audit = useCanvasStore((s) => s.audit);
  const clearAudit = useCanvasStore((s) => s.clearAudit);
  const investigationId = useCanvasStore((s) => s.investigationId);
  const activity = useInvestigationStore((s) => s.data.activity);

  return (
    <div data-testid="canvas-audit-view" className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading text-foreground">Audit log</h2>
          <p className="text-caption text-foreground-muted">
            Canvas activity for <span className="font-mono">{investigationId ?? '…'}</span> +
            canonical investigation feed.
          </p>
        </div>
        <button
          type="button"
          className="cursor-pointer font-mono text-caption text-foreground-muted hover:text-danger"
          onClick={clearAudit}
        >
          clear canvas log
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-subheading text-foreground">Canvas journal</h3>
          <ol className="mt-2 space-y-1.5">
            {audit.length === 0 && (
              <li className="text-caption text-foreground-muted">No canvas actions recorded yet.</li>
            )}
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border-subtle px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-overline uppercase tracking-wider text-foreground">
                    {entry.action}
                  </span>
                  <span className="font-mono text-overline text-foreground-muted">
                    {new Date(entry.at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-0.5 text-caption text-foreground-muted">{entry.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h3 className="text-subheading text-foreground">Investigation activity</h3>
          <ol className="mt-2 space-y-1.5">
            {activity.length === 0 && (
              <li className="text-caption text-foreground-muted">No investigation activity yet.</li>
            )}
            {activity.slice(0, 40).map((entry) => (
              <li key={entry.id} className="rounded-md border border-border-subtle px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label text-foreground">{entry.title}</span>
                  <span className="font-mono text-overline text-foreground-muted">
                    {new Date(entry.at).toLocaleString()}
                  </span>
                </div>
                {entry.detail && (
                  <p className="mt-0.5 text-caption text-foreground-muted">{entry.detail}</p>
                )}
                <p className="mt-0.5 font-mono text-overline text-foreground-secondary">
                  {entry.actor} · {entry.type}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}