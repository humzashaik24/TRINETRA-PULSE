'use client';

import React from 'react';

// ============================================================
// PHASE 3.5 — WORKSPACE HEADER
// ============================================================
// Page-level contextual header used by workspace pages.
// Eyebrow + title + description on the left; actions on the right.
// ============================================================

export interface WorkspaceHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function WorkspaceHeader({ eyebrow, title, description, actions, className }: WorkspaceHeaderProps) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 pb-4 ${className ?? ''}`} data-testid="workspace-header">
      <div className="min-w-0">
        {eyebrow && <p className="tp-data-label mb-1">{eyebrow}</p>}
        <h1 className="text-xl font-semibold text-foreground tracking-tight truncate">{title}</h1>
        {description && <p className="text-sm text-foreground-muted mt-1 truncate">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}