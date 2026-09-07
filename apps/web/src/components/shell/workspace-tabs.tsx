'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// PHASE 3.5 — WORKSPACE TABS
// ============================================================
// Contextual tab navigation for workspace pages (investigation
// workspace: Overview / Network / Entities / Timeline / Evidence /
// Findings). Tab switching is workspace-scoped, never global.
// ============================================================

export interface WorkspaceTab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface WorkspaceTabsProps {
  items: WorkspaceTab[];
  activeId?: string;
  onActiveChange?: (id: string) => void;
  className?: string;
}

export function WorkspaceTabs({ items, activeId, onActiveChange, className }: WorkspaceTabsProps) {
  const [internalActive, setInternalActive] = React.useState(items[0]?.id);
  const active = activeId ?? internalActive;

  if (items.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Workspace sections"
      className={cn('flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-thin', className)}
      data-testid="workspace-tabs"
    >
      {items.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setInternalActive(tab.id);
              onActiveChange?.(tab.id);
            }}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium tp-transition',
              isActive ? 'text-brand' : 'text-foreground-muted hover:text-foreground-secondary'
            )}
          >
            {Icon && <Icon size={15} />}
            <span className="whitespace-nowrap">{tab.label}</span>
            {isActive && (
              <span
                className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}