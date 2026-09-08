/**
 * Minimal typed HTTP client for the Trinetra Pulse relational API (/api/v2).
 *
 * The backend error contract is `{ code, message, details, status_code }`;
 * non-2xx responses are surfaced as `ApiClientError` so callers (and React
 * Query hooks) can read a stable machine-readable code.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  details: Record<string, unknown>;
  status_code: number;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly statusCode: number;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.code = body.code;
    this.details = body.details;
    this.statusCode = body.status_code;
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Accept headers / credentials forwarded by the caller (unused by default). */
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** When true, body is sent as-is (FormData) without JSON serialization. */
  isFormData?: boolean;
}

// ---------------------------------------------------------------------------
// Phase 18.1 authentication wiring.
//
// The client attaches the authenticated user's Bearer token to every request
// to the real layer. The token is registered by the auth store (never read by
// us or stored in this module); a fixed demo identity header was removed
// because ``X-User-Id`` is no longer trusted by the backend. When a request
// comes back 401 while a token was attached, the optional handler lets the
// auth layer end the (now invalid) session.
// ---------------------------------------------------------------------------

let currentAccessToken: string | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

/** Register the active JWT (or clear it) for outgoing requests. */
export function setAuthAccessToken(token: string | null): void {
  currentAccessToken = token;
}

/** Register a callback invoked when an authenticated request returns 401. */
export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

function buildHeaders(options: RequestOptions): Record<string, string> {
  const inferred: Record<string, string> = currentAccessToken
    ? { Authorization: `Bearer ${currentAccessToken}` }
    : {};
  if (!(options.isFormData && options.body instanceof FormData)) {
    inferred['Content-Type'] = 'application/json';
  }
  return { ...inferred, ...(options.headers ?? {}) };
}

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, isFormData } = options;
  const isForm = isFormData && body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    signal,
    headers: buildHeaders(options),
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await parseBody(response);
    if (response.status === 401 && currentAccessToken) {
      onUnauthorizedHandler?.();
    }
    const errBody: ApiErrorBody =
      payload && typeof payload === 'object' && 'code' in (payload as object)
        ? (payload as ApiErrorBody)
        : {
            code: 'http_error',
            message: `Request failed with status ${response.status}`,
            details: {},
            status_code: response.status,
          };
    throw new ApiClientError(errBody);
  }

  if (response.status === 204) return undefined as T;
  return (await parseBody(response)) as T;
}

/** Authenticated binary response helper for evidence retrieval. */
export async function apiFetchBlob(
  baseUrl: string,
  path: string,
  options: Omit<RequestOptions, 'body' | 'isFormData'> = {},
): Promise<Blob> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers: buildHeaders(options),
  });
  if (!response.ok) {
    const payload = await parseBody(response);
    const errBody: ApiErrorBody =
      payload && typeof payload === 'object' && 'code' in (payload as object)
        ? (payload as ApiErrorBody)
        : {
            code: 'http_error',
            message: `Request failed with status ${response.status}`,
            details: {},
            status_code: response.status,
          };
    throw new ApiClientError(errBody);
  }
  return response.blob();
}
