'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button, Badge } from '@trinetra-pulse/ui';
import { staggerChildVariants, Stagger } from '@trinetra-pulse/ui';
import type { UploadFile } from '@trinetra-pulse/types';
import type { ColumnMappingSuggestion } from '@/lib/csv-mapping';
import { parseCsvPreview } from '@/lib/csv-parse';
import { autoSuggestMappings, allHeadersRecognized } from '@/lib/csv-mapping';
import { CsvMappingDialog } from '@/components/data-intelligence/csv-mapping-dialog';
import { uploadDataset } from '@/lib/api/investigations';
import { isMockData } from '@/lib/api/config';

const ACCEPTED_TYPES = ['.csv', '.xlsx', '.json', '.pdf', '.txt', '.docx'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  const ext = name.lastIndexOf('.');
  return ext >= 0 ? name.slice(ext).toLowerCase() : '';
}

function validateFile(file: File): string[] {
  const errors: string[] = [];
  const ext = getFileExtension(file.name);
  if (!ACCEPTED_TYPES.includes(ext)) {
    errors.push(`File type "${ext || 'unknown'}" is not supported. Accepted: ${ACCEPTED_TYPES.join(', ')}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds the ${formatFileSize(MAX_FILE_SIZE)} limit.`);
  }
  if (file.name.length > 255) {
    errors.push('Filename is too long (max 255 characters).');
  }
  return errors;
}

const STATE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  idle: { icon: <Upload className="h-5 w-5" />, color: 'text-foreground-muted', label: 'Ready' },
  dragging: { icon: <Upload className="h-5 w-5" />, color: 'text-brand', label: 'Drop files' },
  selected: { icon: <FileText className="h-5 w-5" />, color: 'text-info', label: 'Selected' },
  validating: { icon: <Loader2 className="h-5 w-5 animate-spin" />, color: 'text-warning', label: 'Validating' },
  uploading: { icon: <Loader2 className="h-5 w-5 animate-spin" />, color: 'text-brand', label: 'Uploading' },
  processing: { icon: <Loader2 className="h-5 w-5 animate-spin" />, color: 'text-ai', label: 'Processing' },
  completed: { icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-success', label: 'Complete' },
  failed: { icon: <AlertCircle className="h-5 w-5" />, color: 'text-danger', label: 'Failed' },
  cancelled: { icon: <X className="h-5 w-5" />, color: 'text-foreground-muted', label: 'Cancelled' },
};

interface FileItemProps {
  uploadFile: UploadFile;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

function FileItem({ uploadFile, onRemove, onRetry }: FileItemProps) {
  const config = STATE_CONFIG[uploadFile.state];
  const hasErrors = uploadFile.validationErrors && uploadFile.validationErrors.length > 0;

  return (
    <motion.div
      variants={staggerChildVariants}
      layout
      className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
    >
      <span className={config.color}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{uploadFile.name}</span>
          <Badge variant={uploadFile.state === 'completed' ? 'success' : uploadFile.state === 'failed' ? 'danger' : 'default'} size="sm">
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-foreground-muted">{formatFileSize(uploadFile.size)}</span>
          <span className="text-[10px] text-foreground-muted/40" aria-hidden="true">|</span>
          <span className="text-[10px] text-foreground-muted uppercase">{uploadFile.extension || 'file'}</span>
        </div>
        {(uploadFile.state === 'uploading' || uploadFile.state === 'processing') && (
          <div className="mt-2">
            <div className="h-1 w-full rounded-full bg-surface-active overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-brand"
                initial={{ width: 0 }}
                animate={{ width: `${uploadFile.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-foreground-muted mt-1">{uploadFile.progress}%</span>
          </div>
        )}
        {hasErrors && (
          <div className="mt-1.5 space-y-0.5">
            {uploadFile.validationErrors!.map((err, i) => (
              <p key={i} className="text-[10px] text-danger">{err}</p>
            ))}
          </div>
        )}
        {uploadFile.error && (
          <p className="text-[10px] text-danger mt-1">{uploadFile.error}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {uploadFile.state === 'failed' && (
          <Button variant="ghost" size="sm" onClick={() => onRetry(uploadFile.id)} aria-label={`Retry upload of ${uploadFile.name}`}>
            Retry
          </Button>
        )}
        {uploadFile.state !== 'uploading' && uploadFile.state !== 'processing' && uploadFile.state !== 'validating' && (
          <button
            onClick={() => onRemove(uploadFile.id)}
            className="p-1 rounded text-foreground-muted hover:text-danger hover:bg-danger-subtle tp-transition"
            aria-label={`Remove ${uploadFile.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface UploadZoneProps {
  investigationId?: string;
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: () => void;
}

interface MappingQueueItem {
  uploadFile: UploadFile;
  suggestions: ColumnMappingSuggestion[];
  previewRows: string[][];
}

export function UploadZone({ investigationId, onFilesSelected, onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  // CSV mapping state
  const [mappingQueue, setMappingQueue] = useState<MappingQueueItem[]>([]);
  const [currentMapping, setCurrentMapping] = useState<MappingQueueItem | null>(null);
  const confirmedMappingsRef = useRef<Map<string, ColumnMappingSuggestion[]>>(new Map());

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      extension: getFileExtension(file.name),
      state: 'validating' as const,
      progress: 0,
    }));

    // Validate
    setTimeout(() => {
      setFiles((prev) => {
        const updated = prev.map((f) => {
          const newFile = newFiles.find((nf) => nf.id === f.id);
          if (!newFile) return f;
          const errors = validateFile(newFile.file);
          if (errors.length > 0) {
            return { ...f, state: 'failed' as const, validationErrors: errors };
          }
          return { ...f, state: 'selected' as const };
        });
        return updated;
      });
    }, 500);

    setFiles((prev) => [...prev, ...newFiles]);
    onFilesSelected?.(Array.from(fileList));
  }, [onFilesSelected]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const retryFile = useCallback((id: string) => {
    setFiles((prev) => prev.map((f) =>
      f.id === id ? { ...f, state: 'selected' as const, progress: 0, error: undefined, validationErrors: undefined } : f
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.state !== 'completed'));
  }, []);

  // Proceed with actual uploads after all CSV mappings are confirmed
  const proceedWithUpload = useCallback(async (
    selectedFiles: UploadFile[],
    invId: string,
  ) => {
    // Mark all selected as uploading
    setFiles((prev) => prev.map((f) =>
      f.state === 'selected' ? { ...f, state: 'uploading' as const, progress: 0 } : f
    ));

    for (const uploadFile of selectedFiles) {
      try {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20 + 5;
          if (progress >= 90) {
            clearInterval(progressInterval);
            progress = 90;
          }
          setFiles((prev) => prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress: Math.min(Math.round(progress), 90) } : f
          ));
        }, 300);

        if (isMockData()) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          clearInterval(progressInterval);
          setFiles((prev) => prev.map((f) =>
            f.id === uploadFile.id ? { ...f, state: 'completed' as const, progress: 100 } : f
          ));
        } else {
          await uploadDataset(uploadFile.file, invId, {
            name: uploadFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
          });
          clearInterval(progressInterval);
          setFiles((prev) => prev.map((f) =>
            f.id === uploadFile.id ? { ...f, state: 'completed' as const, progress: 100 } : f
          ));
          onUploadComplete?.();
        }
      } catch (err) {
        setFiles((prev) => prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, state: 'failed' as const, error: String(err), progress: 0 }
            : f
        ));
      }
    }
  }, [onUploadComplete]);

  const handleUpload = useCallback(async () => {
    if (!investigationId) return;

    const selectedFiles = files.filter((f) => f.state === 'selected');
    if (selectedFiles.length === 0) return;

    // Collect CSV files that need mapping review
    const queue: MappingQueueItem[] = [];
    for (const uf of selectedFiles) {
      if (uf.extension !== '.csv') continue;
      try {
        const text = await uf.file.text();
        const { headers, previewRows } = parseCsvPreview(text, 5);
        if (headers.length === 0) continue;
        const suggestions = autoSuggestMappings(headers);
        if (!allHeadersRecognized(suggestions)) {
          queue.push({ uploadFile: uf, suggestions, previewRows });
        }
      } catch {
        // CSV parse failed — skip mapping, upload will proceed as-is
      }
    }

    if (queue.length > 0) {
      // Show mapping dialog for the first file needing review
      setMappingQueue(queue.slice(1));
      setCurrentMapping(queue[0]);
    } else {
      // Fast path: all CSVs recognized, proceed directly
      proceedWithUpload(selectedFiles, investigationId);
    }
  }, [files, investigationId, proceedWithUpload]);

  // Called when user confirms mapping for the current file
  const handleMappingConfirm = useCallback((confirmedMappings: ColumnMappingSuggestion[]) => {
    if (!currentMapping) return;
    confirmedMappingsRef.current.set(currentMapping.uploadFile.id, confirmedMappings);

    if (mappingQueue.length > 0) {
      // More files need mapping
      setCurrentMapping(mappingQueue[0]);
      setMappingQueue((q) => q.slice(1));
    } else {
      // All mappings confirmed — proceed with upload
      setCurrentMapping(null);
      const selectedFiles = files.filter((f) => f.state === 'selected');
      if (investigationId) {
        proceedWithUpload(selectedFiles, investigationId);
      }
    }
  }, [currentMapping, mappingQueue, files, investigationId, proceedWithUpload]);

  const handleMappingClose = useCallback(() => {
    setCurrentMapping(null);
    setMappingQueue([]);
  }, []);

  useEffect(() => {
    return () => { dragCountRef.current = 0; };
  }, []);

  const selectedCount = files.filter((f) => f.state === 'selected').length;
  const completedCount = files.filter((f) => f.state === 'completed').length;

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Upload files"
        tabIndex={-1}
      />

      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-label="Upload zone. Click or drag files to upload."
        className={`relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer tp-transition ${
          isDragging
            ? 'border-brand bg-brand-subtle/30'
            : 'border-border hover:border-foreground-muted/50 hover:bg-surface-hover'
        }`}
        animate={isDragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center"
            >
              <Upload className="h-10 w-10 text-brand mb-3" />
              <p className="text-subheading text-brand">Drop files here</p>
              <p className="text-body-sm text-foreground-muted mt-1">Release to begin upload</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center"
            >
              <div className="h-12 w-12 rounded-xl bg-surface-elevated flex items-center justify-center mb-3">
                <Upload className="h-6 w-6 text-foreground-muted" />
              </div>
              <p className="text-subheading text-foreground">Drag and drop files here</p>
              <p className="text-body-sm text-foreground-muted mt-1">
                or <span className="text-brand font-medium">browse</span> to select files
              </p>
              <p className="text-caption text-foreground-muted/60 mt-3">
                Supports CSV, XLSX, JSON, PDF, TXT, DOCX &middot; Max {formatFileSize(MAX_FILE_SIZE)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption text-foreground-muted uppercase tracking-wider font-medium">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCompleted}>
                  Clear completed
                </Button>
              )}
              {selectedCount > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpload}
                  disabled={!investigationId}
                  title={!investigationId ? 'Select an investigation first' : undefined}
                >
                  Upload {selectedCount} file{selectedCount !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>

          <Stagger staggerInterval={0.05} className="space-y-2">
            {files.map((f) => (
              <FileItem key={f.id} uploadFile={f} onRemove={removeFile} onRetry={retryFile} />
            ))}
          </Stagger>
        </div>
      )}

      {/* CSV Column Mapping Dialog */}
      {currentMapping && (
        <CsvMappingDialog
          open={!!currentMapping}
          onClose={handleMappingClose}
          onConfirm={handleMappingConfirm}
          fileName={currentMapping.uploadFile.name}
          suggestions={currentMapping.suggestions}
          previewRows={currentMapping.previewRows}
        />
      )}
    </div>
  );
}
