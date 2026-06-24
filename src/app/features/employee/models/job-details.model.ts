export interface JobDetails {
  jobDetailsId: number;
  employeeId: number;

  // Department
  departmentId: number;
  departmentName: string;
  departmentNameAr: string;
  departmentCode: string;

  // Designation
  designationId: number;
  designationTitle: string;
  designationTitleAr: string;
  gradeLevel?: string;

  // Position
  jobPositionId?: string;

  // Managers
  reportingManagerId?: number;
  reportingManagerName?: string;
  reportingManagerCode?: string;
  functionalManagerId?: number;
  functionalManagerName?: string;
  functionalManagerCode?: string;

  // Location
  locationId: number;
  locationName: string;
  locationNameAr: string;
  locationCode: string;
  locationCity: string;

  // Shift
  shiftId?: number;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;

  // Work
  workMode: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isCurrent: boolean;
  remarks?: string;

  // Audit
  createdBy?: string;
  createdAt?: string;
}

export interface JobDetailsRequest {
  departmentId: number;
  designationId: number;
  jobPositionId?: string;
  reportingManagerId?: number;
  functionalManagerId?: number;
  locationId: number;
  shiftId?: number;
  workMode: string;
  effectiveFrom: string;
  remarks?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
