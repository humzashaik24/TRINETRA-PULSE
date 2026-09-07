import {
  FileText,
  FileSearch,
  FileBarChart,
  MessageSquareText,
  ArrowLeftRight,
  Car,
  MapPin,
  Image,
  Video,
  AudioLines,
  ScrollText,
  File,
  type LucideIcon,
} from 'lucide-react';
import type { EvidenceType, EvidenceStatus } from '@trinetra-pulse/types';

// ============================================================
// EVIDENCE DISPLAY CONFIG
// ============================================================

type Icon = LucideIcon;

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'entity' | 'network' | 'evidence' | 'secondary' | 'outline' | 'ai' | 'anomaly';

export const EVIDENCE_TYPE_ICON: Record<EvidenceType, Icon> = {
  DOCUMENT: FileText,
  FIR: FileSearch,
  REPORT: FileBarChart,
  COMMUNICATION: MessageSquareText,
  TRANSACTION: ArrowLeftRight,
  VEHICLE: Car,
  LOCATION: MapPin,
  IMAGE: Image,
  VIDEO: Video,
  AUDIO: AudioLines,
  RECORD: ScrollText,
  OTHER: File,
};

export const EVIDENCE_TYPE_VARIANT: Record<EvidenceType, BadgeVariant> = {
  DOCUMENT: 'default',
  FIR: 'danger',
  REPORT: 'network',
  COMMUNICATION: 'info',
  TRANSACTION: 'anomaly',
  VEHICLE: 'warning',
  LOCATION: 'entity',
  IMAGE: 'ai',
  VIDEO: 'ai',
  AUDIO: 'ai',
  RECORD: 'secondary',
  OTHER: 'secondary',
};

export const EVIDENCE_STATUS_VARIANT: Record<EvidenceStatus, BadgeVariant> = {
  AVAILABLE: 'info',
  PROCESSING: 'info',
  REQUIRES_REVIEW: 'warning',
  VERIFIED: 'success',
  UNVERIFIED: 'secondary',
  ARCHIVED: 'secondary',
};

export const SUPPORT_LEVEL_VARIANT: Record<string, BadgeVariant> = {
  SUPPORTED: 'success',
  PARTIALLY_SUPPORTED: 'warning',
  UNSUPPORTED: 'danger',
};
