import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse, HrDashboardSummary } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.serviceUrl}/api/v1/dashboard`;

  /** HR_ADMIN / HR_MANAGER only — the backend rejects everyone else. */
  getHrSummary(): Observable<HrDashboardSummary> {
    return this.http
      .get<ApiResponse<HrDashboardSummary>>(`${this.base}/hr-summary`)
      .pipe(map((r) => r.data));
  }
}
