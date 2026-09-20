'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../canvas-store';
import { KIND_TO_TOKEN, type CanvasNode, type CanvasNodeKind, type CanvasOrigin } from '../canvas-types';

// ============================================================
// KNOWLEDGE CANVAS — CARD RENDERING
// ============================================================

const KIND_LABELS: Record<CanvasNodeKind, string> = {
  entity: 'ENTITY',
  evidence: 'EVIDENCE',
  finding: 'FINDING',
  event: 'EVENT',
  note: 'NOTE',
  source: 'SOURCE',
  concept: 'CONCEPT',
};

const ORIGIN_LABELS: Record<CanvasOrigin, string> = {
  system: 'system',
  user: 'you',
  ai: 'AI',
  cdr: 'CDR',
  file: 'file',
  whisper: 'whisper',
};

export function CanvasNodeComponent({ data, selected }: NodeProps<CanvasNode>) {
  const focusNode = useCanvasStore((s) => s.focusNode);
  const {
    kind,
    label,
    summary,
    origin,
    entityType,
    evidenceType,
    confidence,
    transcript,
    degree,
    focusedCenter,
    dimmed,
    severity,
    integrityStatus,
    fileName,
    imageUrl,
  } = data ?? {};

  const token = kind === 'entity' && entityType
    ? KIND_TO_TOKEN[entityType]
    : KIND_TO_TOKEN[kind];
  const accent = `hsl(var(--color-${token}))`;

  const isDimmed = Boolean(dimmed);
  const isFocused = Boolean(focusedCenter);

  const onFocusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    focusNode(data.refId ?? null);
  };

  return (
    <div
      data-testid={`canvas-node-${kind}`}
      data-selected={selected ? 'true' : 'false'}
      className={
        'w-72 rounded-xl border bg-surface text-foreground shadow-md transition-all duration-200 overflow-hidden group ' +
        (isFocused
          ? 'border-brand ring-4 ring-brand/30 shadow-2xl scale-[1.03] z-30'
          : selected
            ? 'border-brand ring-2 ring-brand/40 z-20 shadow-lg'
            : isDimmed
              ? 'border-border opacity-30 grayscale hover:opacity-90 hover:grayscale-0'
              : 'border-border hover:border-border-strong hover:shadow-lg')
      }
    >
      <Handle type="target" position={Position.Top} className="h-2.5 w-2.5 !bg-border-strong border-2 border-surface" />

      {/* Card Header Band */}
      <div
        className={
          'flex items-center justify-between px-3.5 py-2 text-xs font-mono border-b ' +
          (kind === 'entity'
            ? 'bg-surface-elevated border-border-subtle'
            : kind === 'evidence'
              ? 'bg-blue-950/40 border-blue-900/50 text-blue-300'
              : kind === 'finding'
                ? 'bg-amber-950/40 border-amber-900/50 text-amber-300'
                : kind === 'note'
                  ? 'bg-yellow-950/40 border-yellow-900/50 text-yellow-300'
                  : 'bg-surface-elevated/80 border-border-subtle')
        }
      >
        <div className="flex items-center gap-1.5 truncate">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-foreground-secondary truncate">
            {kind === 'entity' && entityType
              ? entityType
              : kind === 'evidence' && evidenceType
                ? evidenceType
                : KIND_LABELS[kind]}
          </span>
        </div>
        <span className="text-[10px] uppercase font-mono text-foreground-muted shrink-0">
          {ORIGIN_LABELS[origin]}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm text-foreground leading-snug break-words">
            {label}
          </h3>
          {isFocused && (
            <span className="shrink-0 rounded bg-brand/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand uppercase tracking-wider">
              Focus Hub
            </span>
          )}
        </div>

        {/* Summary / Description */}
        {typeof summary === 'string' && summary.length > 0 && (
          <p className="line-clamp-2 text-xs text-foreground-muted leading-relaxed">
            {summary}
          </p>
        )}

        {/* 1. ENTITY CARD SPECIFICS */}
        {kind === 'entity' && (
          <div className="pt-1.5 border-t border-border-subtle/60 flex items-center justify-between text-xs font-mono text-foreground-secondary">
            <div className="flex items-center gap-2">
              {typeof confidence === 'number' && (
                <span className="text-emerald-400 font-medium">
                  {Math.round(confidence * 100)}% conf
                </span>
              )}
              {typeof degree === 'number' && (
                <span className="text-foreground-muted">
                  {degree} conn{degree === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {data.refId && (
              <button
                type="button"
                onClick={onFocusClick}
                className="text-[10px] font-semibold text-brand hover:underline uppercase tracking-wider"
              >
                Focus
              </button>
            )}
          </div>
        )}

        {/* 2. EVIDENCE CARD SPECIFICS */}
        {kind === 'evidence' && (
          <div className="pt-1.5 border-t border-border-subtle/60 flex items-center justify-between text-xs font-mono">
            <span className="text-sky-400 text-[11px] font-medium flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400"></span>
              {integrityStatus ?? 'Verified Integrity'}
            </span>
            {transcript && (
              <span className="text-[10px] text-foreground-muted truncate">
                transcript
              </span>
            )}
          </div>
        )}

        {/* 3. FINDING CARD SPECIFICS */}
        {kind === 'finding' && (
          <div className="pt-1.5 border-t border-border-subtle/60 flex items-center justify-between text-xs font-mono">
            <span
              className={
                'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ' +
                (severity === 'high' || severity === 'critical'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                  : severity === 'medium'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                    : 'bg-blue-950/60 text-blue-300 border border-blue-800/40')
              }
            >
              {severity ? severity.toUpperCase() : 'HIGH'}
            </span>
            {typeof confidence === 'number' && (
              <span className="text-foreground-muted text-[11px]">
                {Math.round(confidence * 100)}% conf
              </span>
            )}
          </div>
        )}

        {/* 4. NOTE CARD SPECIFICS */}
        {kind === 'note' && (
          <div className="pt-1 border-t border-border-subtle/40 text-[10px] font-mono text-amber-400/80 uppercase">
            Investigator Annotation
          </div>
        )}

        {/* SOURCE / FILE CARD SPECIFICS */}
        {kind === 'source' && fileName && (
          <div className="pt-1 border-t border-border-subtle/60 font-mono text-[11px] text-foreground-muted break-all">
            {fileName}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="mt-1.5 max-h-24 rounded border border-border" />
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="h-2.5 w-2.5 !bg-border-strong border-2 border-surface" />
    </div>
  );
}