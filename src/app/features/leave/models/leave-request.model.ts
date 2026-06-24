export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  leaveReqId: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;

  // Leave type
  leaveTypeCode: string;
  leaveTypeName: string;
  isPaid?: boolean;

  // Dates
  startDate: string; // YYYY-MM-DD
  endDate: string;
  totalDays: number;
  reason: string;

  // Status
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string; // maps to backend rejectionReason

  // Balance snapshot
  balanceAvailable?: number;
  balanceTotal?: number;

  // Audit
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeaveRequest {
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveFilterParams {
  status?: string;
  leaveTypeCode?: string;
  year?: number;
  page?: number;
  size?: number;
}

// ── Matches common-lib PagedResponse.java exactly ────────────
export interface PagedResponse<T> {
  content: T[];
  number?: number; // some endpoints return 'number'
  pageNumber?: number; // others return 'pageNumber'
  size?: number;
  pageSize?: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasContent?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
