import { mockEntityProfileById } from '@/mock/entity-profiles';
import { mockDatasetById } from '@/mock/datasets';
import { mockInvestigationById } from '@/mock/investigations';
import type { LucideIcon } from 'lucide-react';
import type { InspectorContext } from '@/state/shell.store';
import {
  LayoutDashboard,
  FolderSearch,
  Database,
  Users,
  Network,
  FileSearch,
  BarChart3,
  Sparkles,
  BrainCircuit,
  FileText,
  Settings,
  CircleUserRound,
} from 'lucide-react';

// ============================================================
// PHASE 3.5 — WORKSPACE HELPERS
// ============================================================
// Contextual breadcrumb + workspace title resolution.
// Shared by the CommandBar, WorkspaceHeader and the pages.
// ============================================================

export interface Crumb {
  label: string;
  href: string | null;
  icon?: LucideIcon;
}

export interface WorkspaceMeta {
  title: string;
  description: string;
}

const humanize = (segment: string) =>
  segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/** Known static routes and their canonical labels. */
const ROUTE_LABELS: Record<string, string> = {
  overview: 'Overview',
  investigations: 'Investigations',
  'data-intelligence': 'Data Intelligence',
  entities: 'Entities',
  'entity-intelligence': 'Entity Intelligence',
  networks: 'Networks',
  evidence: 'Evidence',
  analytics: 'Analytics',
  patterns: 'Patterns',
  'ai-assistant': 'AI Assistant',
  reports: 'Reports',
  settings: 'Settings',
  profile: 'User',
};

const ROUTE_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  investigations: FolderSearch,
  'data-intelligence': Database,
  entities: Users,
  networks: Network,
  evidence: FileSearch,
  analytics: BarChart3,
  patterns: Sparkles,
  'ai-assistant': BrainCircuit,
  reports: FileText,
  settings: Settings,
  profile: CircleUserRound,
};

/** Resolve a URL path segment to a human label, looking up domain
 *  objects (entities / datasets) where the segment is an id. */
function resolveSegmentLabel(segment: string, index: number, pathname: string): string | null {
  // Entity detail: /entities/<id>
  if (pathname.startsWith('/entities/') && index === 1) {
    return mockEntityProfileById.get(segment)?.displayName ?? null;
  }
  // Investigation detail: /investigations/<id>
  if (pathname.startsWith('/investigations/') && index === 1) {
    return mockInvestigationById.get(segment)?.investigation.title ?? null;
  }
  // Dataset detail: /data-intelligence/<id> landing (reserved)
  if (mockDatasetById.has(segment)) {
    return mockDatasetById.get(segment)?.name ?? null;
  }
  const staticLabel = ROUTE_LABELS[segment];
  if (staticLabel) return staticLabel;
  // Unknown ids (e.g. ent-001, INV-204) — keep technical label.
  return humanize(segment);
}

/** Build contextual breadcrumbs from the current path.
 *  Example: /entities/ent-person-001 → Entities / Rahul Kumar */
export function resolveBreadcrumbs(pathname: string): Crumb[] {
  const clean = pathname.replace(/^\//, '').replace(/\/$/, '');
  const segments = clean ? clean.split('/') : [];

  if (segments.length === 0 || segments[0] === 'overview') {
    return [{ label: 'Overview', href: '/overview' }];
  }

  const crumbs: Crumb[] = [];
  segments.forEach((segment, i) => {
    const label = resolveSegmentLabel(segment, i, pathname);
    if (!label) return;
    const href =
      i < segments.length - 1
        ? `/${segments.slice(0, i + 1).join('/')}`
        : null;
    crumbs.push({ label, href, icon: ROUTE_ICONS[segment] });
  });
  return crumbs;
}

/** Return a fallback title/description for simple workspace pages. */
export function workspaceMetaFor(pathname: string): WorkspaceMeta {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0] ?? 'overview';
  switch (root) {
    case 'overview':
      return {
        title: 'Intelligence Overview',
        description: 'Live command view of the intelligence workspace',
      };
    case 'investigations': {
      const invId = segments[1];
      const record = invId ? mockInvestigationById.get(invId) : undefined;
      return record
        ? { title: record.investigation.title, description: record.investigation.description ?? 'Investigation workspace' }
        : {
            title: 'Investigations',
            description: 'Manage and track investigation cases',
          };
    }
    case 'data-intelligence':
      return {
        title: 'Data Intelligence',
        description: 'Ingest, map and prepare investigation data',
      };
    case 'entities': {
      const id = segments[1];
      const entity = id ? mockEntityProfileById.get(id) : undefined;
      return entity
        ? { title: entity.displayName, description: entity.description ?? 'Entity intelligence profile' }
        : { title: 'Entities', description: 'Canonical records across the intelligence graph' };
    }
    case 'entity-intelligence':
      return {
        title: 'Entity Intelligence',
        description: 'Extraction pipeline, candidate review, and resolution management',
      };
    case 'networks':
      return {
        title: 'Networks',
        description: 'Visualize and analyze entity relationship networks',
      };
    case 'evidence':
      return {
        title: 'Evidence',
        description: 'Manage and track investigation evidence',
      };
    case 'analytics':
      return {
        title: 'Analytics',
        description: 'Data analysis and statistical insights',
      };
    case 'patterns':
      return {
        title: 'Patterns',
        description: 'Detect and analyze behavioral and network patterns',
      };
    case 'ai-assistant':
      return {
        title: 'AI Assistant',
        description: 'AI-powered investigation assistant',
      };
    case 'reports':
      return {
        title: 'Reports',
        description: 'Generate and manage investigation reports',
      };
    case 'settings':
      return {
        title: 'Settings',
        description: 'Workspace and application preferences',
      };
    case 'profile':
      return {
        title: 'User Profile',
        description: 'Account and access management',
      };
    default:
      return { title: humanize(root), description: 'Trinetra Pulse workspace' };
  }
}

/** Map a dashboard network node to an inspector context. Looks up the
 *  entity profile by display name where possible, otherwise treats it
 *  as a raw network node. */
export function resolveDashboardNodeContext(node: {
  id: string;
  label: string;
  type?: string;
  connections?: number;
}): InspectorContext {
  for (const profile of mockEntityProfileById.values()) {
    if (profile.displayName === node.label) {
      return {
        type: 'entity',
        id: profile.id,
        name: profile.displayName,
        entityType: profile.entityType,
      };
    }
  }
  return {
    type: 'network',
    id: node.id,
    label: `Network ${node.id.toUpperCase()}`,
    nodeLabel: node.label,
    nodeType: node.type,
    connections: node.connections,
  };
}

export { humanize };