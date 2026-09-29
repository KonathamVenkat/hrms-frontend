import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../auth/auth';

/** Lets a route through only while there is an unexpired session; otherwise goes to sign-in. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.hasValidSession()) return true;

  auth.clearSession();
  return router.createUrlTree(['/auth/login']);
};
