'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';

// ============================================================
// ANALYTICS VISUAL COMPONENTS (lightweight SVG/div primitives)
// ============================================================
// Small presentational viz primitives for the analytics panels.
// No chart library — deterministic, dependency-free.
// ============================================================

export interface MetricBarDatum {
  key: string;
  label: string;
  value: number;
  bar: number; // 0-1 for bar width
  hint?: string;
}

export function MetricBar({
  data,
  valueFormatter = (v: number) => String(Math.round(v)),
  maxBars = 12,
}: {
  data: MetricBarDatum[];
  valueFormatter?: (v: number) => string;
  maxBars?: number;
}) {
  return (
    <div className="space-y-2">
      {data.slice(0, maxBars).map((d) => (
        <div key={d.key} className="flex items-center gap-2">
          <div className="w-24 shrink-0 truncate text-right text-xs text-foreground-muted" title={d.label}>
            {d.label}
          </div>
          <div className="relative h-4 flex-1 overflow-hidden rounded bg-surface">
            <div
              className="absolute inset-y-0 left-0 rounded bg-current opacity-80"
              style={{
                width: `${Math.max(2, Math.min(100, d.bar * 100))}%`,
                color: 'hsl(210, 80%, 55%)',
              }}
            />
          </div>
          <div className="w-12 shrink-0 text-right font-mono text-[11px] text-foreground">
            {valueFormatter(d.value)}
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <p className="py-4 text-center text-xs text-foreground-muted">No data</p>
      )}
    </div>
  );
}

export function DistributionBar({
  segments,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) {
    return <p className="py-4 text-center text-xs text-foreground-muted">No distribution data</p>;
  }
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label} — ${formatPercent(s.value / total)}`}
            aria-label={`${s.label}, ${formatPercent(s.value / total)}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1 text-[11px] text-foreground-muted">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label} · {formatPercent(total ? s.value / total : 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface SeriesPoint {
  label: string;
  values: Record<string, number>;
}

const SERIES_COLORS = ['hsl(210,80%,55%)', 'hsl(160,70%,45%)', 'hsl(12,80%,55%)', 'hsl(285,70%,55%)'];

export function TimelineChart({
  series,
  seriesLabels,
  height = 120,
}: {
  series: SeriesPoint[];
  seriesLabels: string[];
  height?: number;
}) {
  const width = 320;
  if (series.length === 0 || seriesLabels.length === 0) {
    return <p className="py-4 text-center text-xs text-foreground-muted">No timeline data</p>;
  }
  const allValues = series.flatMap((p) => seriesLabels.map((l) => p.values[l] ?? 0));
  const max = Math.max(...allValues, 0.000001);
  const pad = 4;
  const innerH = height - pad * 2;
  const stepX = series.length > 1 ? (width - 6) / (series.length - 1) : 0;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Centrality trend over time">
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={3}
            x2={width - 3}
            y1={pad + innerH - innerH * t}
            y2={pad + innerH - innerH * t}
            stroke="var(--border, rgba(120,120,120,0.15))"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}
        {seriesLabels.map((label, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length];
          const points = series
            .map((p, i) => `${3 + stepX * i},${pad + innerH - (innerH * (p.values[label] ?? 0)) / max}`)
            .join(' ');
          return (
            <g key={label}>
              <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
              {series.map((p, i) => (
                <circle
                  key={`${label}-${i}`}
                  cx={3 + stepX * i}
                  cy={pad + innerH - (innerH * (p.values[label] ?? 0)) / max}
                  r={2}
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-3">
        {seriesLabels.map((label, i) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-foreground-muted">
            <span className="inline-block h-1.5 w-3 rounded" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {label === 'degree' ? 'Ties' : label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-3', accent && 'border-t-2')}
      style={accent ? { borderTopColor: accent } : undefined}
    >
      <p className="text-[11px] uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-foreground" title={hint}>
        {value}
      </p>
    </div>
  );
}
