// src/app/features/attendance/attendance-routing.ts

import { Routes } from '@angular/router';
import { HR_ROLES, roleGuard } from '../../core/guards/role.guard';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: 'log',
    loadComponent: () =>
      import('./pages/attendance-log/attendance-log').then((m) => m.AttendanceLogComponent),
    title: 'Attendance Log · EHRMS',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/attendance-summary/attendance-summary').then((m) => m.AttendanceSummary),
    title: 'Attendance Summary · EHRMS',
  },
  {
    path: 'request',
    loadComponent: () =>
      import('./pages/attendance-request/attendance-request').then((m) => m.AttendanceRequest),
    title: 'Attendance Request · EHRMS',
  },
  {
    path: 'request-approval',
    canActivate: [roleGuard(...HR_ROLES)],
    loadComponent: () =>
      import('./pages/attendance-request-approval/attendance-request-approval').then(
        (m) => m.AttendanceRequestApproval,
      ),
    title: 'Regularization Approval · EHRMS',
  },
  {
    path: 'overtime',
    loadComponent: () =>
      import('./pages/overtime-request/overtime-request').then((m) => m.OvertimeRequest),
    title: 'Overtime Request · EHRMS',
  },
  {
    path: 'overtime-approval',
    canActivate: [roleGuard(...HR_ROLES)],
    loadComponent: () =>
      import('./pages/overtime-approval/overtime-approval').then((m) => m.OvertimeApproval),
    title: 'Overtime Approval · EHRMS',
  },

  {
    path: '',
    redirectTo: 'log',
    pathMatch: 'full',
  },
];
