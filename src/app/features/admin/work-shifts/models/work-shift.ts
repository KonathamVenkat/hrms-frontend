export interface WorkShift {
  shiftId: number;
  shiftCode: string;
  shiftName: string;
  shiftNameAr: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  workingHours: number;
  gracePeriod: number;
  workingDays: string; // "SUN,MON,TUE,WED,THU"
  isOvernight: boolean;
  isFlexible: boolean;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkShiftRequest {
  shiftCode: string;
  shiftName: string;
  shiftNameAr: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  workingHours: number;
  gracePeriod: number;
  workingDays: string;
  isOvernight: boolean;
  isFlexible: boolean;
  description?: string;
  sortOrder: number;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
