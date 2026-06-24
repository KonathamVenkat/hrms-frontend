import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LeaveType, LeaveTypeRequest } from '../models/leave-type';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

@Injectable({ providedIn: 'root' })
export class LeaveTypeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/admin/leave-types`;

  getAll(): Observable<ApiResponse<LeaveType[]>> {
    return this.http.get<ApiResponse<LeaveType[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<LeaveType>> {
    return this.http.get<ApiResponse<LeaveType>>(`${this.baseUrl}/${id}`);
  }

  create(payload: LeaveTypeRequest): Observable<ApiResponse<LeaveType>> {
    return this.http.post<ApiResponse<LeaveType>>(this.baseUrl, payload);
  }

  update(id: number, payload: LeaveTypeRequest): Observable<ApiResponse<LeaveType>> {
    return this.http.put<ApiResponse<LeaveType>>(`${this.baseUrl}/${id}`, payload);
  }

  deactivate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  activate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/activate`, {});
  }
}
