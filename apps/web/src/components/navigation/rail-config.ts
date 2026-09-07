import {
  LayoutDashboard,
  FolderSearch,
  Database,
  Users,
  Network,
  FileSearch,
  BarChart3,
  Sparkles,
  Settings,
  CircleUserRound,
  type LucideIcon,
} from 'lucide-react';

// ============================================================
// PHASE 3.5 — COMMAND RAIL NAVIGATION
// ============================================================
// Global navigation only. Investigation-level navigation belongs
// to the investigation workspace, never the global rail.
// ============================================================

export interface RailItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** Primary rail actions shown on compact/mobile surfaces. */
  primary?: boolean;
}

export interface RailSection {
  id: string;
  label: string;
  items: RailItem[];
}

export const PRIMARY_RAIL_SECTIONS: RailSection[] = [
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { label: 'Overview', href: '/overview', icon: LayoutDashboard, primary: true },
      { label: 'Investigations', href: '/investigations', icon: FolderSearch, badge: 24 },
      { label: 'Data', href: '/data-intelligence', icon: Database, primary: true },
      { label: 'Entities', href: '/entities', icon: Users, primary: true },
      { label: 'Networks', href: '/networks', icon: Network, primary: true },
      { label: 'Evidence', href: '/evidence', icon: FileSearch, primary: true },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Patterns', href: '/patterns', icon: Sparkles },
    ],
  },
];

export const UTILITY_RAIL_SECTIONS: RailSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'User', href: '/profile', icon: CircleUserRound },
    ],
  },
];

export const RAIL_SECTIONS = [...PRIMARY_RAIL_SECTIONS, ...UTILITY_RAIL_SECTIONS];

export const RAIL_ITEMS = RAIL_SECTIONS.flatMap((section) => section.items);