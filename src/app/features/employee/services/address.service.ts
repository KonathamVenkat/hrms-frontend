// src/app/features/employee/services/address.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EmployeeAddress, EmployeeAddressRequest, ApiResponse } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);

  private url(employeeId: number): string {
    return `${environment.serviceUrl}/api/v1/employees/${employeeId}/addresses`;
  }

  getAll(employeeId: number): Observable<ApiResponse<EmployeeAddress[]>> {
    return this.http.get<ApiResponse<EmployeeAddress[]>>(this.url(employeeId));
  }

  add(
    employeeId: number,
    payload: EmployeeAddressRequest,
  ): Observable<ApiResponse<EmployeeAddress>> {
    return this.http.post<ApiResponse<EmployeeAddress>>(this.url(employeeId), payload);
  }

  update(
    employeeId: number,
    addressId: number,
    payload: EmployeeAddressRequest,
  ): Observable<ApiResponse<EmployeeAddress>> {
    return this.http.put<ApiResponse<EmployeeAddress>>(
      `${this.url(employeeId)}/${addressId}`,
      payload,
    );
  }

  //  This is what the component calls — must exist
  setPrimary(employeeId: number, addressId: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.url(employeeId)}/${addressId}/set-primary`,
      {},
    );
  }

  //  This is what the component calls — must exist
  remove(employeeId: number, addressId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url(employeeId)}/${addressId}`);
  }
}
