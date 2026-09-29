export interface LeaveType {
  leaveTypeId: number;
  code: string;
  nameEn: string;
  nameAr: string;
  description?: string;
  defaultDays: number;
  isPaid: boolean;
  isCarryForward: boolean;
  maxCarryDays: number;
  requiresDocument: boolean;
  docMaxFileSizeMb?: number;
  docAllowedExtensions?: string;
  minNoticeDays: number;
  maxConsecutiveDays: number;
  applicableGender: string;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface LeaveTypeRequest {
  code: string;
  nameEn: string;
  nameAr: string;
  description?: string;
  defaultDays: number;
  isPaid: boolean;
  isCarryForward: boolean;
  maxCarryDays: number;
  requiresDocument: boolean;
  docMaxFileSizeMb?: number;
  docAllowedExtensions?: string;
  minNoticeDays: number;
  maxConsecutiveDays: number;
  applicableGender: string;
  sortOrder: number;
  isActive?: boolean;
}
