import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmployeeDocument, EmpDocTypeOption, ApiResponse } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class EmployeeDocumentService {
  private http = inject(HttpClient);

  private url(employeeId: number): string {
    return `${environment.serviceUrl}/api/v1/employees/${employeeId}/documents`;
  }

  getAll(employeeId: number): Observable<ApiResponse<EmployeeDocument[]>> {
    return this.http.get<ApiResponse<EmployeeDocument[]>>(this.url(employeeId));
  }

  upload(employeeId: number, formData: FormData): Observable<ApiResponse<EmployeeDocument>> {
    return this.http.post<ApiResponse<EmployeeDocument>>(this.url(employeeId), formData);
  }

  updateInfo(
    employeeId: number,
    documentId: number,
    payload: object,
  ): Observable<ApiResponse<EmployeeDocument>> {
    return this.http.put<ApiResponse<EmployeeDocument>>(
      `${this.url(employeeId)}/${documentId}`,
      payload,
    );
  }

  verify(employeeId: number, documentId: number): Observable<ApiResponse<EmployeeDocument>> {
    return this.http.patch<ApiResponse<EmployeeDocument>>(
      `${this.url(employeeId)}/${documentId}/verify`,
      {},
    );
  }

  delete(employeeId: number, documentId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url(employeeId)}/${documentId}`);
  }

  getDocumentTypes(): Observable<ApiResponse<EmpDocTypeOption[]>> {
    return this.http.get<ApiResponse<EmpDocTypeOption[]>>(
      `${environment.serviceUrl}/api/v1/admin/document-types/active`,
    );
  }

  downloadFile(employeeId: number, documentId: number): Observable<Blob> {
    return this.http.get(
      `${this.url(employeeId)}/${documentId}/download`,
      { responseType: 'blob' }, // ← key: tells HttpClient to return raw bytes
    ).pipe(catchError((err: unknown) => this.readBlobError(err)));
  }

  /**
   * With responseType 'blob' a JSON error body arrives as a Blob. Parse it back so callers can
   * read `error.message` like they do for any other failed call.
   */
  private readBlobError(err: unknown): Observable<never> {
    if (!(err instanceof HttpErrorResponse) || !(err.error instanceof Blob)) {
      return throwError(() => err);
    }
    return from(err.error.text()).pipe(
      switchMap((text) => {
        let body: unknown = null;
        try {
          body = JSON.parse(text);
        } catch {
          // not JSON — keep the status only
        }
        return throwError(
          () =>
            new HttpErrorResponse({
              error: body,
              headers: err.headers,
              status: err.status,
              statusText: err.statusText,
              url: err.url ?? undefined,
            }),
        );
      }),
    );
  }
}
