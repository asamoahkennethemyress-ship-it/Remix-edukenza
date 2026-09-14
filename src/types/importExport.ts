export type ImportEntityType = 
  | 'students' 
  | 'teachers' 
  | 'parents' 
  | 'classes' 
  | 'subjects' 
  | 'timetables' 
  | 'fee-structure' 
  | 'examination-results';

export type ExportEntityType = 
  | 'students' 
  | 'teachers' 
  | 'parents' 
  | 'classes' 
  | 'subjects' 
  | 'timetables' 
  | 'attendance' 
  | 'assignments' 
  | 'examination-results' 
  | 'academic-reports' 
  | 'payments' 
  | 'payment-receipts' 
  | 'school-analytics' 
  | 'audit-logs';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawData: Record<string, any>;
}

export interface ImportResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ImportValidationError[];
  importedRecords: any[];
}

export interface ImportHistoryItem {
  id: string;
  importId: string;
  schoolId: string;
  schoolName?: string;
  importedBy: string;
  importedByName: string;
  fileName: string;
  importType: ImportEntityType;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  importedAt: string;
  errors?: ImportValidationError[];
  fileUrl?: string;
}

export interface ExportHistoryItem {
  id: string;
  exportId: string;
  schoolId: string;
  schoolName?: string;
  exportedBy: string;
  exportedByName: string;
  exportType: ExportEntityType;
  fileFormat: ExportFormat;
  filtersUsed: Record<string, any>;
  exportedAt: string;
  recordCount: number;
}

export interface AuditLogRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  userName: string;
  userRole: string;
  schoolId: string;
  schoolName?: string;
  action: string;
  eventType?: string;
  entityType?: string;
  fileFormat?: string;
  recordCount?: number;
  details: string;
  timestamp: string;
}

export interface ExportFilters {
  academicYear?: string;
  term?: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  teacherId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string; // 'all' | 'paid' | 'pending' | 'overdue' | 'partial'
  schoolId?: string;
}

export interface TemplateColumn {
  key: string;
  label: string;
  required: boolean;
  example: string;
  description: string;
}

export interface ImportTemplateDefinition {
  type: ImportEntityType;
  title: string;
  description: string;
  columns: TemplateColumn[];
}
