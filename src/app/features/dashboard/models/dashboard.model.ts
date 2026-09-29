// Matches com.hrms.dashboard.dto.response.HrDashboardResponse exactly.
export interface HrDashboardSummary {
  totalStrength: number;
  newJoinersToday: number;
  joiningThisWeek: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  pendingRegularizations: number;
  pendingOvertimeRequests: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
