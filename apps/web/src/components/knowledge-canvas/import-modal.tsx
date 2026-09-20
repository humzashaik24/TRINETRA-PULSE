'use client';

import { useState } from 'react';
import { Button } from '@trinetra-pulse/ui';
import { useCanvasStore } from './canvas-store';
import { canvasNodeId, kindForFile, sha256Hex } from './canvas-utils';
import { sourceNode } from './canvas-builders';
import { isMockData } from '@/lib/api/config';
import { uploadDataset } from '@/lib/api/investigations';
import { uploadEvidence } from '@/lib/api/evidence';
import { parseCdrCsv } from '@/lib/cdr/cdr-parse';
import { useInvestigationStore } from '@/state/investigation.store';

export function ImportModal() {
  const importOpen = useCanvasStore((s) => s.importOpen);
  const setImportOpen = useCanvasStore((s) => s.setImportOpen);
  const addNode = useCanvasStore((s) => s.addNode);
  const appendAudit = useCanvasStore((s) => s.appendAudit);
  const nextLocalId = useCanvasStore((s) => s.nextLocalId);

  const investigationId = useCanvasStore((s) => s.investigationId);

  const [files, setFiles] = useState<File[]>([]);
  const [sourceName, setSourceName] = useState('manual ingest');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setFiles([]);
    setStatus(null);
    setImportOpen(false);
  };

  const processOne = async (file: File, index: number): Promise<void> => {
    const base = canvasNodeId('source', nextLocalId(), index);
    const kind = kindForFile(file.name, file.type);
    const checksum = await sha256Hex(file).catch(() => null);
    setStatus(`Reading ${file.name}…`);

    if (kind === 'data') {
      const text = await file.text().catch(() => '');
      const cdr = parseCdrCsv(text);
      if (cdr.format === 'communication' && cdr.records.length > 0) {
        const phoneNodeIds = new Set<string>();
        let added = 0;
        cdr.records.forEach((record, i) => {
          if (record.kind !== 'communication' || !record.callee) return;
          const callee = record.callee;
          const phoneId = canvasNodeId('entity', `cdr-phone-${callee}-${i}`, index + i);
          if (phoneNodeIds.has(phoneId)) return;
          phoneNodeIds.add(phoneId);
          addNode({
            id: phoneId,
            type: 'canvas',
            position: { x: 20 + (index + i) * 40, y: 200 },
            data: {
              kind: 'entity',
              label: callee,
              refId: null,
              entityType: 'phone',
              origin: 'cdr',
              createdAt: new Date().toISOString(),
            },
          });
          added += 1;
        });
        appendAudit({
          action: 'ingest-cdr',
          detail: `Parsed ${cdr.records.length} CDR records from ${file.name} (${added} phone nodes)`,
        });
      } else if (!isMockData() && investigationId) {
        await uploadDataset(file, investigationId, {
          name: sourceName || file.name,
          sourceName: file.name,
        });
        appendAudit({
          action: 'ingest-dataset',
          detail: `Uploaded dataset ${file.name} to Trinetra`,
        });
      } else {
        appendAudit({
          action: 'ingest-file',
          detail: `Loaded ${file.name} (${cdr.format ?? 'unrecognized'} format)`,
        });
      }
    }

    const node = sourceNode(
      base,
      file.name,
      fileNameLabel(file, kind),
      { x: 20 + index * 260, y: 60 },
      {
        checksum,
        imageUrl: kind === 'image' ? URL.createObjectURL(file) : null,
        summary: kind === 'document' ? `Document — view original in the evidence store.` : null,
      },
    );

    if (kind === 'audio' && !isMockData() && checksum && investigationId) {
      const { runLocalWhisper } = await import('@/lib/whisper/local-whisper');
      const evidence = await uploadEvidence(file, investigationId, {
        evidenceType: 'AUDIO',
        source: sourceName,
      }).catch(() => null);
      if (evidence) {
        setStatus(`Transcribing ${file.name} on-device…`);
        const result = await runLocalWhisper(
          evidence.id,
          investigationId,
          checksum,
          'Xenova/whisper-tiny',
        ).catch(() => null);
        if (result && result.transcript) {
          node.data.label = `${result.transcript.slice(0, 48)}…`;
          node.data.transcript = result.transcript;
          node.data.origin = 'whisper';
          appendAudit({
            action: 'transcribe',
            detail: `Transcribed ${file.name} on-device (Whisper)`,
          });
        }
      }
    } else if (kind === 'audio') {
      appendAudit({
        action: 'ingest-file',
        detail: `Loaded ${file.name} (audio)`,
      });
    }

    if (!isMockData() && (kind === 'image' || kind === 'document') && investigationId) {
      await uploadEvidence(file, investigationId).catch(() => null);
      appendAudit({
        action: 'ingest-evidence',
        detail: `Registered ${file.name} as Trinetra evidence`,
      });
    }

    addNode(node);
    setStatus(`Added ${file.name} to the canvas`);
  };

  const run = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i += 1) {
        await processOne(files[i], i);
      }
      setFiles([]);
      setStatus(null);
      setImportOpen(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ingest failed');
    } finally {
      setBusy(false);
    }
  };

  if (!importOpen) return null;

  return (
    <div
      data-testid="canvas-import-modal"
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/40 backdrop-blur-sm"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files!)]);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-subheading text-foreground">Ingest into the canvas</h2>
            <p className="font-mono text-overline uppercase tracking-wider text-foreground-muted">
              {investigationId?.toUpperCase() ?? 'INVESTIGATION'}
            </p>
          </div>
        </header>

        <label className="block cursor-pointer rounded-md border border-dashed border-border-strong p-4 text-center text-caption text-foreground-muted hover:bg-surface-hover">
          Drop files here, or click to choose
          <input
            type="file"
            multiple
            data-testid="canvas-import-files"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        <label className="mt-3 block space-y-1">
          <span className="font-mono text-overline uppercase tracking-wider text-foreground-secondary">
            Source name
          </span>
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-label text-foreground"
            placeholder="manual ingest"
          />
        </label>

        {files.length > 0 && (
          <ul className="mt-3 space-y-1">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 font-mono text-caption text-foreground-secondary">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="text-foreground-muted hover:text-danger"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {status && <p className="mt-3 text-caption text-foreground-muted">{status}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            data-testid="canvas-import-run"
            disabled={files.length === 0 || busy}
            onClick={() => void run()}
          >
            Import {files.length > 0 ? `(${files.length})` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

function fileNameLabel(file: File, kind: string): string {
  if (kind === 'audio') return 'audio';
  if (kind === 'image') return 'image';
  if (kind === 'data') return 'data';
  return 'document';
}