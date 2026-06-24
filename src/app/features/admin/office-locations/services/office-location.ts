import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { OfficeLocation, OfficeLocationRequest, ApiResponse } from '../models/office-location';

@Injectable({ providedIn: 'root' })
export class OfficeLocationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/admin/office-locations`;

  getAll(): Observable<ApiResponse<OfficeLocation[]>> {
    return this.http.get<ApiResponse<OfficeLocation[]>>(this.baseUrl);
  }
  getActive(): Observable<ApiResponse<OfficeLocation[]>> {
    return this.http.get<ApiResponse<OfficeLocation[]>>(`${this.baseUrl}/active`);
  }
  getById(id: number): Observable<ApiResponse<OfficeLocation>> {
    return this.http.get<ApiResponse<OfficeLocation>>(`${this.baseUrl}/${id}`);
  }
  create(payload: OfficeLocationRequest): Observable<ApiResponse<OfficeLocation>> {
    return this.http.post<ApiResponse<OfficeLocation>>(this.baseUrl, payload);
  }
  update(id: number, payload: OfficeLocationRequest): Observable<ApiResponse<OfficeLocation>> {
    return this.http.put<ApiResponse<OfficeLocation>>(`${this.baseUrl}/${id}`, payload);
  }
  deactivate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/deactivate`, {});
  }
  activate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/activate`, {});
  }
}
