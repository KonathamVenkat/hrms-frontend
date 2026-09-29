// src/app/core/auth/auth.ts

import { Injectable } from '@angular/core';

/** localStorage keys that make up a signed-in session. */
export const SESSION_KEYS = {
  accessToken: 'hrms_access_token',
  refreshToken: 'hrms_refresh_token',
  user: 'hrms_user',
  expiry: 'hrms_token_expiry',
} as const;

/** sessionStorage key for the sidebar menu cache (per role/user, so cleared with the session). */
export const SIDEBAR_MENU_CACHE_KEY = 'ehrms_sidebar_menu';

/** Matches com.hrms.auth.dto.response.UserInfoResponse. */
export interface StoredUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  employeeId?: string;
  avatarUrl?: string;
  lastLogin?: string;
  mustChangePassword?: boolean;
}

/** Matches com.hrms.auth.dto.response.LoginResponse. */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number; // seconds
  user: StoredUser;
}

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
  private readonly TOKEN_KEY = SESSION_KEYS.accessToken;

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

        // The backend's JWT carries a `roles` LIST; CurrentUser.role is the (single) primary role
        role: this.rolesFromPayload(payload)[0] ?? '',

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

  /**
   * Roles from the JWT `roles` claim (a list such as ["HR_ADMIN"]; a single string or a
   * Spring-style "ROLE_" prefix are tolerated). UI-only convenience — the backend enforces
   * access on every endpoint regardless of what this returns.
   */
  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];
    try {
      return this.rolesFromPayload(this.decodePayload(token));
    } catch {
      return [];
    }
  }

  private rolesFromPayload(payload: any): string[] {
    const raw = payload.roles ?? payload.role ?? payload.authorities ?? [];
    const list: unknown[] = Array.isArray(raw) ? raw : [raw];
    return list
      .filter((r): r is string => typeof r === 'string' && r.length > 0)
      .map((r) => r.replace(/^ROLE_/, ''));
  }

  hasAnyRole(...roles: string[]): boolean {
    const mine = this.getRoles();
    return roles.some((r) => mine.includes(r));
  }

  getUsername(): string {
    return this.getCurrentUser()?.username ?? '';
  }

  // ── Session storage ───────────────────────────────────────

  getRefreshToken(): string | null {
    return this.storageGet(SESSION_KEYS.refreshToken);
  }

  /** The user object the backend returned at sign-in (name, role, mustChangePassword, ...). */
  getStoredUser(): StoredUser | null {
    const raw = this.storageGet(SESSION_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  saveSession(login: LoginResponse): void {
    // A fresh sign-in must never inherit the previous user's cached sidebar menu.
    this.clearSession();
    this.storageSet(SESSION_KEYS.accessToken, login.accessToken);
    this.storageSet(SESSION_KEYS.refreshToken, login.refreshToken);
    this.storageSet(SESSION_KEYS.user, JSON.stringify(login.user));
    this.storageSet(SESSION_KEYS.expiry, String(Date.now() + login.expiresIn * 1000));
  }

  /** True when the stored access token exists and hasn't passed its expiry time. */
  hasValidSession(): boolean {
    const token = this.getToken();
    const expiry = this.storageGet(SESSION_KEYS.expiry);
    return !!token && !!expiry && Date.now() < parseInt(expiry, 10);
  }

  // ── Logout ────────────────────────────────────────────────

  /**
   * Forgets the signed-in user locally: tokens, user object and the cached sidebar menu.
   * Deliberately leaves unrelated keys (e.g. the chosen language) alone — never
   * `localStorage.clear()`. Use AuthService.logout() to also revoke the session server-side.
   */
  clearSession(): void {
    try {
      Object.values(SESSION_KEYS).forEach((key) => localStorage.removeItem(key));
      sessionStorage.removeItem(SIDEBAR_MENU_CACHE_KEY);
    } catch {
      // storage unavailable (SSR / private mode) — nothing to clear
    }
  }

  logout(): void {
    this.clearSession();
  }

  private storageGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private storageSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage unavailable
    }
  }

  // ── Private: decode JWT payload ───────────────────────────

  private decodePayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    return JSON.parse(atob(parts[1]));
  }
}
