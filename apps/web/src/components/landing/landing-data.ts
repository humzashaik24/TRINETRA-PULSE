import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  Database,
  Fingerprint,
  FolderSearch,
  GitBranch,
  Link2,
  Lock,
  MessageSquare,
  Mic,
  Network,
  PanelsTopLeft,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';

export interface LandingCapability {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  accent: string;
  footnote?: string;
}

const CSS_VAR = (name: string): string => `hsl(var(--${name}))`;

/**
 * Shared accent colors mapped to the Trinetra Pulse intelligence domain
 * palette (globals.css). Chip frames stay neutral; the icon + feature
 * checkmarks use the accent value.
 */
export const CAPABILITY_ACCENTS = {
  network: CSS_VAR('--color-network'),
  entity: CSS_VAR('--color-entity'),
  evidence: CSS_VAR('--color-evidence'),
  ai: CSS_VAR('--color-ai'),
  anomaly: CSS_VAR('--color-anomaly'),
  organization: CSS_VAR('--color-entity-organization'),
  event: CSS_VAR('--color-entity-event'),
} as const;

export const CAPABILITIES: LandingCapability[] = [
  {
    id: 'network-intelligence',
    eyebrow: 'Network Intelligence',
    title: 'Network Intelligence',
    description:
      'Entity and relationship graphs that reveal how people, organizations and communications connect across the investigation.',
    features: ['Centrality', 'Communities', 'Bridges', 'Hubs', 'Temporal analytics'],
    icon: Network,
    accent: CAPABILITY_ACCENTS.network,
  },
  {
    id: 'investigation-intelligence',
    eyebrow: 'Investigation Intelligence',
    title: 'Investigation Intelligence',
    description:
      'Turn fragmented records into decision-ready structure for the investigating team.',
    features: ['Patterns', 'Findings', 'Investigation directions', 'Timeline'],
    icon: FolderSearch,
    accent: CAPABILITY_ACCENTS.entity,
  },
  {
    id: 'evidence-security',
    eyebrow: 'Evidence Security',
    title: 'Evidence Security',
    description:
      'Evidence handling built on integrity, custody and access controls from intake to analysis.',
    features: ['SHA-256 integrity', 'Chain of custody', 'RBAC', 'Investigation isolation'],
    icon: ShieldCheck,
    accent: CAPABILITY_ACCENTS.evidence,
  },
  {
    id: 'provenance',
    eyebrow: 'Blockchain Provenance',
    title: 'Blockchain Provenance',
    description:
      'Tamper-evident provenance anchoring so evidence verification is independently auditable.',
    features: ['Tamper-evident provenance anchoring', 'Evidence verification'],
    icon: Boxes,
    accent: CAPABILITY_ACCENTS.network,
    footnote: 'Anchor evidence provenance, not claims of truth or guilt.',
  },
  {
    id: 'local-whisper',
    eyebrow: 'Local Whisper',
    title: 'Local Whisper',
    description:
      'On-device audio transcription that keeps recordings and transcripts inside the workspace.',
    features: ['Local processing', 'Checksum-aware workflow'],
    icon: Mic,
    accent: CAPABILITY_ACCENTS.ai,
  },
  {
    id: 'knowledge-canvas',
    eyebrow: 'Knowledge Canvas',
    title: 'Knowledge Canvas',
    description:
      'A visual workspace that connects evidence and entities into one investigation picture.',
    features: ['Evidence cards', 'Entities', 'Relationships', 'Findings', 'Patterns', 'Timeline'],
    icon: PanelsTopLeft,
    accent: CAPABILITY_ACCENTS.anomaly,
  },
  {
    id: 'grounded-ai',
    eyebrow: 'Grounded AI Assistant',
    title: 'Grounded AI Assistant',
    description:
      'Investigation-specific answers that stay anchored to the records in the case.',
    features: ['Source facts', 'Analytical inference', 'Investigative leads', 'Supporting sources'],
    icon: Sparkles,
    accent: CAPABILITY_ACCENTS.event,
  },
  {
    id: 'analytics-reports',
    eyebrow: 'Analytics & Reports',
    title: 'Analytics & Reports',
    description:
      'Structured analysis that turns the connected investigation into communicable findings.',
    features: ['Network analytics', 'Pattern analysis', 'Evidence summaries', 'Investigation reports'],
    icon: BarChart3,
    accent: CAPABILITY_ACCENTS.organization,
  },
];

export interface LandingTrustItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export const TRUST_ITEMS: LandingTrustItem[] = [
  {
    id: 'investigator-controlled',
    title: 'Investigator Controlled',
    description: 'Trinetra Pulse assists investigators but does not decide guilt.',
    icon: UserCheck,
    accent: CAPABILITY_ACCENTS.entity,
  },
  {
    id: 'evidence-integrity',
    title: 'Evidence Integrity',
    description: 'SHA-256 hashing and custody records provide tamper-evident integrity tracking.',
    icon: Fingerprint,
    accent: CAPABILITY_ACCENTS.evidence,
  },
  {
    id: 'provenance',
    title: 'Provenance',
    description: 'Blockchain anchoring provides an additional provenance verification layer.',
    icon: Link2,
    accent: CAPABILITY_ACCENTS.network,
  },
  {
    id: 'grounded-ai',
    title: 'Grounded AI',
    description: 'AI responses are grounded in the investigation records they reference.',
    icon: MessageSquare,
    accent: CAPABILITY_ACCENTS.ai,
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Sensitive evidence and credentials remain server-side and appropriately protected.',
    icon: Lock,
    accent: CAPABILITY_ACCENTS.anomaly,
  },
];

export interface LandingFlowStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const CAPABILITY_FLOW: LandingFlowStep[] = [
  {
    id: 'fragmented-data',
    title: 'Fragmented Data',
    description: 'Records start scattered across sources and systems.',
    icon: Database,
  },
  {
    id: 'entity-intelligence',
    title: 'Entity & Relationship Intelligence',
    description: 'Entities are resolved and connections are surfaced.',
    icon: Users,
  },
  {
    id: 'investigation-graph',
    title: 'Investigation Graph',
    description: 'The connected picture is assembled into a navigable graph.',
    icon: Network,
  },
  {
    id: 'evidence-integrity',
    title: 'Evidence Integrity',
    description: 'Integrity, custody and provenance are tracked throughout.',
    icon: ShieldCheck,
  },
  {
    id: 'patterns-findings',
    title: 'Patterns & Findings',
    description: 'Repetition and anomaly are turned into documented findings.',
    icon: GitBranch,
  },
  {
    id: 'investigation-directions',
    title: 'Investigation Directions',
    description: 'Findings point to the next lines of inquiry.',
    icon: Target,
  },
  {
    id: 'knowledge-canvas',
    title: 'Knowledge Canvas',
    description: 'Evidence and entities are explored in a visual workspace.',
    icon: PanelsTopLeft,
  },
  {
    id: 'grounded-ai',
    title: 'Grounded AI',
    description: 'AI answers are anchored to the investigation records.',
    icon: Sparkles,
  },
  {
    id: 'investigator-decision',
    title: 'Investigator Decision',
    description: 'The investigator owns the conclusion. The platform assists.',
    icon: Scale,
  },
];

/** Abstract node types rendered in the stylized investigation preview. */
export type LandingNodeType =
  | 'person'
  | 'organization'
  | 'phone'
  | 'account'
  | 'evidence'
  | 'finding';

export interface LandingGraphNode {
  id: string;
  type: LandingNodeType;
  cx: number;
  cy: number;
}

export interface LandingGraphEdge {
  id: string;
  source: string;
  target: string;
}

export const LANDING_GRAPH_COLORS: Record<LandingNodeType, string> = {
  person: 'hsl(var(--color-entity-person))',
  organization: 'hsl(var(--color-entity-organization))',
  phone: 'hsl(var(--color-entity-phone))',
  account: 'hsl(var(--color-entity-account))',
  evidence: 'hsl(var(--color-entity-evidence))',
  finding: 'hsl(var(--color-anomaly))',
};

export const LANDING_GRAPH_LEGEND: { type: LandingNodeType; label: string }[] = [
  { type: 'person', label: 'Person' },
  { type: 'organization', label: 'Organization' },
  { type: 'phone', label: 'Phone' },
  { type: 'account', label: 'Account' },
  { type: 'evidence', label: 'Evidence' },
  { type: 'finding', label: 'Finding' },
];

export const LANDING_GRAPH_NODES: LandingGraphNode[] = [
  { id: 'org-a', type: 'organization', cx: 690, cy: 108 },
  { id: 'prs-a', type: 'person', cx: 150, cy: 100 },
  { id: 'prs-b', type: 'person', cx: 112, cy: 184 },
  { id: 'phn-a', type: 'phone', cx: 236, cy: 268 },
  { id: 'org-b', type: 'organization', cx: 342, cy: 146 },
  { id: 'phn-b', type: 'phone', cx: 316, cy: 316 },
  { id: 'evd-a', type: 'evidence', cx: 404, cy: 208 },
  { id: 'evd-b', type: 'evidence', cx: 528, cy: 310 },
  { id: 'phn-c', type: 'phone', cx: 586, cy: 144 },
  { id: 'acc-a', type: 'account', cx: 648, cy: 232 },
  { id: 'acc-b', type: 'account', cx: 596, cy: 330 },
  { id: 'fnd-a', type: 'finding', cx: 470, cy: 84 },
  { id: 'fnd-b', type: 'finding', cx: 734, cy: 66 },
];

export const LANDING_GRAPH_EDGES: LandingGraphEdge[] = [
  { id: 'e1', source: 'prs-a', target: 'prs-b' },
  { id: 'e2', source: 'prs-a', target: 'org-a' },
  { id: 'e3', source: 'prs-b', target: 'phn-a' },
  { id: 'e4', source: 'prs-b', target: 'org-b' },
  { id: 'e5', source: 'phn-a', target: 'evd-a' },
  { id: 'e6', source: 'org-b', target: 'evd-a' },
  { id: 'e7', source: 'evd-a', target: 'evd-b' },
  { id: 'e8', source: 'evd-b', target: 'phn-c' },
  { id: 'e9', source: 'evd-b', target: 'acc-b' },
  { id: 'e10', source: 'phn-c', target: 'acc-a' },
  { id: 'e11', source: 'acc-a', target: 'org-a' },
  { id: 'e12', source: 'fnd-a', target: 'evd-a' },
  { id: 'e13', source: 'fnd-b', target: 'org-a' },
  { id: 'e14', source: 'acc-a', target: 'acc-b' },
  { id: 'e15', source: 'phn-c', target: 'org-a' },
];

export const LANDING_HERO_ATTRIBUTES = ['Investigator Controlled', 'Tamper-Evident', 'Grounded'] as const;

// Misdirection guard: this page is a capability showcase. It must never
// present fabricated operational scale to a jury.
export const LANDING_DISCLAIMER =
  'Demonstration surface. Trinetra Pulse assists investigators and does not decide guilt.';