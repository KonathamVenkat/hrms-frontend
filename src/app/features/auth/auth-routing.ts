import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../../features/auth/login/login').then((m) => m.LoginComponent),
    title: 'Sign In · HRMS',
  },
  /*{
    path: 'change-password',
    loadComponent: () => import('./change-password/change-password').then((m) => m.ChangePassword),
    title: 'Change Password · HRMS',
  },*/
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
