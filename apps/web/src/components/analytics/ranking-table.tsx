'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';

// ============================================================
// RANKING TABLE — top-N ranked entities for a metric
// ============================================================

export interface RankingRow {
  entityId: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  secondary?: string;
}

export function RankingTable({
  rows,
  valueFormatter,
  onSelect,
  selectedId,
  emptyLabel = 'No ranking data',
  limit = 12,
}: {
  rows: RankingRow[];
  valueFormatter?: (row: RankingRow) => string;
  onSelect?: (row: RankingRow) => void;
  selectedId?: string | null;
  emptyLabel?: string;
  limit?: number;
}) {
  const shown = rows.slice(0, limit);
  const maxValue = shown.reduce((m, r) => Math.max(m, r.value), 0.000001);

  return (
    <div>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-xs text-foreground-muted">{emptyLabel}</p>
      ) : (
        <ol className="divide-y divide-border/60">
          {shown.map((row, i) => {
            const isSelected = selectedId === row.entityId;
            const displayValue = valueFormatter
              ? valueFormatter(row)
              : `${row.prefix ?? ''}${Math.round(row.value * 100) / 100}${row.suffix ?? ''}`;
            return (
              <li key={row.entityId}>
                <button
                  onClick={onSelect ? () => onSelect(row) : undefined}
                  disabled={!onSelect}
                  className={cn(
                    'flex w-full items-center gap-3 py-1.5 text-left',
                    onSelect && 'hover:bg-surface cursor-pointer',
                    isSelected && 'bg-surface/70'
                  )}
                >
                  <span className="w-6 shrink-0 text-right font-mono text-[11px] text-foreground-muted">
                    {i + 1}
                  </span>
                  <span className="w-4 shrink-0 rounded-sm bg-current" style={{ color: 'hsl(210,80%,55%)', height: 10, opacity: 0.5 + 0.5 * (row.value / maxValue) }} />
                  <span className={cn('min-w-0 flex-1 truncate text-xs text-foreground', isSelected && 'font-medium')} title={row.label}>
                    {row.label}
                  </span>
                  {row.secondary && (
                    <span className="shrink-0 font-mono text-[10px] text-foreground-muted">{row.secondary}</span>
                  )}
                  <span className="w-14 shrink-0 text-right font-mono text-[11px] text-foreground">
                    {displayValue}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function formatRankingValue(v: number): string {
  return formatPercent(v);
}
