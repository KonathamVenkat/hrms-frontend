import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LeaveBalance,
  InitializeBalancesRequest,
  AdjustBalanceRequest,
  InitializationResult,
  ApiResponse,
} from '../models/leave-balance.model';

@Injectable({ providedIn: 'root' })
export class LeaveBalanceService {
  private http = inject(HttpClient);
  private baseUrl = environment.serviceUrl;

  // ── Employee-facing ───────────────────────────────────────

  getEmployeeBalances(employeeId: number, year?: number): Observable<ApiResponse<LeaveBalance[]>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get<ApiResponse<LeaveBalance[]>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-balances`,
      { params },
    );
  }

  initializeForEmployee(
    employeeId: number,
    year?: number,
  ): Observable<ApiResponse<LeaveBalance[]>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.post<ApiResponse<LeaveBalance[]>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-balances/initialize`,
      {},
      { params },
    );
  }

  adjustBalance(
    employeeId: number,
    payload: AdjustBalanceRequest,
  ): Observable<ApiResponse<LeaveBalance>> {
    return this.http.patch<ApiResponse<LeaveBalance>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-balances/adjust`,
      payload,
    );
  }

  // ── Admin ─────────────────────────────────────────────────

  getAllBalancesForYear(year?: number): Observable<ApiResponse<LeaveBalance[]>> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    return this.http.get<ApiResponse<LeaveBalance[]>>(
      `${this.baseUrl}/api/v1/admin/leave-balances`,
      { params },
    );
  }

  bulkInitialize(
    payload: InitializeBalancesRequest,
  ): Observable<ApiResponse<InitializationResult>> {
    return this.http.post<ApiResponse<InitializationResult>>(
      `${this.baseUrl}/api/v1/admin/leave-balances/initialize`,
      payload,
    );
  }
}
