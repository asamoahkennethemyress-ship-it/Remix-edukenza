import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { collection, getDocs, query, where, orderBy, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { 
  ExportEntityType, 
  ExportFormat, 
  ExportFilters, 
  ExportHistoryItem, 
  AuditLogRecord 
} from '../types/importExport';

export interface ExecuteExportOptions {
  entityType: ExportEntityType;
  format: ExportFormat;
  filters: ExportFilters;
  schoolId: string;
  schoolName?: string;
  userUid: string;
  userName: string;
  userRole: string;
}

export async function executeDataExport(options: ExecuteExportOptions): Promise<{
  exportId: string;
  recordCount: number;
  fileName: string;
}> {
  const { entityType, format, filters, schoolId, schoolName, userUid, userName, userRole } = options;

  // 1. Fetch data from Firestore
  const records = await fetchExportRecords(entityType, schoolId, filters);

  // 2. Generate export file
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `EDUkenZA_${entityType}_${timestampStr}.${format}`;

  if (format === 'xlsx' || format === 'csv') {
    generateSpreadsheetExport(entityType, records, format, fileName, schoolName || 'EDUkenZA Academy');
  } else if (format === 'pdf') {
    generatePdfExport(entityType, records, fileName, {
      schoolName: schoolName || 'EDUkenZA International Academy',
      generatedBy: userName,
      filters
    });
  }

  // 3. Record in exportHistory
  const exportId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  const historyItem: ExportHistoryItem = {
    id: exportId,
    exportId,
    schoolId: schoolId || 'global',
    schoolName: schoolName || 'EDUkenZA Academy',
    exportedBy: userUid,
    exportedByName: userName,
    exportType: entityType,
    fileFormat: format,
    filtersUsed: filters as Record<string, any>,
    exportedAt: timestamp,
    recordCount: records.length
  };

  try {
    await setDoc(doc(db, 'exportHistory', exportId), historyItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `exportHistory/${exportId}`);
  }

  // 4. Record in auditLogs
  const auditLog: AuditLogRecord = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: userUid,
    userName,
    userRole,
    schoolId: schoolId || 'global',
    action: 'EXPORT',
    entityType,
    fileFormat: format,
    recordCount: records.length,
    details: `Exported ${records.length} ${entityType} records in ${format.toUpperCase()} format.`,
    timestamp
  };

  try {
    await addDoc(collection(db, 'auditLogs'), auditLog);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'auditLogs');
  }

  return {
    exportId,
    recordCount: records.length,
    fileName
  };
}

/**
 * Queries target collection and applies user filter constraints
 */
async function fetchExportRecords(
  entityType: ExportEntityType,
  schoolId: string,
  filters: ExportFilters
): Promise<Record<string, any>[]> {
  const collectionNameMap: Record<ExportEntityType, string> = {
    students: 'students',
    teachers: 'teachers',
    parents: 'users',
    classes: 'classes',
    subjects: 'subjects',
    timetables: 'timetables',
    attendance: 'attendance',
    assignments: 'assignments',
    'examination-results': 'examResults',
    'academic-reports': 'academicReports',
    payments: 'payments',
    'payment-receipts': 'payments',
    'school-analytics': 'auditLogs',
    'audit-logs': 'auditLogs'
  };

  const targetColl = collectionNameMap[entityType] || 'students';
  let q = query(collection(db, targetColl));

  // Apply school constraint if not global
  if (schoolId && schoolId !== 'global') {
    q = query(q, where('schoolId', '==', schoolId));
  }

  // Role specific filters
  if (entityType === 'parents') {
    q = query(q, where('role', '==', 'parent'));
  }

  try {
    const snap = await getDocs(q);
    let results: Record<string, any>[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side Filter Refinement
    if (filters.classId || filters.className) {
      const cls = (filters.className || filters.classId || '').toLowerCase();
      results = results.filter(r => 
        String(r.className || r.classId || '').toLowerCase().includes(cls)
      );
    }

    if (filters.subjectName || filters.subjectId) {
      const sub = (filters.subjectName || filters.subjectId || '').toLowerCase();
      results = results.filter(r => 
        String(r.subjectName || r.subject || r.subjectId || '').toLowerCase().includes(sub)
      );
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      results = results.filter(r => 
        String(r.status || r.paymentStatus || '').toLowerCase() === filters.paymentStatus?.toLowerCase()
      );
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      results = results.filter(r => {
        const itemDate = new Date(r.createdAt || r.timestamp || r.date || r.exportedAt || 0).getTime();
        return itemDate >= start;
      });
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime() + (24 * 60 * 60 * 1000);
      results = results.filter(r => {
        const itemDate = new Date(r.createdAt || r.timestamp || r.date || r.exportedAt || 0).getTime();
        return itemDate <= end;
      });
    }

    return results;
  } catch (err) {
    console.error("Error fetching export records:", err);
    return [];
  }
}

/**
 * Generates Excel (.xlsx) or CSV (.csv) file download
 */
function generateSpreadsheetExport(
  entityType: ExportEntityType,
  records: Record<string, any>[],
  format: 'xlsx' | 'csv',
  fileName: string,
  schoolName: string
) {
  const formattedRows = records.map(r => formatRecordForExport(entityType, r));

  const worksheet = XLSX.utils.json_to_sheet(formattedRows.length > 0 ? formattedRows : [{ Message: 'No records found matching filters.' }]);

  // Calculate auto column widths
  if (formattedRows.length > 0) {
    const keys = Object.keys(formattedRows[0]);
    worksheet['!cols'] = keys.map(k => ({
      wch: Math.max(k.length, 14) + 3
    }));
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, getEntityExportTitle(entityType));

  if (format === 'csv') {
    XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
  }
}

/**
 * Generates a clean, professional PDF document using jsPDF & autoTable
 */
function generatePdfExport(
  entityType: ExportEntityType,
  records: Record<string, any>[],
  fileName: string,
  meta: {
    schoolName: string;
    generatedBy: string;
    filters: ExportFilters;
  }
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const reportTitle = getEntityExportTitle(entityType);

  // Header Colors & Styling
  const primaryNavy = '#002147';
  const goldAccent = '#D4AF37';

  // Draw Header Banner
  doc.setFillColor(primaryNavy);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 65, 'F');

  // Gold Divider Line
  doc.setFillColor(goldAccent);
  doc.rect(0, 65, doc.internal.pageSize.getWidth(), 4, 'F');

  // Header Branding Text
  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(meta.schoolName, 25, 30);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Academic & Operations Report: ${reportTitle}`, 25, 48);

  // Date and Metadata (Right side)
  doc.setFontSize(9);
  const nowStr = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Generated: ${nowStr}`, doc.internal.pageSize.getWidth() - 25, 28, { align: 'right' });
  doc.text(`By: ${meta.generatedBy}`, doc.internal.pageSize.getWidth() - 25, 44, { align: 'right' });

  // Summary Metrics Banner
  doc.setFillColor('#F4F6FA');
  doc.roundedRect(25, 80, doc.internal.pageSize.getWidth() - 50, 32, 4, 4, 'F');

  doc.setTextColor('#002147');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total Records Exported: ${records.length}`, 35, 100);

  if (meta.filters.className) {
    doc.text(`Class: ${meta.filters.className}`, 220, 100);
  }
  if (meta.filters.term) {
    doc.text(`Term: ${meta.filters.term}`, 380, 100);
  }

  // Format Table Columns & Rows
  const formattedRows = records.map(r => formatRecordForExport(entityType, r));
  const headers = formattedRows.length > 0 ? Object.keys(formattedRows[0]) : ['Message'];
  const tableData = formattedRows.length > 0 
    ? formattedRows.map(row => Object.values(row))
    : [['No records found for the selected export filters.']];

  // Render Table
  autoTable(doc, {
    startY: 125,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryNavy,
      textColor: '#FFFFFF',
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: '#333333'
    },
    alternateRowStyles: {
      fillColor: '#FAFCFF'
    },
    margin: { left: 25, right: 25, bottom: 40 },
    didDrawPage: (data) => {
      // Page Numbering Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pageNumber = data.pageNumber;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#666666');
      doc.text(
        `EDUkenZA Platform System Report • Page ${pageNumber} of ${totalPages}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'center' }
      );
    }
  });

  doc.save(fileName);
}

/**
 * Formats row objects cleanly for display and exporting
 */
function formatRecordForExport(entityType: ExportEntityType, raw: Record<string, any>): Record<string, any> {
  if (entityType === 'students') {
    return {
      'Student ID': raw.studentId || raw.id || 'N/A',
      'Full Name': raw.fullName || raw.name || 'N/A',
      'Email Address': raw.email || 'N/A',
      'Class': raw.className || raw.classId || 'Unassigned',
      'Gender': raw.gender || 'N/A',
      'Date of Birth': raw.dob || 'N/A',
      'Phone': raw.phone || 'N/A',
      'Parent Email': raw.parentEmail || 'N/A',
      'Status': String(raw.status || 'Active').toUpperCase()
    };
  }

  if (entityType === 'teachers') {
    return {
      'Employee ID': raw.teacherId || raw.id || 'N/A',
      'Full Name': raw.fullName || raw.name || 'N/A',
      'Email Address': raw.email || 'N/A',
      'Primary Subject': raw.subject || 'N/A',
      'Assigned Class': raw.assignedClassName || raw.assignedClassId || 'None',
      'Phone Number': raw.phone || 'N/A',
      'Status': String(raw.status || 'Active').toUpperCase()
    };
  }

  if (entityType === 'parents') {
    return {
      'Parent Name': raw.fullName || raw.name || 'N/A',
      'Email Address': raw.email || 'N/A',
      'Phone': raw.phone || 'N/A',
      'Address': raw.address || 'N/A',
      'Linked Students': Array.isArray(raw.linkedStudentIds) ? raw.linkedStudentIds.join(', ') : (raw.linkedStudentIds || 'None')
    };
  }

  if (entityType === 'examination-results') {
    return {
      'Student ID': raw.studentId || 'N/A',
      'Exam Title': raw.examName || 'Assessment',
      'Subject': raw.subjectName || 'N/A',
      'Marks Obtained': raw.marksObtained ?? 0,
      'Max Marks': raw.maxMarks ?? 100,
      'Grade': raw.grade || 'N/A',
      'Teacher Remarks': raw.remarks || ''
    };
  }

  if (entityType === 'payments' || entityType === 'payment-receipts') {
    return {
      'Receipt / Invoice #': raw.receiptNo || raw.id || 'N/A',
      'Payer Name': raw.payerName || raw.studentName || 'N/A',
      'Fee Category': raw.feeTitle || raw.category || 'Tuition',
      'Amount Paid (ZAR)': raw.amount || 0,
      'Payment Status': String(raw.status || 'Paid').toUpperCase(),
      'Payment Date': raw.date || raw.createdAt || 'N/A'
    };
  }

  if (entityType === 'audit-logs') {
    return {
      'Log ID': raw.id || 'N/A',
      'Timestamp': raw.timestamp || raw.exportedAt || 'N/A',
      'User': raw.userName || raw.userId || 'N/A',
      'Role': raw.userRole || 'N/A',
      'Action': raw.action || 'N/A',
      'Entity': raw.entityType || 'N/A',
      'Format': raw.fileFormat || 'N/A',
      'Record Count': raw.recordCount ?? 0,
      'Details': raw.details || ''
    };
  }

  // Generic Fallback
  return {
    'ID': raw.id || raw.studentId || raw.teacherId || 'N/A',
    'Title / Name': raw.fullName || raw.name || raw.className || raw.subjectName || raw.title || 'N/A',
    'Category / Type': raw.type || raw.category || entityType,
    'Status': raw.status || 'Active',
    'Date Created': raw.createdAt || raw.timestamp || 'N/A'
  };
}

function getEntityExportTitle(entityType: ExportEntityType): string {
  const titleMap: Record<ExportEntityType, string> = {
    students: 'Student Roster Directory',
    teachers: 'Faculty & Teacher Roster',
    parents: 'Parent & Guardian Directory',
    classes: 'School Class Structures',
    subjects: 'Academic Curriculum Subjects',
    timetables: 'Master Class Timetables',
    attendance: 'Student Attendance Register',
    assignments: 'Coursework & Assignments',
    'examination-results': 'Student Examination Results',
    'academic-reports': 'Student Academic Report Cards',
    payments: 'Fee Invoices & Transactions',
    'payment-receipts': 'Official Payment Receipts',
    'school-analytics': 'School Analytics Report',
    'audit-logs': 'System Security Audit Logs'
  };

  return titleMap[entityType] || 'EDUkenZA Export Report';
}
