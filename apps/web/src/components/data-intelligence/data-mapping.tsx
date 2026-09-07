'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Badge, EmptyState, Switch } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import type { DataMapping, ColumnMapping } from '@trinetra-pulse/types';
import { mockMappings } from '@/mock';

const TARGET_TYPE_COLORS: Record<string, string> = {
  person: 'bg-entity-person/10 text-entity-person',
  phone: 'bg-entity-phone/10 text-entity-phone',
  vehicle: 'bg-entity-vehicle/10 text-entity-vehicle',
  location: 'bg-entity-location/10 text-entity-location',
  organization: 'bg-entity-organization/10 text-entity-organization',
  account: 'bg-entity-account/10 text-entity-account',
  transaction: 'bg-entity-transaction/10 text-entity-transaction',
  event: 'bg-entity-event/10 text-entity-event',
  document: 'bg-entity-document/10 text-entity-document',
  relationship: 'bg-network-subtle text-network',
  other: 'bg-surface-elevated text-foreground-muted',
};

function MappingRow({ mapping }: { mapping: ColumnMapping }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={staggerChildVariants}
      className="border border-border/50 rounded-md overflow-hidden"
    >
      <div className="flex items-center gap-3 px-3 py-2.5 bg-surface hover:bg-surface-hover tp-transition">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-mono text-foreground truncate">{mapping.sourceColumn}</span>
          <ArrowRight className="h-3.5 w-3.5 text-foreground-muted/50 shrink-0" />
          <span className="text-sm font-mono text-foreground truncate">{mapping.targetField}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${TARGET_TYPE_COLORS[mapping.targetType] || TARGET_TYPE_COLORS.other}`}>
            {mapping.targetType}
          </span>
          {mapping.isAutoMapped ? (
            <Badge variant="success" size="sm">Auto</Badge>
          ) : (
            <Badge variant="secondary" size="sm">Manual</Badge>
          )}
          <span className={`text-[10px] font-mono ${mapping.confidence >= 0.9 ? 'text-success' : mapping.confidence >= 0.7 ? 'text-warning' : 'text-danger'}`}>
            {Math.round(mapping.confidence * 100)}%
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && mapping.normalization && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 bg-surface-elevated/30 px-3 py-2"
          >
            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-foreground-muted">Normalization: {mapping.normalization.type}</span>
              <span className="text-foreground-muted">Method: {mapping.normalization.method}</span>
              <span className="text-foreground-muted">
                &quot;{mapping.normalization.originalValue}&quot; &rarr; &quot;{mapping.normalization.normalizedValue}&quot;
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mapping.normalization && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center py-1 text-[10px] text-foreground-muted hover:text-foreground tp-transition"
          aria-label={expanded ? 'Hide normalization details' : 'Show normalization details'}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </motion.div>
  );
}

interface DataMappingViewProps {
  datasetId: string;
  datasetName: string;
}

export function DataMappingView({ datasetId, datasetName }: DataMappingViewProps) {
  const mapping = mockMappings[datasetId];

  if (!mapping) {
    return (
      <EmptyState
        icon={<ArrowRight className="h-8 w-8" />}
        title="No mappings configured"
        description="Column mappings will be created automatically when data is processed."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-foreground">Column Mappings</h4>
          <p className="text-[10px] text-foreground-muted mt-0.5">
            {mapping.mappings.length} field{mapping.mappings.length !== 1 ? 's' : ''} mapped &middot; {mapping.mappings.filter((m) => m.isAutoMapped).length} auto-mapped
          </p>
        </div>
        <Button variant="secondary" size="sm">
          Edit Mappings
        </Button>
      </div>

      <Stagger staggerInterval={0.04} className="space-y-1.5">
        {mapping.mappings.map((m) => (
          <MappingRow key={m.id} mapping={m} />
        ))}
      </Stagger>
    </div>
  );
}
