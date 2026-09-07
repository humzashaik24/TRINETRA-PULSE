import {
  resolveBreadcrumbs,
  workspaceMetaFor,
  resolveDashboardNodeContext,
  humanize,
} from '@/lib/workspace';

// ============================================================
// PHASE 3.5 — WORKSPACE HELPER LIBRARY
// ============================================================

describe('resolveBreadcrumbs', () => {
  it('overview resolves to a single Overview crumb', () => {
    const crumbs = resolveBreadcrumbs('/overview');
    expect(crumbs.map((c) => c.label)).toEqual(['Overview']);
    expect(crumbs[0].href).toBe('/overview');
  });

  it('entities list page resolves the section label', () => {
    const crumbs = resolveBreadcrumbs('/entities');
    expect(crumbs.map((c) => c.label)).toEqual(['Entities']);
  });

  it('entity detail resolves the profile display name', () => {
    const crumbs = resolveBreadcrumbs('/entities/ent-person-001');
    expect(crumbs.length).toBe(2);
    expect(crumbs[0].label).toBe('Entities');
    expect(crumbs[1].label).toBe('Rahul Kumar');
    expect(crumbs[1].href).toBeNull();
  });

  it('data intelligence uses the canonical label', () => {
    const crumbs = resolveBreadcrumbs('/data-intelligence');
    expect(crumbs.map((c) => c.label)).toEqual(['Data Intelligence']);
  });

  it('auto-label: assertion - humanize helper splits kebab segments', () => {
    expect(humanize('entity-intelligence')).toBe('Entity Intelligence');
  });
});

describe('workspaceMetaFor', () => {
  it('returns overview copy for /overview', () => {
    expect(workspaceMetaFor('/overview').title).toContain('Overview');
  });
  it('returns entity name for detail routes', () => {
    const meta = workspaceMetaFor('/entities/ent-person-001');
    expect(meta.title).toBe('Rahul Kumar');
  });
  it('falls back to humanized root', () => {
    expect(workspaceMetaFor('/reports').title).toBe('Reports');
  });
});

describe('resolveDashboardNodeContext', () => {
  it('maps a known label to the entity context', () => {
    const ctx = resolveDashboardNodeContext({ id: 'n1', label: 'Rahul Kumar', type: 'person' });
    expect(ctx.type).toBe('entity');
    if (ctx.type === 'entity') {
      expect(ctx.name).toBe('Rahul Kumar');
      expect(ctx.id.length).toBeGreaterThan(0);
    }
  });

  it('falls back to a network node context for unknown labels', () => {
    const ctx = resolveDashboardNodeContext({ id: 'n7', label: 'Safe House B', type: 'location', connections: 3 });
    expect(ctx.type).toBe('network');
    if (ctx.type === 'network') {
      expect(ctx.nodeLabel).toBe('Safe House B');
      expect(ctx.connections).toBe(3);
    }
  });
});