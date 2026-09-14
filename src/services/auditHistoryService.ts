import { collection, getDocs, setDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';
import { ImportHistoryItem, ExportHistoryItem, AuditLogRecord } from '../types/importExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function logAuditEvent(record: Omit<AuditLogRecord, 'id' | 'timestamp'> & { timestamp?: string }) {
  try {
    const logDocRef = doc(collection(db, 'auditLogs'));
    const timestamp = record.timestamp || new Date().toISOString();
    await setDoc(logDocRef, {
      ...record,
      timestamp
    });
  } catch (err) {
    console.warn("logAuditEvent failed:", err);
  }
}

export async function fetchImportHistory(schoolId?: string): Promise<ImportHistoryItem[]> {
  try {
    let q = query(collection(db, 'importHistory'));
    if (schoolId && schoolId !== 'global') {
      q = query(q, where('schoolId', '==', schoolId));
    }
    const snap = await getDocs(q);
    const list: ImportHistoryItem[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as ImportHistoryItem));
    return list.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
  } catch (err) {
    console.warn("fetchImportHistory warning:", err);
    return [];
  }
}

export async function fetchExportHistory(schoolId?: string): Promise<ExportHistoryItem[]> {
  try {
    let q = query(collection(db, 'exportHistory'));
    if (schoolId && schoolId !== 'global') {
      q = query(q, where('schoolId', '==', schoolId));
    }
    const snap = await getDocs(q);
    const list: ExportHistoryItem[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExportHistoryItem));
    return list.sort((a, b) => new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime());
  } catch (err) {
    console.warn("fetchExportHistory warning:", err);
    return [];
  }
}

export async function fetchAuditLogs(schoolId?: string, maxRecords: number = 200): Promise<AuditLogRecord[]> {
  try {
    let q = query(collection(db, 'auditLogs'));
    if (schoolId && schoolId !== 'global') {
      q = query(q, where('schoolId', '==', schoolId));
    }
    const snap = await getDocs(q);
    const list: AuditLogRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogRecord));
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxRecords);
  } catch (err) {
    console.warn("fetchAuditLogs warning:", err);
    return [];
  }
}

/**
 * Downloads a detailed PDF execution audit report for an import job
 */
export function downloadImportAuditReport(history: ImportHistoryItem) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Navy Header
  doc.setFillColor('#002147');
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, 'F');

  doc.setFillColor('#D4AF37');
  doc.rect(0, 70, doc.internal.pageSize.getWidth(), 4, 'F');

  doc.setTextColor('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('EDUkenZA Data Import Audit Report', 30, 35);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Import Job ID: ${history.importId} • Target Entity: ${history.importType.toUpperCase()}`, 30, 52);

  // Summary Grid
  doc.setFillColor('#F4F6FA');
  doc.roundedRect(30, 85, doc.internal.pageSize.getWidth() - 60, 80, 6, 6, 'F');

  doc.setTextColor('#002147');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Execution Overview:', 45, 105);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`File Name: ${history.fileName}`, 45, 122);
  doc.text(`Imported By: ${history.importedByName}`, 45, 137);
  doc.text(`Date & Time: ${new Date(history.importedAt).toLocaleString()}`, 45, 152);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Rows: ${history.totalRows}`, 320, 122);
  doc.setTextColor('#166534');
  doc.text(`Successful Rows: ${history.successfulRows}`, 320, 137);
  doc.setTextColor('#991B1B');
  doc.text(`Failed Rows: ${history.failedRows}`, 320, 152);

  // Error Details Table
  doc.setTextColor('#002147');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Row Validation & Exception Log:', 30, 190);

  const errors = history.errors || [];
  const errorData = errors.length > 0 
    ? errors.map(e => [
        `Row ${e.rowNumber}`,
        e.field || 'General',
        e.message || 'Validation error'
      ])
    : [['1-N', 'All Fields', 'All rows passed validation and were successfully imported into the database without errors.']];

  autoTable(doc, {
    startY: 200,
    head: [['Row #', 'Target Field', 'Error Description']],
    body: errorData,
    theme: 'grid',
    headStyles: {
      fillColor: '#002147',
      textColor: '#FFFFFF',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    margin: { left: 30, right: 30 }
  });

  doc.save(`Import_Audit_Report_${history.importId}.pdf`);
}
