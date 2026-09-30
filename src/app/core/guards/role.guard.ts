import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../auth/auth';

/**
 * Lets a route through only when the signed-in user has one of `allowedRoles`; anyone else
 * is sent to the dashboard. Pair it with `authGuard` (which the `/app` shell already has).
 *
 * This is a UI convenience — it keeps people out of screens whose API calls would only
 * answer 403. The backend enforces access on every endpoint regardless.
 */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth = inject(Auth);
    const router = inject(Router);

    return auth.hasAnyRole(...allowedRoles) ? true : router.createUrlTree(['/app/dashboard']);
  };
}

/** The roles that may open HR-facing screens (employee records, approval queues). */
export const HR_ROLES = ['HR_ADMIN', 'HR_MANAGER'] as const;
