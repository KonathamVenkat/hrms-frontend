// src/app/features/payroll/models/payroll.model.ts

export type ComponentType  = 'EARNING' | 'DEDUCTION' | 'STATUTORY';
export type CalculationType = 'FIXED' | 'PERCENTAGE_OF_BASIC' | 'PERCENTAGE_OF_GROSS' | 'FORMULA';

export interface SalaryComponentResponse {
  componentId:        number;
  componentCode:      string;
  componentName:      string;
  componentNameAr:    string;
  componentType:      ComponentType;
  componentTypeLabel: string;
  calcType:           CalculationType;
  calcTypeLabel:      string;
  defaultValue:       number;
  isTaxable:          boolean;
  isNssfApplicable:   boolean;
  description:        string | null;
  sortOrder:          number;
  isActive:           boolean;
  createdAt:          string;
  updatedAt:          string;
}

export interface SalaryStructureItemResponse {
  itemId:            number;
  componentId:       number;
  componentCode:     string;
  componentName:     string;
  componentNameAr:   string;
  componentType:     ComponentType;
  effectiveCalcType: CalculationType;
  amount:            number;
  percentage:        number;
  sortOrder:         number;
}

export interface SalaryStructureResponse {
  structureId:    number;
  structureCode:  string;
  structureName:  string;
  description:    string | null;
  isActive:       boolean;
  items:          SalaryStructureItemResponse[];
  employeeCount:  number;
  createdAt:      string;
  updatedAt:      string;
}

export interface SalaryBreakdownItem {
  componentCode:  string;
  componentName:  string;
  componentNameAr:string;
  componentType:  ComponentType;
  amount:         number;
  calcBasis:      string;
}

export interface EmployeeSalaryResponse {
  empSalaryId:      number;
  employeeId:       number;
  employeeCode:     string;
  employeeName:     string;
  designationName:  string | null;
  departmentName:   string | null;
  structureId:      number;
  structureName:    string;
  basicSalary:      number;
  grossSalary:      number;
  netSalary:        number;
  currency:         string;
  effectiveFrom:    string;
  effectiveTo:      string | null;
  isCurrent:        boolean;
  remarks:          string | null;
  breakdown:        SalaryBreakdownItem[];
  createdAt:        string;
  updatedAt:        string;
}

// ── Request types ──────────────────────────────────────────
export interface SalaryComponentRequest {
  componentCode:     string;
  componentName:     string;
  componentNameAr:   string;
  componentType:     ComponentType;
  calcType:          CalculationType;
  defaultValue:      number;
  isTaxable?:        boolean;
  isNssfApplicable?: boolean;
  description?:      string;
  sortOrder?:        number;
}

export interface SalaryStructureItemRequest {
  componentId:       number;
  calcTypeOverride?: CalculationType;
  amount?:           number;
  percentage?:       number;
  sortOrder?:        number;
}

export interface SalaryStructureRequest {
  structureCode: string;
  structureName: string;
  description?:  string;
  items:         SalaryStructureItemRequest[];
}

export interface EmployeeSalaryRequest {
  employeeId:    number;
  structureId:   number;
  basicSalary:   number;
  effectiveFrom: string;   // yyyy-MM-dd
  remarks?:      string;
}

// ── Display configs ────────────────────────────────────────
// `label` values are ngx-translate keys — reusing the existing `payroll.salaryComponent.types.*`
// / `payroll.salaryComponent.calcTypes.*` keys — templates must pipe them through `| translate`.
export const COMPONENT_TYPE_CONFIG: Record<ComponentType,
  { label: string; color: string; bg: string }> = {
  EARNING:   { label: 'payroll.salaryComponent.types.earning',   color: '#166534', bg: '#dcfce7' },
  DEDUCTION: { label: 'payroll.salaryComponent.types.deduction', color: '#991b1b', bg: '#fee2e2' },
  STATUTORY: { label: 'payroll.salaryComponent.types.statutory', color: '#92400e', bg: '#fef3c7' },
};

export const CALC_TYPE_LABELS: Record<CalculationType, string> = {
  FIXED:               'payroll.salaryComponent.calcTypes.fixed',
  PERCENTAGE_OF_BASIC: 'payroll.salaryComponent.calcTypes.percentOfBasic',
  PERCENTAGE_OF_GROSS: 'payroll.salaryComponent.calcTypes.percentOfGross',
  FORMULA:             'payroll.salaryComponent.calcTypes.formula',
};
