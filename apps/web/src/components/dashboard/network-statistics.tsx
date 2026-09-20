'use client';

import { motion } from 'framer-motion';
import {
  Network, Users, GitBranch, BarChart3, Star,
} from 'lucide-react';
import { useDashboardView } from '@/state/dashboard.store';
import { staggerChildVariants } from '@trinetra-pulse/ui';

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <motion.div
      variants={staggerChildVariants}
      className="flex items-center justify-between py-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-foreground-muted">{icon}</span>
        <span className="text-body-sm text-foreground-secondary">{label}</span>
      </div>
      <span className="text-sm font-mono font-medium text-foreground">{value}</span>
    </motion.div>
  );
}

export function NetworkStatistics() {
  const view = useDashboardView();
  const network = view?.network;
  if (!network) return null;

  const stats = [
    { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Network Density', value: network.density.toFixed(2) },
    { icon: <Users className="h-3.5 w-3.5" />, label: 'Communities', value: network.communityCount },
    { icon: <Network className="h-3.5 w-3.5" />, label: 'Connected Components', value: network.connectedComponents },
    { icon: <GitBranch className="h-3.5 w-3.5" />, label: 'Average Degree', value: network.averageDegree.toFixed(1) },
    { icon: <Star className="h-3.5 w-3.5" />, label: 'High-Centrality Entities', value: network.highCentralityCount },
  ];

  return (
    <div className="divide-y divide-border/50" role="list" aria-label="Network statistics">
      {stats.map((stat) => (
        <StatRow key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
