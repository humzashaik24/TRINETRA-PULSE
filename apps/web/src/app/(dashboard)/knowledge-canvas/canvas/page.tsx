'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// ============================================================
// KNOWLEDGE CANVAS — DEDICATED CANVAS ROUTE
// ============================================================
// The full Canvas application is dynamic-imported (SSR disabled) so the
// gateway page stays lightweight: React Flow, the network engine, Whisper
// and mermaid are only fetched once this route is actually entered.
// ============================================================

const CanvasWorkspace = dynamic(
  () =>
    import('@/components/knowledge-canvas/canvas-workspace').then(
      (m) => m.CanvasWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[60vh] items-center justify-center text-caption text-foreground-muted"
        aria-busy="true"
      >
        Loading Knowledge Canvas…
      </div>
    ),
  },
);

export default function KnowledgeCanvasCanvasPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8" aria-busy="true" />}>
      <CanvasWorkspace />
    </Suspense>
  );
}