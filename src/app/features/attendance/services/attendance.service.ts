// src/app/features/attendance/services/attendance.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  AttendanceLogResponse,
  AttendanceSummaryResponse,
  CheckInRequest,
  CheckOutRequest,
} from '../models/attendance.model';

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
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.serviceUrl}/api/v1/attendance`;

  // ── Attendance Log ──────────────────────────────────────────
  checkIn(request: CheckInRequest): Observable<AttendanceLogResponse> {
    return this.http
      .post<ApiResponse<AttendanceLogResponse>>(`${this.base}/check-in`, request)
      .pipe(map((r) => r.data));
  }

  checkOut(request: CheckOutRequest): Observable<AttendanceLogResponse> {
    return this.http
      .post<ApiResponse<AttendanceLogResponse>>(`${this.base}/check-out`, request)
      .pipe(map((r) => r.data));
  }

  getTodayLog(employeeId: number): Observable<AttendanceLogResponse | null> {
    return this.http
      .get<ApiResponse<AttendanceLogResponse>>(`${this.base}/today/${employeeId}`)
      .pipe(map((r) => r.data));
  }

  getLogByDate(employeeId: number, date: string): Observable<AttendanceLogResponse> {
    return this.http
      .get<ApiResponse<AttendanceLogResponse>>(`${this.base}/${employeeId}/date/${date}`)
      .pipe(map((r) => r.data));
  }

  getMonthlyLogs(
    employeeId: number,
    year: number,
    month: number,
  ): Observable<AttendanceLogResponse[]> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http
      .get<ApiResponse<AttendanceLogResponse[]>>(`${this.base}/${employeeId}/monthly`, { params })
      .pipe(map((r) => r.data));
  }

  getAllLogs(
    from: string,
    to: string,
    employeeId?: number,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<AttendanceLogResponse>> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('page', page.toString())
      .set('size', size.toString());
    if (employeeId) params = params.set('employeeId', employeeId.toString());
    return this.http
      .get<ApiResponse<PagedResponse<AttendanceLogResponse>>>(this.base, { params })
      .pipe(map((r) => r.data));
  }

  // ── Attendance Summary ──────────────────────────────────────
  getEmployeeSummary(
    employeeId: number,
    year: number,
    month: number,
  ): Observable<AttendanceSummaryResponse> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http
      .get<
        ApiResponse<AttendanceSummaryResponse>
      >(`${this.base}/summary/employee/${employeeId}`, { params })
      .pipe(map((r) => r.data));
  }

  getAllEmployeesSummary(
    year: number,
    month: number,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<AttendanceSummaryResponse>> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http
      .get<
        ApiResponse<PagedResponse<AttendanceSummaryResponse>>
      >(`${this.base}/summary/all`, { params })
      .pipe(map((r) => r.data));
  }

  getYearlySummary(employeeId: number, year: number): Observable<AttendanceSummaryResponse[]> {
    const params = new HttpParams().set('year', year.toString());
    return this.http
      .get<
        ApiResponse<AttendanceSummaryResponse[]>
      >(`${this.base}/summary/employee/${employeeId}/yearly`, { params })
      .pipe(map((r) => r.data));
  }

  recalculateSummary(
    employeeId: number,
    year: number,
    month: number,
  ): Observable<AttendanceSummaryResponse> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http
      .post<
        ApiResponse<AttendanceSummaryResponse>
      >(`${this.base}/summary/employee/${employeeId}/recalculate`, null, { params })
      .pipe(map((r) => r.data));
  }
}
