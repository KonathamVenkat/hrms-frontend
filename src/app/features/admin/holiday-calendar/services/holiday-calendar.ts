import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Holiday, HolidayRequest, ApiResponse } from '../models/holiday-calendar';

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/admin/holiday-calendar`;

  getByYear(year: number): Observable<ApiResponse<Holiday[]>> {
    const params = new HttpParams().set('year', year);
    return this.http.get<ApiResponse<Holiday[]>>(this.baseUrl, { params });
  }

  getActiveByYear(year: number): Observable<ApiResponse<Holiday[]>> {
    const params = new HttpParams().set('year', year);
    return this.http.get<ApiResponse<Holiday[]>>(`${this.baseUrl}/active`, { params });
  }

  getById(id: number): Observable<ApiResponse<Holiday>> {
    return this.http.get<ApiResponse<Holiday>>(`${this.baseUrl}/${id}`);
  }

  create(payload: HolidayRequest): Observable<ApiResponse<Holiday>> {
    return this.http.post<ApiResponse<Holiday>>(this.baseUrl, payload);
  }

  update(id: number, payload: HolidayRequest): Observable<ApiResponse<Holiday>> {
    return this.http.put<ApiResponse<Holiday>>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/activate`, {});
  }
}
