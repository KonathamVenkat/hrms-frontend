import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Auth } from '../auth/auth';
import { PhotoCache } from './photo-cache.service';

const PATH = '/api/v1/employees/5/photo?v=1';

describe('PhotoCache', () => {
  let cache: PhotoCache;
  let http: HttpTestingController;
  let viewerId = 1;

  beforeEach(() => {
    viewerId = 1;
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: { getEmployeeId: () => viewerId } },
      ],
    });
    cache = TestBed.inject(PhotoCache);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const url = `${environment.serviceUrl}${PATH}`;

  it('hands an http(s) address straight back without a request', () => {
    let shown: string | null = null;
    cache.load('https://cdn.example.com/a.png').subscribe((u) => (shown = u));

    expect(shown).toBe('https://cdn.example.com/a.png');
  });

  it('fetches an uploaded photo once and shares it between callers', () => {
    const shown: (string | null)[] = [];
    cache.load(PATH).subscribe((u) => shown.push(u));
    cache.load(PATH).subscribe((u) => shown.push(u));

    http.expectOne(url).flush(new Blob(['img']));

    expect(shown).toEqual(['blob:photo', 'blob:photo']);
    cache.load(PATH).subscribe((u) => shown.push(u)); // still cached: no new request
    expect(shown).toHaveLength(3);
  });

  it('does not share a photo between two signed-in users of the same tab', () => {
    cache.load(PATH).subscribe();
    http.expectOne(url).flush(new Blob(['img']));

    viewerId = 2;
    cache.load(PATH).subscribe();

    http.expectOne(url).flush(new Blob(['img']));
  });

  it('treats a new version of the photo as a different photo', () => {
    cache.load(PATH).subscribe();
    cache.load('/api/v1/employees/5/photo?v=2').subscribe();

    http.expectOne(url).flush(new Blob(['a']));
    http.expectOne(`${environment.serviceUrl}/api/v1/employees/5/photo?v=2`).flush(new Blob(['b']));
  });

  it('reports a failed load as null and tries again next time', () => {
    let shown: string | null = 'unset';
    cache.load(PATH).subscribe((u) => (shown = u));
    http.expectOne(url).flush(new Blob(['gone']), { status: 404, statusText: 'Not Found' });
    expect(shown).toBeNull();

    cache.load(PATH).subscribe();
    http.expectOne(url).flush(new Blob(['img']));
  });
});
