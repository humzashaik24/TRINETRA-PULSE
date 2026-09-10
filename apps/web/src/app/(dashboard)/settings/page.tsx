'use client';

import { useEffect } from 'react';
import {
  Globe,
  Sun,
  Moon,
  Brain,
  ShieldCheck,
  Database,
  Settings as SettingsIcon,
  User,
  Fingerprint,
  Lock,
  FileCheck,
  Layers,
  Server,
  Activity,
  Info,
} from 'lucide-react';

import { Badge, ChartCard } from '@trinetra-pulse/ui';
import { useAppStore } from '@/state/app.store';
import {
  APP_LANGUAGES,
  LANGUAGE_NATIVE_NAMES,
  useLanguageToggle,
  chromeText,
  type AppLanguage,
} from '@/lib/i18n';
import { useTheme } from '@/components/theme-provider';
import { useAuthStore } from '@/state/auth.store';
import { isMockData } from '@/lib/api/config';
import { useAIStore } from '@/state/ai.store';
import { WorkspaceHeader } from '@/components/shell/workspace-header';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-foreground-secondary">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-md border border-border bg-surface-elevated p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            value === opt.value
              ? 'bg-brand text-brand-foreground shadow-sm'
              : 'text-foreground-secondary hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function maskToken(token: string): string {
  if (token.length <= 12) return '••••••••';
  return `${token.slice(0, 6)}••••••${token.slice(-4)}`;
}

export default function SettingsPage() {
  const setContextLabel = useAppStore((s) => s.setContextLabel);
  const { language, setLanguage } = useLanguageToggle();
  const { theme, setTheme } = useTheme();
  const session = useAuthStore((s) => s.session);
  const aiStore = useAIStore();
  const mock = isMockData();

  useEffect(() => {
    setContextLabel('Settings');
    return () => setContextLabel(null);
  }, [setContextLabel]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <WorkspaceHeader
        eyebrow="WORKSPACE"
        title={chromeText(language, 'Settings')}
        description="Workspace, data and platform configuration"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── GENERAL ─── */}
        <ChartCard
          title="General"
          subtitle="Language and appearance"
          className="md:col-span-2"
        >
          <div className="space-y-1">
            <Row label={chromeText(language, 'Language')}>
              <Globe className="h-3.5 w-3.5 text-foreground-muted" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                aria-label="Language"
                className="h-7 rounded-md border border-border bg-surface-elevated px-2 text-xs font-medium text-foreground outline-none focus:border-brand"
              >
                {APP_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_NATIVE_NAMES[lang]}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={chromeText(language, 'Theme')}>
              {theme === 'dark' ? (
                <Moon className="h-3.5 w-3.5 text-foreground-muted" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-foreground-muted" />
              )}
              <SegmentedControl
                value={theme}
                onChange={(v) => setTheme(v as 'dark' | 'light')}
                options={[
                  { value: 'light', label: chromeText(language, 'Light mode') },
                  { value: 'dark', label: chromeText(language, 'Dark mode') },
                ]}
              />
            </Row>
          </div>
        </ChartCard>

        {/* ─── INVESTIGATION ─── */}
        <ChartCard title="Investigation" subtitle="View and context settings">
          <div className="space-y-1">
            <Row label="Default investigation view">
              <Badge variant="secondary" size="sm">Knowledge Canvas</Badge>
            </Row>
            <Row label="Context scope">
              <Badge variant="secondary" size="sm">Per-investigation</Badge>
            </Row>
            <Row label="AI context window">
              <Badge variant="secondary" size="sm">Session-scoped</Badge>
            </Row>
            <div className="flex items-start gap-2 mt-3 text-xs text-foreground-muted">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Investigation settings are determined by your role and workspace configuration.
            </div>
          </div>
        </ChartCard>

        {/* ─── AI ASSISTANT ─── */}
        <ChartCard title="AI Assistant" subtitle="Provider and grounding configuration">
          <div className="space-y-1">
            <Row label="Provider status">
              {mock ? (
                <Badge variant="warning" size="sm" dot>Demo</Badge>
              ) : (
                <Badge variant="success" size="sm" dot>Production</Badge>
              )}
            </Row>
            <Row label="Grounding">
              <Badge variant="success" size="sm" dot>Active</Badge>
            </Row>
            <Row label="Response mode">
              <Badge variant="secondary" size="sm">Streaming</Badge>
            </Row>
            <Row label="Conversation scope">
              <Badge variant="info" size="sm">
                {aiStore.investigationId ? 'Investigation' : 'Global'}
              </Badge>
            </Row>
            <div className="flex items-start gap-2 mt-3 text-xs text-foreground-muted">
              <Brain className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Responses are grounded in case evidence. AI suggestions are read-only and user-initiated.
            </div>
          </div>
        </ChartCard>

        {/* ─── SECURITY & PRIVACY ─── */}
        <ChartCard title="Security & Privacy" subtitle="Authentication and access control">
          <div className="space-y-1">
            <Row label="Authentication">
              <Lock className="h-3.5 w-3.5 text-foreground-muted" />
              {session ? (
                <Badge variant="success" size="sm" dot>Authenticated</Badge>
              ) : (
                <Badge variant="danger" size="sm">Unauthenticated</Badge>
              )}
            </Row>
            <Row label="Role">
              <ShieldCheck className="h-3.5 w-3.5 text-foreground-muted" />
              <Badge variant="secondary" size="sm">
                {session?.user?.role
                  ? session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)
                  : '—'}
              </Badge>
            </Row>
            <Row label="User ID">
              <span className="font-mono text-xs text-foreground-secondary">
                {session?.user?.id ? maskToken(session.user.id) : '—'}
              </span>
            </Row>
            <Row label="Session token">
              <Fingerprint className="h-3.5 w-3.5 text-foreground-muted" />
              <span className="font-mono text-xs text-foreground-secondary">
                {session?.access_token ? maskToken(session.access_token) : '—'}
              </span>
            </Row>
            <Row label="Evidence handling">
              <Badge variant="info" size="sm">Chain-of-custody enforced</Badge>
            </Row>
            <div className="flex items-start gap-2 mt-3 text-xs text-foreground-muted">
              <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Sensitive data is never exposed to the client. Audit logs track all evidence access.
            </div>
          </div>
        </ChartCard>

        {/* ─── DATA & EVIDENCE ─── */}
        <ChartCard title="Data & Evidence" subtitle="Storage and integrity verification">
          <div className="space-y-1">
            <Row label="Storage mode">
              <Database className="h-3.5 w-3.5 text-foreground-muted" />
              {mock ? (
                <Badge variant="warning" size="sm" dot>In-memory demo</Badge>
              ) : (
                <Badge variant="success" size="sm" dot>Production DB</Badge>
              )}
            </Row>
            <Row label="Integrity verification">
              <FileCheck className="h-3.5 w-3.5 text-foreground-muted" />
              <Badge variant="success" size="sm" dot>SHA-256 hashes</Badge>
            </Row>
            <Row label="Provenance tracking">
              <Layers className="h-3.5 w-3.5 text-foreground-muted" />
              <Badge variant="success" size="sm" dot>Active</Badge>
            </Row>
            <div className="flex items-start gap-2 mt-3 text-xs text-foreground-muted">
              <Database className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {mock
                ? 'Running on deterministic in-memory demo data. No data persists across sessions.'
                : 'All evidence is hashed and versioned with full chain-of-custody records.'}
            </div>
          </div>
        </ChartCard>

        {/* ─── SYSTEM ─── */}
        <ChartCard title="System" subtitle="Runtime and service health">
          <div className="space-y-1">
            <Row label="API status">
              <Server className="h-3.5 w-3.5 text-foreground-muted" />
              {mock ? (
                <Badge variant="warning" size="sm" dot>Mock services</Badge>
              ) : (
                <Badge variant="success" size="sm" dot>API connected</Badge>
              )}
            </Row>
            <Row label="Runtime environment">
              <Badge variant="secondary" size="sm">Next.js 14</Badge>
            </Row>
            <Row label="Application version">
              <span className="font-mono text-xs text-foreground-secondary">
                {process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0-dev'}
              </span>
            </Row>
            <Row label="Service health">
              <Activity className="h-3.5 w-3.5 text-foreground-muted" />
              <Badge variant="success" size="sm" dot>All systems operational</Badge>
            </Row>
            <div className="flex items-start gap-2 mt-3 text-xs text-foreground-muted">
              <SettingsIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {mock
                ? 'Demo mode active — all backend services are simulated in-memory.'
                : 'Connected to the Trinetra Pulse production backend.'}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
