// src/app/features/attendance/attendance-routing.ts

import { Routes } from '@angular/router';
import { HR_ROLES, roleGuard } from '../../core/guards/role.guard';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: 'log',
    loadComponent: () =>
      import('./pages/attendance-log/attendance-log').then((m) => m.AttendanceLogComponent),
    title: 'attendance.log.title',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/attendance-summary/attendance-summary').then((m) => m.AttendanceSummary),
    title: 'attendance.summary.title',
  },
  {
    path: 'request',
    loadComponent: () =>
      import('./pages/attendance-request/attendance-request').then((m) => m.AttendanceRequest),
    title: 'attendance.request.title',
  },
  {
    path: 'request-approval',
    canActivate: [roleGuard(...HR_ROLES)],
    loadComponent: () =>
      import('./pages/attendance-request-approval/attendance-request-approval').then(
        (m) => m.AttendanceRequestApproval,
      ),
    title: 'attendance.requestApproval.title',
  },
  {
    path: 'overtime',
    loadComponent: () =>
      import('./pages/overtime-request/overtime-request').then((m) => m.OvertimeRequest),
    title: 'attendance.overtimeRequest.title',
  },
  {
    path: 'overtime-approval',
    canActivate: [roleGuard(...HR_ROLES)],
    loadComponent: () =>
      import('./pages/overtime-approval/overtime-approval').then((m) => m.OvertimeApproval),
    title: 'attendance.overtimeApproval.title',
  },

  {
    path: '',
    redirectTo: 'log',
    pathMatch: 'full',
  },
];
