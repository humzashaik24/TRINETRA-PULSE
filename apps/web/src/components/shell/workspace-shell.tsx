'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { transitions, useReducedMotion } from '@trinetra-pulse/ui';
import { useShellStore, INSPECTOR_DEFAULT_WIDTH, type ViewportMode } from '@/state/shell.store';
import { useAIStore } from '@/state/ai.store';
import { CommandRail } from './command-rail';
import { CommandBar } from './command-bar';
import { ResizablePanel } from './resizable-panel';
import { ContextInspector } from './inspector/context-inspector';
import { AIAssistantBridge } from '@/components/ai/ai-assistant-bridge';

// ============================================================
// PHASE 3.5 — WORKSPACE SHELL
// ============================================================
// Composes rail + command bar + workspace + context inspector.
// On desktop the inspector is an in-flow resizable column. On
// tablet/mobile it becomes an overlay drawer above the workspace
// so the primary surface is never lost.
// ============================================================

const TABLET_BREAKPOINT = 1080;
const MOBILE_BREAKPOINT = 768;

function ViewportObserver() {
  const setViewport = useShellStore((s) => s.setViewport);

  useEffect(() => {
    const resolve = () => {
      const width = window.innerWidth;
      const mode: ViewportMode =
        width < MOBILE_BREAKPOINT ? 'mobile' : width < TABLET_BREAKPOINT ? 'tablet' : 'desktop';
      setViewport(mode);
    };
    resolve();
    window.addEventListener('resize', resolve);
    return () => window.removeEventListener('resize', resolve);
  }, [setViewport]);

  return null;
}

function InspectorOverlayDrawer() {
  const viewport = useShellStore((s) => s.viewport);
  const isOpen = useShellStore((s) => s.inspectorOpen);
  const close = useShellStore((s) => s.closeInspector);
  const reduced = useReducedMotion();

  const drawerWidth = viewport === 'mobile' ? '100%' : 'min(420px, 85vw)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="inspector-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : transitions.fadeFast}
          className="fixed inset-0 z-50 bg-background/40 backdrop-blur-[1px]"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <motion.aside
        key="inspector-drawer-panel"
        initial={{ x: drawerWidth }}
        animate={{ x: isOpen ? 0 : drawerWidth }}
        exit={{ x: drawerWidth }}
        transition={reduced ? { duration: 0 } : transitions.panel}
        style={{ width: drawerWidth }}
        className="fixed inset-y-0 right-0 z-50 shadow-overlay"
        aria-label="Context inspector"
      >
        <ContextInspector variant="drawer" onClose={close} />
      </motion.aside>
    </AnimatePresence>
  );
}

export interface WorkspaceShellProps {
  children: React.ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const viewport = useShellStore((s) => s.viewport);
  const inspectorOpen = useShellStore((s) => s.inspectorOpen);
  const inspectorWidth = useShellStore((s) => s.inspectorWidth);
  const setInspectorWidth = useShellStore((s) => s.setInspectorWidth);
  const resetInspectorSize = useShellStore((s) => s.resetInspectorSize);

  const aiOpen = useAIStore((s) => s.open);
  const aiWidth = useAIStore((s) => s.width);

  const isInlinePanel = viewport === 'desktop';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface" data-testid="workspace-shell">
      <ViewportObserver />
      <CommandRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <CommandBar />

        <div className="flex min-h-0 flex-1">
          <ResizablePanel
            id="context-inspector"
            side="right"
            panelWidth={isInlinePanel && inspectorOpen ? inspectorWidth : 0}
            onPanelWidthChange={setInspectorWidth}
            onResizeEnd={resetInspectorSize}
            panel={
              isInlinePanel && inspectorOpen ? (
                <ContextInspector variant="panel" />
              ) : null
            }
          >
            <main
              className={cn(
                'h-full overflow-y-auto scrollbar-thin',
                viewport === 'mobile' && 'pb-14'
              )}
            >
              {children}
            </main>
          </ResizablePanel>

          {/* Phase 10: AI investigation panel coexists beside the inspector */}
          {isInlinePanel && aiOpen && (
            <div
              className="h-full shrink-0 overflow-hidden"
              style={{ width: aiWidth }}
            >
              <AIAssistantBridge />
            </div>
          )}
        </div>
      </div>

      {!isInlinePanel && <InspectorOverlayDrawer />}
      {!isInlinePanel && <AIAssistantBridge />}
    </div>
  );
}

export { INSPECTOR_DEFAULT_WIDTH };