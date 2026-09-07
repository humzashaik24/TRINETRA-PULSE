'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  type EntityIntelligence,
  type EntitySearchParams,
  type EntityType,
  type ResolutionState,
} from '@trinetra-pulse/types';
import {
  Badge,
  Button,
  ConfidenceIndicator,
  EntityTypeIcon,
  EmptyState,
  ErrorState,
  LoadingState,
  Search,
  Select,
  Table,
  type Column,
} from '@trinetra-pulse/ui';
import { ArrowUpDown, ScanSearch } from 'lucide-react';
import { RESOLUTION_STATE_LABELS, formatCount, formatRelativeTime } from '@/lib/format';
import { ENTITY_TYPE_LABELS } from '@/lib/format';
import { queryEntities } from '@/lib/entity-search';
import { ResolutionStateBadge } from './badges';
import { Pagination } from './pagination';

// ============================================================
// ENTITY LIST TABLE
// ============================================================

interface EntityTableProps {
  entities: EntityIntelligence[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onView?: (entity: EntityIntelligence) => void;
  onQueryChange?: (query: string) => void;
  onTypeChange?: (type: EntityType | 'all') => void;
  onResolutionChange?: (state: ResolutionState | 'all') => void;
  page?: number;
  total?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  defaultParams?: Partial<EntitySearchParams>;
}

export function EntityTable({
  entities,
  loading = false,
  error = null,
  onRetry,
  onView,
  onQueryChange,
  onTypeChange,
  onResolutionChange,
  page = 1,
  total,
  pageSize = 20,
  totalPages,
  onPageChange,
  defaultParams = {},
}: EntityTableProps) {
  const [query, setQuery] = useState(defaultParams.query ?? '');
  const deferredQuery = useDeferredValue(query);
  const [entityType, setEntityType] = useState<EntityType | 'all'>(defaultParams.entityType ?? 'all');
  const [resolutionState, setResolutionState] = useState<ResolutionState | 'all'>(defaultParams.resolutionState ?? 'all');
  const [sortBy, setSortBy] = useState<NonNullable<EntitySearchParams['sortBy']>>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const availableTypes = useMemo(() => {
    const seen = new Set<EntityType>();
    entities.forEach((e) => seen.add(e.entityType));
    return Array.from(seen);
  }, [entities]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const filtered = queryEntities(entities, { query: deferredQuery, entityType, resolutionState }).items;
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName) * dir;
        case 'type':
          return a.entityType.localeCompare(b.entityType) * dir;
        case 'confidence':
          return (a.confidence - b.confidence) * dir;
        case 'sources':
          return (a.sourcesCount - b.sourcesCount) * dir;
        case 'connections':
          return (a.connectionsCount - b.connectionsCount) * dir;
        case 'activity':
          return (a.activityCount - b.activityCount) * dir;
        case 'resolution':
          return a.resolutionState.localeCompare(b.resolutionState) * dir;
        case 'updated':
        default:
          return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
      }
    });
  }, [entities, deferredQuery, entityType, resolutionState, sortBy, sortOrder]);

  const visible = sorted;
  const shownTotal = total ?? visible.length;
  const shownTotalPages = totalPages ?? Math.max(1, Math.ceil(shownTotal / pageSize));

  const SORT_OPTIONS = [
    { value: 'updated', label: 'Last updated' },
    { value: 'name', label: 'Name' },
    { value: 'type', label: 'Type' },
    { value: 'confidence', label: 'Confidence' },
    { value: 'sources', label: 'Sources' },
    { value: 'connections', label: 'Connections' },
    { value: 'activity', label: 'Activity' },
    { value: 'resolution', label: 'Resolution state' },
  ] as const;

  const columns: Column<EntityIntelligence>[] = [
    {
      key: 'displayName',
      header: 'Entity',
      render: (_v, row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <EntityTypeIcon type={row.entityType} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate">{row.displayName}</span>
              {row.isVerified && (
                <Badge variant="success" size="sm" className="shrink-0">Verified</Badge>
              )}
              {row.isFlagged && (
                <Badge variant="danger" size="sm" className="shrink-0">Flagged</Badge>
              )}
            </div>
            {row.aliases && row.aliases.length > 0 && (
              <span className="block text-[10px] text-foreground-muted truncate max-w-[220px]">
                {row.aliases.length > 1 ? `aka ${row.aliases.join(', ')}` : `aka ${row.aliases[0]}`}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Type',
      width: '120px',
      render: (_v, row) => (
        <span className="text-xs text-foreground-secondary capitalize">{ENTITY_TYPE_LABELS[row.entityType]}</span>
      ),
    },
    {
      key: 'resolutionState',
      header: 'Resolution',
      width: '150px',
      render: (_v, row) => <ResolutionStateBadge state={row.resolutionState} size="sm" />,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      width: '150px',
      render: (_v, row) => <ConfidenceIndicator value={row.confidence} size="sm" showValue />,
    },
    {
      key: 'sourcesCount',
      header: 'Sources',
      width: '90px',
      align: 'right',
      mono: true,
      render: (v) => formatCount(Number(v)),
    },
    {
      key: 'connectionsCount',
      header: 'Links',
      width: '90px',
      align: 'right',
      mono: true,
      render: (v) => formatCount(Number(v)),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      width: '110px',
      align: 'right',
      render: (v) => {
        const label = typeof v === 'string' ? v : '';
        return <span className="text-caption text-foreground-muted">{formatRelativeTime(label)}</span>;
      },
    },
  ];

  if (loading) {
    return <LoadingState message="Loading entities…" />;
  }

  if (error) {
    return <ErrorState title="Could not load entities" message={error} retry={onRetry} />;
  }

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<ScanSearch className="h-8 w-8" />}
        title="No entities match"
        description={deferredQuery || entityType !== 'all' || resolutionState !== 'all'
          ? 'Try adjusting your search or filters.'
          : 'Extracted entities will appear here once the pipeline runs.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Search
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onQueryChange?.(e.target.value);
          }}
          onClear={() => {
            setQuery('');
            onQueryChange?.('');
          }}
          placeholder="Search name, phone, account, vehicle…"
          size="md"
          className="w-full md:max-w-sm"
          aria-label="Search entities"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="sm"
            value={sortBy}
            onChange={(e) => {
              const next = e.target.value as NonNullable<EntitySearchParams['sortBy']>;
              if (next !== sortBy) setSortOrder('desc');
              setSortBy(next);
            }}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            aria-label="Sort by"
            className="w-[150px]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            aria-label={`Toggle sort direction (currently ${sortOrder === 'asc' ? 'ascending' : 'descending'})`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </Button>
          <Select
            size="sm"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as EntityType | 'all');
              onTypeChange?.(e.target.value as EntityType | 'all');
            }}
            options={[
              { value: 'all', label: 'All types' },
              ...availableTypes.map((t) => ({ value: t, label: ENTITY_TYPE_LABELS[t] })),
            ]}
            aria-label="Filter by entity type"
            className="w-[150px]"
          />
          <Select
            size="sm"
            value={resolutionState}
            onChange={(e) => {
              setResolutionState(e.target.value as ResolutionState | 'all');
              onResolutionChange?.(e.target.value as ResolutionState | 'all');
            }}
            options={[
              { value: 'all', label: 'All states' },
              ...(Object.keys(RESOLUTION_STATE_LABELS) as ResolutionState[]).map((s) => ({
                value: s,
                label: RESOLUTION_STATE_LABELS[s],
              })),
            ]}
            aria-label="Filter by resolution state"
            className="w-[150px]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setEntityType('all');
              setResolutionState('all');
              setSortBy('updated');
              setSortOrder('desc');
              onQueryChange?.('');
              onTypeChange?.('all');
              onResolutionChange?.('all');
            }}
            aria-label="Clear all filters"
          >
            Clear
          </Button>
        </div>
      </div>

      <Table
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={visible as unknown as Record<string, unknown>[]}
        onRowClick={onView ? (row) => onView?.(row as unknown as EntityIntelligence) : undefined}
        emptyMessage="No entities"
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={shownTotal}
        totalPages={shownTotalPages}
        onPageChange={onPageChange ?? (() => {})}
      />
    </div>
  );
}