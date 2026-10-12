import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';
import { AuthService } from '../auth/auth.service';

/** Backend endpoints that must be reachable without a session (a 401 from these is a normal failure). */
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/**
 * - Attaches the access token ONLY to requests for our own backend (never to third-party
 *   or same-origin asset requests such as translation files).
 * - A 401 from the backend usually means the short-lived access token expired: renew it once
 *   with the refresh cookie and retry the request. If that fails too, the session is over
 *   (expired, account deactivated, role changed): clear it and go to the sign-in page.
 * - A 403 PASSWORD_CHANGE_REQUIRED means the user must replace a temporary password first.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);

  const isBackendCall = req.url.startsWith(environment.serviceUrl);
  const isPublic = PUBLIC_ENDPOINTS.some((p) => req.url.includes(p));
  const token = auth.getToken();

  const outgoing =
    isBackendCall && token && !isPublic
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  const endSession = (err: unknown) => {
    auth.clearSession();
    router.navigateByUrl('/auth/login');
    return throwError(() => err);
  };

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (isBackendCall && !isPublic && err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          if (!token) return endSession(err);
          return authService.refreshAccessToken().pipe(
            switchMap((fresh) =>
              next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } })),
            ),
            // Refresh rejected, or the retry still 401: the session is over. Other errors
            // (e.g. 403/500 from the retried call, network down) go to the caller untouched.
            catchError((e: unknown) =>
              e instanceof HttpErrorResponse && e.status === 401
                ? endSession(e)
                : throwError(() => e),
            ),
          );
        } else if (err.status === 403 && err.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
          router.navigateByUrl('/auth/change-password');
        }
      }
      return throwError(() => err);
    }),
  );
};
