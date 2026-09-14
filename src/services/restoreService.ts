import { collection, doc, setDoc, addDoc, getDocs, query, where } from 'firebase/firestore';
import JSZip from 'jszip';
import { db } from '../firebase/config';
import { 
  BackupPackage, 
  BackupMetadata, 
  RestoreHistoryRecord, 
  SystemHealthCheckResult 
} from '../types/backup';
import { validateBackupFileIntegrity } from './backupValidationService';

export interface ParseBackupResult {
  metadata: BackupMetadata;
  dataPayload: Record<string, any[]>;
  rawPackage: BackupPackage;
}

/**
 * Parses an uploaded backup file (.json or .zip) into a BackupPackage
 */
export async function parseBackupFile(file: File): Promise<ParseBackupResult> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();

  if (fileExt === 'json') {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON format in backup file.');
    }

    const validation = validateBackupFileIntegrity(parsed);
    if (!validation.isValid) {
      throw new Error(`Backup file validation failed:\n- ${validation.errors.join('\n- ')}`);
    }

    return {
      metadata: parsed.metadata,
      dataPayload: parsed.data,
      rawPackage: parsed
    };
  } else if (fileExt === 'zip') {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const metaFile = zipContent.file('metadata.json');
    if (!metaFile) {
      throw new Error('Invalid ZIP backup: missing "metadata.json" at root level.');
    }

    const metaText = await metaFile.async('text');
    const metadata: BackupMetadata = JSON.parse(metaText);

    const dataPayload: Record<string, any[]> = {};
    const collectionsFolder = zipContent.folder('collections');

    if (collectionsFolder) {
      const colFiles = Object.keys(collectionsFolder.files).filter(f => f.endsWith('.json'));
      for (const filePath of colFiles) {
        const colName = filePath.split('/').pop()?.replace('.json', '');
        if (colName) {
          const colText = await collectionsFolder.files[filePath].async('text');
          dataPayload[colName] = JSON.parse(colText);
        }
      }
    }

    const rawPackage: BackupPackage = {
      metadata,
      data: dataPayload
    };

    const validation = validateBackupFileIntegrity(rawPackage);
    if (!validation.isValid) {
      throw new Error(`Backup file validation failed:\n- ${validation.errors.join('\n- ')}`);
    }

    return {
      metadata,
      dataPayload,
      rawPackage
    };
  } else {
    throw new Error('Unsupported backup file format. Please upload a .json or .zip backup archive.');
  }
}

export interface ExecuteRestoreParams {
  backupPackage: BackupPackage;
  selectedCollections: string[]; // User can choose to restore all or specific collections
  role: 'platform_owner' | 'school_admin';
  userUid: string;
  userName: string;
  targetSchoolId: string;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Restores collections and documents to Firestore database
 */
export async function executeDatabaseRestore(params: ExecuteRestoreParams): Promise<RestoreHistoryRecord> {
  const {
    backupPackage,
    selectedCollections,
    role,
    userUid,
    userName,
    targetSchoolId,
    onProgress
  } = params;

  const restoreId = `RST_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const { metadata, data } = backupPackage;

  onProgress?.(10, 'Initiating pre-restore validation & entity safety checks...');

  // Verification: School Admin can only restore data for their assigned school
  if (role === 'school_admin' && targetSchoolId && metadata.schoolId !== 'global' && metadata.schoolId !== targetSchoolId) {
    throw new Error(`Permission Denied: This backup belongs to school '${metadata.schoolId}', but you are managing '${targetSchoolId}'.`);
  }

  let totalRestoredRecords = 0;
  const restoredColsList: string[] = [];
  const colCountMap: Record<string, number> = {};

  const totalCols = selectedCollections.length;

  for (let i = 0; i < totalCols; i++) {
    const colName = selectedCollections[i];
    const docsToRestore = data[colName] || [];

    const currentPercent = 15 + Math.round(((i + 1) / totalCols) * 75);
    onProgress?.(currentPercent, `Restoring collection '${colName}' (${docsToRestore.length} documents)...`);

    let colRestoredCount = 0;

    for (const docItem of docsToRestore) {
      if (!docItem || typeof docItem !== 'object') continue;

      const docId = docItem.id || `restored_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cleanData = { ...docItem };
      delete cleanData.id; // Don't duplicate id in payload

      // If restoring as School Admin, ensure target schoolId matches safety parameter
      if (role === 'school_admin' && targetSchoolId && targetSchoolId !== 'global' && 'schoolId' in cleanData) {
        cleanData.schoolId = targetSchoolId;
      }

      // Add restore audit timestamp
      cleanData._restoredAt = new Date().toISOString();
      cleanData._restoredBy = userName;

      // Write document to Firestore using setDoc with merge: true
      await setDoc(doc(db, colName, docId), cleanData, { merge: true });
      colRestoredCount++;
    }

    if (colRestoredCount > 0) {
      restoredColsList.push(colName);
      colCountMap[colName] = colRestoredCount;
      totalRestoredRecords += colRestoredCount;
    }
  }

  onProgress?.(92, 'Recording restore log entry in database...');

  const impactSummary = Object.entries(colCountMap)
    .map(([col, cnt]) => `${col}: ${cnt} docs`)
    .join(' • ');

  const restoreRecord: Omit<RestoreHistoryRecord, 'id'> = {
    restoreId,
    backupId: metadata.backupId,
    restoredBy: userName,
    restoredByUid: userUid,
    role,
    schoolId: targetSchoolId || metadata.schoolId || 'global',
    restoredCollections: restoredColsList,
    totalRecords: totalRestoredRecords,
    restoredAt: new Date().toISOString(),
    status: 'completed',
    impactSummary: impactSummary || 'No records affected'
  };

  const docRef = await addDoc(collection(db, 'restoreHistory'), restoreRecord);
  const finalRecord: RestoreHistoryRecord = { id: docRef.id, ...restoreRecord };

  // Log in audit logs
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action: 'DATABASE_RESTORE_EXECUTED',
      restoreId,
      backupId: metadata.backupId,
      schoolId: targetSchoolId || 'global',
      userName,
      userUid,
      userRole: role,
      details: `Restored ${totalRestoredRecords} documents across ${restoredColsList.length} collections (${restoredColsList.join(', ')}). Impact: [${impactSummary}]`,
      timestamp: new Date().toISOString()
    });
  } catch (auditErr) {
    console.warn('Audit log write error:', auditErr);
  }

  onProgress?.(100, 'Database restore operation successfully completed!');

  return finalRecord;
}

/**
 * Fetch restore history logs from Firestore
 */
export async function fetchRestoreHistory(
  role: 'platform_owner' | 'school_admin',
  schoolId?: string
): Promise<RestoreHistoryRecord[]> {
  try {
    let q = query(collection(db, 'restoreHistory'));
    if (role === 'school_admin' && schoolId && schoolId !== 'global') {
      q = query(collection(db, 'restoreHistory'), where('schoolId', '==', schoolId));
    }
    const snap = await getDocs(q);
    const list: RestoreHistoryRecord[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as RestoreHistoryRecord));

    return list.sort((a, b) => new Date(b.restoredAt).getTime() - new Date(a.restoredAt).getTime());
  } catch (err) {
    console.warn('fetchRestoreHistory error:', err);
    return [];
  }
}
