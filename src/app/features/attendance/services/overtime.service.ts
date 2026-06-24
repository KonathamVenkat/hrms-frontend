import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  OvertimeResponse,
  OvertimeSubmitRequest,
  OvertimeActionRequest,
} from '../models/overtime.model';
import { RegularizationStatus } from '../models/regularization.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class OvertimeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.serviceUrl}/api/v1/attendance/overtime`;

  // ── Employee operations ──────────────────────────────────
  submit(request: OvertimeSubmitRequest): Observable<OvertimeResponse> {
    return this.http
      .post<ApiResponse<OvertimeResponse>>(`${this.base}/submit`, request)
      .pipe(map((r) => r.data));
  }

  cancel(otId: string, employeeId: number): Observable<OvertimeResponse> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    return this.http
      .patch<ApiResponse<OvertimeResponse>>(`${this.base}/${otId}/cancel`, null, { params })
      .pipe(map((r) => r.data));
  }

  getMyRequests(
    employeeId: number,
    page = 0,
    size = 10,
  ): Observable<PagedResponse<OvertimeResponse>> {
    const params = new HttpParams()
      .set('employeeId', employeeId.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http
      .get<ApiResponse<PagedResponse<OvertimeResponse>>>(`${this.base}/my`, { params })
      .pipe(map((r) => r.data));
  }

  getById(otId: string): Observable<OvertimeResponse> {
    return this.http
      .get<ApiResponse<OvertimeResponse>>(`${this.base}/${otId}`)
      .pipe(map((r) => r.data));
  }

  // ── HR / Manager operations ──────────────────────────────
  approve(otId: string, request: OvertimeActionRequest): Observable<OvertimeResponse> {
    return this.http
      .patch<ApiResponse<OvertimeResponse>>(`${this.base}/${otId}/approve`, request)
      .pipe(map((r) => r.data));
  }

  reject(otId: string, request: OvertimeActionRequest): Observable<OvertimeResponse> {
    return this.http
      .patch<ApiResponse<OvertimeResponse>>(`${this.base}/${otId}/reject`, request)
      .pipe(map((r) => r.data));
  }

  getAllRequests(
    status?: RegularizationStatus,
    employeeId?: number,
    from?: string,
    to?: string,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<OvertimeResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status) params = params.set('status', status);
    if (employeeId) params = params.set('employeeId', employeeId.toString());
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http
      .get<ApiResponse<PagedResponse<OvertimeResponse>>>(`${this.base}/all`, { params })
      .pipe(map((r) => r.data));
  }

  getPendingCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(`${this.base}/pending-count`)
      .pipe(map((r) => r.data));
  }
}
