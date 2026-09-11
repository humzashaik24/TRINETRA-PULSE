'use client';

import { motion } from 'framer-motion';
import {
  Users, Network, Calendar, FolderOpen, AlertTriangle, FileText, Layers, Boxes,
} from 'lucide-react';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import type { DashboardMetric } from '@trinetra-pulse/types';
import { dashboardMetrics } from '@/mock';

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  'folder-open': <FolderOpen className="h-4 w-4" />,
  'alert-triangle': <AlertTriangle className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
  layers: <Layers className="h-4 w-4" />,
  boxes: <Boxes className="h-4 w-4" />,
};

const METRIC_ORDER: (keyof typeof dashboardMetrics)[] = [
  'entities',
  'relationships',
  'events',
  'activeInvestigations',
  'suspiciousPatterns',
  'findings',
  'evidenceItems',
  'clusters',
];

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <motion.div
      variants={staggerChildVariants}
      className="group rounded-lg border border-border bg-surface p-4 tp-transition hover:bg-surface-hover hover:border-border/80 cursor-default"
      role="article"
      aria-label={`${metric.label}: ${metric.formattedValue}`}
    >
      <div className="flex items-center justify-between">
        <span className="tp-data-label">{metric.label}</span>
        <span className="text-foreground-muted group-hover:text-foreground-secondary tp-transition">
          {ICON_MAP[metric.icon]}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-display-sm font-bold text-foreground font-mono">
          {metric.formattedValue}
        </span>
        {metric.change !== undefined && metric.trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            metric.trend === 'up' ? 'text-success' : metric.trend === 'down' ? 'text-danger' : 'text-foreground-muted'
          }`}>
            {metric.trend === 'up' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 19V5m-5 5l5-5 5 5" />
              </svg>
            )}
            {metric.trend === 'down' && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 5v14m5-5l-5 5-5-5" />
              </svg>
            )}
            {metric.change > 0 ? '+' : ''}{metric.change}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-foreground-muted mt-1.5 leading-relaxed opacity-0 group-hover:opacity-100 tp-transition">
        {metric.description}
      </p>
    </motion.div>
  );
}

export function IntelligenceMetrics() {
  return (
    <Stagger staggerInterval={0.06} delay={0.15} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {METRIC_ORDER.map((key) => (
        <MetricCard key={key} metric={dashboardMetrics[key]} />
      ))}
    </Stagger>
  );
}
