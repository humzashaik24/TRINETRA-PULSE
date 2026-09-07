'use client';

import React, { useMemo } from 'react';
import { Clock, MapPin, Phone, Car, Landmark, MessageSquare, FileText, Video, Camera, FileAudio, Circle } from 'lucide-react';
import { Badge } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { useEvidenceStore } from '@/state/evidence.store';
import { EVIDENCE_TYPE_LABELS, EVIDENCE_STATUS_LABELS, formatDate, EVIDENCE_STATUS_VARIANT } from '@/lib/format';
import { EVIDENCE_TYPE_VARIANT } from '@/components/evidence/evidence-domain';
import type { EvidenceType } from '@trinetra-pulse/types';

// ============================================================
// TIMELINE EVIDENCE MODE (Phase 12)
// ============================================================
// Chronological view of evidence, grouped by day. Each item's
// provenance and links stay intact; "unsupported" events simply
// have no attached evidence yet.

function TypeGlyph({ type }: { type: EvidenceType }) {
  switch (type) {
    case 'COMMUNICATION': return <MessageSquare className="h-3.5 w-3.5" />;
    case 'TRANSACTION': return <Landmark className="h-3.5 w-3.5" />;
    case 'VEHICLE': return <Car className="h-3.5 w-3.5" />;
    case 'LOCATION': return <MapPin className="h-3.5 w-3.5" />;
    case 'IMAGE': return <Camera className="h-3.5 w-3.5" />;
    case 'VIDEO': return <Video className="h-3.5 w-3.5" />;
    case 'AUDIO': return <FileAudio className="h-3.5 w-3.5" />;
    case 'FIR':
    case 'DOCUMENT':
    case 'REPORT':
    case 'RECORD':
    default: return <FileText className="h-3.5 w-3.5" />;
  }
}

export function TimelineEvidenceMode({
  onSelectEvidence,
}: {
  onSelectEvidence?: (id: string) => void;
}) {
  const items = useEvidenceStore((s) => s.items);
  const selectItem = useEvidenceStore((s) => s.selectItem);
  const handleSelect = onSelectEvidence ?? selectItem;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const day = formatDate(item.observedAt);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  if (grouped.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground-muted">
        No evidence to display on the timeline.
      </div>
    );
  }

  return (
    <div className="relative" data-testid="evidence-timeline">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
      <div className="space-y-5">
        {grouped.map(([day, dayItems]) => (
          <div key={day} className="relative pl-6">
            <span className="absolute left-0 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-evidence/50 bg-evidence-subtle">
              <Circle className="h-1.5 w-1.5 text-evidence" />
            </span>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">{day}</p>
            <div className="space-y-2">
              {dayItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-evidence/50 tp-transition"
                  data-testid={`timeline-evidence-${item.id}`}
                >
                  <span className="mt-0.5 rounded-md border p-1.5">
                    <span className="text-foreground-muted">
                      <TypeGlyph type={item.evidenceType} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge size="sm" variant={EVIDENCE_TYPE_VARIANT[item.evidenceType]}>
                        {EVIDENCE_TYPE_LABELS[item.evidenceType]}
                      </Badge>
                      <Badge size="sm" variant={EVIDENCE_STATUS_VARIANT[item.status]}>
                        {EVIDENCE_STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-foreground-muted">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDate(item.observedAt)} · {item.observedAt.split('T')[1]?.slice(0, 5) ?? ''} · {item.sourceName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
