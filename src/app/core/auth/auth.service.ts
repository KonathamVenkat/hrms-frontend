import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Auth, LoginResponse } from './auth';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/** All calls to the backend's auth endpoints. Session state itself lives in {@link Auth}. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = `${environment.serviceUrl}/api/v1`;

  // The refresh token is an HttpOnly cookie set and read by these auth endpoints only, so every
  // call that sets, uses or clears it must opt in to sending and accepting cookies.
  private readonly withCookie = { withCredentials: true };

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        `${this.base}/auth/login`,
        { username, password },
        this.withCookie,
      )
      .pipe(
        map((res) => res.data),
        tap((login) => this.auth.saveSession(login)),
      );
  }

  /**
   * Called once at startup. The access token only lives in memory, so after a page reload the
   * session is restored by exchanging the refresh cookie for a new access token. Never fails: any
   * problem (no cookie, expired, server down) just leaves the user signed out.
   */
  restoreSession(): Observable<void> {
    if (!isPlatformBrowser(this.platformId) || this.auth.hasValidSession()) {
      return of(undefined);
    }
    if (!this.auth.hasSessionHint()) {
      this.auth.clearSession(); // also removes tokens older versions left in localStorage
      return of(undefined);
    }
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.base}/auth/refresh`, null, this.withCookie)
      .pipe(
        timeout(8000),
        tap((res) => this.auth.saveSession(res.data)),
        map(() => undefined),
        catchError(() => {
          this.auth.clearSession();
          return of(undefined);
        }),
      );
  }

  /**
   * Ends the session: the local session is cleared immediately (so the UI is signed out
   * at once) and the refresh cookie is revoked and removed by the server in the background —
   * a failed revoke call must never leave the user looking signed in.
   */
  signOut(): void {
    this.auth.clearSession();
    this.http
      .post(`${this.base}/auth/logout`, null, this.withCookie)
      .subscribe({ error: () => undefined });
    this.router.navigateByUrl('/auth/login');
  }

  /** Signed-in user replaces their own password; all their sessions end afterwards. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<null>>(
        `${this.base}/auth/change-password`,
        { currentPassword, newPassword },
        this.withCookie,
      )
      .pipe(map(() => undefined));
  }

  /** HR_ADMIN sets a temporary password for an employee's account. */
  resetPassword(employeeId: number, temporaryPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<null>>(`${this.base}/admin/users/reset-password`, {
        employeeId,
        temporaryPassword,
      })
      .pipe(map(() => undefined));
  }
}
