'use client';

import { useState, useCallback } from 'react';
import { Database, Upload } from 'lucide-react';
import { useInvestigationStore } from '@/state/investigation.store';
import { UploadZone } from '@/components/data-intelligence/upload-zone';
import { DatasetTable } from '@/components/data-intelligence/dataset-table';
import { ChartCard } from '@trinetra-pulse/ui';

export function InvestigationDataTab() {
  const investigationId = useInvestigationStore((s) => s.data.investigation?.id);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!investigationId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Database className="h-4 w-4" />
        <span>Import and manage investigation datasets</span>
      </div>

      <ChartCard
        title="Upload Data"
        subtitle="Import CSV files into this investigation"
      >
        <UploadZone
          investigationId={investigationId}
          onUploadComplete={handleUploadComplete}
        />
      </ChartCard>

      <ChartCard
        title="Datasets"
        subtitle="Datasets imported into this investigation"
      >
        <DatasetTable
          investigationId={investigationId}
          refreshKey={refreshKey}
        />
      </ChartCard>
    </div>
  );
}
