import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { HR_ROLES, roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ① Default → login
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },

  // ② Public auth routes (login, change-password)
  {
    path: 'auth',
    loadChildren: () => import('./core/auth/auth-routing').then((m) => m.AUTH_ROUTES),
  },

  // ③ Protected shell
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard · EHRMS',
      },
      {
        // The signed-in user's own record, open to every role (the detail page in "self" mode).
        path: 'profile',
        data: { self: true },
        loadComponent: () =>
          import('./features/employee/pages/employee-detail/employee-detail').then((m) => m.EmployeeDetail),
        title: 'employee.routes.profile',
      },
      {
        path: 'employee',
        canActivate: [roleGuard(...HR_ROLES)],
        loadChildren: () =>
          import('./features/employee/employee-routing').then((m) => m.EMPLOYEE_ROUTES),
      },
      {
        path: 'admin',
        children: [
          {
            path: 'leave-types',
            loadComponent: () =>
              import('./features/admin/leave-types/pages/leave-types/leave-types').then(
                (m) => m.LeaveTypes,
              ),
            title: 'Leave Types · EHRMS',
          },
          {
            path: 'holiday-calendar',
            loadComponent: () =>
              import('./features/admin/holiday-calendar/pages/holiday-calendar/holiday-calendar').then(
                (m) => m.HolidayCalendar,
              ),
            title: 'Holiday Calendar · EHRMS',
          },
          {
            path: 'work-shifts',
            loadComponent: () =>
              import('./features/admin/work-shifts/pages/work-shifts/work-shifts').then(
                (m) => m.WorkShifts,
              ),
            title: 'Work Shifts · EHRMS',
          },
          {
            path: 'office-locations',
            loadComponent: () =>
              import('./features/admin/office-locations/pages/office-location/office-location').then(
                (m) => m.OfficeLocations,
              ),
            title: 'Office Locations · EHRMS',
          },
          {
            path: 'document-types',
            loadComponent: () =>
              import('./features/admin/document-types/pages/document-type/document-type').then(
                (m) => m.DocumentTypes,
              ),
            title: 'Document Types · EHRMS',
          },
          {
            path: '',
            redirectTo: 'leave-types',
            pathMatch: 'full',
          },
        ],
      },

      // ── Leave Management ────────────────────────────
      {
        path: 'leave',
        children: [
          {
            path: 'balances',
            loadComponent: () =>
              import('./features/leave/pages/leave-balance/leave-balance').then(
                (m) => m.LeaveBalancePage,
              ),
            title: 'Leave Balances · EHRMS',
          },
          {
            path: 'requests',
            loadComponent: () =>
              import('./features/leave/pages/leave-list/leave-list').then((m) => m.LeaveListPage),
            title: 'My Leave Requests · EHRMS',
          },
          {
            path: 'apply',
            loadComponent: () =>
              import('./features/leave/pages/leave-apply/leave-apply').then(
                (m) => m.LeaveApplyPage,
              ),
            title: 'Apply Leave · EHRMS',
          },
          {
            path: 'approval',
            canActivate: [roleGuard(...HR_ROLES)],
            loadComponent: () =>
              import('./features/leave/pages/leave-approval/leave-approval').then(
                (m) => m.LeaveApprovalPage,
              ),
            title: 'Leave Approval · EHRMS',
          },
          {
            path: 'calendar',
            loadComponent: () =>
              import('./features/leave/pages/leave-calendar/leave-calendar').then(
                (m) => m.LeaveCalendarPage,
              ),
            title: 'Leave Calendar · EHRMS',
          },
          {
            path: '',
            redirectTo: 'balances',
            pathMatch: 'full',
          },
        ],
      },

      // ── Attendance Management ───────────────────────
      {
        path: 'attendance',
        loadChildren: () =>
          import('./features/attendance/attendance-routing').then((m) => m.ATTENDANCE_ROUTES),
      },
      {
        path: 'payroll',
        loadChildren: () =>
          import('./features/payroll/payroll-routing').then((m) => m.PAYROLL_ROUTES),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // ④ Catch-all → login
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
