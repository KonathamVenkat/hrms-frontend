import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { EmployeePhotoService } from './photo.service';

describe('EmployeePhotoService', () => {
  let service: EmployeePhotoService;
  let http: HttpTestingController;
  const url = `${environment.serviceUrl}/api/v1/employees/5/photo`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EmployeePhotoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads the file as multipart form data under the name "file"', () => {
    const file = new File(['img'], 'me.png', { type: 'image/png' });

    service.upload(5, file).subscribe();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({ success: true, message: '', statusCode: 200, data: { id: 5 } });
  });

  it('removes the photo with DELETE', () => {
    service.remove(5).subscribe();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: '', statusCode: 200, data: { id: 5 } });
  });

  it('downloads the stored photo as a blob from the backend address', () => {
    service.download('/api/v1/employees/5/photo').subscribe();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['img']));
  });
});
