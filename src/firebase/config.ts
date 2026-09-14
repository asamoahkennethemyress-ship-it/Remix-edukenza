/**
 * EDUkenZA Firebase & Database Architecture Preparation
 * Provides Firebase initialization structure with seamless offline state fallback
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { UserProfile, SchoolAccount } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
export { firebaseConfig };

// Initialize Firebase App & Services
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
const configWithDbId = firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string };
export const db = configWithDbId.firestoreDatabaseId
  ? getFirestore(app, configWithDbId.firestoreDatabaseId)
  : getFirestore(app);
export const storage = getStorage(app);

// Diagnostic Initialization Logging (Non-sensitive details only)
if (typeof window !== 'undefined') {
  console.log('[FIREBASE INIT] ========================================');
  console.log('[FIREBASE INIT] EDUkenZA Central Firebase Initialized');
  console.log('[FIREBASE INIT] Project ID:', firebaseConfig.projectId);
  console.log('[FIREBASE INIT] Auth Domain:', firebaseConfig.authDomain);
  console.log('[FIREBASE INIT] App ID:', firebaseConfig.appId);
  console.log('[FIREBASE INIT] Storage Bucket:', firebaseConfig.storageBucket);
  console.log('[FIREBASE INIT] Active Apps Count:', getApps().length);
  console.log('[FIREBASE INIT] ========================================');
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

export default app;

// Initial storage key names
export const STORAGE_KEYS = {
  CURRENT_USER: 'edukenza_user_session',
  SCHOOLS_LIST: 'edukenza_registered_schools',
  REGISTERED_USERS: 'edukenza_registered_users',
};

// Initial schools seed (empty by default; schools are dynamically created by Platform Owner)
export const INITIAL_SCHOOLS: SchoolAccount[] = [];

export const getSavedSchools = (): SchoolAccount[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHOOLS_LIST);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: any) => s && (s.id || s.schoolId));
      }
    }
  } catch (e) {
    console.error('Failed to load schools from local storage', e);
  }
  return [];
};

export const saveSchoolAccount = (school: SchoolAccount): void => {
  const currentSchools = getSavedSchools();
  const updated = [school, ...currentSchools.filter(s => s.id !== school.id)];
  localStorage.setItem(STORAGE_KEYS.SCHOOLS_LIST, JSON.stringify(updated));
};

export const removeSavedSchoolAccount = (schoolId: string): void => {
  try {
    const currentSchools = getSavedSchools();
    const updated = currentSchools.filter((s: any) => s && s.id !== schoolId && s.schoolId !== schoolId);
    localStorage.setItem(STORAGE_KEYS.SCHOOLS_LIST, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove school from local storage', e);
  }
};
