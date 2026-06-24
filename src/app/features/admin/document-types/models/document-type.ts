export interface DocumentType {
  docTypeId: number;
  docTypeCode: string;
  docTypeName: string;
  docTypeNameAr: string;
  category: string;
  description?: string;
  isMandatory: boolean;
  hasExpiry: boolean;
  expiryNoticeDays: number;
  allowedExtensions: string;
  maxFileSizeMb: number;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentTypeRequest {
  docTypeCode: string;
  docTypeName: string;
  docTypeNameAr: string;
  category: string;
  description?: string;
  isMandatory: boolean;
  hasExpiry: boolean;
  expiryNoticeDays?: number;
  allowedExtensions?: string;
  maxFileSizeMb?: number;
  sortOrder: number;
  isActive?: boolean;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
