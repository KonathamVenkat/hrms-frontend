// src/app/features/payroll/services/payroll.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  SalaryComponentResponse,
  SalaryComponentRequest,
  SalaryStructureResponse,
  SalaryStructureRequest,
  EmployeeSalaryResponse,
  EmployeeSalaryRequest,
  ComponentType,
} from '../models/payroll.model';

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
export class PayrollService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.serviceUrl}/api/v1/payroll`;

  // ── Salary Components ──────────────────────────────────
  getComponents(activeOnly = true): Observable<SalaryComponentResponse[]> {
    const params = new HttpParams().set('activeOnly', activeOnly.toString());
    return this.http
      .get<ApiResponse<SalaryComponentResponse[]>>(`${this.base}/components`, { params })
      .pipe(map((r) => r.data));
  }

  getComponentsByType(type: ComponentType): Observable<SalaryComponentResponse[]> {
    return this.http
      .get<ApiResponse<SalaryComponentResponse[]>>(`${this.base}/components/type/${type}`)
      .pipe(map((r) => r.data));
  }

  createComponent(req: SalaryComponentRequest): Observable<SalaryComponentResponse> {
    return this.http
      .post<ApiResponse<SalaryComponentResponse>>(`${this.base}/components`, req)
      .pipe(map((r) => r.data));
  }

  updateComponent(id: number, req: SalaryComponentRequest): Observable<SalaryComponentResponse> {
    return this.http
      .put<ApiResponse<SalaryComponentResponse>>(`${this.base}/components/${id}`, req)
      .pipe(map((r) => r.data));
  }

  toggleComponent(id: number, active: boolean): Observable<void> {
    const params = new HttpParams().set('active', active.toString());
    return this.http
      .patch<ApiResponse<void>>(`${this.base}/components/${id}/toggle`, null, { params })
      .pipe(map((r) => r.data));
  }

  // ── Salary Structures ──────────────────────────────────
  getStructures(activeOnly = true): Observable<SalaryStructureResponse[]> {
    const params = new HttpParams().set('activeOnly', activeOnly.toString());
    return this.http
      .get<ApiResponse<SalaryStructureResponse[]>>(`${this.base}/structures`, { params })
      .pipe(map((r) => r.data));
  }

  getStructureById(id: number): Observable<SalaryStructureResponse> {
    return this.http
      .get<ApiResponse<SalaryStructureResponse>>(`${this.base}/structures/${id}`)
      .pipe(map((r) => r.data));
  }

  createStructure(req: SalaryStructureRequest): Observable<SalaryStructureResponse> {
    return this.http
      .post<ApiResponse<SalaryStructureResponse>>(`${this.base}/structures`, req)
      .pipe(map((r) => r.data));
  }

  updateStructure(id: number, req: SalaryStructureRequest): Observable<SalaryStructureResponse> {
    return this.http
      .put<ApiResponse<SalaryStructureResponse>>(`${this.base}/structures/${id}`, req)
      .pipe(map((r) => r.data));
  }

  toggleStructure(id: number, active: boolean): Observable<void> {
    const params = new HttpParams().set('active', active.toString());
    return this.http
      .patch<ApiResponse<void>>(`${this.base}/structures/${id}/toggle`, null, { params })
      .pipe(map((r) => r.data));
  }

  // ── Employee Salary ────────────────────────────────────
  assignSalary(req: EmployeeSalaryRequest): Observable<EmployeeSalaryResponse> {
    return this.http
      .post<ApiResponse<EmployeeSalaryResponse>>(`${this.base}/employee-salary/assign`, req)
      .pipe(map((r) => r.data));
  }

  getCurrentSalary(employeeId: number): Observable<EmployeeSalaryResponse> {
    return this.http
      .get<
        ApiResponse<EmployeeSalaryResponse>
      >(`${this.base}/employee-salary/${employeeId}/current`)
      .pipe(map((r) => r.data));
  }

  getSalaryHistory(employeeId: number): Observable<EmployeeSalaryResponse[]> {
    return this.http
      .get<
        ApiResponse<EmployeeSalaryResponse[]>
      >(`${this.base}/employee-salary/${employeeId}/history`)
      .pipe(map((r) => r.data));
  }

  getAllCurrentSalaries(
    structureId?: number,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<EmployeeSalaryResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (structureId) params = params.set('structureId', structureId.toString());
    return this.http
      .get<
        ApiResponse<PagedResponse<EmployeeSalaryResponse>>
      >(`${this.base}/employee-salary`, { params })
      .pipe(map((r) => r.data));
  }
}
