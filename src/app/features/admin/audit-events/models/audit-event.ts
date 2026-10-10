// Matches AuditEventResponse.java exactly. Null fields are left out of the JSON, so they are optional here.
export interface AuditEvent {
  id: number;
  eventTime: string;
  actor: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
}

// Query parameters of GET /api/v1/admin/audit-events; every filter is optional.
export interface AuditEventFilter {
  actor?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  page: number;
  size: number;
}

// Matches common-lib PagedResponse.java exactly
export interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
