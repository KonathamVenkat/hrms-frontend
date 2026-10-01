import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Auth, LoginResponse, SESSION_HINT_KEY } from './auth';
import { AuthService } from './auth.service';

const LEGACY_KEYS = ['hrms_access_token', 'hrms_refresh_token', 'hrms_user', 'hrms_token_expiry'];

function loginResponse(): LoginResponse {
  return {
    accessToken: 'access-jwt',
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: { id: 1, username: 'sara', email: 's@x.com', fullName: 'Sara Khan', role: 'HR_ADMIN' },
  };
}

describe('AuthService / Auth session', () => {
  let service: AuthService;
  let auth: Auth;
  let http: HttpTestingController;
  const refreshUrl = `${environment.serviceUrl}/api/v1/auth/refresh`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'auth/login', children: [] }])],
    });
    service = TestBed.inject(AuthService);
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('login sends the cookie, keeps the tokens in memory and writes no token to storage', () => {
    service.login('sara', 'secret123').subscribe();
    const req = http.expectOne(`${environment.serviceUrl}/api/v1/auth/login`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true, message: 'ok', data: loginResponse() });

    expect(auth.hasValidSession()).toBe(true);
    expect(auth.getToken()).toBe('access-jwt');
    expect(auth.getStoredUser()?.username).toBe('sara');
    for (const key of LEGACY_KEYS) expect(localStorage.getItem(key)).toBeNull();
    expect(JSON.stringify({ ...localStorage })).not.toContain('access-jwt');
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
  });

  it('does not ask the server when this browser never signed in, and removes old stored tokens', () => {
    localStorage.setItem('hrms_access_token', 'old-token');
    let done = false;
    service.restoreSession().subscribe(() => (done = true));

    http.expectNone(refreshUrl);
    expect(done).toBe(true);
    expect(localStorage.getItem('hrms_access_token')).toBeNull();
    expect(auth.hasValidSession()).toBe(false);
  });

  it('restores the session from the refresh cookie after a reload', () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    service.restoreSession().subscribe();

    const req = http.expectOne(refreshUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true, message: 'ok', data: loginResponse() });

    expect(auth.hasValidSession()).toBe(true);
    expect(auth.getStoredUser()?.fullName).toBe('Sara Khan');
  });

  it('leaves the user signed out, without failing, when the refresh cookie is no longer valid', () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    let done = false;
    service.restoreSession().subscribe(() => (done = true));

    http.expectOne(refreshUrl).flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(done).toBe(true);
    expect(auth.hasValidSession()).toBe(false);
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it('signing out clears the session at once and asks the server to drop the cookie', () => {
    service.login('sara', 'secret123').subscribe();
    http.expectOne(`${environment.serviceUrl}/api/v1/auth/login`).flush({ success: true, message: 'ok', data: loginResponse() });

    service.signOut();

    expect(auth.hasValidSession()).toBe(false);
    const logout = http.expectOne(`${environment.serviceUrl}/api/v1/auth/logout`);
    expect(logout.request.withCredentials).toBe(true);
    logout.flush({});
  });
});
