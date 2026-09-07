/**
 * Data-source configuration for the real application layer.
 *
 * Trinetra Pulse ships on deterministic in-memory demo data by default so the
 * existing UI continues to work unchanged. When the platform is pointed at a
 * running backend the data source flips to the relational API.
 *
 * Environment switches:
 *  - NEXT_PUBLIC_USE_MOCK_API   : "true" uses the in-memory demo services
 *                                 (default), "false" uses the /api/v2 backend.
 *  - NEXT_PUBLIC_API_BASE_URL   : base URL for the backend (default "/api/v2").
 */

export type DataSource = 'mock' | 'api';

export const DATA_SOURCE: DataSource =
  process.env.NEXT_PUBLIC_USE_MOCK_API === 'false' ? 'api' : 'mock';

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v2';

/** True when the application is consuming the in-memory demo services. */
export function isMockData(): boolean {
  return DATA_SOURCE === 'mock';
}
