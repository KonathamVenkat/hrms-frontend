export interface EmployeeDocument {
  documentId: number;
  employeeId: number;
  docTypeId: number;
  docTypeCode: string;
  docTypeName: string;
  category: string;
  hasExpiry: boolean;
  documentName: string;
  originalFileName: string;
  fileSize: number;
  fileExtension: string;
  fileSizeFormatted: string;
  downloadUrl: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
  notes?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  uploadedBy?: string;
  createdAt?: string;
}

/**
 * Renamed to EmpDocTypeOption to avoid clash with
 * browser's built-in DocumentType global variable.
 */
export interface EmpDocTypeOption {
  docTypeId: number;
  docTypeCode: string;
  docTypeName: string;
  category: string;
  hasExpiry: boolean;
  isActive: boolean;
  /** Comma-separated, e.g. "PDF,JPG,PNG": what this type accepts. */
  allowedExtensions?: string;
  /** The largest file this type accepts, in MB. */
  maxFileSizeMb?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
