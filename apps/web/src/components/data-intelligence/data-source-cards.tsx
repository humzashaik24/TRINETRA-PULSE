'use client';

import { motion } from 'framer-motion';
import {
  FileText, Table, ClipboardList, Phone, CreditCard, Car, MapPin, Upload,
} from 'lucide-react';
import { staggerChildVariants } from '@trinetra-pulse/ui';
import type { DataSource } from '@trinetra-pulse/types';
import { dataSources } from '@/mock';

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  Table: <Table className="h-5 w-5" />,
  ClipboardList: <ClipboardList className="h-5 w-5" />,
  Phone: <Phone className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  Car: <Car className="h-5 w-5" />,
  MapPin: <MapPin className="h-5 w-5" />,
  Upload: <Upload className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  document: 'bg-evidence-subtle text-evidence',
  structured: 'bg-info-subtle text-info',
  investigation: 'bg-ai-subtle text-ai',
};

function SourceCard({ source }: { source: DataSource }) {
  return (
    <motion.div
      variants={staggerChildVariants}
      className="group rounded-lg border border-border bg-surface p-4 tp-transition hover:bg-surface-hover hover:border-border/80 cursor-pointer"
      role="article"
      aria-label={`${source.name} data source`}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${CATEGORY_COLORS[source.category]}`}>
          {ICON_MAP[source.icon]}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground group-hover:text-brand tp-transition">
            {source.name}
          </h3>
          <p className="text-[11px] text-foreground-muted mt-0.5 line-clamp-2 leading-relaxed">
            {source.description}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {source.acceptedExtensions.map((ext) => (
              <span key={ext} className="inline-flex items-center rounded bg-surface-elevated px-1.5 py-0.5 text-[9px] font-mono text-foreground-muted uppercase">
                {ext.replace('.', '')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DataSourceCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="list" aria-label="Available data sources">
      {dataSources.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  );
}
