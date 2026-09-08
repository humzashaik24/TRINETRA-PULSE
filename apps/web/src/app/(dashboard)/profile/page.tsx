'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircleUserRound, LogOut, ShieldCheck } from 'lucide-react';

import { Badge, Button } from '@trinetra-pulse/ui';
import { useAppStore } from '@/state/app.store';
import { useAuthStore } from '@/state/auth.store';
import { useCurrentUser } from '@/hooks/use-auth';
import { WorkspaceHeader } from '@/components/shell/workspace-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@trinetra-pulse/ui';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  investigator: 'Investigator',
  auditor: 'Auditor (read-only)',
};

export default function ProfilePage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const user = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    setContextLabel('User');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title="User Profile"
        description="Account and role information"
        actions={
          <Button variant="secondary" size="sm" onClick={handleLogout} data-testid="logout-button">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-foreground-muted">
              <CircleUserRound size={20} />
            </div>
            <CardTitle data-testid="profile-name">{user?.display_name ?? '—'}</CardTitle>
            <CardDescription>{user?.email ?? 'No active session'}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="tp-data-label mb-1.5">Role</p>
            <Badge variant="secondary" data-testid="profile-role">
              <ShieldCheck className="h-3 w-3" />
              {user ? ROLE_LABELS[user.role] ?? user.role : 'Not signed in'}
            </Badge>
          </div>
          <div>
            <p className="tp-data-label mb-1.5">Identifier</p>
            <p className="font-mono text-sm text-foreground-secondary" data-testid="profile-id">
              {user?.id ?? '—'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}