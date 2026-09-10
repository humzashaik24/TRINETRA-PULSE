'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/state/app.store';
import { useAIStore } from '@/state/ai.store';
import { useInvestigationStore } from '@/state/investigation.store';
import { Tooltip, Avatar } from '@trinetra-pulse/ui';
import { useTheme } from '@/components/theme-provider';
import { resolveBreadcrumbs } from '@/lib/workspace';
import { chromeText, useChromeLanguage } from '@/lib/i18n';
import {
  Search,
  Bell,
  BrainCircuit,
  Moon,
  Sun,
  ChevronRight,
  Activity,
} from 'lucide-react';

// ============================================================
// PHASE 3.5 — COMMAND BAR
// ============================================================
// Compact top-level bar: contextual breadcrumbs on the left;
// search trigger, system status, notifications, theme and the
// user menu on the right.
// ============================================================

function LiveBreadcrumbs() {
  const pathname = usePathname();
  const lang = useChromeLanguage();
  const crumbs = resolveBreadcrumbs(pathname);
  const localized = crumbs.map((crumb) => ({
    ...crumb,
    label: chromeText(lang, crumb.label),
  }));

  if (localized.length === 0) return null;

  return (
    <nav aria-label={chromeText(lang, 'Breadcrumb')} data-testid="live-breadcrumbs">
      <ol className="flex items-center gap-1 text-xs text-foreground-muted">
        {localized.map((crumb, i) => {
          const isLast = i === localized.length - 1;
          const content = (
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                isLast ? 'font-medium text-foreground' : 'truncate max-w-[140px]'
              )}
            >
              {crumb.icon && <crumb.icon size={12} className="shrink-0 text-foreground-muted" />}
              <span className="truncate">{crumb.label}</span>
            </span>
          );
          return (
            <li key={`${crumb.href}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={10} className="shrink-0 text-foreground-muted/50" aria-hidden="true" />}
              {isLast || !crumb.href ? (
                content
              ) : crumb.href.startsWith('/') ? (
                <Link href={crumb.href} className="tp-transition hover:text-foreground-secondary">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ContextIndicator() {
  const contextLabel = useAppStore((s) => s.contextLabel);
  const activeCaseId = useAppStore((s) => s.activeCaseId);
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const setActiveCase = useAppStore((s) => s.setActiveCase);
  const router = useRouter();
  const investigationId = useInvestigationStore((s) => s.investigationId);
  const investigation = useInvestigationStore((s) => s.data.investigation);

  if (!contextLabel && !activeCaseId && !investigation) return null;

  const gotoInvestigation = () => {
    if (investigationId) router.push(`/investigations/${investigationId}`);
  };

  return (
    <button
      onClick={() => {
        if (investigationId) {
          gotoInvestigation();
        } else {
          setContextLabel(null);
          setActiveCase(null);
        }
      }}
      className="hidden md:inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-2.5 py-1 tp-transition hover:border-border-strong"
      title={investigation ? `Active investigation: ${investigation.title} — open it` : activeCaseId ? `Active investigation ${activeCaseId}` : 'Clear context'}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-subtle" />
      <span className="text-xs text-foreground-secondary font-medium truncate max-w-[200px]">
        {investigation?.title ?? contextLabel ?? `Case ${activeCaseId}`}
      </span>
    </button>
  );
}

function SearchTrigger() {
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const lang = useChromeLanguage();
  return (
    <Tooltip content={chromeText(lang, 'Search (Ctrl+K)')}>
      <button
        onClick={() => setCommandOpen(true)}
        data-testid="command-bar-search"
        className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2.5 text-xs text-foreground-muted tp-transition hover:border-border-strong hover:bg-surface-hover sm:w-48 md:w-56"
      >
        <Search size={14} className="shrink-0" />
        <span className="hidden sm:inline">{chromeText(lang, 'Search intelligence...')}</span>
        <kbd className="ml-auto hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-border bg-surface px-1 text-[9px] font-mono text-foreground-muted">
          Ctrl K
        </kbd>
      </button>
    </Tooltip>
  );
}

function SystemStatus() {
  const lang = useChromeLanguage();
  return (
    <div className="hidden xl:flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] text-foreground-muted">
      <Activity size={12} className="text-success" />
      <span>{chromeText(lang, 'All systems operational')}</span>
    </div>
  );
}

function NotificationBell() {
  const notifications = useAppStore((s) => s.notifications);
  const open = useAppStore((s) => s.notificationsOpen);
  const setOpen = useAppStore((s) => s.setNotificationsOpen);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const lang = useChromeLanguage();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <Tooltip content={chromeText(lang, 'Notifications')}>
        <button
          onClick={() => setOpen(!open)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground-secondary"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-medium text-white">
              {unread}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-surface shadow-overlay animate-slide-down">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-foreground">{chromeText(lang, 'Notifications')}</span>
              <button
                onClick={() => notifications.filter((n) => !n.read).forEach((n) => markRead(n.id))}
                className="text-xs text-brand hover:text-brand-hover tp-transition"
              >
                {chromeText(lang, 'Mark all read')}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-foreground-muted">{chromeText(lang, 'No notifications')}</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-left tp-transition hover:bg-surface-hover',
                      !n.read && 'bg-brand-subtle/5'
                    )}
                  >
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    <div className={cn('flex-1 min-w-0', n.read && 'pl-5')}>
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-foreground-muted mt-0.5 truncate">{n.description}</p>
                      <p className="text-[10px] text-foreground-muted mt-1">{n.timestamp}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu() {
  const open = useAppStore((s) => s.profileOpen);
  const setOpen = useAppStore((s) => s.setProfileOpen);
  const lang = useChromeLanguage();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg p-1 tp-transition hover:bg-surface-hover"
        aria-label={chromeText(lang, 'Open user menu')}
      >
        <Avatar size="sm" color="brand" initials="AI" />
        <div className="hidden lg:flex flex-col items-start">
          <span className="text-xs font-medium text-foreground leading-none">{chromeText(lang, 'Admin')}</span>
          <span className="text-[10px] text-foreground-muted leading-none mt-0.5">{chromeText(lang, 'Analyst')}</span>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-surface shadow-overlay py-1 animate-slide-down">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground">Admin User</p>
              <p className="text-xs text-foreground-muted">admin@trinetra.gov</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-hover tp-transition"
            >
              {chromeText(lang, 'Profile Settings')}
            </Link>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-hover tp-transition">
              {chromeText(lang, 'Preferences')}
            </button>
            <div className="border-t border-border my-1" />
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-subtle tp-transition">
              {chromeText(lang, 'Sign Out')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CommandBar() {
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const openAIPanel = useAIStore((s) => s.openPanel);
  const aiOpen = useAIStore((s) => s.open);
  const { theme, toggleTheme } = useTheme();
  const lang = useChromeLanguage();

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 lg:px-5"
      data-testid="command-bar"
    >
      {/* Left: breadcrumbs + context */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <LiveBreadcrumbs />
        <div className="hidden md:block shrink-0">
          <ContextIndicator />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        <SearchTrigger />
        <Tooltip content={chromeText(lang, 'AI Assistant')}>
          <button
            onClick={() => openAIPanel()}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg tp-transition',
              'text-foreground-muted hover:bg-ai-subtle hover:text-ai',
              aiOpen && 'bg-ai-subtle text-ai'
            )}
            aria-label={chromeText(lang, 'AI Assistant')}
          >
            <BrainCircuit size={16} />
          </button>
        </Tooltip>
        <Tooltip content={theme === 'dark' ? chromeText(lang, 'Light mode') : chromeText(lang, 'Dark mode')}>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted tp-transition hover:bg-surface-hover hover:text-foreground-secondary"
            aria-label={chromeText(lang, 'Toggle theme')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </Tooltip>
        <Tooltip content={chromeText(lang, 'System status')}>
          <button
            onClick={() => setCommandOpen(false)}
            className="hidden xl:flex h-8 items-center justify-center rounded-lg px-1 text-success tp-transition hover:bg-surface-hover"
            aria-label="System status"
          >
            <SystemStatus />
          </button>
        </Tooltip>
        <NotificationBell />
        <div className="mx-1 h-5 w-px bg-border hidden sm:block" />
        <UserMenu />
      </div>
    </header>
  );
}