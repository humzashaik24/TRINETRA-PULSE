import {
  CheckCircle2,
  CircleDot,
  Clock,
  Eye,
  HelpCircle,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type {
  ExtractionJobStatus,
  ExtractionMethod,
  RelationshipCandidateStatus,
  RelationshipKind,
  ResolutionState,
} from '@trinetra-pulse/types';
import { RESOLUTION_STATE_LABELS } from './format';

// ============================================================
// DOMAIN UI CONFIGURATION
// ============================================================
// Mapping of canonical domain states to badge variants/icons/labels.
// Colors are accents only — text labels always present (no color-only).
// ============================================================

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'entity' | 'network' | 'evidence';

export const RESOLUTION_STATE_CONFIG: Record<
  ResolutionState,
  { variant: BadgeVariant; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  CONFIRMED: { variant: 'success', icon: ShieldCheck, label: RESOLUTION_STATE_LABELS.CONFIRMED },
  PROBABLE: { variant: 'info', icon: CircleDot, label: RESOLUTION_STATE_LABELS.PROBABLE },
  POSSIBLE: { variant: 'warning', icon: HelpCircle, label: RESOLUTION_STATE_LABELS.POSSIBLE },
  REJECTED: { variant: 'danger', icon: XCircle, label: RESOLUTION_STATE_LABELS.REJECTED },
  NEEDS_REVIEW: { variant: 'warning', icon: Eye, label: RESOLUTION_STATE_LABELS.NEEDS_REVIEW },
};

export const EXTRACTION_METHOD_CONFIG: Record<
  ExtractionMethod,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  RULE_BASED: { icon: Scale, label: 'Rule based' },
  STRUCTURED_MAPPING: { icon: CheckCircle2, label: 'Structured mapping' },
  REGEX: { icon: Clock, label: 'Regex' },
  NLP: { icon: Sparkles, label: 'NLP' },
  ML: { icon: Sparkles, label: 'ML model' },
  LLM: { icon: Sparkles, label: 'LLM' },
  MANUAL: { icon: Eye, label: 'Manual' },
  ANALYTICAL: { icon: Sparkles, label: 'Analytical' },
  DATABASE_IMPORT: { icon: CheckCircle2, label: 'Database import' },
  DOCUMENT_PARSE: { icon: CheckCircle2, label: 'Document parse' },
  AI_NLP: { icon: Sparkles, label: 'AI / NLP' },
  AI_CV: { icon: Sparkles, label: 'AI / computer vision' },
  AI_AUDIO: { icon: Sparkles, label: 'AI / audio' },
  NETWORK_ANALYSIS: { icon: Sparkles, label: 'Network analysis' },
  OTHER: { icon: HelpCircle, label: 'Other' },
};

export const JOB_STATUS_CONFIG: Record<
  ExtractionJobStatus,
  { variant: BadgeVariant; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  QUEUED: { variant: 'default', icon: Clock, label: 'Queued' },
  RUNNING: { variant: 'info', icon: Loader2, label: 'Running' },
  EXTRACTING: { variant: 'info', icon: Loader2, label: 'Extracting' },
  NORMALIZING: { variant: 'info', icon: Loader2, label: 'Normalizing' },
  RESOLVING: { variant: 'info', icon: RefreshCw, label: 'Resolving' },
  COMPLETED: { variant: 'success', icon: CheckCircle2, label: 'Completed' },
  FAILED: { variant: 'danger', icon: XCircle, label: 'Failed' },
  CANCELLED: { variant: 'default', icon: XCircle, label: 'Cancelled' },
};

export const RELATIONSHIP_KIND_LABELS: Record<RelationshipKind, string> = {
  USES: 'Uses',
  OWNS: 'Owns',
  KNOWS: 'Knows',
  WORKS_FOR: 'Works for',
  LOCATED_AT: 'Located at',
  OWNS_ACCOUNT: 'Owns account',
  SENT_TRANSACTION: 'Sent transaction',
  INVOLVED_IN: 'Involved in',
  PART_OF: 'Part of',
  SUPPORTED_BY: 'Supported by',
};

export const RELATIONSHIP_STATUS_CONFIG: Record<
  RelationshipCandidateStatus,
  { variant: BadgeVariant; label: string }
> = {
  CANDIDATE: { variant: 'default', label: 'Candidate' },
  PROBABLE: { variant: 'info', label: 'Probable' },
  CONFIRMED: { variant: 'success', label: 'Confirmed' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  NEEDS_REVIEW: { variant: 'warning', label: 'Needs review' },
};