// src/app/features/attendance/models/overtime.model.ts

import { RegularizationStatus } from './regularization.model';

export type OvertimeType = 'PRE_APPROVED' | 'POST_FACTO' | 'WEEKEND' | 'HOLIDAY';

export interface OvertimeResponse {
  otId:               string;       // "OT-2026-000001"
  employeeId:         number;
  employeeCode:       string;
  employeeName:       string;
  otDate:             string;       // yyyy-MM-dd
  otDateFormatted:    string;       // "Mon, Jun 14 2026"
  otType:             OvertimeType;
  otTypeLabel:        string;
  startTime:          string;       // ISO datetime
  endTime:            string;
  durationMinutes:    number;
  durationFormatted:  string;       // "2h 30m"
  reason:             string;
  projectCode:        string | null;
  status:             RegularizationStatus;
  statusLabel:        string;
  rejectionReason:    string | null;
  reviewedBy:         number | null;
  reviewedByName:     string | null;
  reviewedAt:         string | null;
  isActive:           boolean;
  createdAt:          string;
  updatedAt:          string;
}

export interface OvertimeSubmitRequest {
  employeeId:   number;
  otDate:       string;         // yyyy-MM-dd
  otType:       OvertimeType;
  startTime:    string;         // yyyy-MM-ddTHH:mm:ss
  endTime:      string;
  reason:       string;
  projectCode?: string;
}

export interface OvertimeActionRequest {
  reviewedBy:       number;
  action:           RegularizationStatus;
  rejectionReason?: string;
}

// OT Type display config — `label` values are ngx-translate keys, templates must pipe
// them through `| translate`.
export const OT_TYPE_CONFIG: Record<OvertimeType,
  { label: string; color: string; bg: string; icon: string }> = {
  PRE_APPROVED: { label: 'attendance.otType.preApproved', color: '#1e40af', bg: '#dbeafe', icon: 'schedule'       },
  POST_FACTO:   { label: 'attendance.otType.postFacto',   color: '#6b21a8', bg: '#f3e8ff', icon: 'history'        },
  WEEKEND:      { label: 'attendance.otType.weekend',     color: '#0e7490', bg: '#cffafe', icon: 'weekend'         },
  HOLIDAY:      { label: 'attendance.otType.holiday',     color: '#166534', bg: '#dcfce7', icon: 'celebration'     },
};

// Status display config — `label` values are ngx-translate keys.
export const OT_STATUS_CONFIG: Record<RegularizationStatus,
  { label: string; color: string; bg: string; icon: string }> = {
  PENDING:   { label: 'attendance.otStatus.pending',   color: '#92400e', bg: '#fef3c7', icon: 'pending'        },
  APPROVED:  { label: 'attendance.otStatus.approved',  color: '#166534', bg: '#dcfce7', icon: 'check_circle'   },
  REJECTED:  { label: 'attendance.otStatus.rejected',  color: '#991b1b', bg: '#fee2e2', icon: 'cancel'         },
  CANCELLED: { label: 'attendance.otStatus.cancelled', color: '#475569', bg: '#f1f5f9', icon: 'do_not_disturb' },
};
