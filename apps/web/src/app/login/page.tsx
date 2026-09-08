'use client';

// Phase 18.1 — sign-in surface. POSTs to /api/v2/auth/login in API mode; in
// mock mode it activates the deterministic demo session for the selected
// demo account. Demo credentials are DEVELOPMENT ONLY and are never shown in
// production-style builds (mock mode only).

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { Button, Input, Label } from '@trinetra-pulse/ui';
import { isMockData } from '@/lib/api/config';
import { useAuthStore } from '@/state/auth.store';

const MOCK_CREDENTIALS = [
  ['investigator@trinetra.dev', 'Investigator!2026'],
  ['supervisor@trinetra.dev', 'Supervisor!2026'],
  ['admin@trinetra.dev', 'Admin!2026'],
  ['auditor@trinetra.dev', 'Auditor!2026'],
];

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const from = searchParams.get('from') || '/overview';

  React.useEffect(() => {
    if (useAuthStore.getState().session) {
      router.replace(from);
    }
  }, [status, from, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await login(email, password);
    if (ok) router.replace(from);
  }

  const busy = status === 'loading';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <circle cx="5" cy="8" r="2" />
              <circle cx="19" cy="8" r="2" />
            </svg>
          </div>
          <div>
            <h1 className="text-display-sm font-bold text-foreground">Trinetra Pulse</h1>
            <p className="mt-1 text-sm text-foreground-muted">AI-powered criminal network intelligence</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm" data-testid="login-form">
          <fieldset className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@trinetra.dev"
              data-testid="login-email"
            />
          </fieldset>

          <fieldset className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-secondary"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger-subtle bg-danger-subtle px-3 py-2 text-xs text-danger"
              data-testid="login-error"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={busy}
            disabled={!email || password.length < 8}
            data-testid="login-submit"
          >
            {!busy && <LogIn size={16} />}
            Sign in
          </Button>

          {isMockData() && (
            <div className="rounded-md bg-surface-elevated px-3 py-2.5 text-xs text-foreground-muted" data-testid="mock-credentials">
              <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground-secondary">
                <ShieldCheck size={13} />
                Demo accounts (mock data only)
              </div>
              <ul className="space-y-1 font-mono">
                {MOCK_CREDENTIALS.map(([account, pass]) => (
                  <li key={account}>
                    {account} <span className="text-foreground-muted">/</span> {pass}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}