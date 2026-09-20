'use client';

import { Suspense } from 'react';
import { KnowledgeCanvasGateway } from '@/components/knowledge-canvas/gateway';

// ============================================================
// KNOWLEDGE CANVAS — GATEWAY ROUTE
// ============================================================
// Lightweight launcher with a single primary action. The full Canvas
// workspace lives at /knowledge-canvas/canvas and is lazy-loaded there,
// so /knowledge-canvas never pulls in React Flow, the network engine,
// Whisper or mermaid. Journey contract keeps ?i=<investigation> so the
// active investigation survives navigation.
// ============================================================

export default function KnowledgeCanvasPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8" aria-busy="true" />}>
      <KnowledgeCanvasGateway />
    </Suspense>
  );
}