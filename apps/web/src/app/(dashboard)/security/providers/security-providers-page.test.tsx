import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import SecurityProvidersPage from '@/app/(dashboard)/security/providers/page';
import { useCurrentUser } from '@/hooks/use-auth';
import type { AuthUser } from '@/lib/auth/types';
import {
  createProvider,
  deleteProvider,
  listProviders,
  testProvider,
  updateProvider,
  type ProviderRow,
} from '@/lib/api/providers';

jest.mock('@/hooks/use-auth', () => ({
  useCurrentUser: jest.fn(),
}));

jest.mock('@/lib/api/config', () => ({
  isMockData: () => false,
  API_BASE_URL: '/api/v2',
}));

jest.mock('@/lib/api/providers', () => ({
  listProviders: jest.fn(),
  createProvider: jest.fn(),
  updateProvider: jest.fn(),
  deleteProvider: jest.fn(),
  testProvider: jest.fn(),
}));

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockList = listProviders as jest.MockedFunction<typeof listProviders>;
const mockCreate = createProvider as jest.MockedFunction<typeof createProvider>;
const mockUpdate = updateProvider as jest.MockedFunction<typeof updateProvider>;
const mockDelete = deleteProvider as jest.MockedFunction<typeof deleteProvider>;
const mockTest = testProvider as jest.MockedFunction<typeof testProvider>;

const base = {
  base_url: null,
  enabled: true,
  is_default: false,
  configuration: null,
  created_at: '2026-08-01T09:00:00Z',
  updated_at: '2026-08-01T09:00:00Z',
  created_by: null,
  updated_by: null,
};

const rows: ProviderRow[] = [
  {
    ...base,
    id: 'p-1',
    provider_name: 'OpenAI Investigation',
    provider_type: 'openai',
    capability: 'investigation_ai',
    model: 'gpt-4.1',
    has_credential: true,
    is_default: true,
    credential_masked: '••••••••••••••7A2F',
  },
  {
    ...base,
    id: 'p-2',
    provider_name: 'Mock Audio',
    provider_type: 'mock',
    capability: 'transcription',
    model: 'mock-transcribe',
    enabled: false,
    has_credential: false,
    credential_masked: '',
  },
];

const user = (role: AuthUser['role']): AuthUser => ({
  id: role === 'admin' ? 'admin-1' : 'auditor-1',
  email: role === 'admin' ? 'admin@trinetra.dev' : 'auditor@trinetra.dev',
  display_name: role === 'admin' ? 'Admin' : 'Auditor',
  role,
  is_active: true,
});

beforeEach(() => {
  mockUseCurrentUser.mockReturnValue(user('admin'));
  mockList.mockResolvedValue(rows);
  mockTest.mockResolvedValue({
    status: 'CONNECTED',
    provider: 'OpenAI Investigation',
    capability: 'investigation_ai',
    mode: 'EXTERNAL',
  });
  mockCreate.mockResolvedValue({
    ...base,
    id: 'p-new',
    provider_name: 'Gemini Vision',
    provider_type: 'gemini',
    capability: 'vision',
    model: 'gemini-2.5-flash',
    has_credential: false,
    credential_masked: '',
  });
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe('SecurityProvidersPage', () => {
  it('shows a denied panel for non-admins and never loads the list', async () => {
    mockUseCurrentUser.mockReturnValue(user('auditor'));
    render(<SecurityProvidersPage />);
    expect(screen.getByTestId('providers-denied')).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });

  it('renders provider rows with masked credentials in API mode', async () => {
    render(<SecurityProvidersPage />);
    expect(await screen.findByText('OpenAI Investigation')).toBeInTheDocument();
    expect(screen.getByText('Mock Audio')).toBeInTheDocument();
    const masked = screen.getAllByTestId('provider-masked-credential');
    expect(masked).toHaveLength(1);
    expect(masked[0]).toHaveTextContent('7A2F');
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('adds a provider through the dialog', async () => {
    render(<SecurityProvidersPage />);
    await screen.findByText('OpenAI Investigation');

    fireEvent.click(screen.getByTestId('providers-add-button'));
    fireEvent.change(screen.getByTestId('provider-name-input'), {
      target: { value: 'Gemini Vision' },
    });
    fireEvent.change(screen.getByTestId('provider-type-select'), {
      target: { value: 'gemini' },
    });
    fireEvent.change(screen.getByTestId('provider-capability-select'), {
      target: { value: 'vision' },
    });
    fireEvent.change(screen.getByTestId('provider-model-input'), {
      target: { value: 'gemini-2.5-flash' },
    });
    fireEvent.click(screen.getByTestId('provider-save-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider_name: 'Gemini Vision',
          provider_type: 'gemini',
          capability: 'vision',
          model: 'gemini-2.5-flash',
          credential: null,
        })
      );
    });
    expect(await screen.findByText('Gemini Vision')).toBeInTheDocument();
  });

  it('runs a connection test and shows the result', async () => {
    render(<SecurityProvidersPage />);
    await screen.findByText('OpenAI Investigation');

    fireEvent.click(screen.getAllByTestId('provider-test-button')[0]);
    const result = await screen.findByTestId('provider-test-result');
    expect(result).toHaveTextContent('CONNECTED');
    expect(result).toHaveTextContent('external');
    expect(mockTest).toHaveBeenCalledWith('p-1');
  });

  it('toggles enabled state via the row switch', async () => {
    mockUpdate.mockResolvedValue({ ...rows[0], enabled: false, is_default: false });
    render(<SecurityProvidersPage />);
    await screen.findByText('OpenAI Investigation');

    fireEvent.click(screen.getAllByTestId('provider-enable-switch')[0]);
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('p-1', { enabled: false });
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('deletes a provider after confirmation', async () => {
    render(<SecurityProvidersPage />);
    await screen.findByText('OpenAI Investigation');

    fireEvent.click(screen.getAllByTestId('provider-delete-button')[1]);
    await screen.findByTestId('provider-delete-confirm');
    fireEvent.click(screen.getByTestId('provider-delete-confirm'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('p-2');
    });
    expect(screen.queryByText('Mock Audio')).not.toBeInTheDocument();
  });
});