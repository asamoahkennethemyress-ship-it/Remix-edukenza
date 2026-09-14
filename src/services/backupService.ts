import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc,
  orderBy, 
  limit 
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import JSZip from 'jszip';
import { db, storage } from '../firebase/config';
import { 
  BackupMetadata, 
  BackupPackage, 
  BackupHistoryRecord, 
  BackupType, 
  BackupFormat, 
  AutomaticBackupSettings 
} from '../types/backup';
import { BACKUP_COLLECTIONS, getCollectionsForRole } from '../utils/backupCollections';

export interface CreateBackupParams {
  role: 'platform_owner' | 'school_admin';
  userUid: string;
  userName: string;
  schoolId: string; // 'global' for platform owner or specific school ID
  schoolName?: string;
  backupType: BackupType;
  selectedCollections: string[];
  fileFormat: BackupFormat;
  onProgress?: (percent: number, message: string) => void;
}

/**
 * Executes a full or partial database backup and saves to Storage & backupHistory
 */
export async function createDatabaseBackup(params: CreateBackupParams): Promise<{
  backupRecord: BackupHistoryRecord;
  downloadBlob: Blob;
  fileName: string;
}> {
  const {
    role,
    userUid,
    userName,
    schoolId,
    schoolName = 'EDUkenZA Academy',
    backupType,
    selectedCollections,
    fileFormat,
    onProgress
  } = params;

  const backupId = `BKP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  onProgress?.(10, 'Initiating collection reads...');

  const dataPayload: Record<string, any[]> = {};
  let totalRecordsAcc = 0;

  // 1. Fetch data from each selected collection
  const totalCols = selectedCollections.length;
  for (let i = 0; i < totalCols; i++) {
    const colId = selectedCollections[i];
    const def = BACKUP_COLLECTIONS.find(c => c.id === colId);
    
    const currentPercent = 10 + Math.round(((i + 1) / totalCols) * 50);
    onProgress?.(currentPercent, `Reading collection '${colId}'...`);

    try {
      let q = collection(db, colId) as any;
      if (role === 'school_admin' && schoolId && schoolId !== 'global' && def?.schoolFilterField) {
        q = query(collection(db, colId), where(def.schoolFilterField, '==', schoolId));
      }

      const snap = await getDocs(q);
      const docsList = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as object)
      }));

      dataPayload[colId] = docsList;
      totalRecordsAcc += docsList.length;
    } catch (err) {
      console.warn(`Warning reading collection ${colId}:`, err);
      dataPayload[colId] = [];
    }
  }

  onProgress?.(65, 'Assembling backup package metadata...');

  const metadata: BackupMetadata = {
    backupId,
    schoolId: schoolId || 'global',
    schoolName,
    backupType,
    scope: role === 'platform_owner' ? 'platform' : 'school',
    createdBy: userName,
    createdByUid: userUid,
    role,
    dateCreated: new Date().toISOString(),
    edukenzaVersion: 'v3.2.0-enterprise',
    totalRecords: totalRecordsAcc,
    collectionsIncluded: selectedCollections,
    fileFormat
  };

  const backupPackage: BackupPackage = {
    metadata,
    data: dataPayload
  };

  onProgress?.(75, `Formatting output as ${fileFormat.toUpperCase()}...`);

  let fileBlob: Blob;
  let fileName: string;

  if (fileFormat === 'json') {
    const jsonStr = JSON.stringify(backupPackage, null, 2);
    fileBlob = new Blob([jsonStr], { type: 'application/json' });
    fileName = `EDUkenZA_Backup_${schoolId}_${backupId}.json`;
  } else {
    // ZIP packaging with JSZip
    const zip = new JSZip();
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    const collectionsFolder = zip.folder('collections');
    for (const [colName, items] of Object.entries(dataPayload)) {
      collectionsFolder?.file(`${colName}.json`, JSON.stringify(items, null, 2));
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    fileBlob = zipContent;
    fileName = `EDUkenZA_Backup_${schoolId}_${backupId}.zip`;
  }

  // Calculate size
  const fileSizeInKB = (fileBlob.size / 1024).toFixed(1);
  const fileSizeFormatted = fileBlob.size > 1024 * 1024 
    ? `${(fileBlob.size / (1024 * 1024)).toFixed(2)} MB` 
    : `${fileSizeInKB} KB`;

  onProgress?.(85, 'Uploading backup archive to Firebase Storage...');

  const storagePath = `backups/${schoolId}/${fileName}`;
  let downloadUrl = '';

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileBlob);
    downloadUrl = await getDownloadURL(storageRef);
  } catch (err) {
    console.warn('Storage upload error (fallback active):', err);
  }

  onProgress?.(95, 'Logging backup history & audit trail...');

  const historyRecord: Omit<BackupHistoryRecord, 'id'> = {
    backupId,
    schoolId: schoolId || 'global',
    schoolName,
    createdBy: userName,
    createdByUid: userUid,
    role,
    backupType,
    collectionsIncluded: selectedCollections,
    totalRecords: totalRecordsAcc,
    fileSize: fileSizeFormatted,
    fileFormat,
    storagePath,
    downloadUrl,
    createdAt: new Date().toISOString(),
    status: 'completed'
  };

  // Save record to Firestore backupHistory
  const docRef = await addDoc(collection(db, 'backupHistory'), historyRecord);
  const finalRecord: BackupHistoryRecord = { id: docRef.id, ...historyRecord };

  // Log in audit logs
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action: 'BACKUP_CREATED',
      backupId,
      schoolId: schoolId || 'global',
      userName,
      userUid,
      userRole: role,
      details: `Created ${backupType.toUpperCase()} database backup containing ${totalRecordsAcc} records across ${selectedCollections.length} collections (${fileFormat.toUpperCase()}).`,
      timestamp: new Date().toISOString()
    });
  } catch (auditErr) {
    console.warn('Audit log write error:', auditErr);
  }

  onProgress?.(100, 'Backup completed successfully!');

  return {
    backupRecord: finalRecord,
    downloadBlob: fileBlob,
    fileName
  };
}

/**
 * Trigger immediate browser download of a backup file blob
 */
export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fetch backup history logs from Firestore
 */
export async function fetchBackupHistory(
  role: 'platform_owner' | 'school_admin',
  schoolId?: string
): Promise<BackupHistoryRecord[]> {
  try {
    let q = query(collection(db, 'backupHistory'));
    if (role === 'school_admin' && schoolId && schoolId !== 'global') {
      q = query(collection(db, 'backupHistory'), where('schoolId', '==', schoolId));
    }
    const snap = await getDocs(q);
    const list: BackupHistoryRecord[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as BackupHistoryRecord));

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('fetchBackupHistory error:', err);
    return [];
  }
}

/**
 * Fetch or save Automatic Backup schedule settings
 */
export async function getAutomaticBackupSettings(schoolId: string = 'global'): Promise<AutomaticBackupSettings> {
  const defaultSettings: AutomaticBackupSettings = {
    enabled: true,
    frequency: 'daily',
    timeOfDay: '02:00',
    selectedCollections: BACKUP_COLLECTIONS.map(c => c.id),
    notifyEmail: 'admin@edukenza.com',
    autoDeleteDays: 30,
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  try {
    const docSnap = await getDoc(doc(db, 'backupSettings', schoolId));
    if (docSnap.exists()) {
      return { ...defaultSettings, ...docSnap.data() } as AutomaticBackupSettings;
    }
  } catch (e) {
    console.warn('getAutomaticBackupSettings warning:', e);
  }
  return defaultSettings;
}

export async function saveAutomaticBackupSettings(
  settings: AutomaticBackupSettings,
  schoolId: string = 'global',
  userUid: string,
  userName: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'backupSettings', schoolId), {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: userName
    });

    await addDoc(collection(db, 'auditLogs'), {
      action: 'AUTOMATIC_BACKUP_CONFIG_UPDATED',
      schoolId,
      userName,
      userUid,
      details: `Updated automatic backup schedule to ${settings.frequency.toUpperCase()} at ${settings.timeOfDay} (Status: ${settings.enabled ? 'ENABLED' : 'DISABLED'}).`,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('saveAutomaticBackupSettings error:', e);
    throw new Error('Failed to save automatic backup settings.');
  }
}
