import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, AuditEvent, AuditEventFilter, PagedResponse } from '../models/audit-event';

@Injectable({ providedIn: 'root' })
export class AuditEventService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/admin/audit-events`;

  search(filter: AuditEventFilter): Observable<ApiResponse<PagedResponse<AuditEvent>>> {
    let params = new HttpParams().set('page', filter.page).set('size', filter.size);
    for (const key of ['actor', 'action', 'targetType', 'targetId', 'from', 'to'] as const) {
      const value = filter[key]?.trim();
      if (value) params = params.set(key, value);
    }
    return this.http.get<ApiResponse<PagedResponse<AuditEvent>>>(this.baseUrl, { params });
  }
}
