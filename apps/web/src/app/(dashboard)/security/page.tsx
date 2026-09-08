'use client';

// Phase 18.1 — administration surface: user management (ADMIN) and the auth
// audit trail (SUPERVISOR / ADMIN / AUDITOR). Data comes from the relational
// backend in API mode; in mock mode deterministic sample rows keep the UI
// demonstrable. The backend remains the source of truth for authorization —
// the page just hides what the current role cannot read.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Users as UsersIcon, ScrollText, KeyRound } from 'lucide-react';

import { Badge, buttonVariants } from '@trinetra-pulse/ui';
import { useCurrentUser } from '@/hooks/use-auth';
import { isMockData } from '@/lib/api/config';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import { API_BASE_URL } from '@/lib/api/config';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@trinetra-pulse/ui';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'supervisor' | 'investigator' | 'auditor';
  is_active: boolean;
  created_at: string;
}

interface AuditRow {
  id: string;
  user_id: string | null;
  email: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  investigator: 'Investigator',
  auditor: 'Auditor',
};

const MOCK_USERS: UserRow[] = [
  { id: 'u-1', email: 'admin@trinetra.dev', display_name: 'Administrator User', role: 'admin', is_active: true, created_at: new Date().toISOString() },
  { id: 'u-2', email: 'supervisor@trinetra.dev', display_name: 'Supervisor User', role: 'supervisor', is_active: true, created_at: new Date().toISOString() },
  { id: 'u-3', email: 'investigator@trinetra.dev', display_name: 'Investigator User', role: 'investigator', is_active: true, created_at: new Date().toISOString() },
  { id: 'u-4', email: 'auditor@trinetra.dev', display_name: 'Auditor User', role: 'auditor', is_active: true, created_at: new Date().toISOString() },
];

const MOCK_AUDIT: AuditRow[] = [
  { id: 'a-1', user_id: 'u-1', email: 'investigator@trinetra.dev', action: 'login_success', details: null, created_at: new Date().toISOString() },
  { id: 'a-2', user_id: null, email: 'investigator@trinetra.dev', action: 'login_failure', details: null, created_at: new Date().toISOString() },
  { id: 'a-3', user_id: 'u-4', email: 'auditor@trinetra.dev', action: 'permission_denied', details: { role: 'auditor' }, created_at: new Date().toISOString() },
];

type Role = UserRow['role'];

function canReadAudit(role: Role | undefined): boolean {
  return role === 'supervisor' || role === 'admin' || role === 'auditor';
}

export default function SecurityPage() {
  const user = useCurrentUser();
  const role = user?.role;

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [usersDenied, setUsersDenied] = useState(false);
  const [auditDenied, setAuditDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(section: 'users' | 'audit') {
      if (isMockData()) {
        if (section === 'users') setUsers(MOCK_USERS);
        else setAudit(MOCK_AUDIT);
        return;
      }
      try {
        const data = await apiFetch<{ items: UserRow[] | AuditRow[] }>(
          API_BASE_URL,
          section === 'users' ? '/admin/users' : '/admin/audit'
        );
        if (!cancelled) {
          if (section === 'users') setUsers(data.items as UserRow[]);
          else setAudit(data.items as AuditRow[]);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.code === 'forbidden') {
          if (section === 'users') setUsersDenied(true);
          else setAuditDenied(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load security data');
        }
      }
    }

    if (role === 'admin') void load('users');
    if (canReadAudit(role)) void load('audit');

    return () => {
      cancelled = true;
    };
  }, [role]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="SECURITY"
        title="Access Control"
        description="User roles and the authentication / RBAC audit trail"
      />

      {error && (
        <p role="alert" className="rounded-md border border-danger-subtle bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon size={18} className="text-foreground-muted" />
            <CardTitle>Users</CardTitle>
          </div>
          <CardDescription>Administrator-only user and role management.</CardDescription>
        </CardHeader>
        <CardContent>
          {usersDenied && (
            <Denied message="Your role cannot manage users. Only administrators can view this section." />
          )}
          {users === null && !usersDenied && (
            <p className="text-sm text-foreground-muted">Loading users…</p>
          )}
          {users !== null && (
            <div className="overflow-x-auto" data-testid="security-users-table">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left tp-data-label text-foreground-muted">
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Role</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-mono text-foreground-secondary">{u.email}</td>
                      <td className="py-2 pr-3">{u.display_name}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={u.is_active ? 'success' : 'danger'}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-foreground-muted" />
            <CardTitle>Provider configuration</CardTitle>
          </div>
          <CardDescription>
            Administrator-only management of AI and media provider credentials,
            capability support and defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/security/providers"
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            data-testid="security-providers-link"
          >
            Manage providers
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-foreground-muted" />
            <CardTitle>Auth audit trail</CardTitle>
          </div>
          <CardDescription>
            Login, role-change and permission events (supervisor / admin / auditor).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditDenied && (
            <Denied message="Your role cannot read the audit trail. Supervisors, administrators and auditors can." />
          )}
          {audit === null && !auditDenied && (
            <p className="text-sm text-foreground-muted">Loading audit events…</p>
          )}
          {audit !== null && (
            <div className="space-y-2" data-testid="security-audit-list">
              {audit.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm">
                  <Badge variant="outline" className="font-mono">{event.action}</Badge>
                  <span className="font-mono text-foreground-secondary">{event.email}</span>
                  <span className="ml-auto text-xs text-foreground-muted">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Denied({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3" data-testid="security-denied">
      <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" />
      <p className="text-sm text-foreground-secondary">{message}</p>
    </div>
  );
}