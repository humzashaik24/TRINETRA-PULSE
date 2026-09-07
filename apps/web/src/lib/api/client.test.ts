import { ApiClientError, apiFetch } from './client';

describe('ApiClientError', () => {
  it('carries the backend error contract fields', () => {
    const err = new ApiClientError({
      code: 'not_found',
      message: 'Investigations not found',
      details: { resource: 'Investigations', id: 'x' },
      status_code: 404,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiClientError');
    expect(err.code).toBe('not_found');
    expect(err.message).toBe('Investigations not found');
    expect(err.details).toEqual({ resource: 'Investigations', id: 'x' });
    expect(err.statusCode).toBe(404);
  });
});

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('GETs and parses json', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'abc' }),
    } as unknown as Response);

    const data = await apiFetch<{ id: string }>('http://base', '/things');
    expect(data).toEqual({ id: 'abc' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://base/things',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('POSTs a JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 'new' }),
    } as unknown as Response);

    await apiFetch('http://base', '/things', { method: 'POST', body: { a: 1 } });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('returns undefined for 204', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    } as unknown as Response);

    const data = await apiFetch<void>('http://base', '/things', {
      method: 'DELETE',
    });
    expect(data).toBeUndefined();
  });

  it('sends the demo identity header so production API calls are authorized', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{}',
    } as unknown as Response);

    await apiFetch('http://base', '/investigations');
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)['X-User-Id']).toBe(
      'inspector.mehta@trinetra.local',
    );
  });

  it('throws ApiClientError with the backend error contract on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          code: 'not_found',
          message: 'Investigations not found',
          details: { resource: 'Investigations' },
          status_code: 404,
        }),
    } as unknown as Response);

    const promise = apiFetch('http://base', '/investigations/00000000-0000-0000-0000-000000000000');
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({
      code: 'not_found',
      statusCode: 404,
    });
  });

  it('falls back to a generic error when the body is not a contract object', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '<html>oops</html>',
    } as unknown as Response);

    await expect(apiFetch('http://base', '/things')).rejects.toMatchObject({
      code: 'http_error',
      statusCode: 500,
    });
  });
});
