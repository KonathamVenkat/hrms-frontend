import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, CreatedEmployee } from '../models/employee';

@Injectable({ providedIn: 'root' })
export class EmployeePhotoService {
  private http = inject(HttpClient);

  /** Largest photo the backend accepts. */
  readonly maxBytes = 2 * 1024 * 1024;

  private url(employeeId: number): string {
    return `${environment.serviceUrl}/api/v1/employees/${employeeId}/photo`;
  }

  upload(employeeId: number, file: File): Observable<ApiResponse<CreatedEmployee>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<ApiResponse<CreatedEmployee>>(this.url(employeeId), formData);
  }

  remove(employeeId: number): Observable<ApiResponse<CreatedEmployee>> {
    return this.http.delete<ApiResponse<CreatedEmployee>>(this.url(employeeId));
  }
}
