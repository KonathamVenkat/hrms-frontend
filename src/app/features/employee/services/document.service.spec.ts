import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { EmployeeDocumentService } from './document.service';
import { serverMessage } from '../../../core/utils/http-error-message';

describe('EmployeeDocumentService download', () => {
  let service: EmployeeDocumentService;
  let http: HttpTestingController;
  const url = `${environment.serviceUrl}/api/v1/employees/5/documents/9/download`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EmployeeDocumentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('returns the file bytes on success', async () => {
    const result = new Promise<Blob>((resolve) => service.downloadFile(5, 9).subscribe(resolve));

    http.expectOne(url).flush(new Blob(['pdf']));

    expect((await result).size).toBe(3);
  });

  it('turns a JSON error body (delivered as a Blob) back into a readable error', async () => {
    const failure = new Promise<HttpErrorResponse>((resolve) =>
      service.downloadFile(5, 9).subscribe({ error: resolve }),
    );

    http
      .expectOne(url)
      .flush(new Blob([JSON.stringify({ success: false, message: 'Document content not found' })]), {
        status: 404,
        statusText: 'Not Found',
      });

    const err = await failure;
    expect(err.status).toBe(404);
    expect(serverMessage(err)).toBe('Document content not found');
  });

  it('keeps the status when the error body is not JSON', async () => {
    const failure = new Promise<HttpErrorResponse>((resolve) =>
      service.downloadFile(5, 9).subscribe({ error: resolve }),
    );

    http.expectOne(url).flush(new Blob(['<html>bad gateway</html>']), { status: 502, statusText: 'Bad Gateway' });

    const err = await failure;
    expect(err.status).toBe(502);
    expect(serverMessage(err)).toBeUndefined();
  });
});
