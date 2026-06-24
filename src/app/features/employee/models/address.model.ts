export interface EmployeeAddress {
  employeeAddressesId: number;
  employeeId: number;
  addressType: string; // PERMANENT | CURRENT | EMERGENCY | MAILING
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeAddressRequest {
  addressType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;
  isPrimary?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
