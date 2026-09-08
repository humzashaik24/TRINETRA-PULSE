/**
 * Typed client for the administrative AI/media provider surface
 * (/api/v2/admin/providers). Phase 23.
 *
 * Credentials are write-only by design: read responses carry only
 * ``has_credential`` and a masked digest (``credential_masked``), so the
 * client state, React devtools and this module never hold a plaintext key.
 * Create/update payloads accept a plaintext ``credential`` which the backend
 * encrypts before persisting it.
 */

import { API_BASE_URL } from './config';
import { apiFetch } from './client';

export type ProviderType = 'openai' | 'gemini' | 'openrouter' | 'mock';
export type ProviderCapability =
  | 'investigation_ai'
  | 'vision'
  | 'video'
  | 'transcription';

export interface ProviderRow {
  id: string;
  provider_name: string;
  provider_type: ProviderType;
  capability: ProviderCapability;
  model: string;
  base_url: string | null;
  enabled: boolean;
  is_default: boolean;
  configuration: Record<string, unknown> | null;
  has_credential: boolean;
  credential_masked: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Table component requires Record<string, unknown>-compatible row shapes.
  [key: string]: unknown;
}

export interface ProviderCreatePayload {
  provider_name: string;
  provider_type: ProviderType;
  capability: ProviderCapability;
  model: string;
  base_url?: string | null;
  enabled?: boolean;
  is_default?: boolean;
  configuration?: Record<string, unknown> | null;
  credential?: string | null;
}

export interface ProviderUpdatePayload {
  provider_name?: string;
  provider_type?: ProviderType;
  capability?: ProviderCapability;
  model?: string;
  base_url?: string | null;
  enabled?: boolean;
  is_default?: boolean;
  configuration?: Record<string, unknown> | null;
  credential?: string | null;
  clear_credential?: boolean;
}

export interface ProviderTestResult {
  status: 'CONNECTED' | 'FAILED';
  provider: string;
  capability: ProviderCapability;
  mode: 'MOCK' | 'EXTERNAL';
}

export async function listProviders(): Promise<ProviderRow[]> {
  return apiFetch<ProviderRow[]>(API_BASE_URL, '/admin/providers');
}

export async function createProvider(
  payload: ProviderCreatePayload
): Promise<ProviderRow> {
  return apiFetch<ProviderRow>(API_BASE_URL, '/admin/providers', {
    method: 'POST',
    body: payload,
  });
}

export async function updateProvider(
  providerId: string,
  payload: ProviderUpdatePayload
): Promise<ProviderRow> {
  return apiFetch<ProviderRow>(API_BASE_URL, `/admin/providers/${providerId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteProvider(providerId: string): Promise<void> {
  return apiFetch<void>(API_BASE_URL, `/admin/providers/${providerId}`, {
    method: 'DELETE',
  });
}

/** Run an out-of-band connectivity check against the provider endpoint. */
export async function testProvider(
  providerId: string
): Promise<ProviderTestResult> {
  return apiFetch<ProviderTestResult>(
    API_BASE_URL,
    `/admin/providers/${providerId}/test`,
    { method: 'POST' }
  );
}