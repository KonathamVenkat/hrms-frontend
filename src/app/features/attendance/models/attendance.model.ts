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
  checkInTime?: string;
  punchSource?: PunchSource;
  locationId?:  number;
  notes?:       string;
}

export interface CheckOutRequest {
  employeeId:    number;
  checkOutTime?: string;
  punchSource?:  PunchSource;
  notes?:        string;
}

// Status display config
export const STATUS_CONFIG: Record<AttendanceStatus,
  { label: string; color: string; bg: string; icon: string }> = {
  PRESENT:  { label: 'Present',  color: '#166534', bg: '#dcfce7', icon: 'check_circle' },
  LATE:     { label: 'Late',     color: '#92400e', bg: '#fef3c7', icon: 'schedule'     },
  ABSENT:   { label: 'Absent',   color: '#991b1b', bg: '#fee2e2', icon: 'cancel'       },
  HALF_DAY: { label: 'Half Day', color: '#1e40af', bg: '#dbeafe', icon: 'brightness_5' },
  ON_LEAVE: { label: 'On Leave', color: '#6b21a8', bg: '#f3e8ff', icon: 'beach_access' },
  HOLIDAY:  { label: 'Holiday',  color: '#0e7490', bg: '#cffafe', icon: 'celebration'  },
  WEEKEND:  { label: 'Weekend',  color: '#475569', bg: '#f1f5f9', icon: 'weekend'      },
};
