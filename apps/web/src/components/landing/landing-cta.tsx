'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@trinetra-pulse/ui';
import { cn } from '@/lib/utils';
import { loadStoredSession } from '@/lib/auth/session';
import { useAuthStore } from '@/state/auth.store';

// ============================================================
// AUTH-AWARE ENTER CTA
//   - Fresh visitor (no session):          → /login
//   - Already authenticated visitor:        → /overview workspace
//
// The landing page does NOT call authStore.hydrate(). In mock
// mode hydrate() auto-provisions a demo session, which would make
// the CTA silently skip the login surface. Reading the persisted
// session (passive) preserves the START → LOGIN → WORKSPACE flow
// while still skipping login for returning authenticated users.
// ============================================================

export function useLandingSession(): boolean {
  const storeSession = useAuthStore((s) => s.session);
  const [hasStoredSession] = React.useState<boolean>(() =>
    typeof window === 'undefined' ? false : loadStoredSession() !== null,
  );
  return Boolean(storeSession) || hasStoredSession;
}

export function LandingPrimaryCta({
  size = 'xl',
  className,
}: {
  size?: 'lg' | 'xl';
  className?: string;
}) {
  const authenticated = useLandingSession();
  const href = authenticated ? '/overview' : '/login';

  return (
    <Link
      href={href}
      data-testid="landing-primary-cta"
      data-cta-target={href}
      className={cn('inline-block', className)}
    >
      <Button variant="primary" size={size}>
        Enter Trinetra Pulse
        <ArrowRight size={size === 'xl' ? 18 : 16} aria-hidden="true" />
      </Button>
    </Link>
  );
}