/**
 * EDUkenZA Firebase & Database Architecture Preparation
 * Provides Firebase initialization structure with seamless offline state fallback
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { UserProfile, SchoolAccount } from '../types';
import rawFirebaseConfig from '../../firebase-applet-config.json';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

function sanitizeConfigValue(val: any): string | undefined {
  if (typeof val !== 'string') return undefined;
  // Remove wrapping quotes, commas, spaces, or stray punctuation
  const cleaned = val.replace(/^["']|["',]+$/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

// Active Firebase Configuration with support for production Vercel environment variable overrides
export const firebaseConfig = {
  projectId: 'edukenza-2ab0',
  authDomain: 'edukenza-2ab0.firebaseapp.com',
  storageBucket: 'edukenza-2ab0.firebasestorage.app',
  apiKey: sanitizeConfigValue(metaEnv?.VITE_FIREBASE_API_KEY) || rawFirebaseConfig.apiKey || 'AIzaSyCbIbeyet9cOf1V18cmB7rQfrbwERNltAI',
  appId: sanitizeConfigValue(metaEnv?.VITE_FIREBASE_APP_ID) || rawFirebaseConfig.appId || '1:782147626491:web:e32e1b2c7389f403aa975e',
  messagingSenderId: sanitizeConfigValue(metaEnv?.VITE_FIREBASE_MESSAGING_SENDER_ID) || rawFirebaseConfig.messagingSenderId || '782147626491',
  measurementId: sanitizeConfigValue(metaEnv?.VITE_FIREBASE_MEASUREMENT_ID) || rawFirebaseConfig.measurementId || '',
  oAuthClientId: sanitizeConfigValue(metaEnv?.VITE_FIREBASE_OAUTH_CLIENT_ID) || rawFirebaseConfig.oAuthClientId || '782147626491-3hir9reluoftdi7mg2ueve72evs6h70t.apps.googleusercontent.com',
  firestoreDatabaseId: 'ai-studio-remixedukenza-e7c63526-01e3-4b16-897a-39990509a023',
  recaptchaSiteKey: (rawFirebaseConfig as any).recaptchaSiteKey || ''
};

// Initialize Firebase App & Services (single instance guarantee)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth with browserPopupRedirectResolver and indexedDBLocalPersistence
// This prevents auth/argument-error when executing signInWithPopup in the browser
let authInstance: any;
try {
  authInstance = getAuth(app);
} catch {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
}

// Ensure popupRedirectResolver is guaranteed on the auth instance
if (authInstance && !authInstance._popupRedirectResolver) {
  try {
    authInstance._popupRedirectResolver = browserPopupRedirectResolver;
  } catch {}
}

export const auth = authInstance;
export { browserPopupRedirectResolver };

/**
 * Helper to construct a clean, valid GoogleAuthProvider instance with proper parameters
 */
export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}

export const googleProvider = createGoogleProvider();
const targetDbId = firebaseConfig.firestoreDatabaseId;
export const db = (targetDbId && targetDbId !== '(default)' && targetDbId.trim() !== '')
  ? getFirestore(app, targetDbId)
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
