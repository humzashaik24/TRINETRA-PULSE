export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
  path?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
}
