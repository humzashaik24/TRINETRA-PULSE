'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { staggerChildVariants } from '@trinetra-pulse/ui';
import { activitySeries } from '@/mock';

const CHART_COLORS = {
  events: 'hsl(217, 91%, 60%)',
  relationships: 'hsl(142, 71%, 45%)',
  communications: 'hsl(160, 84%, 39%)',
  patterns: 'hsl(24, 95%, 53%)',
};

const SERIES_LABELS: Record<string, string> = {
  events: 'Events',
  relationships: 'Relationships',
  communications: 'Communications',
  patterns: 'Patterns',
};

export function ActivityChart() {
  const [activeSeries, setActiveSeries] = useState<Set<string>>(
    new Set(['events', 'relationships', 'communications', 'patterns'])
  );

  const { data } = activitySeries;
  const maxValue = Math.max(
    ...data.flatMap((d) => [
      activeSeries.has('events') ? d.events : 0,
      activeSeries.has('relationships') ? d.relationships : 0,
      activeSeries.has('communications') ? d.communications : 0,
      activeSeries.has('patterns') ? d.patterns * 10 : 0,
    ]),
    1
  );

  const chartWidth = 100;
  const chartHeight = 60;
  const barGroupWidth = chartWidth / data.length;
  const barWidth = barGroupWidth * 0.18;
  const gap = 1;

  const seriesKeys = ['events', 'relationships', 'communications', 'patterns'] as const;

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap" role="group" aria-label="Chart series filters">
        {seriesKeys.map((key) => (
          <button
            key={key}
            onClick={() => toggleSeries(key)}
            className={`flex items-center gap-1.5 text-[10px] font-medium tp-transition rounded px-1.5 py-0.5 ${
              activeSeries.has(key)
                ? 'text-foreground'
                : 'text-foreground-muted/40 hover:text-foreground-muted'
            }`}
            aria-pressed={activeSeries.has(key)}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0 tp-transition"
              style={{
                backgroundColor: CHART_COLORS[key],
                opacity: activeSeries.has(key) ? 1 : 0.3,
              }}
              aria-hidden="true"
            />
            {SERIES_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="relative" style={{ height: 160 }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 8}`}
          className="w-full h-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Activity chart showing events, relationships, communications, and patterns over the last 7 days"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <g key={pct}>
              <line
                x1="0"
                y1={chartHeight * (1 - pct)}
                x2={chartWidth}
                y2={chartHeight * (1 - pct)}
                stroke="hsl(var(--color-border))"
                strokeWidth="0.1"
                strokeDasharray="0.5 0.5"
              />
              <text
                x="-0.5"
                y={chartHeight * (1 - pct) + 0.8}
                className="fill-foreground-muted"
                fontSize="1.8"
                textAnchor="end"
              >
                {Math.round(maxValue * pct)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = i * barGroupWidth + barGroupWidth * 0.15;
            const activeKeys = seriesKeys.filter((k) => activeSeries.has(k));
            const totalBars = activeKeys.length;
            const totalBarWidth = totalBars * barWidth + (totalBars - 1) * gap;
            const startX = x + (barGroupWidth * 0.7 - totalBarWidth) / 2;

            return (
              <g key={d.label}>
                {activeKeys.map((key, barIndex) => {
                  let value: number;
                  if (key === 'patterns') {
                    value = d.patterns * 10;
                  } else if (key === 'events') {
                    value = d.events;
                  } else if (key === 'relationships') {
                    value = d.relationships;
                  } else {
                    value = d.communications;
                  }
                  const barHeight = (value / maxValue) * chartHeight;
                  const barX = startX + barIndex * (barWidth + gap);
                  const barY = chartHeight - barHeight;

                  return (
                    <rect
                      key={key}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={CHART_COLORS[key]}
                      opacity={0.8}
                      rx="0.3"
                      className="tp-transition hover:opacity-100"
                    >
                      <title>{`${SERIES_LABELS[key]}: ${key === 'patterns' ? d.patterns : value} (${d.label})`}</title>
                    </rect>
                  );
                })}
                <text
                  x={x + barGroupWidth * 0.35}
                  y={chartHeight + 4}
                  className="fill-foreground-muted"
                  fontSize="2"
                  textAnchor="middle"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
