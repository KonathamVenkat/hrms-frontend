import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LeaveRequest,
  CreateLeaveRequest,
  LeaveFilterParams,
  PagedResponse,
  ApiResponse,
} from '../models/leave-request.model';
import { LeaveBalance } from '../models/leave-balance.model';

@Injectable({ providedIn: 'root' })
export class LeaveRequestService {
  private http = inject(HttpClient);
  private baseUrl = environment.serviceUrl;

  // ── Employee-facing ───────────────────────────────────────

  applyLeave(
    employeeId: number,
    payload: CreateLeaveRequest,
  ): Observable<ApiResponse<LeaveRequest>> {
    return this.http.post<ApiResponse<LeaveRequest>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-requests`,
      payload,
    );
  }

  getMyLeaves(
    employeeId: number,
    params: LeaveFilterParams = {},
  ): Observable<ApiResponse<PagedResponse<LeaveRequest>>> {
    let p = new HttpParams();
    if (params.status) p = p.set('status', params.status);
    if (params.leaveTypeCode) p = p.set('leaveTypeCode', params.leaveTypeCode);
    if (params.year) p = p.set('year', params.year);
    if (params.page != null) p = p.set('page', params.page);
    if (params.size != null) p = p.set('size', params.size);

    return this.http.get<ApiResponse<PagedResponse<LeaveRequest>>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-requests`,
      { params: p },
    );
  }

  cancelLeave(employeeId: number, leaveReqId: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-requests/${leaveReqId}/cancel`,
      {},
    );
  }

  getBalanceSummary(employeeId: number, year?: number): Observable<ApiResponse<LeaveBalance[]>> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    return this.http.get<ApiResponse<LeaveBalance[]>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-balances/summary`,
      { params: p },
    );
  }

  // ── HR-facing ─────────────────────────────────────────────

  getAllLeaves(
    params: LeaveFilterParams = {},
  ): Observable<ApiResponse<PagedResponse<LeaveRequest>>> {
    let p = new HttpParams();
    if (params.status) p = p.set('status', params.status);
    if (params.leaveTypeCode) p = p.set('leaveTypeCode', params.leaveTypeCode);
    if (params.page != null) p = p.set('page', params.page);
    if (params.size != null) p = p.set('size', params.size);

    return this.http.get<ApiResponse<PagedResponse<LeaveRequest>>>(
      `${this.baseUrl}/api/v1/leave-requests`,
      { params: p },
    );
  }

  processLeave(
    leaveReqId: number,
    action: 'APPROVED' | 'REJECTED',
    remarks?: string,
  ): Observable<ApiResponse<LeaveRequest>> {
    return this.http.patch<ApiResponse<LeaveRequest>>(
      `${this.baseUrl}/api/v1/leave-requests/${leaveReqId}/process`,
      { action, remarks },
    );
  }
}
