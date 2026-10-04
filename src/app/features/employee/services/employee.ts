import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  EmployeePage,
  Employee,
  CreatedEmployee,
  EmployeeQueryParams,
  DepartmentLookup,
  DesignationLookup,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  EmployeeDetailData,
} from '../models/employee';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.serviceUrl}/api/v1/employees`;
  private deptUrl = `${environment.serviceUrl}/api/v1/departments`;
  private desigUrl = `${environment.serviceUrl}/api/v1/designations`;

  // ── GET paginated employee list ───────────────────────────
  getEmployees(params: EmployeeQueryParams = {}): Observable<ApiResponse<EmployeePage>> {
    const body = {
      keyword: params.search || null,
      departmentId: params.departmentId ? +params.departmentId : null,
      employmentStatus: params.employmentStatus || null,
      employmentType: params.employmentType || null,
      gender: params.gender || null,
      // undefined (caller didn't specify) defaults to active-only — the safe
      // default for lookups/dropdowns. Pass `null` explicitly to mean "all
      // (active + inactive)", as the employee-list screen's own filter does.
      isActive: params.isActive === undefined ? true : params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 10,
      sortBy: params.sortBy || 'id',
      sortDir: params.sortDir || 'asc',
    };

    return this.http.post<ApiResponse<EmployeePage>>(
      `${this.baseUrl}/search`, // ← POST to /search
      body,
    );
  }

  // ── GET single employee ───────────────────────────────────
  getEmployee(id: number): Observable<ApiResponse<EmployeeDetailData>> {
    return this.http.get<ApiResponse<EmployeeDetailData>>(`${this.baseUrl}/${id}`);
  }

  // ── Create employee + auth user ───────────────────────────
  createEmployee(payload: CreateEmployeePayload): Observable<ApiResponse<CreatedEmployee>> {
    return this.http.post<ApiResponse<CreatedEmployee>>(this.baseUrl, payload);
  }

  // ── Departments lookup ────────────────────────────────────
  getDepartments(): Observable<ApiResponse<DepartmentLookup[]>> {
    return this.http.get<ApiResponse<DepartmentLookup[]>>(`${this.deptUrl}/lookup`);
  }

  // ── Designations lookup (all) ─────────────────────────────
  getDesignations(): Observable<ApiResponse<DesignationLookup[]>> {
    return this.http.get<ApiResponse<DesignationLookup[]>>(`${this.desigUrl}/lookup`);
  }

  // ── Designations by department (cascading) ────────────────
  getDesignationsByDepartment(deptId: number): Observable<ApiResponse<DesignationLookup[]>> {
    return this.http.get<ApiResponse<DesignationLookup[]>>(
      `${this.desigUrl}/lookup/by-department/${deptId}`,
    );
  }

  // ── Update employee ───────────────────────────────────────
  updateEmployee(
    id: number,
    payload: UpdateEmployeePayload,
  ): Observable<ApiResponse<EmployeeDetailData>> {
    return this.http.put<ApiResponse<EmployeeDetailData>>(`${this.baseUrl}/${id}`, payload);
  }

  // ── Deactivate / Reactivate (HR_ADMIN only) ───────────────
  /** `exitStatus` (TERMINATED, RESIGNED, RETIRED) is recorded together with the deactivation. */
  deactivateEmployee(id: number, exitStatus?: string): Observable<ApiResponse<void>> {
    let params = new HttpParams();
    if (exitStatus) {
      params = params.set('exitStatus', exitStatus);
    }
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`, { params });
  }

  reactivateEmployee(id: number): Observable<ApiResponse<Employee>> {
    return this.http.patch<ApiResponse<Employee>>(`${this.baseUrl}/${id}/reactivate`, {});
  }
}
