'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  PanelLeft,
  PanelLeftClose,
  LayoutDashboard,
  FolderSearch,
  Database,
  Users,
  Network,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, transitions, useReducedMotion } from '@trinetra-pulse/ui';
import {
  useShellStore,
  RAIL_COLLAPSED_WIDTH,
  RAIL_EXPANDED_WIDTH,
} from '@/state/shell.store';
import {
  PRIMARY_RAIL_SECTIONS,
  UTILITY_RAIL_SECTIONS,
  filterRailItemsByRole,
  type RailItem,
} from '@/components/navigation/rail-config';
import { useAuthStore } from '@/state/auth.store';

// ============================================================
// PHASE 3.5 — COMMAND RAIL
// ============================================================
// Global navigation surface. Desktop/tablet: vertical collapse
// rail. Mobile: compact bottom navigation.
// Investigation-level navigation is handled by the workspace.
// ============================================================

function RailLink({ item, expanded }: { item: RailItem; expanded: boolean }) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      aria-label={expanded ? undefined : item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg text-sm font-medium tp-transition',
        expanded ? 'px-2.5 py-2' : 'justify-center px-0 py-2.5',
        active
          ? 'bg-brand-subtle text-brand'
          : 'text-foreground-secondary hover:bg-surface-hover hover:text-foreground'
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active-indicator"
          initial={false}
          animate={{ opacity: 1 }}
          className={cn(
            'absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand',
            expanded ? 'left-0' : 'left-1/2 -translate-x-1/2'
          )}
          aria-hidden="true"
        />
      )}
      <Icon
        size={18}
        strokeWidth={2}
        className={cn(
          'shrink-0',
          active ? 'text-brand' : 'text-foreground-muted group-hover:text-foreground-secondary'
        )}
      />
      <span className={cn('truncate', !expanded && 'hidden')}>{item.label}</span>
      {typeof item.badge === 'number' &&
        (expanded ? (
          <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {item.badge}
          </span>
        ) : (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
        ))}
    </Link>
  );

  if (expanded) return content;
  return (
    <Tooltip content={item.label} side="right">
      {content}
    </Tooltip>
  );
}

function RailToggle() {
  const expanded = useShellStore((s) => s.railExpanded);
  const toggleRail = useShellStore((s) => s.toggleRail);

  return (
    <div className="border-t border-border p-3">
      <button
        onClick={toggleRail}
        aria-label={expanded ? 'Collapse navigation rail' : 'Expand navigation rail'}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg text-xs text-foreground-muted tp-transition',
          expanded ? 'px-2.5 py-1.5' : 'justify-center px-0 py-1.5',
          'hover:bg-surface-hover hover:text-foreground-secondary'
        )}
      >
        {expanded ? (
          <>
            <PanelLeft size={14} />
            <span>Collapse</span>
          </>
        ) : (
          <Tooltip content="Expand rail" side="right">
            <PanelLeftClose size={14} className="mx-auto" />
          </Tooltip>
        )}
      </button>
    </div>
  );
}

export function RailBrand({ expanded }: { expanded: boolean }) {
  return (
    <div
      className={cn(
        'flex h-14 shrink-0 items-center border-b border-border',
        expanded ? 'px-4' : 'justify-center px-0'
      )}
    >
      <Link href="/overview" className="flex items-center justify-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="5" cy="8" r="2" />
            <circle cx="19" cy="8" r="2" />
          </svg>
        </div>
        {expanded && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-none">Trinetra</span>
            <span className="text-[10px] font-medium text-foreground-muted leading-none mt-0.5">Pulse</span>
          </div>
        )}
      </Link>
    </div>
  );
}

export function CommandRail() {
  const expanded = useShellStore((s) => s.railExpanded);
  const viewport = useShellStore((s) => s.viewport);
  const reduced = useReducedMotion();
  const role = useAuthStore((s) => s.session?.user.role);

  if (viewport === 'mobile') {
    return <MobileBottomNav />;
  }

  const primarySections = PRIMARY_RAIL_SECTIONS.map((section) => ({
    ...section,
    items: filterRailItemsByRole(section.items, role),
  }));
  const utilitySections = UTILITY_RAIL_SECTIONS.map((section) => ({
    ...section,
    items: filterRailItemsByRole(section.items, role),
  }));

  const width = expanded ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH;

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={reduced ? { duration: 0 } : transitions.sidebar}
      className="relative z-30 flex h-full shrink-0 flex-col border-r border-border bg-surface"
      data-testid="command-rail"
      aria-label="Primary navigation"
    >
      <RailBrand expanded={expanded} />
      <nav
        className={cn(
          'flex-1 space-y-0.5 overflow-y-auto py-3 scrollbar-thin',
          expanded ? 'px-3' : 'px-2'
        )}
        aria-label="Global sections"
      >
        {primarySections.map((section) => (
          <div key={section.id} className="space-y-0.5">
            {expanded && (
              <p className="tp-data-label px-2.5 pb-1 pt-1">{section.label}</p>
            )}
            {section.items.map((item) => (
              <RailLink key={item.href} item={item} expanded={expanded} />
            ))}
          </div>
        ))}
      </nav>

      <nav
        className={cn('shrink-0 space-y-0.5 py-3', expanded ? 'px-3' : 'px-2')}
        aria-label="Workspace"
      >
        {utilitySections.map((section) =>
          section.items.map((item) => (
            <RailLink key={item.href} item={item} expanded={expanded} />
          ))
        )}
      </nav>

      <RailToggle />
    </motion.aside>
  );
}

// ------------------------------------------------------------
// Mobile bottom navigation
// ------------------------------------------------------------

const MOBILE_PRIMARY: RailItem[] = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Data', href: '/data-intelligence', icon: Database },
  { label: 'Entities', href: '/entities', icon: Users },
  { label: 'Networks', href: '/networks', icon: Network },
  { label: 'Investigations', href: '/investigations', icon: FolderSearch },
];

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary navigation"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface"
    >
      {MOBILE_PRIMARY.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2 text-[10px] font-medium tp-transition',
              active ? 'text-brand' : 'text-foreground-muted'
            )}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export { MOBILE_PRIMARY };