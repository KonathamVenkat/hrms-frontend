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

/** Update payload: no username/password (not changeable here) or workEmail (immutable). */
export interface UpdateEmployeePayload
  extends Omit<CreateEmployeePayload, 'username' | 'password' | 'workEmail' | 'role'> {
  profilePhotoUrl?: string;
  /** Sent only by an HR_ADMIN; the backend rejects a role change from anyone else. */
  role?: string;
  /** The version the form was loaded with; the backend answers 409 if someone saved in between. */
  version?: number;
}

/**
 * What GET /employees/{id} returns (EmployeeDetailResponse). The backend omits null fields,
 * so anything that can be empty is optional here.
 */
export interface EmployeeDetailData {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  firstNameAr: string;
  middleName?: string;
  middleNameAr?: string;
  lastName: string;
  lastNameAr: string;
  fullNameEn: string;
  fullNameAr: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  maritalStatus?: string;
  nationality?: string;
  religion?: string;
  profilePhotoUrl?: string;
  personalEmail: string;
  workEmail: string;
  personalPhone?: string;
  workPhone?: string;
  hireDate: string;
  probationEndDate?: string;
  confirmationDate?: string;
  employmentStatus: string;
  employmentType: string;
  isActive: boolean;
  departmentId?: number;
  departmentName?: string;
  departmentCode?: string;
  departmentNameAr?: string;
  designationId?: number;
  designationTitle?: string;
  designationTitleAr?: string;
  designationCode?: string;
  gradeLevel?: string;
  /** The linked login's role; absent when the employee has no login. */
  role?: string;
  /** Optimistic-lock version; send it back on update. */
  version?: number;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
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
  workPhone?: string;
  personalPhone?: string;
  profilePhotoUrl?: string;
  employmentStatus: string;
  employmentType: string;
  nationality?: string;
  hireDate: string;
  isActive: boolean;
  departmentId?: number;
  departmentName?: string;
  departmentCode?: string;
  designationId?: number;
  designationTitle?: string;
  gradeLevel?: string;
}

/** What POST /employees returns (EmployeeResponse): the id is `id`, not `employeeId`. */
export interface CreatedEmployee extends Omit<Employee, 'employeeId' | 'designationTitle'> {
  id: number;
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
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
  timestamp?: string;
}
