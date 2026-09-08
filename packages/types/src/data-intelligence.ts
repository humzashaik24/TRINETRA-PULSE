import type { EntityType } from './entity';

// ============================================================
// DATA SOURCE
// ============================================================

export type DataSourceCategory = 'document' | 'structured' | 'investigation';

export type DocumentFormat = 'pdf' | 'txt' | 'docx';
export type StructuredFormat = 'csv' | 'xlsx' | 'json';
export type InvestigationFormat = 'fir_records' | 'case_records' | 'communication_records' | 'transaction_records' | 'vehicle_records' | 'location_records' | 'event_records' | 'custom';

export type FileFormat = DocumentFormat | StructuredFormat | InvestigationFormat;

export interface DataSource {
  id: string;
  name: string;
  description: string;
  category: DataSourceCategory;
  format: FileFormat;
  icon: string;
  acceptedExtensions: string[];
  maxFileSize: number; // bytes
}

// ============================================================
// DATASET
// ============================================================

export type DatasetStatus = 'uploading' | 'validating' | 'processing' | 'ready' | 'failed' | 'archived';

export interface Dataset {
  id: string;
  name: string;
  description: string;
  sourceId: string;
  sourceName: string;
  format: FileFormat;
  category: DataSourceCategory;
  status: DatasetStatus;
  recordCount: number;
  fileSize: number;
  fileName: string;
  qualityScore: number; // 0-1
  qualityLevel: QualityLevel;
  warnings: number;
  errors: number;
  duplicates: number;
  createdAt: string;
  updatedAt: string;
  lastIngestionId?: string;
}

// ============================================================
// DATASET FILE
// ============================================================

export type DatasetFileStatus = 'pending' | 'validating' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface DatasetFile {
  id: string;
  datasetId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: DatasetFileStatus;
  progress: number; // 0-100
  error?: string;
  uploadedAt?: string;
}

// ============================================================
// INGESTION JOB
// ============================================================

export type IngestionStatus = 'queued' | 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IngestionJob {
  id: string;
  datasetId: string;
  datasetName: string;
  status: IngestionStatus;
  startedAt: string;
  completedAt?: string;
  progress: number; // 0-100
  recordsProcessed: number;
  recordsAccepted: number;
  recordsRejected: number;
  warnings: number;
  errors: number;
  source: string;
  user?: string;
}

// ============================================================
// DATA QUALITY
// ============================================================

export type QualityLevel = 'excellent' | 'good' | 'needs_review' | 'poor';

export interface DataQualitySummary {
  datasetId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warnings: number;
  duplicates: number;
  missingFields: number;
  normalizedFields: number;
  qualityLevel: QualityLevel;
  qualityScore: number; // 0-1
  issues: DataValidationIssue[];
}

export interface DataValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  field: string;
  row?: number;
  message: string;
  suggestedAction?: string;
  originalValue?: string;
}

// ============================================================
// DATA PREVIEW
// ============================================================

export interface DataPreview {
  datasetId: string;
  columns: DataColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  sampleSize: number;
}

export interface DataColumn {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
  example: string;
  nullPercentage: number;
  uniquePercentage: number;
  mappedField?: string;
}

// ============================================================
// DATA MAPPING
// ============================================================

export interface DataMapping {
  datasetId: string;
  mappings: ColumnMapping[];
  createdAt: string;
  updatedAt: string;
}

export interface ColumnMapping {
  id: string;
  sourceColumn: string;
  targetField: string;
  targetType: EntityType | 'relationship' | 'event' | 'other';
  confidence: number;
  isAutoMapped: boolean;
  normalization?: NormalizationRule;
}

export interface NormalizationRule {
  type: 'name' | 'phone' | 'vehicle' | 'location' | 'datetime' | 'account' | 'custom';
  originalValue: string;
  normalizedValue: string;
  method: string;
}

// ============================================================
// DATA PROCESSING PIPELINE
// ============================================================

export type PipelineStage = 'upload' | 'validate' | 'parse' | 'normalize' | 'quality_check' | 'store' | 'queue_extraction';

export interface PipelineState {
  currentStage: PipelineStage;
  stages: PipelineStageProgress[];
  startedAt: string;
  completedAt?: string;
}

export interface PipelineStageProgress {
  stage: PipelineStage;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  progress: number;
  message?: string;
}

// ============================================================
// UPLOAD STATE
// ============================================================

export type UploadState = 'idle' | 'dragging' | 'selected' | 'validating' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  extension: string;
  state: UploadState;
  progress: number;
  error?: string;
  validationErrors?: string[];
  result?: string;
}

// ============================================================
// CONNECTOR ARCHITECTURE
// ============================================================

export interface DataSourceConnector {
  id: string;
  name: string;
  type: 'file' | 'api' | 'database';
  status: 'available' | 'connected' | 'error';
  validate(config: Record<string, unknown>): Promise<ValidationResult>;
  connect(config: Record<string, unknown>): Promise<boolean>;
  fetch?(config: Record<string, unknown>): Promise<unknown>;
  preview?(config: Record<string, unknown>): Promise<DataPreview>;
  sync?(config: Record<string, unknown>): Promise<IngestionJob>;
  disconnect(): Promise<void>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================
// API CONTRACTS
// ============================================================

export interface DatasetListParams {
  page?: number;
  page_size?: number;
  status?: DatasetStatus;
  category?: DataSourceCategory;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'record_count';
  sort_order?: 'asc' | 'desc';
}

export interface IngestionJobListParams {
  page?: number;
  page_size?: number;
  status?: IngestionStatus;
  dataset_id?: string;
}
