'use client';

// Phase 18.1 — route guard for the authenticated dashboard surface.
//
//  - API mode: unauthenticated visitors are redirected to /login (with a
//    ``from`` so they return where they left off).
//  - Mock mode: the in-memory demo universe remains usable without a backend —
//    the auth store hydrates a deterministic demo session instead. This bypass
//    is UI-only and can never run when NEXT_PUBLIC_USE_MOCK_API=false.

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { isMockData } from '@/lib/api/config';
import { useAuthStore } from '@/state/auth.store';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (isMockData()) return;
    const { hydrated: isHydrated, session } = useAuthStore.getState();
    if (isHydrated && !session) {
      const from = pathname && pathname !== '/' ? pathname : '/overview';
      router.replace(`/login?from=${encodeURIComponent(from)}`);
    }
  }, [status, hydrated, pathname, router]);

  return <>{children}</>;
}