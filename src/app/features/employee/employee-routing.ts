// src/app/features/employee/employee-routing.ts
// ── Add 'detail/:id' route ────────────────────────────────────

import { Routes } from '@angular/router';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: 'list',
    loadComponent: () => import('./pages/employee-list/employee-list').then((m) => m.EmployeeList),
    title: 'Employees · EHRMS',
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/employee-form/employee-form').then((m) => m.EmployeeForm),
    title: 'Create Employee · EHRMS',
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/employee-form/employee-form').then((m) => m.EmployeeForm),
    title: 'Edit Employee · EHRMS',
  },
  {
    path: 'detail/:id', // ← ADD THIS
    loadComponent: () =>
      import('./pages/employee-detail/employee-detail').then((m) => m.EmployeeDetail),
    title: 'Employee Detail · EHRMS',
  },
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
];
