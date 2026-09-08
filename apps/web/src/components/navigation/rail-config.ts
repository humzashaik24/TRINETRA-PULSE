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
  ShieldHalf,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';

import { USER_ROLE_RANK, type UserRole } from '@/lib/auth/types';

// ============================================================
// PHASE 3.5 — COMMAND RAIL NAVIGATION
// ============================================================
// Global navigation only. Investigation-level navigation belongs
// to the investigation workspace, never the global rail.
//
// Phase 18.1 — role-gated navigation:
// ``RailItem.roles`` restricts an item to the listed roles (exact), while
// ``minRole`` uses the hierarchical model (AUDITOR stays read-only).
// ============================================================

export interface RailItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** Primary rail actions shown on compact/mobile surfaces. */
  primary?: boolean;
  /** Exact roles that may see this item (undefined = everyone). */
  roles?: UserRole[];
  /** Minimum role rank required to see this item. */
  minRole?: UserRole;
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
      {
        label: 'Security',
        href: '/security',
        icon: ShieldHalf,
        roles: ['admin', 'supervisor', 'auditor'],
      },
      {
        label: 'Providers',
        href: '/security/providers',
        icon: KeyRound,
        roles: ['admin'],
      },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'User', href: '/profile', icon: CircleUserRound },
    ],
  },
];

export const RAIL_SECTIONS = [...PRIMARY_RAIL_SECTIONS, ...UTILITY_RAIL_SECTIONS];

export const RAIL_ITEMS = RAIL_SECTIONS.flatMap((section) => section.items);

/** Filter rail items by the current user's role (Phase 18.1). */
export function filterRailItemsByRole(
  items: RailItem[],
  role: UserRole | undefined,
): RailItem[] {
  if (!role) return items.filter((item) => item.roles === undefined && item.minRole === undefined);
  return items.filter((item) => {
    if (item.roles) return item.roles.includes(role);
    if (item.minRole) return USER_ROLE_RANK[role] >= USER_ROLE_RANK[item.minRole];
    return true;
  });
}