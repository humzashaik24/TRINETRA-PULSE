'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Code2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Network as NetworkIcon,
  ArrowRight,
  Phone,
  Wallet,
  Play,
} from 'lucide-react';
import { Badge, Button, ChartCard, StatCard, EmptyState } from '@trinetra-pulse/ui';
import { parseCdrCsv, type CdrParseResult, type CdrRecord } from '@/lib/cdr/cdr-parse';
import {
  SAMPLE_CDR_CSV,
  SAMPLE_CDR_FILE_NAME,
  SAMPLE_TRANSACTION_CSV,
  SAMPLE_TRANSACTION_FILE_NAME,
} from '@/mock/cdr-sample';
import { expandNetworkWithCdr, type NetworkCdrExpansion } from '@/services/network.service';
import { isMockData } from '@/lib/api/config';
import { useCanMutate } from '@/hooks/use-auth';

// ============================================================
// KNOWLEDGE CANVAS — CDR / CSV VIEW
// ============================================================
// Deterministic local parsing of communication / transaction CSVs
// and projection onto the network graph (mock demo path). The live
// API path routes through the Data Intelligence ingestion pipeline
// instead of a parallel in-browser engine.
// ============================================================

interface CdrViewProps {
  networkId: string;
  investigationId: string;
  onExpanded?: () => void;
}

interface PreviewRow {
  left: string;
  op: string;
  right: string;
  detail: string;
}

function previewRows(result: CdrParseResult): PreviewRow[] {
  return result.records.slice(0, 8).map((r) => {
    if (r.kind === 'communication') {
      return {
        left: `+91 ${r.caller.slice(0, 5)} ${r.caller.slice(5)}`,
        op: '\u2192',
        right: `+91 ${r.callee.slice(0, 5)} ${r.callee.slice(5)}`,
        detail: `${r.type === 'VOICE' ? 'call' : r.type === 'SMS' ? 'message' : 'data'}${r.durationSeconds && r.durationSeconds > 0 ? ` \u00b7 ${r.durationSeconds}s` : ''}`,
      };
    }
    return {
      left: formatAccount(r.fromAccount),
      op: '\u2192',
      right: formatAccount(r.toAccount),
      detail: r.amount != null ? `\u20b9 ${r.amount.toLocaleString('en-IN')}${r.currency ? ` ${r.currency}` : ''}` : 'amount unknown',
    };
  });
}

function formatAccount(digits: string): string {
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

const FORMAT_BADGE: Record<string, { label: string; variant: 'info' | 'success' | 'default' }> = {
  communication: { label: 'Communication CDR', variant: 'info' },
  transaction: { label: 'Transaction log', variant: 'success' },
};

export function CdrView({ networkId, investigationId, onExpanded }: CdrViewProps) {
  const canMutate = useCanMutate();
  const mockMode = isMockData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<CdrParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [expansion, setExpansion] = useState<NetworkCdrExpansion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptCsv = (text: string, name: string) => {
    setError(null);
    setExpansion(null);
    const result = parseCdrCsv(text);
    setParsed(result);
    setFileName(name);
    if (result.format === null) {
      setError(
        'This file could not be recognised as a communication (caller/called) or transaction (from/to account) record set.'
      );
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => acceptCsv(String(reader.result ?? ''), file.name);
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsText(file);
  };

  const runExpansion = async () => {
    if (!parsed || !parsed.records.length || expanding) return;
    setExpanding(true);
    setError(null);
    try {
      const result = await expandNetworkWithCdr(networkId, parsed.records, {
        datasetName: fileName ?? 'CDR import',
      });
      setExpansion(result);
      onExpanded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network expansion failed.');
    } finally {
      setExpanding(false);
    }
  };

  const rows = parsed ? previewRows(parsed) : [];
  const formatter = parsed ? FORMAT_BADGE[parsed.format ?? 'x'] : undefined;

  return (
    <div className="space-y-6">
      {error && parsed?.format === null && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-subtle p-3">
          <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
          <p className="text-body-sm text-foreground">{error}</p>
        </div>
      )}

      {/* Source selection */}
      <ChartCard
        title="Import a communication or transaction CSV"
        subtitle="Parsed locally, deterministically — the same file always produces the same graph expansion"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => acceptCsv(SAMPLE_CDR_CSV, SAMPLE_CDR_FILE_NAME)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Load CDR sample
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => acceptCsv(SAMPLE_TRANSACTION_CSV, SAMPLE_TRANSACTION_FILE_NAME)}
            >
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              Load transaction sample
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="sr-only"
              aria-label="Upload a CSV file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPasteText(pasteText ? '' : SAMPLE_CDR_CSV);
            }}
          >
            <Code2 className="h-3.5 w-3.5 mr-1.5" />
            {pasteText ? 'Clear paste' : 'Paste raw CSV'}
          </Button>
        </div>

        <AnimatePresence>
          {pasteText && !parsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-border bg-surface-elevated p-3 font-mono text-caption text-foreground"
                placeholder="Paste CSV text here, then click Parse"
              />
              <div className="mt-2">
                <Button size="sm" onClick={() => acceptCsv(pasteText, 'pasted-csv.csv')}>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Parse
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ChartCard>

      {/* Parse summary */}
      {parsed && parsed.format !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Format"
              value={formatter?.label ?? 'Unknown'}
              icon={<NetworkIcon className="h-4 w-4" />}
              className="col-span-2 lg:col-span-2"
            />
            <StatCard label="Records parsed" value={parsed.records.length} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Rows skipped" value={parsed.skippedRows} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          {parsed.warnings.length > 0 && parsed.records.length === 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-subtle p-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                {parsed.warnings.map((w, i) => (
                  <p key={i} className="text-body-sm text-foreground">{w}</p>
                ))}
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <ChartCard
              title="Row preview"
              subtitle={fileName ?? 'parsed.csv'}
              action={
                <Badge variant={formatter?.variant ?? 'default'} size="sm">
                  {formatter?.label}
                </Badge>
              }
              className="mt-4"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-caption text-foreground-muted uppercase tracking-wider">
                      <th className="pb-2 pr-4 font-medium">From</th>
                      <th className="pb-2 pr-4 font-medium"></th>
                      <th className="pb-2 pr-4 font-medium">To</th>
                      <th className="pb-2 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm">
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5 pr-4 font-mono text-foreground">{row.left}</td>
                        <td className="py-1.5 pr-4 text-foreground-muted">{row.op}</td>
                        <td className="py-1.5 pr-4 font-mono text-foreground">{row.right}</td>
                        <td className="py-1.5 text-foreground-muted">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.records.length > 8 && (
                <p className="text-caption text-foreground-muted mt-2">
                  +{parsed.records.length - 8} more rows hidden in preview
                </p>
              )}
            </ChartCard>
          )}
        </motion.div>
      )}

      {/* Expansion */}
      {parsed && parsed.format !== null && parsed.records.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {mockMode ? (
            canMutate ? (
              <ChartCard
                title="Expand the network graph"
                subtitle="Project parsed records onto the active network — existing phones/accounts are matched, new ones are created"
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void runExpansion()}
                    disabled={expanding}
                  >
                    {expanding ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <NetworkIcon className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {expanding ? 'Expanding…' : 'Expand network'}
                  </Button>
                }
              >
                <p className="text-caption text-foreground-muted">
                  Applies to network <span className="font-mono font-medium text-foreground">{networkId}</span>{' '}
                  in investigation{' '}
                  <span className="font-mono font-medium text-foreground">{investigationId}</span>.
                </p>
              </ChartCard>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-4">
                <AlertTriangle className="h-4 w-4 text-foreground-muted shrink-0" />
                <p className="text-body-sm text-foreground-secondary">
                  Your account is read-only. Network expansion requires investigator permissions.
                </p>
              </div>
            )
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-4">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-body-sm text-foreground">
                  Live API mode: CSV warnings and row preview are available locally, but graph
                  expansion runs through the server-side ingestion pipeline.
                </p>
                <p className="text-caption text-foreground-muted mt-1">
                  Upload the file in <span className="font-medium">Data Intelligence</span> — the
                  server ingestion job builds the network graph from the dataset.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Expansion result */}
      {expansion && expansion.nodesCreated.length + expansion.edgesCreated.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Nodes created" value={expansion.nodesCreated.length} icon={<NetworkIcon className="h-4 w-4" />} />
            <StatCard label="Edges created" value={expansion.edgesCreated.length} icon={<ArrowRight className="h-4 w-4" />} />
            <StatCard label="Existing matched" value={expansion.matchedExisting.length} icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatCard label="Dataset" value={expansion.datasetName} icon={<FileText className="h-4 w-4" />} />
          </div>

          <ChartCard
            title="Expansion summary"
            subtitle={`Records: ${expansion.communicationRecords} communication · ${expansion.transactionRecords} transactions`}
            className="mt-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-caption text-foreground-muted uppercase tracking-wider font-medium mb-2">
                  New nodes
                </p>
                {expansion.nodesCreated.length === 0 ? (
                  <EmptyState title="No new nodes" description="Every referenced entity already existed in the network." />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {expansion.nodesCreated.map((n) => (
                      <Badge key={n.entityId} variant={n.type === 'phone' ? 'info' : 'success'} size="sm">
                        {n.type === 'phone' ? <Phone className="h-3 w-3 mr-1" /> : <Wallet className="h-3 w-3 mr-1" />}
                        {n.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-caption text-foreground-muted uppercase tracking-wider font-medium mb-2">
                  Matched existing entities
                </p>
                {expansion.matchedExisting.length === 0 ? (
                  <EmptyState title="No matches" description="No existing entities were referenced by these records." />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {expansion.matchedExisting.map((n) => (
                      <Badge key={n.entityId} variant="default" size="sm">
                        {n.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ChartCard>
        </motion.div>
      )}
    </div>
  );
}