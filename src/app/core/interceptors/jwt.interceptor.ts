import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';

/** Backend endpoints that must be reachable without a session (a 401 from these is a normal failure). */
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/**
 * - Attaches the access token ONLY to requests for our own backend (never to third-party
 *   or same-origin asset requests such as translation files).
 * - A 401 from the backend means the session is over (expired, account deactivated, role
 *   changed): clear it and go to the sign-in page.
 * - A 403 PASSWORD_CHANGE_REQUIRED means the user must replace a temporary password first.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const auth = inject(Auth);
  const router = inject(Router);

  const isBackendCall = req.url.startsWith(environment.serviceUrl);
  const isPublic = PUBLIC_ENDPOINTS.some((p) => req.url.includes(p));
  const token = auth.getToken();

  const outgoing =
    isBackendCall && token && !isPublic
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (isBackendCall && !isPublic && err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          auth.clearSession();
          router.navigateByUrl('/auth/login');
        } else if (err.status === 403 && err.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
          router.navigateByUrl('/auth/change-password');
        }
      }
      return throwError(() => err);
    }),
  );
};
