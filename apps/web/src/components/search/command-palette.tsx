'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/app.store';
import { useAIStore } from '@/state/ai.store';
import {
  Search,
  User,
  Phone,
  Car,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  FileText,
  FolderSearch,
  Network,
  Database,
  FileSearch,
  Sparkles,
  BarChart3,
  BrainCircuit,
  Settings,
  CircleUserRound,
  CornerDownLeft,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockEntityProfiles } from '@/mock';
import { mockDatasets } from '@/mock';
import { suspiciousPatterns, presentationPatterns } from '@/mock';
import { investigationActivity } from '@/mock';
import { mockInvestigations } from '@/mock';
import { mockInvestigationById, isPresentationInvestigation } from '@/mock/investigations';
import { useInvestigationStore } from '@/state/investigation.store';
import { journeyHref } from '@/navigation/journey';
import { RAIL_ITEMS } from '@/components/navigation/rail-config';
import type { EntityType } from '@trinetra-pulse/types';

// ============================================================
// PHASE 3.5 — COMMAND PALETTE
// ============================================================
// Grouped search across intelligence: navigation, entities,
// investigations, networks, evidence, datasets, patterns and
// reports. Keyboard-first, with recent items and Ctrl/Cmd+K.
// ============================================================

export interface PaletteEntry {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  href?: string;
  /** Action commands carry no href. */
  action?: () => void;
  keywords?: string[];
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  person: User,
  phone: Phone,
  vehicle: Car,
  location: MapPin,
  organization: Building2,
  account: CreditCard,
  transaction: Hash,
  event: Calendar,
  case: FolderSearch,
  document: FileText,
  evidence: FileSearch,
};

function entityIcon(type: string) {
  return ENTITY_ICONS[type] ?? User;
}

function buildNavigationEntries(): PaletteEntry[] {
  return RAIL_ITEMS.map((item) => ({
    id: `nav:${item.href}`,
    group: 'Navigation',
    label: item.label,
    description: `Open ${item.label.toLowerCase()} workspace`,
    icon: item.icon as PaletteEntry['icon'],
    href: item.href,
    keywords: ['go', 'open', item.label.toLowerCase()],
  }));
}

function buildEntityEntries(): PaletteEntry[] {
  return mockEntityProfiles.slice(0, 40).map((e) => ({
    id: `entity:${e.id}`,
    group: 'Entities',
    label: e.displayName,
    description: `${e.entityType} · ${e.connectionsCount} connections${e.isFlagged ? ' · flagged' : ''}`,
    icon: entityIcon(e.entityType),
    href: `/entities/${e.id}`,
    keywords: ['entity', e.entityType, ...(e.aliases ?? [])],
  }));
}

function buildInvestigationEntries(): PaletteEntry[] {
  return mockInvestigations
    .filter((inv) => isPresentationInvestigation(inv.id))
    .slice(0, 20)
    .map((inv) => ({
    id: `investigation:${inv.id}`,
    group: 'Investigations',
    label: inv.title,
    description: `${inv.id.toUpperCase()} · ${inv.status.replace(/_/g, ' ')} · ${inv.entity_count} entities · ${inv.evidence_count} evidence`,
    icon: FolderSearch,
    href: `/investigations/${inv.id}`,
    keywords: ['case', 'investigation', inv.id, inv.priority, ...inv.tags],
  }));
}

function buildDataSourceEntries(): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  const networks = new Set<string>();
  const evidence = new Set<string>();
  for (const a of investigationActivity) {
    if (a.reference.type === 'network' && !networks.has(a.reference.id)) {
      networks.add(a.reference.id);
      entries.push({
        id: `network:${a.reference.id}`,
        group: 'Networks',
        label: a.reference.label.toUpperCase(),
        description: a.title,
        icon: Network,
        href: '/networks',
        keywords: ['network', 'graph'],
      });
    }
    if (a.reference.type === 'evidence' && !evidence.has(a.reference.id)) {
      evidence.add(a.reference.id);
      entries.push({
        id: `evidence:${a.reference.id}`,
        group: 'Evidence',
        label: a.reference.label.toUpperCase(),
        description: a.title,
        icon: FileSearch,
        href: '/evidence',
        keywords: ['evidence', 'file', 'document'],
      });
    }
  }
  mockDatasets.slice(0, 12).forEach((d) => {
    entries.push({
      id: `dataset:${d.id}`,
      group: 'Datasets',
      label: d.name,
      description: `${d.format.toUpperCase()} · ${d.status} · ${d.recordCount.toLocaleString('en-US')} records`,
      icon: Database,
      href: '/data-intelligence',
      keywords: ['dataset', 'data', d.category, d.sourceName],
    });
  });
  presentationPatterns.slice(0, 8).forEach((p) => {
    entries.push({
      id: `pattern:${p.id}`,
      group: 'Patterns',
      label: p.title,
      description: `${p.typeLabel} · ${p.severity} · confidence ${Math.round(p.confidence * 100)}%`,
      icon: Sparkles,
      href: '/patterns',
      keywords: ['pattern', 'flag', p.typeLabel.toLowerCase()],
    });
  });
  return entries;
}

function buildInvestigationCommands(): PaletteEntry[] {
  return [
    {
      id: 'investigation:new',
      group: 'Investigations',
      label: 'New Investigation',
      description: 'Set up a new investigation case',
      icon: FolderSearch,
      href: '/investigations/new',
      keywords: ['case', 'investigation', 'create', 'new'],
    },
  ];
}

function buildCurrentInvestigationEntries(investigationId: string | null): PaletteEntry[] {
  if (!investigationId) return [];
  const record = mockInvestigationById.get(investigationId);
  if (!record) return [];
  const inv = record.investigation;
  const entries: PaletteEntry[] = [];

  entries.push({
    id: `current:${inv.id}`,
    group: 'Current Investigation',
    label: `${inv.title} (open)`,
    description: `${inv.id.toUpperCase()} · ${inv.status.replace(/_/g, ' ')}`,
    icon: FolderSearch,
    href: journeyHref(`/investigations/${inv.id}`),
    keywords: ['current', 'open', 'case', inv.id, inv.title, 'continue'],
  });

  record.entities.slice(0, 8).forEach((e) => {
    entries.push({
      id: `current:entity:${e.entity_id}`,
      group: 'Current Investigation',
      label: e.name,
      description: `${e.entity_type} · ${e.role} · ${inv.title}`,
      icon: entityIcon(e.entity_type),
      href: journeyHref(`/entities/${e.entity_id}`, { investigation: inv.id }),
      keywords: ['entity', 'current', e.entity_type, e.role, inv.id],
    });
  });

  record.evidence.slice(0, 6).forEach((ev) => {
    entries.push({
      id: `current:evidence:${ev.evidence_id}`,
      group: 'Current Investigation',
      label: ev.title,
      description: `Evidence · ${inv.title}`,
      icon: FileSearch,
      href: journeyHref(`/investigations/${inv.id}`, { section: 'evidence' }),
      keywords: ['evidence', 'current', 'file', ev.evidence_id, inv.id],
    });
  });

  record.findings.slice(0, 6).forEach((f) => {
    entries.push({
      id: `current:finding:${f.id}`,
      group: 'Current Investigation',
      label: f.title,
      description: `Finding · ${f.category} · ${f.confidence} confidence`,
      icon: Sparkles,
      href: journeyHref(`/investigations/${inv.id}`, { section: 'findings' }),
      keywords: ['finding', 'current', f.category, f.confidence, inv.id],
    });
  });

  record.networks.slice(0, 2).forEach((n) => {
    entries.push({
      id: `current:network:${n.network_id}`,
      group: 'Current Investigation',
      label: n.name,
      description: `Network · ${inv.title}`,
      icon: Network,
      href: journeyHref(`/networks/${n.network_id}`, { investigation: inv.id }),
      keywords: ['network', 'graph', 'current', n.network_id, inv.id],
    });
  });

  return entries;
}

function buildReportEntries(): PaletteEntry[] {
  return [
    {
      id: 'report:1',
      group: 'Reports',
      label: 'Generate Investigation Report',
      description: 'Compile evidence and findings into a case report',
      icon: FileText,
      href: '/reports',
      keywords: ['report', 'export', 'generate'],
    },
    {
      id: 'report:2',
      group: 'Reports',
      label: 'Open Analytics',
      description: 'Trends, hotspots and graph analytics',
      icon: BarChart3,
      href: '/analytics',
      keywords: ['analytics', 'insights', 'trends'],
    },
    {
      id: 'report:3',
      group: 'Reports',
      label: 'Open AI Assistant',
      description: 'Interrogate the investigation corpus with AI',
      icon: BrainCircuit,
      action: () => useAIStore.getState().openPanel(),
      keywords: ['ai', 'assistant', 'ask'],
    },
  ];
}

function buildSettingsEntries(): PaletteEntry[] {
  return [
    {
      id: 'settings:1',
      group: 'Settings',
      label: 'Open Settings',
      description: 'Workspace, data and platform configuration',
      icon: Settings,
      href: '/settings',
      keywords: ['settings', 'configure', 'preferences'],
    },
    {
      id: 'settings:2',
      group: 'Settings',
      label: 'Open Profile',
      description: 'Account and notification preferences',
      icon: CircleUserRound,
      href: '/profile',
      keywords: ['profile', 'account'],
    },
  ];
}

export function buildPaletteEntries(): PaletteEntry[] {
  return [
    ...buildNavigationEntries(),
    ...buildEntityEntries(),
    ...buildInvestigationEntries(),
    ...buildInvestigationCommands(),
    ...buildDataSourceEntries(),
    ...buildReportEntries(),
    ...buildSettingsEntries(),
  ];
}

/** Combined entry list including the open investigation's objects. */
export function buildPaletteEntriesForCurrent(investigationId: string | null): PaletteEntry[] {
  return [
    ...buildCurrentInvestigationEntries(investigationId),
    ...buildNavigationEntries(),
    ...buildEntityEntries(),
    ...buildInvestigationEntries(),
    ...buildInvestigationCommands(),
    ...buildDataSourceEntries(),
    ...buildReportEntries(),
    ...buildSettingsEntries(),
  ];
}

function loadRecent(): string[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('tp:palette-recent') : null;
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const RECENT_LIMIT = 6;

export function CommandPalette() {
  const open = useAppStore((s) => s.commandOpen);
  const setOpen = useAppStore((s) => s.setCommandOpen);
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeInvestigationId = useInvestigationStore((s) => s.investigationId);

  const allEntries = useMemo(
    () => buildPaletteEntriesForCurrent(activeInvestigationId),
    [activeInvestigationId]
  );
  const recentEntries = useMemo(() => {
    const map = new Map(allEntries.map((e) => [e.id, e]));
    return recent.map((id) => map.get(id)).filter((e): e is PaletteEntry => Boolean(e));
  }, [allEntries, recent]);

  const results = useMemo(() => {
    if (!query.trim()) return allEntries;
    const q = query.trim().toLowerCase();
    return allEntries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [allEntries, query]);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteEntry[]>();
    for (const e of results) {
      if (!map.has(e.group)) map.set(e.group, []);
      map.get(e.group)!.push(e);
    }
    return Array.from(map.entries());
  }, [results]);

  const displayList = query.trim() ? results : recentEntries.length > 0 ? recentEntries : allEntries;

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrlK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typing;

      if (isCtrlK) {
        e.preventDefault();
        setOpen(!open);
      } else if (isSlash && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    setQuery('');
    setSelectedIndex(0);
    return undefined;
  }, [open]);

  const remember = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem('tp:palette-recent', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const execute = useCallback(
    (entry: PaletteEntry) => {
      setOpen(false);
      remember(entry.id);
      if (entry.href) {
        router.push(entry.href);
      } else if (entry.action) {
        entry.action();
      }
    },
    [setOpen, remember, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = query.trim() ? results : recentEntries.length > 0 ? recentEntries : results;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(list.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && list[selectedIndex]) {
      execute(list[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[18vh]">
      <div className="fixed inset-0 bg-black/60 animate-fade-in" onClick={() => setOpen(false)} />
      <div
        className="relative z-[60] w-full max-w-lg mx-4 rounded-xl border border-border bg-surface shadow-overlay overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-foreground-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search intelligence..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
            aria-label="Search"
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {displayList.length === 0 ? (
            <div className="py-8 text-center text-sm text-foreground-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-3">
              {query.trim() ? (
                <>
                  {groups.map(([group, entries]) => (
                    <section key={group}>
                      <p className="tp-data-label px-2 pb-1">{group}</p>
                      <div className="space-y-0.5">
                        {entries.map((entry) => {
                          const globalIndex = results.indexOf(entry);
                          return <PaletteRow key={entry.id} entry={entry} active={globalIndex === selectedIndex} onExecute={() => execute(entry)} onHover={() => setSelectedIndex(globalIndex)} />;
                        })}
                      </div>
                    </section>
                  ))}
                </>
              ) : recentEntries.length > 0 ? (
                <section>
                  <p className="tp-data-label px-2 pb-1">Recent</p>
                  <div className="space-y-0.5">
                    {recentEntries.map((entry, i) => (
                      <PaletteRow key={entry.id} entry={entry} active={i === selectedIndex} onExecute={() => execute(entry)} onHover={() => setSelectedIndex(i)} />
                    ))}
                  </div>
                </section>
              ) : (
                <>
                  {groups.map(([group, entries]) => (
                    <section key={group}>
                      <p className="tp-data-label px-2 pb-1">{group}</p>
                      <div className="space-y-0.5">
                        {entries.map((entry) => {
                          const globalIndex = allEntries.indexOf(entry);
                          return <PaletteRow key={entry.id} entry={entry} active={globalIndex === selectedIndex} onExecute={() => execute(entry)} onHover={() => setSelectedIndex(globalIndex)} />;
                        })}
                      </div>
                    </section>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-foreground-muted">
          <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-surface-elevated px-1 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-surface-elevated px-1 font-mono">↵</kbd> execute</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-surface-elevated px-1 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function PaletteRow({
  entry,
  active,
  onExecute,
  onHover,
}: {
  entry: PaletteEntry;
  active: boolean;
  onExecute: () => void;
  onHover: () => void;
}) {
  const Icon = entry.icon ?? Search;
  return (
    <button
      onClick={onExecute}
      onMouseMove={onHover}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left tp-transition',
        active ? 'bg-surface-hover' : 'hover:bg-surface-hover'
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-foreground-muted">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{entry.label}</p>
        {entry.description && (
          <p className="text-xs text-foreground-muted truncate">{entry.description}</p>
        )}
      </div>
      <span className="hidden sm:inline-flex text-[10px] text-foreground-muted px-1.5 py-0.5 rounded bg-surface-elevated shrink-0">
        {entry.group}
      </span>
      <CornerDownLeft size={12} className="text-foreground-muted shrink-0" />
    </button>
  );
}