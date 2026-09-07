'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Users, FileSearch, GitBranch, RefreshCw, Plus } from 'lucide-react';
import { useAppStore } from '@/state/app.store';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { Badge, Button, ErrorState, Input, Select, Skeleton } from '@trinetra-pulse/ui';
import { getInvestigations } from '@/services/investigation.service';
import { isMockData } from '@/lib/api/config';
import { listInvestigations } from '@/lib/api/investigations';
import { mapInvestigationList } from '@/lib/api/adapter';
import { DemoInvestigationHero } from '@/components/demo/demo-investigation-hero';
import {
  type Investigation,
  type InvestigationStatus,
  type InvestigationPriority,
} from '@trinetra-pulse/types';

// ============================================================
// INVESTIGATIONS — LISTING
// ============================================================
// Index of investigation cases with search / filter / sort.
// Columns: ID, Title, Status, Priority, Entities, Evidence,
// Relationships, Last activity, Assigned, Updated. Priority is
// workflow priority (never criminality); status is lifecycle.
// ============================================================

type SortKey = 'id' | 'title' | 'updated' | 'priority';

const STATUS_LABELS: Record<InvestigationStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under Review',
  suspended: 'Suspended',
  closed: 'Closed',
  archived: 'Archived',
};

const PRIORITY_LABELS: Record<InvestigationPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

const PRIORITY_ORDER: Record<InvestigationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

function statusVariant(status: InvestigationStatus) {
  switch (status) {
    case 'active':
      return 'success';
    case 'under_review':
      return 'warning';
    case 'draft':
    case 'suspended':
      return 'info';
    case 'closed':
    case 'archived':
      return 'default';
    default:
      return 'default';
  }
}

function priorityVariant(priority: InvestigationPriority) {
  switch (priority) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'normal':
      return 'info';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// Table-shaped skeleton that mirrors the real grid so the page does
// not jump between a centered spinner and the table layout.
function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface" data-testid="investigations-table" aria-busy="true" aria-label="Loading investigations">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground-muted">
              {['ID', 'Title', 'Status', 'Priority', 'Entities', 'Evidence', 'Relationships', 'Last activity', 'Assigned', 'Updated'].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0" aria-hidden="true">
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={64} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={180} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="rectangular" width={84} height={22} className="rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="rectangular" width={70} height={22} className="rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={32} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={32} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={32} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={96} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={120} />
                </td>
                <td className="px-4 py-3">
                  <Skeleton variant="text" width={88} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InvestigationsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);

  const [items, setItems] = useState<Investigation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | InvestigationStatus>('all');
  const [priority, setPriority] = useState<'all' | InvestigationPriority>('all');
  const [sort, setSort] = useState<SortKey>('updated');

  useEffect(() => {
    setContextLabel('Investigations');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  const load = () => {
    setError(null);
    setItems(null);
    if (isMockData()) {
      getInvestigations()
        .then(setItems)
        .catch(() => setError('Failed to load investigations'));
      return;
    }
    listInvestigations({ page: 1, page_size: 100 })
      .then((res) => setItems(mapInvestigationList(res.items)))
      .catch(() => setError('Failed to load investigations from the API'));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items
      .filter((inv) => {
        if (status !== 'all' && inv.status !== status) return false;
        if (priority !== 'all' && inv.priority !== priority) return false;
        if (!q) return true;
        return (
          inv.id.toLowerCase().includes(q) ||
          inv.title.toLowerCase().includes(q) ||
          inv.tags.some((t) => t.toLowerCase().includes(q)) ||
          inv.assigned.some((a) => a.toLowerCase().includes(q)) ||
          (inv.lead_investigator.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        switch (sort) {
          case 'id':
            return a.id.localeCompare(b.id);
          case 'title':
            return a.title.localeCompare(b.title);
          case 'priority':
            return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          case 'updated':
          default:
            return a.updated_at < b.updated_at ? 1 : -1;
        }
      });
  }, [items, search, status, priority, sort]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="Investigations"
        description="Investigation workspace — curated cases that reference canonical entities, evidence and networks"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load} aria-label="Refresh investigations">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Link href="/investigations/new">
              <Button variant="primary" size="sm" data-testid="new-investigation-link">
                <Plus className="h-3.5 w-3.5" />
                New investigation
              </Button>
            </Link>
          </div>
        }
      />

      <DemoInvestigationHero />

      <div data-testid="investigations-filter-bar" className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, ID, tag, investigator…"
            className="pl-8"
            aria-label="Search investigations"
            data-testid="investigations-search"
          />
        </div>
        <div className="w-40">
          <Select
            size="md"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            aria-label="Filter by status"
            data-testid="investigations-status-filter"
            options={[
              { value: 'all', label: 'All statuses' },
              ...(Object.keys(STATUS_LABELS) as InvestigationStatus[]).map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              })),
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            size="md"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            aria-label="Filter by priority"
            data-testid="investigations-priority-filter"
            options={[
              { value: 'all', label: 'All priorities' },
              ...(Object.keys(PRIORITY_LABELS) as InvestigationPriority[]).map((p) => ({
                value: p,
                label: PRIORITY_LABELS[p],
              })),
            ]}
          />
        </div>
        <div className="w-auto ml-auto flex items-center gap-2 text-xs text-foreground-muted">
          <label htmlFor="sort-key" className="shrink-0">
            Sort
          </label>
          <select
            id="sort-key"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="investigations-sort"
          >
            <option value="updated">Last updated</option>
            <option value="id">ID</option>
            <option value="title">Title</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>

      {error ? (
        <ErrorState title="Could not load investigations" message={error} retry={load} />
      ) : !items ? (
        <TableSkeleton />
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="overflow-hidden rounded-xl border border-border bg-surface" data-testid="investigations-table">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground-muted">
                    <th className="px-4 py-2.5 font-medium">ID</th>
                    <th className="px-4 py-2.5 font-medium">Title</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Entities</th>
                    <th className="px-4 py-2.5 font-medium">Evidence</th>
                    <th className="px-4 py-2.5 font-medium">Relationships</th>
                    <th className="px-4 py-2.5 font-medium">Last activity</th>
                    <th className="px-4 py-2.5 font-medium">Assigned</th>
                    <th className="px-4 py-2.5 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground-muted">{inv.id.toUpperCase()}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/investigations/${inv.id}`}
                          className="font-medium text-foreground hover:text-brand"
                          data-testid="investigation-link"
                        >
                          {inv.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant(inv.status)} size="sm">
                          {STATUS_LABELS[inv.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={priorityVariant(inv.priority)} size="sm">
                          {PRIORITY_LABELS[inv.priority]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-foreground-secondary tabular-nums">
                          <Users className="h-3.5 w-3.5 text-foreground-muted" />
                          {inv.entity_count}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-foreground-secondary tabular-nums">
                          <FileSearch className="h-3.5 w-3.5 text-foreground-muted" />
                          {inv.evidence_count}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-foreground-secondary tabular-nums">
                          <GitBranch className="h-3.5 w-3.5 text-foreground-muted" />
                          {inv.relationship_count}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground-muted">{formatDate(inv.last_activity_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-foreground-secondary">{inv.assigned.join(', ') || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground-muted">{formatDate(inv.updated_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-foreground-muted">
                        No investigations match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            {filtered.length} of {items.length} investigation{items.length === 1 ? '' : 's'}
          </p>
        </motion.div>
      )}
    </div>
  );
}
