// features/auth/auth-routing.ts
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../../features/auth/login/login').then((m) => m.LoginComponent),
    title: 'Sign In · EHRMS',
  },
  /* {
    path: 'change-password',
    loadComponent: () =>
      import('./change-password/change-password').then((m) => m.ChangePasswordComponent),
    
  /* {
    path: 'change-password',
    loadComponent: () =>
      import('./change-password/change-password.ts').then((m) => m.ChangePasswordComponent),
    title: 'Change Password · HRMS',
  },*/
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
