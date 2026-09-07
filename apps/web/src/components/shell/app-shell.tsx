'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@trinetra-pulse/ui';
import { WorkspaceShell } from './workspace-shell';
import { CommandPalette } from '../search/command-palette';

// ============================================================
// PHASE 3.5 — APP SHELL
// ============================================================
// Top-level shell composition: WorkspaceShell (rail + command bar
// + workspace + context inspector) plus global overlays.
//
// Phase 11.5 polish:
//   - Single global search surface (CommandPalette). Both "/" and
//     Ctrl/Cmd+K resolve to it; the duplicate GlobalSearch modal and
//     the standalone "/" key handler were removed (key handling now
//     lives in CommandPalette itself).
//   - Page transitions now use the shared PageTransition primitive
//     (design tokens + reduced-motion aware) instead of a hardcoded
//     inline variant.
// ============================================================

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <WorkspaceShell>
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={pathname}>{children}</PageTransition>
        </AnimatePresence>
      </WorkspaceShell>

      <CommandPalette />
    </>
  );
}