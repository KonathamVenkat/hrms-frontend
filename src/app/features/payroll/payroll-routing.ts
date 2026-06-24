// src/app/features/payroll/payroll-routing.ts

import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: 'components',
    loadComponent: () =>
      import('./pages/salary-component/salary-component').then((m) => m.SalaryComponentComponent),
    title: 'Salary Components · EHRMS',
  },
  {
    path: 'structures',
    loadComponent: () =>
      import('./pages/salary-structure/salary-structure').then((m) => m.SalaryStructureComponent),
    title: 'Salary Structures · EHRMS',
  },
  {
    path: 'employee-salary',
    loadComponent: () =>
      import('./pages/employee-salary/employee-salary').then((m) => m.EmployeeSalary),
    title: 'Employee Salary · EHRMS',
  },
  {
    path: '',
    redirectTo: 'components',
    pathMatch: 'full',
  },
];
