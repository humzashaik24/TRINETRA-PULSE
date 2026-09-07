'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@trinetra-pulse/ui';
import { Stagger, staggerChildVariants } from '@trinetra-pulse/ui';
import type { DataPreview, DataColumn } from '@trinetra-pulse/types';
import { mockPreviews } from '@/mock';

function ColumnInfo({ column }: { column: DataColumn }) {
  const typeColors: Record<string, string> = {
    string: 'text-info',
    number: 'text-success',
    boolean: 'text-warning',
    date: 'text-ai',
    unknown: 'text-foreground-muted',
  };

  return (
    <motion.div variants={staggerChildVariants} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-hover tp-transition">
      <span className="text-sm font-medium text-foreground w-40 truncate">{column.name}</span>
      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-elevated ${typeColors[column.type]}`}>
        {column.type}
      </span>
      <span className="text-[10px] text-foreground-muted font-mono ml-auto">
        {column.nullPercentage > 0 ? `${column.nullPercentage}% null` : 'no nulls'}
      </span>
      <span className="text-[10px] text-foreground-muted font-mono w-16 text-right">
        {column.uniquePercentage.toFixed(1)}% unique
      </span>
      {column.mappedField && (
        <span className="text-[10px] text-success font-mono">
          &rarr; {column.mappedField}
        </span>
      )}
    </motion.div>
  );
}

interface DatasetPreviewProps {
  datasetId: string;
  datasetName: string;
  onClose: () => void;
}

export function DatasetPreview({ datasetId, datasetName, onClose }: DatasetPreviewProps) {
  const [activeTab, setActiveTab] = useState('columns');
  const preview = mockPreviews[datasetId];

  if (!preview) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-subheading text-foreground">{datasetName}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-body-sm text-foreground-muted">Preview not available for this dataset.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-lg border border-border bg-surface overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-subheading text-foreground">{datasetName}</h3>
          <p className="text-[10px] text-foreground-muted mt-0.5">
            {preview.totalRows.toLocaleString()} total rows &middot; {preview.columns.length} columns &middot; Showing {preview.sampleSize} sample rows
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="columns" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-4 border-b border-border">
          <TabsList>
            <TabsTrigger value="columns">Columns ({preview.columns.length})</TabsTrigger>
            <TabsTrigger value="sample">Sample Data</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="columns" className="p-2">
          <Stagger staggerInterval={0.03}>
            {preview.columns.map((col) => (
              <ColumnInfo key={col.name} column={col} />
            ))}
          </Stagger>
        </TabsContent>

        <TabsContent value="sample" className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left" role="table">
              <thead>
                <tr className="border-b border-border">
                  {preview.columns.map((col) => (
                    <th key={col.name} className="px-3 py-2 text-[10px] font-medium text-foreground-muted uppercase tracking-wider whitespace-nowrap">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border/30 last:border-0 hover:bg-surface-hover tp-transition">
                    {preview.columns.map((col) => (
                      <td key={col.name} className="px-3 py-2 text-xs text-foreground-secondary whitespace-nowrap max-w-[200px] truncate">
                        {String(row[col.name] ?? '') || <span className="text-foreground-muted/40 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
