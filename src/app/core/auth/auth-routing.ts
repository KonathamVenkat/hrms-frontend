// features/auth/auth-routing.ts
import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('../../features/auth/login/login').then((m) => m.LoginComponent),
    title: 'Sign In · EHRMS',
  },
  {
    // Needs a session: it's used both from the user menu and, right after sign-in, to
    // replace a temporary password.
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../../features/auth/change-password/change-password').then((m) => m.ChangePassword),
    title: 'Change Password · EHRMS',
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
