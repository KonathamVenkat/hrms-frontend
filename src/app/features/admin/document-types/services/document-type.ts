import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { DocumentType, DocumentTypeRequest, ApiResponse } from '../models/document-type';

@Injectable({ providedIn: 'root' })
export class DocumentTypeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/admin/document-types`;

  getAll(): Observable<ApiResponse<DocumentType[]>> {
    return this.http.get<ApiResponse<DocumentType[]>>(this.baseUrl);
  }
  getActive(): Observable<ApiResponse<DocumentType[]>> {
    return this.http.get<ApiResponse<DocumentType[]>>(`${this.baseUrl}/active`);
  }
  getById(id: number): Observable<ApiResponse<DocumentType>> {
    return this.http.get<ApiResponse<DocumentType>>(`${this.baseUrl}/${id}`);
  }
  create(payload: DocumentTypeRequest): Observable<ApiResponse<DocumentType>> {
    return this.http.post<ApiResponse<DocumentType>>(this.baseUrl, payload);
  }
  update(id: number, payload: DocumentTypeRequest): Observable<ApiResponse<DocumentType>> {
    return this.http.put<ApiResponse<DocumentType>>(`${this.baseUrl}/${id}`, payload);
  }
  deactivate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/deactivate`, {});
  }
  activate(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.baseUrl}/${id}/activate`, {});
  }
}
