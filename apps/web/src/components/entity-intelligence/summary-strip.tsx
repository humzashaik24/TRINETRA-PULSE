'use client';

import { StatCard } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import { motion } from 'framer-motion';
import { Fingerprint, ListTree, RefreshCw, Users } from 'lucide-react';
import { formatCount } from '@/lib/format';

// ============================================================
// ENTITY INTELLIGENCE — SUMMARY STRIP
// ============================================================

export interface EntitySummaryCounts {
  entities: number;
  candidates: number;
  pendingResolutions: number;
  jobsRunning: number;
}

interface SummaryStripProps {
  counts: EntitySummaryCounts;
  loading?: boolean;
}

export function SummaryStrip({ counts, loading = false }: SummaryStripProps) {
  const cards = [
    {
      label: 'Canonical entities',
      value: loading ? '—' : formatCount(counts.entities),
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Candidates awaiting review',
      value: loading ? '—' : formatCount(counts.candidates),
      icon: <Fingerprint className="h-4 w-4" />,
    },
    {
      label: 'Resolutions pending',
      value: loading ? '—' : formatCount(counts.pendingResolutions),
      icon: <ListTree className="h-4 w-4" />,
    },
    {
      label: 'Jobs in progress',
      value: loading ? '—' : formatCount(counts.jobsRunning),
      icon: <RefreshCw className="h-4 w-4" />,
    },
  ];

  return (
    <Stagger staggerInterval={0.05}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <motion.div key={card.label} variants={staggerChildVariants}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>
    </Stagger>
  );
}