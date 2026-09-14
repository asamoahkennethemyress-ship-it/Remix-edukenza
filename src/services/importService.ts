import * as XLSX from 'xlsx';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { 
  ImportEntityType, 
  ImportResult, 
  ImportValidationError, 
  ImportHistoryItem, 
  AuditLogRecord 
} from '../types/importExport';
import { validateImportData, PreImportValidationResult } from './importValidator';

export interface ExecuteImportOptions {
  file: File;
  entityType: ImportEntityType;
  schoolId: string;
  schoolName?: string;
  userUid: string;
  userName: string;
  userRole: string;
  onProgress?: (progressPercent: number, statusMessage: string) => void;
}

/**
 * Parses spreadsheet or CSV file into row objects
 */
export async function parseImportFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(new Error(`Failed to parse file '${file.name}'. Ensure it is a valid Excel (.xlsx) or CSV (.csv) file.`));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Executes full import pipeline: Uploads file to Storage, processes valid rows into Firestore, logs importHistory & auditLogs
 */
export async function processFileImport(options: ExecuteImportOptions): Promise<{
  validation: PreImportValidationResult;
  result: ImportResult;
  historyItem: ImportHistoryItem;
}> {
  const { file, entityType, schoolId, schoolName, userUid, userName, userRole, onProgress } = options;

  onProgress?.(10, 'Parsing spreadsheet file...');
  const parsedRows = await parseImportFile(file);

  onProgress?.(25, 'Validating data and checking database constraints...');
  const validation = await validateImportData(entityType, parsedRows, schoolId);

  // Upload file to Firebase Storage if possible
  let fileUrl = '';
  try {
    onProgress?.(40, 'Uploading file backup to secure storage...');
    const storagePath = `import_files/${schoolId || 'global'}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  } catch (err) {
    console.warn("Storage upload warning (proceeding with database import):", err);
  }

  onProgress?.(55, 'Saving valid records to database...');
  const successfulRecords: any[] = [];
  const executionErrors: ImportValidationError[] = [...validation.errors];

  const totalValid = validation.validRows.length;
  let processedCount = 0;

  for (const row of validation.validRows) {
    processedCount++;
    const progressPercent = Math.min(55 + Math.floor((processedCount / (totalValid || 1)) * 30), 85);
    onProgress?.(progressPercent, `Processing record ${processedCount} of ${totalValid}...`);

    try {
      await saveEntityRecord(entityType, row, schoolId, userUid);
      successfulRecords.push(row);
    } catch (err: any) {
      executionErrors.push({
        rowNumber: row._rowNumber || processedCount,
        field: 'Database Write',
        message: err?.message || 'Failed to persist record in database.',
        rawData: row
      });
    }
  }

  const importId = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  onProgress?.(90, 'Generating audit history logs...');

  // Create importHistory record
  const historyItem: ImportHistoryItem = {
    id: importId,
    importId,
    schoolId: schoolId || 'global',
    schoolName: schoolName || 'EDUkenZA School',
    importedBy: userUid,
    importedByName: userName,
    fileName: file.name,
    importType: entityType,
    totalRows: validation.totalRows,
    successfulRows: successfulRecords.length,
    failedRows: validation.totalRows - successfulRecords.length,
    importedAt: timestamp,
    errors: executionErrors,
    fileUrl
  };

  try {
    await setDoc(doc(db, 'importHistory', importId), historyItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `importHistory/${importId}`);
  }

  // Create auditLog record
  const auditLog: AuditLogRecord = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: userUid,
    userName,
    userRole,
    schoolId: schoolId || 'global',
    action: 'IMPORT',
    entityType,
    fileFormat: file.name.split('.').pop() || 'xlsx',
    recordCount: successfulRecords.length,
    details: `Imported ${successfulRecords.length} ${entityType} records from file '${file.name}'. (${validation.totalRows - successfulRecords.length} failed).`,
    timestamp
  };

  try {
    await addDoc(collection(db, 'auditLogs'), auditLog);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'auditLogs');
  }

  onProgress?.(100, 'Import completed successfully.');

  return {
    validation,
    result: {
      totalRows: validation.totalRows,
      successfulRows: successfulRecords.length,
      failedRows: validation.totalRows - successfulRecords.length,
      errors: executionErrors,
      importedRecords: successfulRecords
    },
    historyItem
  };
}

/**
 * Persists an individual record into the respective Firestore collection
 */
async function saveEntityRecord(
  entityType: ImportEntityType,
  data: Record<string, any>,
  schoolId: string,
  userUid: string
) {
  const timestamp = new Date().toISOString();

  if (entityType === 'students') {
    const docId = `std_${data.studentId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const cleanStudentId = data.studentId.trim().toUpperCase();
    const systemEmail = data.email && data.email.includes('@')
      ? data.email.toLowerCase()
      : `${cleanStudentId.toLowerCase()}@edukenza.student`;

    const payload = {
      id: docId,
      studentId: cleanStudentId,
      fullName: data.fullName,
      email: systemEmail,
      gender: data.gender || 'Male',
      dob: data.dob || '',
      phone: data.phone || '',
      address: data.address || '',
      className: data.className,
      parentEmail: data.parentEmail || '',
      schoolId,
      status: 'active',
      importedBy: userUid,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await setDoc(doc(db, 'students', docId), payload, { merge: true });
    
    // Also sync to users table so auth account can log in
    await setDoc(doc(db, 'users', docId), {
      uid: docId,
      email: systemEmail,
      name: data.fullName,
      fullName: data.fullName,
      role: 'student',
      status: 'active',
      schoolId,
      studentId: cleanStudentId,
      className: data.className,
      createdAt: timestamp
    }, { merge: true });
  } else if (entityType === 'teachers') {
    const docId = `tch_${data.teacherId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const payload = {
      id: docId,
      teacherId: data.teacherId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || '',
      subject: data.subject,
      assignedClassName: data.assignedClassName || '',
      schoolId,
      status: 'active',
      importedBy: userUid,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await setDoc(doc(db, 'teachers', docId), payload, { merge: true });

    await setDoc(doc(db, 'users', docId), {
      uid: docId,
      email: data.email,
      name: data.fullName,
      fullName: data.fullName,
      role: 'teacher',
      status: 'active',
      schoolId,
      teacherId: data.teacherId,
      createdAt: timestamp
    }, { merge: true });
  } else if (entityType === 'parents') {
    const docId = `prt_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const payload = {
      uid: docId,
      email: data.email,
      name: data.fullName,
      fullName: data.fullName,
      phone: data.phone || '',
      address: data.address || '',
      linkedStudentIds: data.linkedStudentIds ? String(data.linkedStudentIds).split(',').map((s: string) => s.trim()) : [],
      role: 'parent',
      status: 'active',
      schoolId,
      importedBy: userUid,
      createdAt: timestamp
    };
    await setDoc(doc(db, 'users', docId), payload, { merge: true });
  } else if (entityType === 'classes') {
    const docId = `cls_${data.className.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const payload = {
      id: docId,
      className: data.className,
      gradeLevel: data.gradeLevel || '',
      roomNumber: data.roomNumber || '',
      capacity: Number(data.capacity) || 35,
      schoolId,
      createdAt: timestamp
    };
    await setDoc(doc(db, 'classes', docId), payload, { merge: true });
  } else if (entityType === 'subjects') {
    const docId = `sub_${data.code.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const payload = {
      id: docId,
      subjectName: data.subjectName,
      code: data.code,
      department: data.department || 'General',
      credits: Number(data.credits) || 1,
      schoolId,
      createdAt: timestamp
    };
    await setDoc(doc(db, 'subjects', docId), payload, { merge: true });
  } else if (entityType === 'timetables') {
    const docId = `tt_${data.className.replace(/[^a-zA-Z0-9]/g, '_')}_${data.dayOfWeek}_${data.startTime}`;
    const payload = {
      id: docId,
      className: data.className,
      subjectName: data.subjectName,
      teacherEmail: data.teacherEmail,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      room: data.room || '',
      schoolId,
      createdAt: timestamp
    };
    await setDoc(doc(db, 'timetables', docId), payload, { merge: true });
  } else if (entityType === 'fee-structure') {
    const docId = `fee_${data.academicYear}_${data.term.replace(/\s+/g, '_')}_${data.className.replace(/\s+/g, '_')}`;
    const payload = {
      id: docId,
      academicYear: data.academicYear,
      term: data.term,
      className: data.className,
      feeTitle: data.feeTitle,
      amount: Number(data.amount) || 0,
      dueDate: data.dueDate,
      schoolId,
      createdAt: timestamp
    };
    await setDoc(doc(db, 'feeStructures', docId), payload, { merge: true });
  } else if (entityType === 'examination-results') {
    const docId = `res_${data.studentId}_${data.subjectName.replace(/\s+/g, '_')}_${Date.now()}`;
    const payload = {
      id: docId,
      studentId: data.studentId,
      examName: data.examName,
      subjectName: data.subjectName,
      marksObtained: Number(data.marksObtained),
      maxMarks: Number(data.maxMarks),
      grade: data.grade || calculateGrade(Number(data.marksObtained), Number(data.maxMarks)),
      remarks: data.remarks || '',
      schoolId,
      createdAt: timestamp
    };
    await setDoc(doc(db, 'examResults', docId), payload, { merge: true });
  }
}

function calculateGrade(marks: number, maxMarks: number): string {
  if (!maxMarks) return 'N/A';
  const pct = (marks / maxMarks) * 100;
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}
