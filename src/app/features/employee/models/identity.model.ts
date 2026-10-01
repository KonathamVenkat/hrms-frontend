export interface IdentityInfo {
  employeeIdentityId?: number;
  employeeId: number;
  nationalId?: string;
  passportNumber?: string;
  taxId?: string;
  socialSecurityNumber?: string;
  drivingLicenseNumber?: string;
  visaNumber?: string;
  visaType?: string;
  visaIssueDate?: string; // YYYY-MM-DD
  visaExpiryDate?: string;
  visaExpiringSoon?: boolean; // computed by backend
  workPermitNumber?: string;
  workPermitExpiry?: string;
  workPermitExpiringSoon?: boolean; // computed by backend
  biometricId?: string;
  masked?: boolean; // true: numbers are masked by the backend (last 4 only); read-only view
  createdAt?: string;
  updatedAt?: string;
}

export interface IdentityInfoRequest {
  nationalId?: string;
  passportNumber?: string;
  taxId?: string;
  socialSecurityNumber?: string;
  drivingLicenseNumber?: string;
  visaNumber?: string;
  visaType?: string;
  visaIssueDate?: string;
  visaExpiryDate?: string;
  workPermitNumber?: string;
  workPermitExpiry?: string;
  biometricId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
