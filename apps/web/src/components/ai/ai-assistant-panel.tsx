'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useShellStore } from '@/state/shell.store';
import { useAIStore } from '@/state/ai.store';
import { useReducedMotion } from '@trinetra-pulse/ui';
import type {
  AIContextScope,
  AISourceReference,
  AIAction,
} from '@trinetra-pulse/types';
import { AIChat } from './ai-chat';

// ============================================================
// PHASE 10 — AI ASSISTANT PANEL (Phase 11.5 polish)
// ============================================================
// Mounts the AI chat into the shared workspace shell:
//   - Desktop: resizable right-side panel (in-flow column)
//   - Tablet : overlay drawer from the right
//   - Mobile : bottom sheet
// It must COEXIST with the Context Inspector, so the panel never
// takes over the full viewport beyond its layout region.
// The panel shell stays minimal — the conversation header (with
// scope + close) lives inside AIChat to avoid a double header.
// ============================================================

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1080;

type Viewport = 'desktop' | 'tablet' | 'mobile';

export function AIAssistantPanel({
  scope,
  onSourceClick,
  onAction,
}: {
  scope: AIContextScope;
  onSourceClick?: (source: AISourceReference) => void;
  onAction?: (action: AIAction) => void;
}) {
  const viewport = useShellStore((s) => s.viewport);
  const [localViewport, setLocalViewport] = useState<Viewport>(resolveViewport());

  const open = useAIStore((s) => s.open);
  const mode = useAIStore((s) => s.mode);
  const width = useAIStore((s) => s.width);
  const closePanel = useAIStore((s) => s.closePanel);
  const setWidth = useAIStore((s) => s.setWidth);

  useEffect(() => {
    const onResize = () => setLocalViewport(resolveViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const effectiveViewport: Viewport = mapShellViewport(viewport) ?? localViewport;
  const isMobileLike = viewport === 'mobile';

  const skin = open ? (isMobileLike ? 'mobile' : mode) : 'closed';

  return (
    <AnimatePresence initial={false}>
      {skin !== 'closed' && (
        <AIResponsive
          key={skin}
          skin={skin}
          width={width}
          onResize={setWidth}
          onClose={closePanel}
        >
          <AIChat
            scope={scope}
            onSourceClick={onSourceClick ?? noop}
            onAction={onAction ?? noop}
            onClose={closePanel}
          />
        </AIResponsive>
      )}
    </AnimatePresence>
  );
}

function AIResponsive({
  skin,
  width,
  onResize,
  onClose,
  children,
}: {
  skin: 'panel' | 'drawer' | 'mobile' | 'sheet';
  width: number;
  onResize: (w: number) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  if (skin === 'mobile' || skin === 'sheet') {
    return (
      <motion.div
        key="ai-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={reduced ? { duration: 0 } : { type: 'tween', duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[70vh] flex-col overflow-hidden border-t border-border bg-background shadow-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="AI assistant"
      >
        <div className="flex h-1.5 shrink-0 justify-center bg-transparent pt-1">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </motion.div>
    );
  }

  if (skin === 'drawer') {
    return (
      <AnimatePresence>
        <motion.div
          key="ai-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.15 }}
          className="fixed inset-0 z-50 bg-background/30 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />
        <motion.aside
          key="ai-drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={reduced ? { duration: 0 } : { type: 'tween', duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          className="fixed top-0 bottom-0 right-0 z-50 flex w-full max-w-[400px] flex-col overflow-hidden border-l border-border bg-background shadow-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="AI assistant"
        >
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </motion.aside>
      </AnimatePresence>
    );
  }

  // Desktop in-flow resizable panel
  return (
    <aside
      className="relative flex h-full w-full flex-col overflow-hidden border-l border-border bg-background"
      role="complementary"
      aria-label="AI assistant"
    >
      <ResizeHandle onDrag={(delta) => onResize(width + delta)} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}

function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    const startX = e.clientX;
    const move = (ev: PointerEvent) => onDrag(startX - ev.clientX);
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      className={cn(
        'absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize select-none tp-transition-fast',
        dragging ? 'bg-ai/40' : 'hover:bg-border-strong/60'
      )}
      onPointerDown={onPointerDown}
      role="separator"
      aria-label="Resize AI panel"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onDrag(24);
        if (e.key === 'ArrowRight') onDrag(-24);
      }}
    />
  );
}
// ------------------------------------------------------------
// Viewport resolution
// ------------------------------------------------------------

function resolveViewport(): Viewport {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  return w < MOBILE_BREAKPOINT ? 'mobile' : w < TABLET_BREAKPOINT ? 'tablet' : 'desktop';
}

function mapShellViewport(v: unknown): Viewport | null {
  if (v === 'mobile') return 'mobile';
  if (v === 'tablet') return 'tablet';
  if (v === 'desktop') return 'desktop';
  return null;
}

function noop() {}