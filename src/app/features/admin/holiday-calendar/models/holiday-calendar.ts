export interface Holiday {
  holidayId: number;
  holidayName: string;
  holidayNameAr: string;
  holidayDate: string; // YYYY-MM-DD
  holidayType: string; // PUBLIC | RELIGIOUS | OPTIONAL | RESTRICTED
  description?: string;
  isRecurring: boolean;
  year: number;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HolidayRequest {
  holidayName: string;
  holidayNameAr: string;
  holidayDate: string;
  holidayType: string;
  description?: string;
  isRecurring?: boolean;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
