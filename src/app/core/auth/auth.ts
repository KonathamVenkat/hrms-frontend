// src/app/core/auth/auth.ts

import { Injectable } from '@angular/core';

/**
 * localStorage keys that older versions used to hold the whole session, tokens included. They are
 * only ever removed now: tokens stay in memory (access) or in an HttpOnly cookie (refresh), so
 * script running in the page cannot read them.
 */
const LEGACY_SESSION_KEYS = [
  'hrms_access_token',
  'hrms_refresh_token',
  'hrms_user',
  'hrms_token_expiry',
] as const;

/**
 * Non-secret marker that a sign-in happened in this browser. It only tells the app that asking the
 * server to restore the session (using the refresh cookie) is worthwhile, which avoids a pointless
 * failing request on every first visit.
 */
export const SESSION_HINT_KEY = 'hrms_session_hint';

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

/**
 * Matches com.hrms.auth.dto.response.LoginResponse. The refresh token is not part of the body: the
 * server sets it as an HttpOnly cookie.
 */
export interface LoginResponse {
  accessToken: string;
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
  // The session lives in memory only. A page reload restores it from the refresh cookie
  // (AuthService.restoreSession).
  private accessToken: string | null = null;
  private user: StoredUser | null = null;
  private expiresAt = 0;

  // ── Token ─────────────────────────────────────────────────

  getToken(): string | null {
    return this.accessToken;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = this.decodePayload(token);
      // Check expiry
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        this.accessToken = null;
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

  /** The user object the backend returned at sign-in (name, role, mustChangePassword, ...). */
  getStoredUser(): StoredUser | null {
    return this.user;
  }

  saveSession(login: LoginResponse): void {
    // A fresh sign-in must never inherit the previous user's cached sidebar menu.
    this.clearSession();
    this.accessToken = login.accessToken;
    this.user = login.user;
    this.expiresAt = Date.now() + login.expiresIn * 1000;
    this.storageSet(SESSION_HINT_KEY, '1');
  }

  /** True when there is an access token that hasn't passed its expiry time. */
  hasValidSession(): boolean {
    return !!this.accessToken && Date.now() < this.expiresAt;
  }

  /** True when this browser signed in before, so restoring the session from the cookie may work. */
  hasSessionHint(): boolean {
    return this.storageGet(SESSION_HINT_KEY) === '1';
  }

  // ── Logout ────────────────────────────────────────────────

  /**
   * Forgets the signed-in user locally: tokens, user object and the cached sidebar menu, plus any
   * session keys left behind by older versions. Deliberately leaves unrelated keys (e.g. the chosen
   * language) alone — never `localStorage.clear()`. Use AuthService.signOut() to also revoke the
   * session server-side.
   */
  clearSession(): void {
    this.accessToken = null;
    this.user = null;
    this.expiresAt = 0;
    try {
      [...LEGACY_SESSION_KEYS, SESSION_HINT_KEY].forEach((key) => localStorage.removeItem(key));
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
