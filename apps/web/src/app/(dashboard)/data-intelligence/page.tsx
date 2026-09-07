'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/state/app.store';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@trinetra-pulse/ui';
import { ChartCard } from '@trinetra-pulse/ui';
import {
  DataIntelligenceHeader,
  UploadZone,
  DataSourceCards,
  DatasetTable,
  DatasetPreview,
  DataMappingView,
  DataQualityView,
  IngestionHistory,
} from '@/components/data-intelligence';

const DEFAULT_INVESTIGATION_ID = '6c887c98-939a-50ce-ac27-f58376941de2';

export default function DataIntelligencePage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const [activeView, setActiveView] = useState<'overview' | 'upload' | 'datasets' | 'ingestion'>('overview');
  const [previewDataset, setPreviewDataset] = useState<{ id: string; name: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setContextLabel('Data Intelligence');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DataIntelligenceHeader />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="flex items-center gap-2"
      >
        <Button
          variant={activeView === 'upload' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveView(activeView === 'upload' ? 'overview' : 'upload')}
        >
          {activeView === 'upload' ? 'Hide Upload' : 'Upload Data'}
        </Button>
        <Button
          variant={activeView === 'datasets' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveView(activeView === 'datasets' ? 'overview' : 'datasets')}
        >
          {activeView === 'datasets' ? 'Hide Datasets' : 'View Datasets'}
        </Button>
        <Button
          variant={activeView === 'ingestion' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveView(activeView === 'ingestion' ? 'overview' : 'ingestion')}
        >
          {activeView === 'ingestion' ? 'Hide History' : 'Ingestion History'}
        </Button>
      </motion.div>

      {/* Upload Zone */}
      <AnimatePresence>
        {activeView === 'upload' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChartCard title="Upload Data" subtitle="Drag and drop files or browse to select">
              <UploadZone
                investigationId={DEFAULT_INVESTIGATION_ID}
                onUploadComplete={handleUploadComplete}
              />
            </ChartCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Sources */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <ChartCard title="Data Sources" subtitle="Supported source types for investigation data">
          <DataSourceCards />
        </ChartCard>
      </motion.div>

      {/* Dataset Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <ChartCard
          title="Datasets"
          subtitle="All imported investigation datasets"
          action={
            <Button variant="ghost" size="sm" onClick={() => setActiveView('datasets')}>
              {activeView === 'datasets' ? 'Collapse' : 'Expand'}
            </Button>
          }
        >
          <DatasetTable
            investigationId={DEFAULT_INVESTIGATION_ID}
            refreshKey={refreshKey}
            onView={(id) => {
              setPreviewDataset({ id, name: 'Dataset Detail' });
              setActiveView('datasets');
            }}
            onPreview={(id) => {
              setPreviewDataset({ id, name: 'Dataset Preview' });
            }}
          />
        </ChartCard>
      </motion.div>

      {/* Dataset Preview */}
      <AnimatePresence>
        {previewDataset && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <DatasetPreview
              datasetId={previewDataset.id}
              datasetName={previewDataset.name}
              onClose={() => setPreviewDataset(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Quality + Mapping */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <ChartCard title="Data Quality" subtitle="Quality analysis for the most recent dataset">
            <DataQualityView datasetId="ds-001" datasetName="FIR Records - Pune District" />
          </ChartCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <ChartCard title="Data Mapping" subtitle="Column-to-entity field mappings">
            <DataMappingView datasetId="ds-001" datasetName="FIR Records - Pune District" />
          </ChartCard>
        </motion.div>
      </div>

      {/* Ingestion History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
      >
        <ChartCard title="Ingestion History" subtitle="Recent processing jobs and their outcomes">
          <IngestionHistory refreshKey={refreshKey} />
        </ChartCard>
      </motion.div>
    </div>
  );
}
