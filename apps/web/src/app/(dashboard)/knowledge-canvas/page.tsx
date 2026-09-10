'use client';

import { Suspense } from 'react';
import { KnowledgeCanvasWorkspace } from '@/components/knowledge-canvas/knowledge-canvas-workspace';

// ============================================================
// KNOWLEDGE CANVAS — ROUTE
// ============================================================
// Thin page shell; the workspace owns all state + capabilities.
// Journey contract: /knowledge-canvas?i=<investigation>&section=<tab>
// The workspace reads ?i=/?section= via useSearchParams, so it is
// wrapped in a Suspense boundary to keep the page statically
// prerenderable (Next.js CSR bailout guard).
// ============================================================

export default function KnowledgeCanvasPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8" aria-busy="true" />}>
      <KnowledgeCanvasWorkspace />
    </Suspense>
  );
}