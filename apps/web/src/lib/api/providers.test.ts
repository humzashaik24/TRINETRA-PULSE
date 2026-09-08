/**
 * Tests for the Phase 23 typed provider API client.
 *
 * Verifies endpoint routing, HTTP verbs and payload forwarding through
 * ``apiFetch``, plus the write-only credential contract (create accepts a
 * plaintext credential, reads only ever carry the masked digest).
 */

import {
  createProvider,
  deleteProvider,
  listProviders,
  testProvider,
  updateProvider,
  type ProviderRow,
} from './providers';
import { apiFetch } from './client';

jest.mock('./client', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('./config', () => ({
  API_BASE_URL: '/api/v2',
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const ROW: ProviderRow = {
  id: '11111111-1111-4111-8111-111111111111',
  provider_name: 'OpenAI Investigation',
  provider_type: 'openai',
  capability: 'investigation_ai',
  model: 'gpt-4.1',
  base_url: null,
  enabled: true,
  is_default: true,
  configuration: null,
  has_credential: true,
  credential_masked: '••••••••••••••7A2F',
  created_at: '2026-08-01T09:00:00.000000',
  updated_at: '2026-08-01T09:00:00.000000',
  created_by: null,
  updated_by: null,
};

afterEach(() => {
  mockApiFetch.mockReset();
});

describe('provider API client', () => {
  it('lists providers from /admin/providers', async () => {
    mockApiFetch.mockResolvedValue([ROW]);
    const rows = await listProviders();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v2', '/admin/providers');
    expect(rows).toEqual([ROW]);
  });

  it('creates a provider with the plaintext credential', async () => {
    mockApiFetch.mockResolvedValue(ROW);
    const row = await createProvider({
      provider_name: 'OpenAI Investigation',
      provider_type: 'openai',
      capability: 'investigation_ai',
      model: 'gpt-4.1',
      credential: 'sk-proj-top-secret',
    });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v2', '/admin/providers', {
      method: 'POST',
      body: expect.objectContaining({ credential: 'sk-proj-top-secret' }),
    });
    expect(row.credential_masked).toBe('••••••••••••••7A2F');
    expect('credential' in row).toBe(false);
  });

  it('updates a provider via PATCH', async () => {
    mockApiFetch.mockResolvedValue({ ...ROW, model: 'gpt-4.1-mini' });
    const row = await updateProvider(ROW.id, { model: 'gpt-4.1-mini' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v2',
      `/admin/providers/${ROW.id}`,
      { method: 'PATCH', body: { model: 'gpt-4.1-mini' } }
    );
    expect(row.model).toBe('gpt-4.1-mini');
  });

  it('deletes a provider via DELETE', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await deleteProvider(ROW.id);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v2',
      `/admin/providers/${ROW.id}`,
      { method: 'DELETE' }
    );
  });

  it('runs an out-of-band connection test', async () => {
    mockApiFetch.mockResolvedValue({
      status: 'CONNECTED' as const,
      provider: 'OpenAI Investigation',
      capability: 'investigation_ai' as const,
      mode: 'EXTERNAL' as const,
    });
    const result = await testProvider(ROW.id);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v2',
      `/admin/providers/${ROW.id}/test`,
      { method: 'POST' }
    );
    expect(result.status).toBe('CONNECTED');
    expect(result.mode).toBe('EXTERNAL');
  });
});