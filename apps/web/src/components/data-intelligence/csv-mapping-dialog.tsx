'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ArrowRight,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Table,
} from 'lucide-react';
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, Select, Badge } from '@trinetra-pulse/ui';
import {
  type ColumnMappingSuggestion,
  type EntityTarget,
  TARGET_LABELS,
  TARGET_BADGE_CLASSES,
} from '@/lib/csv-mapping';

// ============================================================
// CSV COLUMN MAPPING DIALOG
// ============================================================
// Intercepts CSV uploads after file selection to let the
// investigator review and correct column-to-entity mappings
// before ingestion. Skipped when all headers are recognized.
// ============================================================

const TARGET_OPTIONS: { value: EntityTarget; label: string }[] = [
  { value: 'person', label: 'Person Name' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'vehicle', label: 'Vehicle Registration' },
  { value: 'location', label: 'Location / Address' },
  { value: 'organization', label: 'Organization' },
  { value: 'account', label: 'Account / Bank' },
  { value: 'transaction', label: 'Transaction / Amount' },
  { value: 'id', label: 'Record ID' },
  { value: 'skip', label: 'Do not import' },
];

interface MappingRowProps {
  suggestion: ColumnMappingSuggestion;
  previewValues: string[];
  onChange: (column: string, target: EntityTarget) => void;
}

function MappingRow({ suggestion, previewValues, onChange }: MappingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isUnmapped = suggestion.target === 'skip';

  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-surface hover:bg-surface-hover tp-transition">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-mono text-foreground truncate">{suggestion.sourceColumn}</span>
          <ArrowRight className="h-3.5 w-3.5 text-foreground-muted/50 shrink-0" />
          <span className="text-sm font-mono text-foreground truncate">{TARGET_LABELS[suggestion.target]}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${TARGET_BADGE_CLASSES[suggestion.target]}`}>
            {suggestion.target === 'skip' ? 'skipped' : suggestion.target}
          </span>
          {suggestion.target !== 'skip' && (
            <span className={`text-[10px] font-mono ${suggestion.confidence >= 0.7 ? 'text-success' : suggestion.confidence >= 0.4 ? 'text-warning' : 'text-foreground-muted'}`}>
              {Math.round(suggestion.confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated/30 border-t border-border/30">
        <label htmlFor={`mapping-${suggestion.sourceColumn}`} className="text-[10px] text-foreground-muted uppercase tracking-wide shrink-0">
          Map to
        </label>
        <select
          id={`mapping-${suggestion.sourceColumn}`}
          value={suggestion.target}
          onChange={(e) => onChange(suggestion.sourceColumn, e.target.value as EntityTarget)}
          className="flex-1 appearance-none rounded border border-border bg-surface px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {TARGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {previewValues.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-foreground-muted hover:text-foreground tp-transition"
            aria-label={expanded ? 'Hide preview' : 'Show preview'}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {expanded && previewValues.length > 0 && (
        <div className="border-t border-border/30 bg-surface-elevated/20 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] text-foreground-muted mb-1">
            <Table className="h-3 w-3" />
            <span>Preview (first {previewValues.length} rows)</span>
          </div>
          <div className="space-y-0.5">
            {previewValues.map((val, i) => (
              <div key={i} className="text-xs font-mono text-foreground/80 truncate">
                {val || <span className="text-foreground-muted/40 italic">empty</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CsvMappingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (updatedMappings: ColumnMappingSuggestion[]) => void;
  fileName: string;
  suggestions: ColumnMappingSuggestion[];
  previewRows: string[][];
}

export function CsvMappingDialog({
  open,
  onClose,
  onConfirm,
  fileName,
  suggestions: initialSuggestions,
  previewRows,
}: CsvMappingDialogProps) {
  const [mappings, setMappings] = useState<ColumnMappingSuggestion[]>(initialSuggestions);

  useEffect(() => {
    if (open) setMappings(initialSuggestions);
  }, [open, initialSuggestions]);

  const handleChange = useCallback((column: string, target: EntityTarget) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === column ? { ...m, target } : m,
      ),
    );
  }, []);

  const unmappedCount = mappings.filter((m) => m.target === 'skip').length;
  const hasRequired = mappings.some((m) => m.target !== 'skip');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogTitle>Column Mapping — {fileName}</DialogTitle>
        <DialogDescription>
          Review and correct column-to-entity mappings before ingestion.
        </DialogDescription>

        <div className="flex-1 overflow-y-auto space-y-2 mt-3 scrollbar-thin pr-1">
          {mappings.map((s, i) => (
            <MappingRow
              key={s.sourceColumn}
              suggestion={s}
              previewValues={previewRows.map((row) => row[i] ?? '')}
              onChange={handleChange}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          {unmappedCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-warning">
              <AlertTriangle className="h-3 w-3" />
              <span>{unmappedCount} column{unmappedCount !== 1 ? 's' : ''} will not be imported</span>
            </div>
          )}
          {mappings.every((m) => m.target !== 'skip' && m.confidence >= 0.3) && (
            <div className="flex items-center gap-1 text-[10px] text-success">
              <Check className="h-3 w-3" />
              <span>All columns auto-mapped</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!hasRequired}
            title={!hasRequired ? 'Map at least one column to an entity field' : undefined}
            onClick={() => onConfirm(mappings)}
          >
            Continue Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
