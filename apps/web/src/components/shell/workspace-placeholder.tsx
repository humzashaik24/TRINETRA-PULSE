'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// PHASE 3.5 — WORKSPACE PLACEHOLDER
// ============================================================
// Shared empty-state surface for workspaces whose full feature
// ships in later phases.
// ============================================================

export interface WorkspacePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind accent classes, e.g. "bg-brand-subtle text-brand". */
  accentClassName?: string;
}

export function WorkspacePlaceholder({
  icon: Icon,
  title,
  description,
  accentClassName = 'bg-brand-subtle text-brand',
}: WorkspacePlaceholderProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-12">
      <div className="flex flex-col items-center text-center">
        <div
          className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${accentClassName}`}
          aria-hidden="true"
        >
          <Icon size={24} />
        </div>
        <h3 className="text-subheading text-foreground">{title}</h3>
        <p className="text-body-sm text-foreground-muted mt-1 max-w-sm">{description}</p>
      </div>
    </div>
  );
}