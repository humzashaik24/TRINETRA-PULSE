'use client';

import { motion } from 'framer-motion';
import { duration, easing } from '@trinetra-pulse/ui';
import { isMockData } from '@/lib/api/config';
import { nexusInvestigationRecord } from '@/mock/nexus-dataset';

export function DashboardHeader() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const isPresentation = isMockData();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.normal, ease: easing.emphasized }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-sm font-bold text-foreground">
            Intelligence Overview
          </h1>
          <p className="text-body text-foreground-muted mt-1">
            Monitor connected entities, relationships and emerging patterns across investigations.
          </p>
          {isPresentation && (
            <span className="mt-2 inline-flex items-center rounded bg-brand-subtle px-2 py-0.5 text-[10px] font-medium text-brand">
              Demonstration data — {nexusInvestigationRecord.investigation.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          <div className="flex items-center gap-1.5 text-caption text-foreground-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
            <span>Live</span>
          </div>
          <div className="tp-separator-vertical h-4" aria-hidden="true" />
          <div className="text-right">
            <div className="text-caption text-foreground-secondary font-mono">{timeStr}</div>
            <div className="text-[10px] text-foreground-muted">{dateStr}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
