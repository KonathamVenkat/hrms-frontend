export interface DepartmentLookup {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  costCenterCode: string;
}

export interface DesignationLookup {
  id: number;
  code: string;
  title: string;
  titleAr: string;
  gradeLevel: string;
  departmentId: number;
}

export interface CreateEmployeePayload {
  // Personal
  firstName: string;
  firstNameAr: string;
  middleName?: string;
  middleNameAr?: string;
  lastName: string;
  lastNameAr: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationality?: string;
  religion?: string;
  // Contact
  personalEmail: string;
  workEmail?: string;
  personalPhone?: string;
  workPhone?: string;
  // Employment
  hireDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  employmentType?: string;
  employmentStatus?: string;
  // Auth
  username: string;
  password: string;
  role: string;
}

export interface EmployeeQueryParams {
  search?: string;
  departmentId?: number;
  employmentStatus?: string;
  employmentType?: string;
  gender?: string;
  /** Omit entirely for the active-only default; pass `null` explicitly for "all" (active + inactive). */
  isActive?: boolean | null;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface Employee {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  gender: string;
  workEmail: string;
  workPhone: string;
  personalPhone: string;
  profilePhotoUrl?: string;
  employmentStatus: string;
  employmentType: string;
  nationality: string;
  hireDate: string;
  isActive: boolean;
  departmentId: number;
  departmentName: string;
  departmentCode: string;
  designationId?: number;
  designationTitle?: string;
  gradeLevel?: string;
}

export interface EmployeeFilter {
  search: string;
  departmentId: number | null;
  employmentStatus: string;
  employmentType: string;
  gender: string;
  isActive: boolean | null;
}

export interface EmployeePage {
  content: Employee[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  timestamp?: string;
}
