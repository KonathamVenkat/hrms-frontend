// src/app/features/attendance/models/attendance.model.ts

export type AttendanceStatus =
  | 'PRESENT' | 'ABSENT' | 'HALF_DAY'
  | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND' | 'LATE';

export type PunchSource = 'MANUAL' | 'BIOMETRIC' | 'WEB' | 'MOBILE';

export interface AttendanceLogResponse {
  logId:              number;
  employeeId:         number;
  employeeCode:       string;
  employeeName:       string;
  attendanceDate:     string;
  checkInTime:        string | null;
  checkOutTime:       string | null;
  workingMinutes:     number;
  overtimeMinutes:    number;
  lateMinutes:        number;
  earlyLeaveMinutes:  number;
  status:             AttendanceStatus;
  punchSource:        PunchSource;
  locationId:         number | null;
  locationName:       string | null;
  shiftName:          string | null;
  shiftStartTime:     string | null;
  shiftEndTime:       string | null;
  notes:              string | null;
  isRegularized:      boolean;
  createdAt:          string;
  updatedAt:          string;
}

export interface AttendanceSummaryResponse {
  summaryId:            number | null;
  employeeId:           number;
  employeeCode:         string;
  employeeName:         string;
  departmentName:       string | null;
  designationName:      string | null;
  summaryYear:          number;
  summaryMonth:         number;
  monthLabel:           string;
  // Day counters
  presentDays:          number;
  absentDays:           number;
  halfDays:             number;
  lateDays:             number;
  leaveDays:            number;
  holidayDays:          number;
  weekendDays:          number;
  totalWorkingDays:     number;
  // Time accumulators
  totalWorkingMins:     number;
  totalOvertimeMins:    number;
  totalLateMins:        number;
  // Formatted
  totalWorkingHours:    string;
  totalOvertimeHours:   string;
  totalLateHours:       string;
  attendancePercentage: number;
  // Meta
  isCurrentMonth:       boolean;
  lastCalculatedAt:     string | null;
}

export interface CheckInRequest {
  employeeId:   number;
  punchSource?: PunchSource;
  locationId?:  number;
  notes?:       string;
}

export interface CheckOutRequest {
  employeeId:    number;
  punchSource?:  PunchSource;
  notes?:        string;
}

// Status display config
// Note: `label` values are ngx-translate keys, not display text — templates must pipe
// them through `| translate` (e.g. `getStatusStyle(row.status).label | translate`).
export const STATUS_CONFIG: Record<AttendanceStatus,
  { label: string; color: string; bg: string; icon: string }> = {
  PRESENT:  { label: 'attendance.status.present',  color: '#166534', bg: '#dcfce7', icon: 'check_circle' },
  LATE:     { label: 'attendance.status.late',     color: '#92400e', bg: '#fef3c7', icon: 'schedule'     },
  ABSENT:   { label: 'attendance.status.absent',   color: '#991b1b', bg: '#fee2e2', icon: 'cancel'       },
  HALF_DAY: { label: 'attendance.status.halfDay',  color: '#1e40af', bg: '#dbeafe', icon: 'brightness_5' },
  ON_LEAVE: { label: 'attendance.status.onLeave',  color: '#6b21a8', bg: '#f3e8ff', icon: 'beach_access' },
  HOLIDAY:  { label: 'attendance.status.holiday',  color: '#0e7490', bg: '#cffafe', icon: 'celebration'  },
  WEEKEND:  { label: 'attendance.status.weekend',  color: '#475569', bg: '#f1f5f9', icon: 'weekend'      },
};
