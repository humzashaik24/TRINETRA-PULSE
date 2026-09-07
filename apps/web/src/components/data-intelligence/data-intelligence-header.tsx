'use client';

import { motion } from 'framer-motion';
import { duration, easing } from '@trinetra-pulse/ui';

export function DataIntelligenceHeader() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.normal, ease: easing.emphasized }}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-sm font-bold text-foreground">
            Data Intelligence
          </h1>
          <p className="text-body text-foreground-muted mt-1">
            Import and prepare investigation data for analysis.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          <div className="text-right">
            <div className="text-caption text-foreground-secondary font-mono">{timeStr}</div>
            <div className="text-[10px] text-foreground-muted">{dateStr}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
