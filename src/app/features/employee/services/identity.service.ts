import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IdentityInfo, IdentityInfoRequest, ApiResponse } from '../models/identity.model';

@Injectable({ providedIn: 'root' })
export class IdentityService {
  private http = inject(HttpClient);

  private url(employeeId: number): string {
    return `${environment.serviceUrl}/api/v1/employees/${employeeId}/identity`;
  }

  get(employeeId: number): Observable<ApiResponse<IdentityInfo>> {
    return this.http.get<ApiResponse<IdentityInfo>>(this.url(employeeId));
  }

  save(employeeId: number, payload: IdentityInfoRequest): Observable<ApiResponse<IdentityInfo>> {
    return this.http.put<ApiResponse<IdentityInfo>>(this.url(employeeId), payload);
  }
}
