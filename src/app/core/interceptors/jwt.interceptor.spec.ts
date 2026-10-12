import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Auth, LoginResponse } from '../auth/auth';
import { jwtInterceptor } from './jwt.interceptor';

function login(token: string): LoginResponse {
  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 1800,
    user: { id: 1, username: 'sara', email: 's@x.com', fullName: 'Sara Khan', role: 'HR_ADMIN' },
  };
}

describe('jwtInterceptor silent refresh', () => {
  const api = `${environment.serviceUrl}/api/v1`;
  let http: HttpClient;
  let ctl: HttpTestingController;
  let auth: Auth;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'auth/login', children: [] }]),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    auth.saveSession(login('old'));
  });

  afterEach(() => ctl.verify());

  it('renews the token on 401 and retries the request once, with one refresh for parallel calls', () => {
    const results: unknown[] = [];
    http.get(`${api}/a`).subscribe((r) => results.push(r));
    http.get(`${api}/b`).subscribe((r) => results.push(r));

    ctl.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'Unauthorized' });
    ctl.expectOne(`${api}/b`).flush({}, { status: 401, statusText: 'Unauthorized' });
    ctl
      .expectOne(`${api}/auth/refresh`)
      .flush({ success: true, message: 'ok', data: login('new') });

    const retryA = ctl.expectOne(`${api}/a`);
    const retryB = ctl.expectOne(`${api}/b`);
    expect(retryA.request.headers.get('Authorization')).toBe('Bearer new');
    retryA.flush('a');
    retryB.flush('b');
    expect(results).toEqual(['a', 'b']);
    expect(auth.getToken()).toBe('new');
  });

  it('ends the session when the refresh is rejected', () => {
    let failed = false;
    http.get(`${api}/a`).subscribe({ error: () => (failed = true) });
    ctl.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'Unauthorized' });
    ctl.expectOne(`${api}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    expect(auth.getToken()).toBeNull();
  });
});
