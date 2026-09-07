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

/**
 * SIH demonstration identity sent to the backend on every request.
 *
 * The real application layer gates on an identity via the ``X-User-Id`` header
 * (``app/api/deps.py``): in production the header is required AND must match the
 * server-configured actor (``AUTH_ACTOR_EMAIL``), so a client can not impersonate
 * an arbitrary identity; any non-matching value is rejected with 401. For the
 * demonstration the web client presents the documented default inspector so the
 * deployed browser → FastAPI → PostgreSQL flow works end-to-end without a full
 * authentication system. A real auth layer would replace this value with the
 * authenticated user's identifier rather than altering the API contract.
 */
const DEMO_USER_ID = 'inspector.mehta@trinetra.local';

export async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal, headers, isFormData } = options;
  const isForm = isFormData && body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    signal,
    headers: isForm
      ? { 'X-User-Id': DEMO_USER_ID, ...(headers ?? {}) }
      : {
          'Content-Type': 'application/json',
          'X-User-Id': DEMO_USER_ID,
          ...(headers ?? {}),
        },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
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

  if (response.status === 204) return undefined as T;
  return (await parseBody(response)) as T;
}
