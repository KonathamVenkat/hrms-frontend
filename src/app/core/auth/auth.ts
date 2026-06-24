// src/app/core/auth/auth.ts

import { Injectable } from '@angular/core';

export interface CurrentUser {
  employeeId: number;
  employeeCode: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly TOKEN_KEY = 'hrms_access_token';

  // ── Token ─────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = this.decodePayload(token);
      // Check expiry
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        this.removeToken();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── Current user from JWT payload ─────────────────────────

  getCurrentUser(): CurrentUser | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = this.decodePayload(token);

      return {
        // Try all common field names backends use
        employeeId: payload.employeeId ?? payload.employee_id ?? payload.empId ?? 0,

        employeeCode: payload.employeeCode ?? payload.employee_code ?? payload.empCode ?? '',

        username: payload.sub ?? payload.username ?? payload.userName ?? '',

        fullName: payload.fullName ?? payload.full_name ?? payload.name ?? '',

        role: payload.role ?? payload.roles ?? payload.authorities ?? '',

        email: payload.email ?? '',
      };
    } catch {
      return null;
    }
  }

  // ── Get individual fields ─────────────────────────────────

  getEmployeeId(): number {
    return this.getCurrentUser()?.employeeId ?? 0;
  }

  getRole(): string {
    return this.getCurrentUser()?.role ?? '';
  }

  getUsername(): string {
    return this.getCurrentUser()?.username ?? '';
  }

  // ── Logout ────────────────────────────────────────────────

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('hrms_user');
  }

  // ── Private: decode JWT payload ───────────────────────────

  private decodePayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    return JSON.parse(atob(parts[1]));
  }
}
