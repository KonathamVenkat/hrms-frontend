export interface LeaveBalance {
  balanceId?: number;
  employeeId: number;
  leaveType: string; // code e.g. "ANNUAL"
  leaveTypeName: string; // display name
  leaveTypeNameAr?: string;
  isPaid?: boolean;
  isCarryForward?: boolean;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  carriedForwardDays?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InitializeBalancesRequest {
  year: number;
  employeeIds?: number[];
  skipExisting: boolean;
  applyCarryForward: boolean;
}

export interface AdjustBalanceRequest {
  leaveTypeCode: string;
  year: number;
  adjustmentType: 'GRANT' | 'DEDUCT' | 'RESET';
  days: number;
  reason: string;
}

export interface InitializationResult {
  year: number;
  totalEmployees: number;
  initializedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
  processedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
