import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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
  private readonly base = `${environment.serviceUrl}/api/v1`;

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.base}/auth/login`, { username, password })
      .pipe(
        map((res) => res.data),
        tap((login) => this.auth.saveSession(login)),
      );
  }

  /**
   * Ends the session: the local session is cleared immediately (so the UI is signed out
   * at once) and the refresh token is revoked server-side in the background — a failed
   * revoke call must never leave the user looking signed in.
   */
  signOut(): void {
    const refreshToken = this.auth.getRefreshToken();
    this.auth.clearSession();
    if (refreshToken) {
      this.http
        .post(`${this.base}/auth/logout`, { token: refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.router.navigateByUrl('/auth/login');
  }

  /** Signed-in user replaces their own password; all their sessions end afterwards. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .post<ApiResponse<null>>(`${this.base}/auth/change-password`, {
        currentPassword,
        newPassword,
      })
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
