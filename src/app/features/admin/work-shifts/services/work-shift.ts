import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { WorkShift, WorkShiftRequest, ApiResponse } from '../models/work-shift';

@Injectable({ providedIn: 'root' })
export class WorkShiftService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/admin/work-shifts`;

  getAll(): Observable<ApiResponse<WorkShift[]>> {
    return this.http.get<ApiResponse<WorkShift[]>>(this.baseUrl);
  }

  getActive(): Observable<ApiResponse<WorkShift[]>> {
    return this.http.get<ApiResponse<WorkShift[]>>(`${this.baseUrl}/active`);
  }

  getById(id: number): Observable<ApiResponse<WorkShift>> {
    return this.http.get<ApiResponse<WorkShift>>(`${this.baseUrl}/${id}`);
  }

  create(payload: WorkShiftRequest): Observable<ApiResponse<WorkShift>> {
    return this.http.post<ApiResponse<WorkShift>>(this.baseUrl, payload);
  }

  update(id: number, payload: WorkShiftRequest): Observable<ApiResponse<WorkShift>> {
    return this.http.put<ApiResponse<WorkShift>>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/activate`, {});
  }
}
