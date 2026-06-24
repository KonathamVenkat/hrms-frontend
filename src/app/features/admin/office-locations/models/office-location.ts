export interface OfficeLocation {
  locationId: number;
  locationCode: string;
  locationName: string;
  locationNameAr: string;
  locationType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficeLocationRequest {
  locationCode: string;
  locationName: string;
  locationNameAr: string;
  locationType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  country: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  sortOrder: number;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
