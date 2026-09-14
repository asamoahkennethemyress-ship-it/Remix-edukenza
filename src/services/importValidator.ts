import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ImportEntityType, ImportValidationError } from '../types/importExport';
import { IMPORT_TEMPLATES } from '../utils/templateDefinitions';

export interface PreImportValidationResult {
  isValid: boolean;
  totalRows: number;
  validRowCount: number;
  invalidRowCount: number;
  errors: ImportValidationError[];
  validRows: Record<string, any>[];
  rawRows: Record<string, any>[];
  missingRequiredColumns: string[];
}

/**
 * Validates parsed raw spreadsheet/CSV data against database constraints and template schema
 */
export async function validateImportData(
  entityType: ImportEntityType,
  parsedData: Record<string, any>[],
  schoolId: string
): Promise<PreImportValidationResult> {
  const templateDef = IMPORT_TEMPLATES[entityType];
  const errors: ImportValidationError[] = [];
  const validRows: Record<string, any>[] = [];

  if (!parsedData || parsedData.length === 0) {
    return {
      isValid: false,
      totalRows: 0,
      validRowCount: 0,
      invalidRowCount: 0,
      errors: [{
        rowNumber: 0,
        field: 'File',
        message: 'The uploaded file contains no data rows or could not be read.',
        rawData: {}
      }],
      validRows: [],
      rawRows: [],
      missingRequiredColumns: []
    };
  }

  // 1. Check Missing Required Columns
  const sampleRow = parsedData[0] || {};
  const presentKeys = Object.keys(sampleRow).map(k => normalizeHeaderKey(k));
  
  const missingRequiredColumns: string[] = [];
  templateDef.columns.forEach(col => {
    if (col.required) {
      const match = presentKeys.some(pk => pk === normalizeHeaderKey(col.label) || pk === normalizeHeaderKey(col.key));
      if (!match) {
        missingRequiredColumns.push(col.label);
      }
    }
  });

  if (missingRequiredColumns.length > 0) {
    errors.push({
      rowNumber: 0,
      field: 'Header Columns',
      message: `Missing required template columns: ${missingRequiredColumns.join(', ')}`,
      rawData: sampleRow
    });
  }

  // 2. Fetch existing database records for duplicate checks
  const existingStudentIds = new Set<string>();
  const existingEmployeeIds = new Set<string>();
  const existingEmails = new Set<string>();
  const existingClasses = new Set<string>();
  const existingSubjects = new Set<string>();

  try {
    if (entityType === 'students' || entityType === 'examination-results') {
      const q = schoolId ? query(collection(db, 'students'), where('schoolId', '==', schoolId)) : collection(db, 'students');
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId) existingStudentIds.add(String(data.studentId).trim().toLowerCase());
        if (data.email) existingEmails.add(String(data.email).trim().toLowerCase());
      });
    }

    if (entityType === 'teachers') {
      const q = schoolId ? query(collection(db, 'teachers'), where('schoolId', '==', schoolId)) : collection(db, 'teachers');
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data();
        if (data.teacherId) existingEmployeeIds.add(String(data.teacherId).trim().toLowerCase());
        if (data.email) existingEmails.add(String(data.email).trim().toLowerCase());
      });
    }

    if (entityType === 'parents') {
      const q = schoolId ? query(collection(db, 'users'), where('role', '==', 'parent')) : query(collection(db, 'users'), where('role', '==', 'parent'));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data();
        if (data.email) existingEmails.add(String(data.email).trim().toLowerCase());
      });
    }

    // Load available Classes and Subjects
    const classQ = schoolId ? query(collection(db, 'classes'), where('schoolId', '==', schoolId)) : collection(db, 'classes');
    const classSnap = await getDocs(classQ);
    classSnap.forEach(d => {
      const data = d.data();
      if (data.className) existingClasses.add(String(data.className).trim().toLowerCase());
    });

    const subQ = schoolId ? query(collection(db, 'subjects'), where('schoolId', '==', schoolId)) : collection(db, 'subjects');
    const subSnap = await getDocs(subQ);
    subSnap.forEach(d => {
      const data = d.data();
      if (data.subjectName) existingSubjects.add(String(data.subjectName).trim().toLowerCase());
    });
  } catch (err) {
    console.warn("Pre-import database lookup warning:", err);
  }

  // File-level duplicate tracking
  const fileStudentIds = new Set<string>();
  const fileEmployeeIds = new Set<string>();
  const fileEmails = new Set<string>();

  // Filter out instruction/example rows if present from template download
  const cleanData = parsedData.filter(row => {
    const values = Object.values(row).map(v => String(v).trim().toLowerCase());
    const isInstructionRow = values.some(v => v.includes('[required]') || v.includes('[optional]'));
    return !isInstructionRow;
  });

  // 3. Row-by-Row Validation
  cleanData.forEach((rawRow, index) => {
    const rowNum = index + 1; // 1-indexed for user view
    const normalizedRow: Record<string, any> = {};
    let rowHasError = false;

    // Map headers to key names
    templateDef.columns.forEach(col => {
      const matchedKey = Object.keys(rawRow).find(
        k => normalizeHeaderKey(k) === normalizeHeaderKey(col.label) || normalizeHeaderKey(k) === normalizeHeaderKey(col.key)
      );
      const val = matchedKey !== undefined ? String(rawRow[matchedKey] ?? '').trim() : '';
      normalizedRow[col.key] = val;
    });

    // Check required fields
    templateDef.columns.forEach(col => {
      if (col.required && !normalizedRow[col.key]) {
        errors.push({
          rowNumber: rowNum,
          field: col.label,
          message: `${col.label} is required and cannot be empty.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
    });

    // Entity Specific Validations
    if (entityType === 'students') {
      const studentId = String(normalizedRow.studentId || '').trim().toLowerCase();
      const email = String(normalizedRow.email || '').trim().toLowerCase();
      const dob = String(normalizedRow.dob || '').trim();

      if (studentId) {
        if (existingStudentIds.has(studentId)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Student ID',
            message: `Duplicate Student ID '${normalizedRow.studentId}' already exists in the school database.`,
            rawData: rawRow
          });
          rowHasError = true;
        } else if (fileStudentIds.has(studentId)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Student ID',
            message: `Duplicate Student ID '${normalizedRow.studentId}' appears multiple times in this file.`,
            rawData: rawRow
          });
          rowHasError = true;
        }
        fileStudentIds.add(studentId);
      }

      if (email) {
        if (!isValidEmail(email)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Email Address',
            message: `Invalid email format '${normalizedRow.email}'.`,
            rawData: rawRow
          });
          rowHasError = true;
        } else if (existingEmails.has(email)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Email Address',
            message: `Email '${normalizedRow.email}' is already registered in the system.`,
            rawData: rawRow
          });
          rowHasError = true;
        } else if (fileEmails.has(email)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Email Address',
            message: `Duplicate email '${normalizedRow.email}' appears multiple times in this file.`,
            rawData: rawRow
          });
          rowHasError = true;
        }
        fileEmails.add(email);
      }

      if (dob && !isValidDateString(dob)) {
        errors.push({
          rowNumber: rowNum,
          field: 'Date of Birth',
          message: `Invalid date format '${dob}'. Expected YYYY-MM-DD.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
    }

    if (entityType === 'teachers') {
      const teacherId = String(normalizedRow.teacherId || '').trim().toLowerCase();
      const email = String(normalizedRow.email || '').trim().toLowerCase();

      if (teacherId) {
        if (existingEmployeeIds.has(teacherId)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Employee ID',
            message: `Duplicate Employee ID '${normalizedRow.teacherId}' already exists.`,
            rawData: rawRow
          });
          rowHasError = true;
        } else if (fileEmployeeIds.has(teacherId)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Employee ID',
            message: `Duplicate Employee ID '${normalizedRow.teacherId}' appears multiple times in file.`,
            rawData: rawRow
          });
          rowHasError = true;
        }
        fileEmployeeIds.add(teacherId);
      }

      if (email) {
        if (!isValidEmail(email)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Email Address',
            message: `Invalid email address format '${normalizedRow.email}'.`,
            rawData: rawRow
          });
          rowHasError = true;
        } else if (existingEmails.has(email)) {
          errors.push({
            rowNumber: rowNum,
            field: 'Email Address',
            message: `Email '${normalizedRow.email}' already exists in system.`,
            rawData: rawRow
          });
          rowHasError = true;
        }
        fileEmails.add(email);
      }
    }

    if (entityType === 'parents') {
      const email = String(normalizedRow.email || '').trim().toLowerCase();
      if (email && !isValidEmail(email)) {
        errors.push({
          rowNumber: rowNum,
          field: 'Email Address',
          message: `Invalid parent email '${normalizedRow.email}'.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
    }

    if (entityType === 'fee-structure') {
      const dueDate = String(normalizedRow.dueDate || '').trim();
      const amount = Number(normalizedRow.amount);
      if (dueDate && !isValidDateString(dueDate)) {
        errors.push({
          rowNumber: rowNum,
          field: 'Due Date',
          message: `Invalid due date format '${dueDate}'. Expected YYYY-MM-DD.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
      if (isNaN(amount) || amount <= 0) {
        errors.push({
          rowNumber: rowNum,
          field: 'Amount',
          message: `Fee amount must be a positive numeric value.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
    }

    if (entityType === 'examination-results') {
      const marks = Number(normalizedRow.marksObtained);
      const maxMarks = Number(normalizedRow.maxMarks);
      if (isNaN(marks) || marks < 0) {
        errors.push({
          rowNumber: rowNum,
          field: 'Marks Obtained',
          message: `Marks obtained must be a valid non-negative number.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
      if (isNaN(maxMarks) || maxMarks <= 0) {
        errors.push({
          rowNumber: rowNum,
          field: 'Max Marks',
          message: `Max marks must be a positive number greater than zero.`,
          rawData: rawRow
        });
        rowHasError = true;
      }
      if (!isNaN(marks) && !isNaN(maxMarks) && marks > maxMarks) {
        errors.push({
          rowNumber: rowNum,
          field: 'Marks Obtained',
          message: `Marks obtained (${marks}) cannot exceed maximum marks (${maxMarks}).`,
          rawData: rawRow
        });
        rowHasError = true;
      }
    }

    if (!rowHasError) {
      validRows.push({
        ...normalizedRow,
        _rowNumber: rowNum
      });
    }
  });

  return {
    isValid: errors.length === 0,
    totalRows: cleanData.length,
    validRowCount: validRows.length,
    invalidRowCount: cleanData.length - validRows.length,
    errors,
    validRows,
    rawRows: cleanData,
    missingRequiredColumns
  };
}

function normalizeHeaderKey(str: string): string {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}
