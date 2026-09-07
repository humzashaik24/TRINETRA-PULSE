'use client';

import { useEffect, useState } from 'react';
import { type AuditEvent } from '@trinetra-pulse/types';
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
  type Column,
} from '@trinetra-pulse/ui';
import { History } from 'lucide-react';
import { fetchAuditEvents } from '@/services/entity.service';
import { formatDateTime } from '@/lib/format';

// ============================================================
// AUDIT TRAIL
// ============================================================

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

  const ACTION_TONE: Record<string, BadgeVariant> = {
    ENTITY_CREATED: 'info',
    ENTITY_UPDATED: 'default',
    ENTITY_RESOLVED: 'success',
    ENTITY_REJECTED: 'danger',
    ENTITY_MERGED: 'success',
    RELATIONSHIP_CREATED: 'info',
    RELATIONSHIP_VERIFIED: 'success',
    RELATIONSHIP_REJECTED: 'danger',
    CANDIDATE_REVIEWED: 'warning',
    EXTRACTION_STARTED: 'default',
  };

export function AuditTrail() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchAuditEvents()
      .then((list) => {
        if (mounted) setEvents(list);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load audit trail');
      })
      .finally(() => {
        if (mounted) setRunning(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const columns: Column<AuditEvent>[] = [
    {
      key: 'actionLabel',
      header: 'Action',
      render: (_v, row) => {
        const variant = ACTION_TONE[row.action] ?? 'default';
        return (
          <Badge variant={variant} size="sm">
            {row.actionLabel}
          </Badge>
        );
      },
    },
    {
      key: 'object',
      header: 'Object',
      width: '220px',
      render: (_v, row) => (
        <div className="min-w-0">
          <div className="truncate text-sm text-foreground">{row.object}</div>
          {row.objectId && <div className="font-mono text-[10px] text-foreground-muted">{row.objectId}</div>}
        </div>
      ),
    },
    {
      key: 'actorName',
      header: 'Actor',
      width: '150px',
      render: (_v, row) => (
        <div>
          <div className="text-sm text-foreground">{row.actorName}</div>
          <div className="font-mono text-[10px] text-foreground-muted">{row.actor}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (_v, row) => (
        <span className="text-body-sm text-foreground-muted line-clamp-1">{row.reason ?? '—'}</span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      width: '160px',
      align: 'right',
      render: (v) => <span className="text-caption text-foreground-muted">{formatDateTime(String(v))}</span>,
    },
  ];

  if (running) return <LoadingState message="Loading audit trail…" />;
  if (error) return <ErrorState title="Could not load audit trail" message={error} />;
  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-8 w-8" />}
        title="No audit events"
        description="Every mutation — resolution, merge, extraction start — is recorded here."
      />
    );
  }

  return (
    <Table
      columns={columns as unknown as Column<Record<string, unknown>>[]}
      data={events as unknown as Record<string, unknown>[]}
      compact
    />
  );
}