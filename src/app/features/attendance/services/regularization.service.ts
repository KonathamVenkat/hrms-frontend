// src/app/features/attendance/services/regularization.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  RegularizationResponse,
  RegularizationRequest,
  RegularizationActionRequest,
  RegularizationStatus,
} from '../models/regularization.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class RegularizationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.serviceUrl}/api/v1/attendance/regularization`;

  // ── Employee operations ─────────────────────────────────────
  submit(request: RegularizationRequest): Observable<RegularizationResponse> {
    return this.http
      .post<ApiResponse<RegularizationResponse>>(`${this.base}/submit`, request)
      .pipe(map((r) => r.data));
  }

  cancel(regId: number, employeeId: number): Observable<RegularizationResponse> {
    const params = new HttpParams().set('employeeId', employeeId.toString());
    return this.http
      .patch<ApiResponse<RegularizationResponse>>(`${this.base}/${regId}/cancel`, null, { params })
      .pipe(map((r) => r.data));
  }

  getMyRequests(
    employeeId: number,
    page = 0,
    size = 10,
  ): Observable<PagedResponse<RegularizationResponse>> {
    const params = new HttpParams()
      .set('employeeId', employeeId.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http
      .get<ApiResponse<PagedResponse<RegularizationResponse>>>(`${this.base}/my`, { params })
      .pipe(map((r) => r.data));
  }

  getById(regId: number): Observable<RegularizationResponse> {
    return this.http
      .get<ApiResponse<RegularizationResponse>>(`${this.base}/${regId}`)
      .pipe(map((r) => r.data));
  }

  // ── HR / Manager operations ─────────────────────────────────
  approve(regId: number, request: RegularizationActionRequest): Observable<RegularizationResponse> {
    return this.http
      .patch<ApiResponse<RegularizationResponse>>(`${this.base}/${regId}/approve`, request)
      .pipe(map((r) => r.data));
  }

  reject(regId: number, request: RegularizationActionRequest): Observable<RegularizationResponse> {
    return this.http
      .patch<ApiResponse<RegularizationResponse>>(`${this.base}/${regId}/reject`, request)
      .pipe(map((r) => r.data));
  }

  getAllRequests(
    status?: RegularizationStatus,
    employeeId?: number,
    from?: string,
    to?: string,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<RegularizationResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (status) params = params.set('status', status);
    if (employeeId) params = params.set('employeeId', employeeId.toString());
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http
      .get<ApiResponse<PagedResponse<RegularizationResponse>>>(`${this.base}/all`, { params })
      .pipe(map((r) => r.data));
  }

  getPendingCount(): Observable<number> {
    return this.http
      .get<ApiResponse<number>>(`${this.base}/pending-count`)
      .pipe(map((r) => r.data));
  }
}
