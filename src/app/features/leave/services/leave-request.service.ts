import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LeaveRequest,
  CreateLeaveRequest,
  LeaveFilterParams,
  PagedResponse,
  ApiResponse,
  WorkingDays,
} from '../models/leave-request.model';
import { LeaveBalance } from '../models/leave-balance.model';

@Injectable({ providedIn: 'root' })
export class LeaveRequestService {
  private http = inject(HttpClient);
  private document = inject(DOCUMENT);
  private baseUrl = environment.serviceUrl;

  // ── Employee-facing ───────────────────────────────────────

  /** Sent as multipart: the JSON body goes in the `request` part, the optional document in `file`. */
  applyLeave(
    employeeId: number,
    payload: CreateLeaveRequest,
    file?: File | null,
  ): Observable<ApiResponse<LeaveRequest>> {
    const body = new FormData();
    body.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (file) body.append('file', file, file.name);
    return this.http.post<ApiResponse<LeaveRequest>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-requests`,
      body,
    );
  }

  /** Fetches the attachment with the auth header and hands it to the browser as a file download. */
  downloadAttachment(leave: LeaveRequest): Observable<void> {
    return this.http
      .get(
        `${this.baseUrl}/api/v1/employees/${leave.employeeId}/leave-requests/${leave.leaveReqId}/attachment`,
        { responseType: 'blob' },
      )
      .pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          const a = this.document.createElement('a');
          a.href = url;
          a.download = leave.attachmentName ?? 'attachment';
          a.click();
          URL.revokeObjectURL(url);
        }),
      );
  }

  /** Leave days the range costs this employee: their shift's weekly off and public holidays are free. */
  getWorkingDays(
    employeeId: number,
    startDate: string,
    endDate: string,
  ): Observable<ApiResponse<WorkingDays>> {
    return this.http.get<ApiResponse<WorkingDays>>(
      `${this.baseUrl}/api/v1/employees/${employeeId}/leave-requests/working-days`,
      { params: new HttpParams().set('startDate', startDate).set('endDate', endDate) },
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
