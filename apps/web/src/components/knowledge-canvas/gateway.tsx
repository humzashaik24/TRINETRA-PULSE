'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { buttonVariants } from '@trinetra-pulse/ui';
import { useAppStore } from '@/state/app.store';
import { useJourneyFocus } from '@/hooks/use-journey-focus';
import { chromeText, useChromeLanguage } from '@/lib/i18n';
import { DEMO_INVESTIGATION_ID, journeyHref } from '@/navigation/journey';
import { mockInvestigationById } from '@/mock/investigations';
import { isMockData } from '@/lib/api/config';
import { useEffect } from 'react';

// ============================================================
// KNOWLEDGE CANVAS — GATEWAY (lightweight launcher)
// ============================================================
// /knowledge-canvas is deliberately simple: an entry point with ONE
// primary action — OPEN CANVAS. Nothing heavier than the app shell is
// loaded here; the full Canvas workspace (React Flow, network engine,
// Whisper, mermaid) is dynamic-imported only after the investigator
// clicks through to /knowledge-canvas/canvas.
// ============================================================

const CAPABILITIES: readonly { title: string; body: string }[] = [
  { title: 'Visual canvas', body: 'Position entities, evidence and findings on an infinite graph and reason over the connections.' },
  { title: 'Investigation-aware', body: 'The workspace stays scoped to the selected Trinetra investigation — entities, evidence and AI context all come from it.' },
  { title: 'Grounded AI', body: 'Ask the Investigator about a selection. Answers route through Trinetra backend AI and separate source facts from inference.' },
  { title: 'Ingest & link', body: 'Load CDR / CSV samples or uploads, attach files and run on-device Whisper transcription.' },
];

export function KnowledgeCanvasGateway() {
  const lang = useChromeLanguage();
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const { payload } = useJourneyFocus();
  const investigationId = payload.investigation ?? DEMO_INVESTIGATION_ID;

  useEffect(() => {
    setContextLabel(chromeText(lang, 'Knowledge Canvas'));
    return () => setContextLabel(null);
  }, [setContextLabel, lang]);

  const investigation = isMockData() ? mockInvestigationById.get(investigationId) : undefined;
  const openCanvasHref = journeyHref('/knowledge-canvas/canvas', {
    investigation: investigationId,
  });

  return (
    <div className="py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-md border border-border-subtle bg-surface px-2.5 py-1 font-mono text-overline uppercase tracking-wider text-foreground-secondary">
              {investigationId.toUpperCase()}
            </span>
            <h1 className="text-display-sm font-bold text-foreground">
              {chromeText(lang, 'Knowledge Canvas')}
            </h1>
            <p className="max-w-xl text-body text-foreground-muted">
              {chromeText(
                lang,
                'A visual investigation workspace. Open the canvas to arrange entities, evidence and findings, connect them, and reason over the case with grounded AI — all inside the current investigation context.',
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="rounded-lg border border-border-subtle bg-surface/60 p-4"
              >
                <h2 className="text-subheading text-foreground">{cap.title}</h2>
                <p className="mt-1 text-body-sm text-foreground-muted">{cap.body}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href={openCanvasHref}
              data-testid="open-canvas"
              className={buttonVariants({ variant: 'primary', size: 'xl', className: 'w-full sm:w-auto' })}
            >
              Open Canvas
            </Link>
            <span className="text-caption text-foreground-muted">
              {investigation?.investigation.title ?? 'Operation Trinetra Nexus'} —
              the workspace stays scoped to this investigation.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}