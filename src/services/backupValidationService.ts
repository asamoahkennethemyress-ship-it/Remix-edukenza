import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { ref, uploadString, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { SystemHealthCheckResult, BackupPackage, CollectionBackupMeta } from '../types/backup';
import { getCollectionsForRole, BACKUP_COLLECTIONS } from '../utils/backupCollections';

/**
 * Runs a real-time system health check for Firestore and Storage connectivity.
 */
export async function runSystemHealthCheck(
  role: 'platform_owner' | 'school_admin',
  schoolId?: string
): Promise<SystemHealthCheckResult> {
  const result: SystemHealthCheckResult = {
    firestoreConnected: false,
    storageConnected: false,
    availableStorageEstimatedMB: 5000, // Unlimited Cloud Storage standard allocation
    collectionAccessStatus: {},
    checkedAt: new Date().toISOString()
  };

  // 1. Test Firestore Probe
  try {
    const probeSnap = await getDocs(query(collection(db, 'users'), limit(1)));
    result.firestoreConnected = true;
  } catch (err) {
    console.warn('Firestore probe check warning:', err);
    result.firestoreConnected = false;
  }

  // 2. Test Firebase Storage probe
  try {
    const probeRef = ref(storage, `backups/probes/probe_${Date.now()}.txt`);
    await uploadString(probeRef, 'EDUkenZA Backup Probe Test');
    result.storageConnected = true;
    // Clean up probe file
    deleteObject(probeRef).catch(() => {});
  } catch (err) {
    console.warn('Storage probe check warning:', err);
    // If storage offline, mark false but allow local fallback
    result.storageConnected = false;
  }

  // 3. Test accessibility for allowed collections
  const allowed = getCollectionsForRole(role);
  for (const def of allowed) {
    try {
      let q = query(collection(db, def.id), limit(1));
      if (role === 'school_admin' && schoolId && schoolId !== 'global' && def.schoolFilterField) {
        q = query(collection(db, def.id), where(def.schoolFilterField, '==', schoolId), limit(1));
      }
      await getDocs(q);
      result.collectionAccessStatus[def.id] = true;
    } catch {
      result.collectionAccessStatus[def.id] = false;
    }
  }

  return result;
}

/**
 * Counts existing records for selected collections before running backup.
 */
export async function estimateCollectionRecords(
  collectionsToBackup: string[],
  role: 'platform_owner' | 'school_admin',
  schoolId?: string
): Promise<CollectionBackupMeta[]> {
  const metas: CollectionBackupMeta[] = [];

  for (const colId of collectionsToBackup) {
    const def = BACKUP_COLLECTIONS.find(c => c.id === colId);
    if (!def) continue;

    try {
      let q = collection(db, colId) as any;
      if (role === 'school_admin' && schoolId && schoolId !== 'global' && def.schoolFilterField) {
        q = query(collection(db, colId), where(def.schoolFilterField, '==', schoolId));
      }
      const snap = await getDocs(q);
      metas.push({
        collectionName: colId,
        label: def.label,
        recordCount: snap.size
      });
    } catch (err) {
      console.warn(`Error counting collection ${colId}:`, err);
      metas.push({
        collectionName: colId,
        label: def.label,
        recordCount: 0
      });
    }
  }

  return metas;
}

/**
 * Validates a backup package structure before restore
 */
export function validateBackupFileIntegrity(pkg: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pkg || typeof pkg !== 'object') {
    return { isValid: false, errors: ['File does not contain a valid JSON object structure.'] };
  }

  if (!pkg.metadata) {
    errors.push('Missing required "metadata" section in backup package.');
  } else {
    if (!pkg.metadata.backupId) errors.push('Backup ID missing from metadata.');
    if (!pkg.metadata.backupType) errors.push('Backup Type missing from metadata.');
    if (!pkg.metadata.collectionsIncluded || !Array.isArray(pkg.metadata.collectionsIncluded)) {
      errors.push('Collections list missing or invalid in metadata.');
    }
  }

  if (!pkg.data || typeof pkg.data !== 'object') {
    errors.push('Missing "data" collection payload in backup file.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
