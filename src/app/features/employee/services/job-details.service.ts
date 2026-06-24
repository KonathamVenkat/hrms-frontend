import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { JobDetails, JobDetailsRequest, ApiResponse } from '../models/job-details.model';

@Injectable({ providedIn: 'root' })
export class JobDetailsService {
  private http = inject(HttpClient);

  private url(employeeId: number): string {
    return `${environment.serviceUrl}/api/v1/employees/${employeeId}/job-details`;
  }

  getCurrentJob(employeeId: number): Observable<ApiResponse<JobDetails>> {
    return this.http.get<ApiResponse<JobDetails>>(`${this.url(employeeId)}/current`);
  }

  getJobHistory(employeeId: number): Observable<ApiResponse<JobDetails[]>> {
    return this.http.get<ApiResponse<JobDetails[]>>(`${this.url(employeeId)}/history`);
  }

  assignJob(employeeId: number, payload: JobDetailsRequest): Observable<ApiResponse<JobDetails>> {
    return this.http.post<ApiResponse<JobDetails>>(this.url(employeeId), payload);
  }

  updateCurrentJob(
    employeeId: number,
    payload: JobDetailsRequest,
  ): Observable<ApiResponse<JobDetails>> {
    return this.http.put<ApiResponse<JobDetails>>(`${this.url(employeeId)}/current`, payload);
  }
}
