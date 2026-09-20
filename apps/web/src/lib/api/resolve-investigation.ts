/**
 * Canonical investigation id resolution against the real backend.
 *
 * Dashboard / data-intelligence deep links historically use semantic ids
 * (e.g. ``inv-demo-nexus``), while the backend addresses investigations by
 * UUID. This helper maps a semantic id to the real UUID via the investigation
 * list lookup (``metadata.canonical_id`` / ``metadata.case_id``). Actual UUIDs
 * pass straight through. In mock mode the identifier is returned unchanged.
 */

import { isMockData } from './config';
import { listInvestigations } from './investigations';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CANONICAL_UUID_MAP: Record<string, string> = {
  'inv-demo-nexus': '1f202866-9808-5ded-b6ea-d8c7ff3c30b7',
};

export async function resolveInvestigationId(identifier: string): Promise<string> {
  if (isMockData()) return identifier;
  if (UUID_RE.test(identifier)) return identifier;
  if (CANONICAL_UUID_MAP[identifier]) return CANONICAL_UUID_MAP[identifier];
  const page = await listInvestigations({ page_size: 100 }).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 0 }));
  const found = page.items.find((inv) => {
    const canonical = inv.metadata?.canonical_id;
    const caseId = inv.metadata?.case_id;
    return canonical === identifier || caseId === identifier;
  });
  if (!found) {
    throw new Error(`Investigation "${identifier}" is not available`);
  }
  return found.id;
}