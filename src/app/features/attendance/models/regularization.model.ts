// src/app/features/attendance/models/regularization.model.ts

export type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RegularizationResponse {
  regId:                  number;
  employeeId:             number;
  employeeCode:           string;
  employeeName:           string;
  attendanceDate:         string;       // yyyy-MM-dd
  attendanceDateFormatted: string;      // "Mon, Jun 14 2026"
  logId:                  number | null;
  requestedInTime:        string;       // ISO datetime
  requestedOutTime:       string | null;
  reason:                 string;
  status:                 RegularizationStatus;
  statusLabel:            string;
  rejectionReason:        string | null;
  reviewedBy:             number | null;
  reviewedByName:         string | null;
  reviewedAt:             string | null;
  isActive:               boolean;
  createdAt:              string;
  updatedAt:              string;
}

export interface RegularizationRequest {
  employeeId:        number;
  attendanceDate:    string;    // yyyy-MM-dd
  requestedInTime:   string;    // yyyy-MM-ddTHH:mm:ss
  requestedOutTime?: string;
  reason:            string;
}

export interface RegularizationActionRequest {
  action:            RegularizationStatus;
  rejectionReason?:  string;
}

// Status display config — `label` values are ngx-translate keys, templates must pipe
// them through `| translate`.
export const REG_STATUS_CONFIG: Record<RegularizationStatus,
  { label: string; color: string; bg: string; icon: string }> = {
  PENDING:   { label: 'attendance.regStatus.pending',   color: '#92400e', bg: '#fef3c7', icon: 'pending'       },
  APPROVED:  { label: 'attendance.regStatus.approved',  color: '#166534', bg: '#dcfce7', icon: 'check_circle'  },
  REJECTED:  { label: 'attendance.regStatus.rejected',  color: '#991b1b', bg: '#fee2e2', icon: 'cancel'        },
  CANCELLED: { label: 'attendance.regStatus.cancelled', color: '#475569', bg: '#f1f5f9', icon: 'do_not_disturb'},
};
