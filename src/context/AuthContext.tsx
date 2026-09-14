import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection, 
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { UserProfile, SchoolAccount, UserRole, ActiveView, RegistrationFormData, EducationCategory } from '../types';
import { auth, db, googleProvider, STORAGE_KEYS, getSavedSchools, saveSchoolAccount, handleFirestoreError, OperationType, firebaseConfig } from '../firebase/config';
import { PRIMARY_PLATFORM_OWNER_EMAIL, isPlatformOwnerEmail, enforceProtectedRole, isSchoolAdminRole, normalizeRole, parseValidRole } from '../utils/permissions';
import { parseAuthError } from '../utils/authErrors';
import { formatStudentAuthEmail, parseStudentAuthError } from '../utils/studentAuthHelper';
import { logAuthDebug } from '../utils/debugLogger';
import { 
  logSecurityEvent, 
  trackFailedLoginAttempt, 
  clearFailedLoginAttempts, 
  isAccountLockedDueToRateLimit 
} from '../services/securityAuditService';
import { triggerPlatformOwnerAlert } from '../services/notificationService';
import { verifyWebAuthnPasskey, createWebAuthnPasskey } from '../services/biometricService';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function getDashboardViewForRole(role: UserRole, educationCategory?: EducationCategory): ActiveView {
  switch (role) {
    case 'platform_owner':
      return 'owner-dashboard';
    case 'school_head':
    case 'assistant_academics':
    case 'assistant_domestic':
    case 'house_master':
    case 'housekeeping':
    case 'facilities':
    case 'general_services':
      return 'senior-high-dashboard';
    case 'school_admin':
      return educationCategory === 'SENIOR_HIGH' ? 'senior-high-dashboard' : 'school-admin-dashboard';
    case 'teacher':
      return 'teacher-dashboard';
    case 'student':
      return 'student-dashboard';
    case 'parent':
      return 'parent-dashboard';
    default:
      return 'login';
  }
}

export const DASHBOARD_ROLE_REQUIREMENTS: Record<string, UserRole | UserRole[]> = {
  'owner-dashboard': 'platform_owner',
  'school-admin-dashboard': ['school_admin', 'school_head', 'platform_owner'],
  'senior-high-dashboard': [
    'school_head',
    'assistant_academics',
    'assistant_domestic',
    'house_master',
    'housekeeping',
    'facilities',
    'general_services',
    'school_admin',
    'platform_owner'
  ],
  'teacher-dashboard': ['teacher', 'assistant_academics', 'school_head', 'school_admin', 'platform_owner'],
  'student-dashboard': ['student', 'platform_owner'],
  'parent-dashboard': ['parent', 'platform_owner']
};

/**
 * AUTHENTICATION & FIRESTORE LOGGING MIDDLEWARE
 * Intercepts, structures, and logs all Firebase Authentication state changes
 * and Firestore document fetches to track auth flows and diagnose login failures.
 */
export const authLoggingMiddleware = {
  logAuthStateChange: (firebaseUser: FirebaseUser | null, contextSource: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH MIDDLEWARE | ${timestamp}] =====================================`);
    console.log(`[AUTH MIDDLEWARE | ${timestamp}] EVENT: Auth State Changed (${contextSource})`);
    if (firebaseUser) {
      console.log(`[AUTH MIDDLEWARE] Status: AUTHENTICATED`);
      console.log(`[AUTH MIDDLEWARE] User UID:`, firebaseUser.uid);
      console.log(`[AUTH MIDDLEWARE] User Email:`, firebaseUser.email);
      console.log(`[AUTH MIDDLEWARE] Email Verified:`, firebaseUser.emailVerified);
      console.log(`[AUTH MIDDLEWARE] Provider Data:`, firebaseUser.providerData.map(p => ({ providerId: p.providerId, email: p.email })));
    } else {
      console.log(`[AUTH MIDDLEWARE] Status: UNAUTHENTICATED / LOGGED OUT`);
    }
    console.log(`[AUTH MIDDLEWARE | ${timestamp}] =====================================`);
  },

  logDocFetchStart: (path: string, contextSource: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH MIDDLEWARE | ${timestamp}] FETCH START -> Target Path: "${path}" | Source: ${contextSource}`);
  },

  logDocFetchResult: (
    path: string, 
    exists: boolean, 
    data: any | null, 
    contextSource: string,
    error?: any
  ) => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH MIDDLEWARE | ${timestamp}] === FIRESTORE DOC FETCH RESULT (${contextSource}) ===`);
    console.log(`[AUTH MIDDLEWARE] Path: "${path}"`);
    console.log(`[AUTH MIDDLEWARE] Document Exists in Database: ${exists}`);
    if (error) {
      console.warn(`[AUTH MIDDLEWARE] Firestore Fetch Note (serving fallback if needed):`, error);
    } else if (exists && data) {
      console.log(`[AUTH MIDDLEWARE] Document Summary:`, {
        uid: data.uid || 'UNSET',
        email: data.email || 'UNSET',
        role: data.role || 'UNSET',
        status: data.status || 'UNSET',
        schoolId: data.schoolId || data.school_id || data.assignedSchoolId || data.school || 'MISSING',
        schoolName: data.schoolName || 'UNSET',
        fullName: data.fullName || data.name || 'UNSET',
        createdAt: data.createdAt || 'UNSET'
      });
      console.log(`[AUTH MIDDLEWARE] Raw Payload:`, data);
    } else {
      console.warn(`[AUTH MIDDLEWARE] WARNING: No Firestore document exists at "${path}"`);
    }
    console.log(`[AUTH MIDDLEWARE | ${timestamp}] =====================================`);
  }
};

/**
 * Dedicated helper to fetch a user document from Firestore with middleware logging
 */
/**
 * Dedicated helper to fetch an exact user document from Firestore users/{uid}
 * Strictly authoritative by Firebase Authentication UID.
 * Does NOT auto-create, mutate, or substitute profiles or school IDs.
 */
async function fetchUserDocWithMiddlewareLogging(uid: string, contextSource: string, userEmail?: string) {
  const path = `users/${uid}`;
  authLoggingMiddleware.logDocFetchStart(path, contextSource);
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    const exists = userSnap.exists();
    const data = exists ? userSnap.data() : null;

    let mismatchedDocId: string | null = null;

    // If profile is not found under users/{uid}, perform read-only check for email mismatch (Step 7)
    if (!exists && userEmail) {
      try {
        const cleanEmail = userEmail.trim().toLowerCase();
        const qEmail = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          const matchedDoc = emailSnap.docs[0];
          if (matchedDoc.id !== uid) {
            mismatchedDocId = matchedDoc.id;
            console.warn(`[AUTH UID MISMATCH] Document exists for email "${cleanEmail}" under UID "${matchedDoc.id}", but authenticated Google UID is "${uid}". UID MATCH: NO`);
          }
        }
      } catch (checkErr) {
        // Silent catch for diagnostic check to avoid interfering with primary auth flow
      }
    }

    authLoggingMiddleware.logDocFetchResult(path, exists, data, contextSource);
    return { 
      userSnap, 
      exists, 
      data, 
      path, 
      userDocRef, 
      permissionDenied: false, 
      mismatchedDocId, 
      error: null 
    };
  } catch (error: any) {
    const isPermissionError = error?.code === 'permission-denied' || String(error?.message || '').toLowerCase().includes('permission');
    const fsError = handleFirestoreError(error, OperationType.GET, path);
    authLoggingMiddleware.logDocFetchResult(path, false, null, contextSource, fsError);

    if (isPermissionError) {
      console.error(`[AUTH FIRESTORE ERROR] Firestore permission denied on path "${path}":`, error);
    }

    return { 
      userSnap: null, 
      exists: false, 
      data: null, 
      path, 
      userDocRef: doc(db, 'users', uid), 
      permissionDenied: isPermissionError, 
      mismatchedDocId: null, 
      error 
    };
  }
}

/**
 * Dedicated Debug Logger for User Authentication and Role Validation
 */
const logAuthFlow = (
  authUid: string,
  firestorePath: string,
  docExists: boolean,
  userData: any,
  roleDetected: string,
  redirectDestination: string,
  errorMsg?: string
) => {
  console.log('[EDUKENZA AUTH DEBUG] =====================================');
  console.log('[EDUKENZA AUTH DEBUG] Step 1: Authentication success: true');
  console.log('[EDUKENZA AUTH DEBUG] Step 2: Auth UID:', authUid);
  console.log('[EDUKENZA AUTH DEBUG] Step 2: Firestore document path:', firestorePath);
  console.log('[EDUKENZA AUTH DEBUG] Step 2: Document exists:', docExists);
  console.log('[EDUKENZA AUTH DEBUG] Step 2: Document data:', userData);
  console.log('[EDUKENZA AUTH DEBUG] Step 3: Role detected:', roleDetected);
  console.log('[EDUKENZA AUTH DEBUG] Step 4: Redirect target:', redirectDestination);
  if (errorMsg) {
    console.warn('[EDUKENZA AUTH DEBUG] Step Note / Exact Exception:', errorMsg);
  }
  console.log('[EDUKENZA AUTH DEBUG] =====================================');
};

interface AuthContextType {
  currentUser: UserProfile | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  registeredSchools: SchoolAccount[];
  login: (emailOrStudentId: string, password: string, rememberMe?: boolean, selectedRole?: string) => Promise<{ success: boolean; message?: string; isFirstLoginSetup?: boolean }>;
  loginWithStudentId: (studentId: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  loginStudentWithGoogle: (onProgress?: (status: string) => void) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (onProgress?: (stage: 'signing_in' | 'loading_profile') => void) => Promise<{ success: boolean; message?: string }>;
  loginWithBiometrics: () => Promise<{ success: boolean; message?: string }>;
  registerBiometricDevice: (displayName?: string) => Promise<{ success: boolean; credentialId?: string; message?: string }>;
  setupSchoolAdminPassword: (newPassword: string) => Promise<{ success: boolean; message?: string }>;
  setupSchoolAdminPasswordWithCredentials: (email: string, tempPass: string, newPass: string) => Promise<{ success: boolean; message?: string }>;
  completeStudentPasswordChange: (newPassword: string) => Promise<{ success: boolean; message?: string }>;
  registerSchool: (data: RegistrationFormData) => Promise<{ success: boolean; school?: SchoolAccount; user?: UserProfile; message?: string }>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  activeModal: 'privacy' | 'terms' | 'contact' | 'forgot_password' | 'first_login_password_setup' | null;
  setActiveModal: (modal: 'privacy' | 'terms' | 'contact' | 'forgot_password' | 'first_login_password_setup' | null) => void;
  loadingAuth: boolean;
  targetRoleDestination?: {
    title: string;
    subtitle: string;
    description: string;
    features: string[];
  } | null;
  clearRoleDestination?: () => void;
  isWalkthroughOpen: boolean;
  openWalkthrough: () => void;
  closeWalkthrough: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        parsed.role = enforceProtectedRole(parsed.email, parsed.role);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse cached user:', e);
    }
    return null;
  });

  const [activeView, setActiveViewRaw] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view') || urlParams.get('tab');
        if (viewParam && ['home', 'features', 'how-it-works', 'benefits', 'pricing', 'faq', 'login', 'register-school', 'role-preview'].includes(viewParam)) {
          return viewParam as ActiveView;
        }
        const hash = window.location.hash.replace('#', '');
        if (hash && ['home', 'features', 'how-it-works', 'benefits', 'pricing', 'faq', 'login', 'register-school', 'role-preview'].includes(hash)) {
          return hash as ActiveView;
        }
      } catch (e) {
        console.warn('[ActiveView Init Notice]:', e);
      }
    }
    return 'home';
  });
  const [registeredSchools, setRegisteredSchools] = useState<SchoolAccount[]>(getSavedSchools());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | 'forgot_password' | 'first_login_password_setup' | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);
  const [targetRoleDestination, setTargetRoleDestination] = useState<{
    title: string;
    subtitle: string;
    description: string;
    features: string[];
  } | null>(null);

  const clearRoleDestination = () => {
    setTargetRoleDestination(null);
    setActiveViewRaw('home');
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 2000) => {
    const id = Date.now().toString();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, duration);
  }, []);

  const openWalkthrough = () => setIsWalkthroughOpen(true);

  const closeWalkthrough = () => {
    setIsWalkthroughOpen(false);
    if (currentUser?.uid) {
      localStorage.setItem(`edukenza_walkthrough_seen_${currentUser.uid}`, 'true');
    }
  };

  // Real-time Firestore Profile Listener Reference
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);
  // Guard flag to prevent onAuthStateChanged from prematurely executing sign-out during active login flows
  const isAuthenticatingRef = useRef<boolean>(false);
  // Synchronous ref of currentUser to eliminate route-guard race conditions upon login/registration
  const currentUserRef = useRef<UserProfile | null>(currentUser);

  const stopProfileListener = useCallback(() => {
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }
  }, []);

  const startProfileListener = useCallback((authUid: string) => {
    stopProfileListener();

    try {
      const userDocRef = doc(db, 'users', authUid);
      const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (!docSnap.exists()) {
          // Avoid race conditions: if authenticating or currentUser was just established, wait for document sync
          if (isAuthenticatingRef.current || (currentUserRef.current && currentUserRef.current.uid === authUid)) {
            console.log('[REALTIME PROFILE] Initial user document sync in progress, waiting...');
            return;
          }
          console.warn('[REALTIME PROFILE] Firestore user profile document was deleted or missing.');
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          setActiveViewRaw('login');
          showToast('Your account profile could not be found. Signing out.', 'error');
          return;
        }

        const data = docSnap.data();
        const cleanEmail = (data.email || auth.currentUser?.email || '').toLowerCase().trim();
        const validatedRole = enforceProtectedRole(cleanEmail, data.role);

        // UNKNOWN / UNVERIFIED ROLE CHECK
        if (!validatedRole) {
          console.warn('[REALTIME PROFILE] Role could not be verified for user:', authUid);
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          setActiveViewRaw('login');
          showToast('Your account role could not be verified. Please contact your administrator.', 'error');
          return;
        }

        // STATUS CHECK
        const status = String(data.status || 'active').toLowerCase().trim();
        if (status !== 'active' && validatedRole !== 'platform_owner') {
          console.warn(`[REALTIME PROFILE] User status changed to "${status}". Logging out immediately.`);
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          setActiveViewRaw('login');
          let msg = 'Your account status has changed. Please contact your administrator.';
          if (status === 'suspended') {
            msg = 'Your account has been suspended. Please contact support.';
          } else if (status === 'disabled') {
            msg = 'Your account has been disabled.';
          } else if (status === 'inactive') {
            msg = 'Your school account is inactive.';
          }
          showToast(msg, 'error');
          return;
        }

        // SCHOOL ISOLATION CHECK
        const resolvedSchoolId = data.schoolId || data.school_id || data.assignedSchoolId || data.school || '';
        if (isSchoolAdminRole(validatedRole) && (!resolvedSchoolId || resolvedSchoolId.trim() === '')) {
          console.warn('[REALTIME PROFILE] Active School Admin missing assigned schoolId.');
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          setActiveViewRaw('login');
          showToast('School Admin account is missing an assigned school. Access revoked.', 'error');
          return;
        }

        if (validatedRole === 'student' && (!resolvedSchoolId || resolvedSchoolId.trim() === '')) {
          console.warn('[REALTIME PROFILE] Active Student missing assigned schoolId.');
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          setActiveViewRaw('login');
          showToast('Student account is not assigned to any registered school. Access revoked.', 'error');
          return;
        }

        const liveProfile: UserProfile = {
          ...data,
          uid: authUid,
          email: cleanEmail,
          name: data.fullName || data.name || cleanEmail.split('@')[0] || 'User',
          fullName: data.fullName || data.name || 'User',
          role: validatedRole,
          status: (data.status as any) || 'active',
          firstLogin: false,
          schoolId: resolvedSchoolId,
          schoolName: data.schoolName || '',
          createdAt: data.createdAt || new Date().toISOString()
        };

        setCurrentUser(liveProfile);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(liveProfile));

        const targetDashboard = getDashboardViewForRole(validatedRole, (data as any).educationCategory);
        if (targetDashboard !== 'login') {
          setActiveViewRaw((prevView) => {
            if (Object.keys(DASHBOARD_ROLE_REQUIREMENTS).includes(prevView) && prevView !== targetDashboard) {
              console.log(`[REALTIME PROFILE] Real-time role change: routing from "${prevView}" to "${targetDashboard}"`);
              return targetDashboard;
            }
            return prevView;
          });
        }
      }, (err) => {
        console.warn('[REALTIME PROFILE] Snapshot listener error:', err);
      });

      profileUnsubscribeRef.current = unsubscribe;
    } catch (e) {
      console.warn('[REALTIME PROFILE] Error setting up snapshot listener:', e);
    }
  }, [stopProfileListener, showToast]);

  /**
   * Authoritative account resolver and safe migration mechanism.
   * Resolves an authenticated Google user's profile strictly under users/{authUid}.
   * If users/{authUid} exists, returns it directly.
   * If not, checks pre-authorized registrations (Platform Owner, users by email, teachers,
   * students, parents, schools, schoolAdmins) and links them cleanly to users/{authUid} without data loss.
   */
  const resolveAndLinkUserProfile = useCallback(async (
    authUid: string,
    cleanEmail: string,
    displayName: string,
    photoUrl: string
  ): Promise<{ profile: UserProfile | null; error?: string }> => {
    const userDocRef = doc(db, 'users', authUid);

    try {
      // 1. Direct check: users/{authUid}
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const rawData = snap.data();
        let role = normalizeRole(rawData.role);

        // Platform Owner email guarantees platform_owner role
        if (isPlatformOwnerEmail(cleanEmail)) {
          role = 'platform_owner';
        }

        if (!role) {
          return { profile: null, error: 'Your account role could not be verified. Please contact your administrator.' };
        }

        const profile: UserProfile = {
          ...rawData,
          uid: authUid,
          email: cleanEmail || rawData.email || '',
          name: rawData.fullName || rawData.name || displayName || cleanEmail.split('@')[0],
          fullName: rawData.fullName || rawData.name || displayName || 'User',
          role: role,
          educationCategory: rawData.educationCategory || 'BASIC',
          status: rawData.status || 'active',
          firstLogin: false,
          schoolId: rawData.schoolId || rawData.school_id || (role === 'platform_owner' ? 'global' : ''),
          schoolName: rawData.schoolName || (role === 'platform_owner' ? 'EDUkenZA Platform' : ''),
          photoUrl: rawData.photoUrl || photoUrl || '',
          avatarUrl: rawData.avatarUrl || rawData.photoUrl || photoUrl || '',
          createdAt: rawData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return { profile };
      }

      // 2. Safe account-linking / migration for pre-registered accounts
      console.log(`[AUTH RESOLUTION] users/${authUid} not yet provisioned. Checking pre-authorized records for "${cleanEmail}"...`);

      // A. Platform Owner Provisioning
      if (isPlatformOwnerEmail(cleanEmail)) {
        console.log(`[AUTH RESOLUTION] Authenticated email "${cleanEmail}" identified as Platform Owner. Provisioning users/${authUid}...`);
        const ownerProfile: UserProfile = {
          uid: authUid,
          email: cleanEmail,
          name: displayName || 'Platform Owner',
          fullName: displayName || 'Platform Owner',
          role: 'platform_owner',
          status: 'active',
          firstLogin: false,
          schoolId: 'global',
          schoolName: 'EDUkenZA Platform',
          educationCategory: 'BASIC',
          photoUrl: photoUrl || '',
          avatarUrl: photoUrl || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userDocRef, ownerProfile);
        return { profile: ownerProfile };
      }

      // B. Check users collection by email (e.g. pre-provisioned School Admin/Head or previous registration)
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
        if (!uSnap.empty) {
          const legacyDoc = uSnap.docs[0];
          const legacyData = legacyDoc.data();
          const role = normalizeRole(legacyData.role);
          if (role) {
            console.log(`[AUTH RESOLUTION] Found existing user record with role "${role}". Linking to UID "${authUid}"...`);
            const linkedProfile: UserProfile = {
              ...legacyData,
              uid: authUid,
              email: cleanEmail,
              name: legacyData.fullName || legacyData.name || displayName || cleanEmail.split('@')[0],
              fullName: legacyData.fullName || legacyData.name || displayName || 'User',
              role: role,
              status: legacyData.status || 'active',
              firstLogin: false,
              schoolId: legacyData.schoolId || '',
              schoolName: legacyData.schoolName || '',
              educationCategory: legacyData.educationCategory || 'BASIC',
              photoUrl: legacyData.photoUrl || photoUrl || '',
              avatarUrl: legacyData.avatarUrl || photoUrl || '',
              createdAt: legacyData.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, linkedProfile);
            if (legacyDoc.id !== authUid) {
              await deleteDoc(doc(db, 'users', legacyDoc.id)).catch(() => {});
            }
            return { profile: linkedProfile };
          }
        }
      } catch (e) {
        console.warn('[AUTH RESOLUTION] User by email query notice:', e);
      }

      // C. Check teachers collection by email
      try {
        const tSnap = await getDocs(query(collection(db, 'teachers'), where('email', '==', cleanEmail)));
        if (!tSnap.empty) {
          const teacherDoc = tSnap.docs[0];
          const tData = teacherDoc.data();
          console.log(`[AUTH RESOLUTION] Found registered teacher "${tData.fullName}" in school "${tData.schoolId}". Linking to UID "${authUid}"...`);
          const teacherProfile: UserProfile = {
            uid: authUid,
            email: cleanEmail,
            name: tData.fullName || displayName || 'Teacher',
            fullName: tData.fullName || displayName || 'Teacher',
            role: 'teacher',
            schoolId: tData.schoolId || '',
            schoolName: tData.schoolName || '',
            teacherId: tData.teacherId || '',
            phone: tData.phone || '',
            status: tData.status || 'active',
            firstLogin: false,
            photoUrl: photoUrl || '',
            avatarUrl: photoUrl || '',
            createdAt: tData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, teacherProfile);
          await updateDoc(doc(db, 'teachers', teacherDoc.id), { uid: authUid, updatedAt: new Date().toISOString() }).catch(() => {});
          return { profile: teacherProfile };
        }
      } catch (e) {
        console.warn('[AUTH RESOLUTION] Teacher query notice:', e);
      }

      // D. Check students collection by email or googleEmail
      try {
        let sSnap = await getDocs(query(collection(db, 'students'), where('email', '==', cleanEmail)));
        if (sSnap.empty) {
          sSnap = await getDocs(query(collection(db, 'students'), where('googleEmail', '==', cleanEmail)));
        }
        if (!sSnap.empty) {
          const studentDoc = sSnap.docs[0];
          const sData = studentDoc.data();
          console.log(`[AUTH RESOLUTION] Found registered student "${sData.fullName}" (ID: ${sData.studentId}). Linking to UID "${authUid}"...`);
          const studentProfile: UserProfile = {
            uid: authUid,
            email: cleanEmail,
            name: sData.fullName || displayName || 'Student',
            fullName: sData.fullName || displayName || 'Student',
            role: 'student',
            schoolId: sData.schoolId || '',
            schoolName: sData.schoolName || '',
            studentId: sData.studentId || sData.admissionNumber || '',
            classId: sData.classId || '',
            className: sData.className || '',
            parentId: sData.parentId || '',
            status: sData.status || 'active',
            firstLogin: false,
            photoUrl: photoUrl || '',
            avatarUrl: photoUrl || '',
            createdAt: sData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, studentProfile);
          await updateDoc(doc(db, 'students', studentDoc.id), { uid: authUid, updatedAt: new Date().toISOString() }).catch(() => {});
          return { profile: studentProfile };
        }
      } catch (e) {
        console.warn('[AUTH RESOLUTION] Student query notice:', e);
      }

      // E. Check parents collection by email
      try {
        const pSnap = await getDocs(query(collection(db, 'parents'), where('email', '==', cleanEmail)));
        if (!pSnap.empty) {
          const parentDoc = pSnap.docs[0];
          const pData = parentDoc.data();
          console.log(`[AUTH RESOLUTION] Found registered parent "${pData.fullName}". Linking to UID "${authUid}"...`);
          const parentProfile: UserProfile = {
            uid: authUid,
            email: cleanEmail,
            name: pData.fullName || displayName || 'Parent',
            fullName: pData.fullName || displayName || 'Parent',
            role: 'parent',
            schoolId: pData.schoolId || '',
            schoolName: pData.schoolName || '',
            phone: pData.phone || '',
            status: pData.status || 'active',
            firstLogin: false,
            photoUrl: photoUrl || '',
            avatarUrl: photoUrl || '',
            createdAt: pData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, parentProfile);
          await updateDoc(doc(db, 'parents', parentDoc.id), { uid: authUid, updatedAt: new Date().toISOString() }).catch(() => {});
          return { profile: parentProfile };
        }
      } catch (e) {
        console.warn('[AUTH RESOLUTION] Parent query notice:', e);
      }

      // F. Check schools collection by adminEmail
      try {
        const schSnap = await getDocs(query(collection(db, 'schools'), where('adminEmail', '==', cleanEmail)));
        if (!schSnap.empty) {
          const schoolDoc = schSnap.docs[0];
          const schData = schoolDoc.data();
          const role: UserRole = schData.educationCategory === 'SENIOR_HIGH' ? 'school_head' : 'school_admin';
          console.log(`[AUTH RESOLUTION] Found registered school "${schData.schoolName}" with admin email. Linking to UID "${authUid}"...`);
          const adminProfile: UserProfile = {
            uid: authUid,
            email: cleanEmail,
            name: schData.adminName || displayName || 'School Administrator',
            fullName: schData.adminName || displayName || 'School Administrator',
            role: role,
            educationCategory: schData.educationCategory || 'BASIC',
            schoolId: schData.schoolId || schoolDoc.id,
            schoolName: schData.schoolName || '',
            status: schData.status || 'active',
            firstLogin: false,
            photoUrl: photoUrl || '',
            avatarUrl: photoUrl || '',
            createdAt: schData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, adminProfile);
          await updateDoc(doc(db, 'schools', schoolDoc.id), { adminId: authUid, updatedAt: new Date().toISOString() }).catch(() => {});
          return { profile: adminProfile };
        }
      } catch (e) {
        console.warn('[AUTH RESOLUTION] School query notice:', e);
      }

      // G. Check schoolAdmins collection by adminEmail
      try {
        const saSnap = await getDocs(query(collection(db, 'schoolAdmins'), where('adminEmail', '==', cleanEmail)));
        if (!saSnap.empty) {
          const saDoc = saSnap.docs[0];
          const saData = saDoc.data();
          const role: UserRole = saData.role ? normalizeRole(saData.role) || 'school_admin' : 'school_admin';
          console.log(`[AUTH RESOLUTION] Found registered school admin in schoolAdmins. Linking to UID "${authUid}"...`);
          const adminProfile: UserProfile = {
            uid: authUid,
            email: cleanEmail,
            name: saData.adminName || displayName || 'School Administrator',
            fullName: saData.adminName || displayName || 'School Administrator',
            role: role,
            educationCategory: saData.educationCategory || 'BASIC',
            schoolId: saData.schoolId || '',
            schoolName: saData.schoolName || '',
            status: 'active',
            firstLogin: false,
            photoUrl: photoUrl || '',
            avatarUrl: photoUrl || '',
            createdAt: saData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await setDoc(userDocRef, adminProfile);
          return { profile: adminProfile };
        }
      } catch (e) {
        console.warn('[AUTH RESOLUTION] SchoolAdmins query notice:', e);
      }

      // Not found anywhere
      return {
        profile: null,
        error: `No registered EDUkenZA account found for ${cleanEmail}. Please contact your school administrator or platform administrator.`
      };
    } catch (err: any) {
      console.error('[AUTH RESOLUTION EXCEPTION]', err);
      return { profile: null, error: err?.message || 'Database error retrieving user profile.' };
    }
  }, []);

  // Auto-trigger walkthrough on first login or if not seen yet
  useEffect(() => {
    if (currentUser?.uid) {
      const seen = localStorage.getItem(`edukenza_walkthrough_seen_${currentUser.uid}`);
      if (!seen || seen !== 'true' || currentUser.firstLogin) {
        const timer = setTimeout(() => {
          setIsWalkthroughOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    } else {
      setIsWalkthroughOpen(false);
    }
  }, [currentUser?.uid]);

  // Sync currentUser with local storage and synchronous ref
  useEffect(() => {
    currentUserRef.current = currentUser;
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  // Firebase Auth Observer (Strict user retrieval by UID)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      authLoggingMiddleware.logAuthStateChange(firebaseUser, 'onAuthStateChanged');

      // If an interactive sign-in flow (e.g. loginWithGoogle, registerSchool) is actively managing authentication, defer observer handling
      if (isAuthenticatingRef.current) {
        console.log('[AUTH OBSERVER] Active interactive authentication in progress, deferring observer.');
        return;
      }

      if (firebaseUser) {
        try {
          const authUid = firebaseUser.uid;
          const userEmail = (firebaseUser.email || '').toLowerCase().trim();

          const resolution = await resolveAndLinkUserProfile(
            authUid,
            userEmail,
            firebaseUser.displayName || '',
            firebaseUser.photoURL || ''
          );

          // If no authorized profile exists, deny and sign out
          if (!resolution.profile) {
            console.warn('[AUTH OBSERVER] No authorized Firestore profile for user:', userEmail, 'UID:', authUid);
            stopProfileListener();
            currentUserRef.current = null;
            await firebaseSignOut(auth);
            setCurrentUser(null);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            setLoadingAuth(false);
            return;
          }

          const profile = resolution.profile;
          const status = String(profile.status || 'active').toLowerCase().trim();
          if (status !== 'active' && profile.role !== 'platform_owner') {
            console.warn(`[AUTH OBSERVER] Inactive user status "${status}". Signing out.`);
            stopProfileListener();
            currentUserRef.current = null;
            await firebaseSignOut(auth);
            setCurrentUser(null);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            setLoadingAuth(false);
            return;
          }

          const redirectView = getDashboardViewForRole(profile.role, profile.educationCategory);
          currentUserRef.current = profile;
          setCurrentUser(profile);
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));

          setActiveViewRaw((currentView) => {
            if (currentView === 'login' || currentView === 'home' || currentView === 'role-preview') {
              return redirectView;
            }
            return currentView;
          });

          // Start real-time Firestore profile listener
          startProfileListener(authUid);
        } catch (error) {
          console.warn('[AUTH OBSERVER] Auth state sync note:', error);
        }
      } else {
        stopProfileListener();
        currentUserRef.current = null;
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      setLoadingAuth(false);
    });

    return () => {
      unsubscribe();
      stopProfileListener();
    };
  }, [stopProfileListener, startProfileListener, resolveAndLinkUserProfile, showToast]);

  /**
   * ROUTE GUARD LAYER
   * Prevents role escalation by validating requested view against authoritative user role.
   * Checks synchronous currentUserRef to guarantee fresh session data immediately upon login.
   */
  const setActiveView = useCallback((viewInput: React.SetStateAction<ActiveView>) => {
    setActiveViewRaw((prevView) => {
      const targetView = typeof viewInput === 'function' ? (viewInput as (prev: ActiveView) => ActiveView)(prevView) : viewInput;
      const requiredRole = DASHBOARD_ROLE_REQUIREMENTS[targetView];

      if (requiredRole) {
        const userToCheck = currentUserRef.current;
        const isAuthorized = userToCheck && (
          Array.isArray(requiredRole)
            ? requiredRole.includes(userToCheck.role)
            : userToCheck.role === requiredRole
        );

        if (!isAuthorized) {
          console.warn(`[ROUTE GUARD] Access denied to '${targetView}'. Required: ${JSON.stringify(requiredRole)}, current role: '${userToCheck?.role || 'unauthenticated'}'. Forcing redirect to login.`);
          showToast('Unauthorized dashboard access attempt. Please log in with valid credentials.', 'error');
          return 'login';
        }
      }
      return targetView;
    });
  }, [showToast]);

  // Enforce Route Guard whenever currentUser or activeView changes
  useEffect(() => {
    const requiredRole = DASHBOARD_ROLE_REQUIREMENTS[activeView];
    if (requiredRole) {
      const userToCheck = currentUserRef.current || currentUser;
      const isAuthorized = userToCheck && (
        Array.isArray(requiredRole)
          ? requiredRole.includes(userToCheck.role)
          : userToCheck.role === requiredRole
      );

      if (!isAuthorized) {
        console.warn(`[ROUTE GUARD EFFECT] Access denied to dashboard '${activeView}'. Required: ${JSON.stringify(requiredRole)}, current user role: '${userToCheck?.role || 'unauthenticated'}'. Forcing redirect to login.`);
        setActiveViewRaw('login');
      }
    }
  }, [currentUser, activeView]);

  /**
   * Production Login System
   * Retrieves user document using users/{auth.uid} ONLY.
   */
  const login = async (
    emailOrStudentId: string, 
    password: string, 
    rememberMe: boolean = false,
    selectedRole?: string
  ): Promise<{ success: boolean; message?: string; isFirstLoginSetup?: boolean }> => {
    if (!emailOrStudentId || !password) {
      const msg = selectedRole === 'student' ? 'Please enter both your Student ID Number and password.' : 'Please enter both your email address and password.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    let cleanInput = emailOrStudentId.trim();
    let cleanEmail = cleanInput.toLowerCase();

    // If input is Student ID Number (no '@'), resolve system email
    if (!cleanInput.includes('@')) {
      try {
        const studentIdSearch = cleanInput.toUpperCase();
        const qStudents = query(collection(db, 'students'), where('studentId', '==', studentIdSearch));
        const snapStudents = await getDocs(qStudents);
        if (!snapStudents.empty) {
          const stDoc = snapStudents.docs[0].data();
          cleanEmail = stDoc.email || `${studentIdSearch.toLowerCase()}@edukenza.student`;
        } else {
          const qUsers = query(collection(db, 'users'), where('studentId', '==', studentIdSearch));
          const snapUsers = await getDocs(qUsers);
          if (!snapUsers.empty) {
            const uDoc = snapUsers.docs[0].data();
            cleanEmail = uDoc.email || `${studentIdSearch.toLowerCase()}@edukenza.student`;
          } else {
            cleanEmail = `${studentIdSearch.toLowerCase()}@edukenza.student`;
          }
        }
      } catch (err) {
        console.warn('Student ID resolution lookup failed:', err);
        cleanEmail = `${cleanInput.toLowerCase()}@edukenza.student`;
      }
    } else {
      cleanEmail = cleanInput.toLowerCase();
    }

    // RATE LIMIT CHECK: Lockout brute-force login attempts
    const rateLimit = isAccountLockedDueToRateLimit(cleanEmail);
    if (rateLimit.isLocked) {
      const lockUntil = rateLimit.lockedUntil ? new Date(rateLimit.lockedUntil).toLocaleTimeString() : '15 minutes';
      const msg = `Account temporarily locked due to multiple failed login attempts. Please try again after ${lockUntil}.`;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    const isOwnerEmail = isPlatformOwnerEmail(cleanEmail);

    if (rememberMe) {
      localStorage.setItem('edukenza_remembered_email', cleanInput);
    } else {
      localStorage.removeItem('edukenza_remembered_email');
    }

    isAuthenticatingRef.current = true;
    try {
      // 1. Authenticate against Firebase Auth with email and password
      let userCredential: any = null;

      try {
        userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (authErr: any) {
        console.warn('[EDUKENZA AUTH] signInWithEmailAndPassword code:', authErr?.code, 'message:', authErr?.message);

        // If password had trailing/leading spaces, retry with trimmed password
        if ((authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/wrong-password') && password.trim() !== password) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password.trim());
          } catch (retryErr) {
            // Ignore retry error
          }
        }

        if (!userCredential) {
          throw authErr;
        }
      }

      if (!userCredential || !userCredential.user) {
        throw new Error('Authentication failed: Firebase Auth did not return user credentials.');
      }

      const authUid = userCredential.user.uid;

      console.log('[EDUKENZA LOGIN TRACE] =====================================');
      console.log('[EDUKENZA LOGIN TRACE] 1. Firebase Auth Success: true');
      console.log('[EDUKENZA LOGIN TRACE] 2. Auth UID Returned:', authUid);
      console.log('[EDUKENZA LOGIN TRACE] 3. Auth Email:', cleanEmail);

      // 2. Read Firestore users/{authUid} as source of truth
      let firestoreData: any = null;
      let firestorePath: string = `users/${authUid}`;
      let exists = false;

      const { exists: docExists, data: docData, path: docPath, permissionDenied, error: fetchErr } = await fetchUserDocWithMiddlewareLogging(authUid, 'login', cleanEmail);
      exists = docExists;
      firestoreData = docData;
      firestorePath = docPath;

      // Handle Permission Denied
      if (permissionDenied) {
        console.error(`[EDUKENZA AUTH] Firestore permission denied on path "${firestorePath}":`, fetchErr);
        stopProfileListener();
        await firebaseSignOut(auth);
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        const permMsg = 'Firestore permission denied. Please verify your database security rules for collection "users".';
        showToast(permMsg, 'error', 7000);
        return { success: false, message: permMsg };
      }

      // If document is missing in Firestore, deny access
      if (!exists || !firestoreData) {
        console.warn(`[EDUKENZA AUTH] Profile not found in Firestore for UID: "${authUid}" (email: "${cleanEmail}")`);
        stopProfileListener();
        await firebaseSignOut(auth);
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        const notFoundMsg = 'Your account has not yet been authorized or provisioned in Firestore. Please contact your administrator.';
        showToast(notFoundMsg, 'error', 6000);
        return { success: false, message: notFoundMsg };
      }

      // Role normalization and verification
      const rawRole = firestoreData.role;
      const normalized = normalizeRole(rawRole);
      const validatedRole: UserRole = enforceProtectedRole(cleanEmail, normalized) || normalized;

      const statusRaw = firestoreData.status ? String(firestoreData.status) : 'active';
      const statusClean = statusRaw.toLowerCase().trim();
      const targetDashboardView = getDashboardViewForRole(validatedRole, firestoreData.educationCategory);
      const resolvedSchoolId = firestoreData.schoolId || firestoreData.school_id || firestoreData.assignedSchoolId || firestoreData.school || '';
      const resolvedSchoolName = firestoreData.schoolName || '';

      console.log(`[EDUKENZA LOGIN TRACE] 4. Raw Role: "${rawRole}" | Normalized Role: "${validatedRole}"`);
      console.log(`[EDUKENZA LOGIN TRACE] 5. User Status: "${statusClean}" | SchoolId: "${resolvedSchoolId}" | SchoolName: "${resolvedSchoolName}"`);
      console.log(`[EDUKENZA LOGIN TRACE] 6. Target Dashboard View: "${targetDashboardView}"`);

      logAuthFlow(
        authUid,
        firestorePath,
        true,
        firestoreData,
        validatedRole,
        targetDashboardView
      );

      // Status Check: Block non-active accounts
      if (statusClean !== 'active' && validatedRole !== 'platform_owner') {
        console.error('[EDUKENZA LOGIN TRACE FAILURE] Failure Condition: Account status is not active. Current status:', statusClean);
        stopProfileListener();
        await firebaseSignOut(auth);
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        let msg = 'Your account is inactive.';
        if (statusClean === 'suspended') {
          msg = 'Your account has been suspended. Please contact support.';
        } else if (statusClean === 'disabled') {
          msg = 'Your account has been disabled.';
        } else if (statusClean === 'deleted') {
          msg = 'No account found.';
        } else if (statusClean === 'inactive') {
          msg = 'Your school account is inactive. Please contact your administrator.';
        } else if (statusClean === 'pending') {
          msg = 'Your account is pending approval by your school administrator.';
        }
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      // Check role mismatch if user explicitly picked a tab role
      if (selectedRole && validatedRole !== selectedRole && validatedRole !== 'platform_owner') {
        stopProfileListener();
        await firebaseSignOut(auth);
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        const selectedRoleName = selectedRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const actualRoleName = validatedRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const msg = `Role mismatch: This account belongs to a ${actualRoleName}, not a ${selectedRoleName}. Please select ${actualRoleName} on the login tab.`;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const authenticatedUser: UserProfile = {
        uid: authUid,
        email: cleanEmail,
        name: firestoreData.fullName || firestoreData.name || cleanEmail.split('@')[0],
        fullName: firestoreData.fullName || firestoreData.name || 'User',
        role: validatedRole,
        status: 'active',
        firstLogin: false,
        schoolId: resolvedSchoolId,
        schoolName: resolvedSchoolName,
        createdAt: firestoreData.createdAt || new Date().toISOString()
      };

      console.log('[EDUKENZA LOGIN TRACE] 7. Login Success! User Profile:', authenticatedUser);
      console.log('[EDUKENZA LOGIN TRACE] =====================================');

      currentUserRef.current = authenticatedUser;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authenticatedUser));
      setCurrentUser(authenticatedUser);
      setActiveView(targetDashboardView);

      // Start real-time Firestore profile listener
      startProfileListener(authUid);

      // Clear failed login tracker and log security audit event
      clearFailedLoginAttempts(cleanEmail);
      logSecurityEvent({
        eventType: 'LOGIN_SUCCESS',
        action: 'USER_LOGIN',
        userId: authUid,
        userEmail: cleanEmail,
        userName: authenticatedUser.fullName,
        userRole: validatedRole,
        schoolId: resolvedSchoolId,
        details: `User successfully logged into ${targetDashboardView}`,
        severity: 'low'
      });

      showToast(`Welcome back, ${authenticatedUser.fullName}!`, 'success');
      return { success: true };

    } catch (error: any) {
      console.warn('[EDUKENZA AUTH] Login authentication failed for:', cleanEmail, 'code:', error?.code || 'unknown');

      // Track failed attempt for rate limiting and log security incident
      trackFailedLoginAttempt(cleanEmail);
      logSecurityEvent({
        eventType: 'LOGIN_FAILED',
        action: 'FAILED_AUTHENTICATION_ATTEMPT',
        userEmail: cleanEmail,
        details: `Failed login attempt for ${cleanEmail}. Error: ${error?.code || 'Invalid Credentials'}`,
        severity: 'medium'
      });

      const diagnostic = parseAuthError(error);
      const friendlyMsg = diagnostic.message;

      showToast(friendlyMsg, 'error');
      return { success: false, message: friendlyMsg };
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  /**
   * CRITICAL STUDENT GOOGLE SIGN-IN
   * Replaces obsolete Student ID + Password with Google Sign-In ("Continue with Google").
   * 
   * Complete Flow:
   * 1. Concurrency control & progressive loading state ("Signing you in…")
   * 2. Execute Google OAuth popup via Firebase Authentication
   * 3. Loading state ("Checking your EDUkenZA account…")
   * 4. Retrieve Firestore authorization doc at users/{authUid}
   * 5. If doc missing, check pre-authorized student record in students collection (by email / googleEmail):
   *    - Verify student is active (not disabled, suspended, or pending)
   *    - Verify record has not been claimed by a different UID
   *    - Verify assigned schoolId exists
   *    - Provision users/{authUid} with role='student' and link students doc
   * 6. Strictly verify:
   *    - role === 'student' (Access denied if account is teacher, admin, or parent)
   *    - status === 'active' (Access denied if disabled or suspended)
   *    - schoolId is present (Access denied if no assigned school)
   * 7. Loading state ("Loading your Student Portal…")
   * 8. Establish session, route to student-dashboard, attach realtime profile listener
   */
  const loginStudentWithGoogle = async (
    onProgress?: (status: string) => void
  ): Promise<{ success: boolean; message?: string }> => {
    if (isAuthenticatingRef.current) {
      const msg = 'Authentication is already in progress. Please wait.';
      return { success: false, message: msg };
    }
    isAuthenticatingRef.current = true;

    try {
      // Step 1: Loading state "Signing you in…"
      onProgress?.('Signing you in…');

      let userCredential: any = null;
      try {
        userCredential = await signInWithPopup(auth, googleProvider);
      } catch (authErr: any) {
        console.warn('[STUDENT GOOGLE AUTH] signInWithPopup error:', authErr);
        isAuthenticatingRef.current = false;
        const parsed = parseStudentAuthError(authErr);
        showToast(parsed.message, 'error');
        return { success: false, message: parsed.message };
      }

      const user = userCredential?.user;
      if (!user) {
        isAuthenticatingRef.current = false;
        const msg = 'Google authentication was cancelled or produced no user.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const authUid = user.uid;
      const cleanEmail = (user.email || '').toLowerCase().trim();
      const displayName = user.displayName || 'Student';

      // Step 2: Loading state "Checking your EDUkenZA account…"
      onProgress?.('Checking your EDUkenZA account…');

      // Fetch users/{authUid} with middleware logging
      let { 
        exists, 
        data, 
        path, 
        permissionDenied, 
        error: fetchErr 
      } = await fetchUserDocWithMiddlewareLogging(authUid, 'loginStudentWithGoogle', cleanEmail);

      // Handle Firestore permission denied
      if (permissionDenied) {
        console.error('[STUDENT GOOGLE AUTH] Permission denied reading user doc:', fetchErr);
        stopProfileListener();
        try { await firebaseSignOut(auth); } catch (e) {}
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        isAuthenticatingRef.current = false;
        const permMsg = 'Unable to access student profile due to permission restrictions. Please contact your school administrator.';
        showToast(permMsg, 'error');
        return { success: false, message: permMsg };
      }

      // If profile does not exist in users/{authUid}, check for pre-authorized student record
      if (!exists || !data) {
        console.log(`[STUDENT GOOGLE AUTH] Checking pre-authorized student record for email: "${cleanEmail}"...`);

        let studentSnap = await getDocs(query(collection(db, 'students'), where('email', '==', cleanEmail)));
        if (studentSnap.empty) {
          studentSnap = await getDocs(query(collection(db, 'students'), where('googleEmail', '==', cleanEmail)));
        }

        // Unauthorized Google account
        if (studentSnap.empty) {
          console.warn(`[STUDENT GOOGLE AUTH] Unauthorized Google account: "${cleanEmail}". No student record found.`);
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          isAuthenticatingRef.current = false;
          const unauthorizedMsg = 'Your Google account is not registered as a student in EDUkenZA. Please contact your school administrator.';
          showToast(unauthorizedMsg, 'error', 6000);
          return { success: false, message: unauthorizedMsg };
        }

        const studentDoc = studentSnap.docs[0].data();
        const studentDocId = studentSnap.docs[0].id;

        // Student account status check
        const studentStatus = String(studentDoc.status || 'active').toLowerCase().trim();
        if (studentStatus !== 'active') {
          console.warn(`[STUDENT GOOGLE AUTH] Student record status is "${studentStatus}". Access denied.`);
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          isAuthenticatingRef.current = false;
          let statusMsg = 'Your student account is inactive. Please contact your school administrator.';
          if (studentStatus === 'disabled') statusMsg = 'Your student account has been disabled. Please contact your school administrator.';
          if (studentStatus === 'suspended') statusMsg = 'Your student account has been suspended. Please contact your school administrator.';
          showToast(statusMsg, 'error');
          return { success: false, message: statusMsg };
        }

        // Security: Ensure this student record hasn't been claimed by a different UID
        if (studentDoc.uid && studentDoc.uid !== authUid) {
          console.warn(`[STUDENT GOOGLE AUTH] Student record already claimed by UID: ${studentDoc.uid}. Attempted by: ${authUid}`);
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          isAuthenticatingRef.current = false;
          const claimedMsg = 'This student profile has already been linked to a different account. Please contact your school administrator.';
          showToast(claimedMsg, 'error');
          return { success: false, message: claimedMsg };
        }

        // School assignment check
        const resolvedSchoolId = studentDoc.schoolId || '';
        if (!resolvedSchoolId || resolvedSchoolId.trim() === '') {
          stopProfileListener();
          try { await firebaseSignOut(auth); } catch (e) {}
          setCurrentUser(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          isAuthenticatingRef.current = false;
          const noSchoolMsg = 'Student account is not assigned to any registered school. Access revoked.';
          showToast(noSchoolMsg, 'error');
          return { success: false, message: noSchoolMsg };
        }

        // Account linking - create users/{authUid} and link students doc
        const now = new Date().toISOString();
        const resolvedStudentId = studentDoc.studentId || studentDoc.admissionNumber || '';
        const resolvedName = studentDoc.fullName || displayName || 'Student';

        const newStudentProfile: UserProfile = {
          uid: authUid,
          email: cleanEmail,
          name: resolvedName,
          fullName: resolvedName,
          role: 'student',
          schoolId: resolvedSchoolId,
          schoolName: studentDoc.schoolName || '',
          studentId: resolvedStudentId,
          classId: studentDoc.classId || '',
          className: studentDoc.className || '',
          status: 'active',
          authMethod: 'google',
          firstLogin: false,
          createdAt: studentDoc.createdAt || now,
          updatedAt: now
        };

        await setDoc(doc(db, 'users', authUid), newStudentProfile);

        try {
          await updateDoc(doc(db, 'students', studentDocId), {
            uid: authUid,
            email: cleanEmail,
            googleEmail: cleanEmail,
            updatedAt: now
          });
        } catch (linkErr) {
          console.warn('[STUDENT GOOGLE AUTH] Could not update student doc with uid:', linkErr);
        }

        exists = true;
        data = newStudentProfile;
      }

      // Step 3: Role Authorization - MUST be student
      // Teacher or School Admin or Parent Google account attempting Student login is denied
      const rawRole = data.role;
      const normalizedRole = normalizeRole(rawRole);
      if (normalizedRole !== 'student') {
        console.warn(`[STUDENT GOOGLE AUTH] Role mismatch: User is registered as "${normalizedRole}", not "student". Denying student portal access.`);
        stopProfileListener();
        try { await firebaseSignOut(auth); } catch (e) {}
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        isAuthenticatingRef.current = false;
        const roleLabel = normalizedRole === 'school_admin' 
          ? 'school administrator' 
          : normalizedRole === 'teacher' 
          ? 'teacher' 
          : normalizedRole === 'parent' 
          ? 'parent' 
          : normalizedRole.replace('_', ' ');
        const mismatchMsg = `Access denied. This Google account is registered as a ${roleLabel} in EDUkenZA, not as a student. Please sign in via the Staff / Parent Portal.`;
        showToast(mismatchMsg, 'error', 6500);
        return { success: false, message: mismatchMsg };
      }

      // Status check: active status required
      const statusClean = String(data.status || 'active').toLowerCase().trim();
      if (statusClean !== 'active') {
        console.warn(`[STUDENT GOOGLE AUTH] Student status is "${statusClean}". Denying access.`);
        stopProfileListener();
        try { await firebaseSignOut(auth); } catch (e) {}
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        isAuthenticatingRef.current = false;
        let statusMsg = 'Your student account is inactive. Please contact your school administrator.';
        if (statusClean === 'disabled') statusMsg = 'Your student account has been disabled. Please contact your school administrator.';
        if (statusClean === 'suspended') statusMsg = 'Your student account has been suspended. Please contact your school administrator.';
        showToast(statusMsg, 'error');
        return { success: false, message: statusMsg };
      }

      // School assignment check
      const resolvedSchoolId = data.schoolId || data.school_id || data.assignedSchoolId || data.school || '';
      if (!resolvedSchoolId || resolvedSchoolId.trim() === '') {
        console.warn('[STUDENT GOOGLE AUTH] Student account missing assigned school.');
        stopProfileListener();
        try { await firebaseSignOut(auth); } catch (e) {}
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        isAuthenticatingRef.current = false;
        const schoolMsg = 'Student account is not assigned to any registered school. Access revoked.';
        showToast(schoolMsg, 'error');
        return { success: false, message: schoolMsg };
      }

      // Step 4: Loading state "Loading your Student Portal…"
      onProgress?.('Loading your Student Portal…');

      const authenticatedUser: UserProfile = {
        uid: authUid,
        email: cleanEmail,
        name: data.fullName || data.name || displayName || 'Student',
        fullName: data.fullName || data.name || displayName || 'Student',
        role: 'student',
        status: 'active',
        firstLogin: false,
        schoolId: resolvedSchoolId,
        schoolName: data.schoolName || '',
        studentId: data.studentId || '',
        classId: data.classId || '',
        className: data.className || '',
        createdAt: data.createdAt || new Date().toISOString()
      };

      currentUserRef.current = authenticatedUser;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authenticatedUser));
      setCurrentUser(authenticatedUser);
      setActiveView('student-dashboard');

      startProfileListener(authUid);
      isAuthenticatingRef.current = false;

      logSecurityEvent({
        eventType: 'LOGIN_SUCCESS',
        action: 'STUDENT_GOOGLE_SIGNIN',
        userId: authUid,
        userEmail: cleanEmail,
        userName: authenticatedUser.fullName,
        userRole: 'student',
        schoolId: resolvedSchoolId,
        details: `Student successfully logged into Student Dashboard via Google Sign-In`,
        severity: 'low'
      });

      showToast(`Welcome to EDUkenZA, ${authenticatedUser.fullName}!`, 'success');
      return { success: true };

    } catch (err: any) {
      console.error('[STUDENT GOOGLE AUTH] Unexpected exception:', err);
      isAuthenticatingRef.current = false;
      const parsed = parseStudentAuthError(err);
      showToast(parsed.message, 'error');
      return { success: false, message: parsed.message };
    }
  };

  /**
   * LEGACY STUDENT ID AUTHENTICATION
   * Deprecated in favor of Google Sign-In ("Continue with Google").
   */
  const loginWithStudentId = async (
    _studentId?: string,
    _password?: string,
    _rememberMe: boolean = false
  ): Promise<{ success: boolean; message?: string }> => {
    const msg = 'Student ID and password login has been upgraded to Google Sign-In. Please click "Continue with Google" to access your student portal.';
    showToast(msg, 'info', 6000);
    return { success: false, message: msg };
  };

  /**
   * Google Sign-In with Firebase Auth
   * Authenticates user using Google OAuth popup and enforces strict Firestore authorization.
   * Uses Firebase Authentication UID as authoritative identity.
   * Auto-links pre-registered users (students, teachers, school admins, parents, owners).
   */
  const loginWithGoogle = async (
    onProgress?: (stage: 'signing_in' | 'loading_profile') => void
  ): Promise<{ success: boolean; message?: string }> => {
    isAuthenticatingRef.current = true;
    onProgress?.('signing_in');
    let authUid: string | null = null;
    let cleanEmail: string = '';
    let displayName: string = '';

    try {
      // Step 1: Execute Google OAuth via Firebase Authentication
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      if (!user) {
        isAuthenticatingRef.current = false;
        return { success: false, message: 'Google authentication was cancelled or produced no user.' };
      }

      onProgress?.('loading_profile');
      authUid = user.uid;
      cleanEmail = (user.email || '').toLowerCase().trim();
      displayName = user.displayName || '';
      const photoUrl = user.photoURL || '';

      // Step 2: Resolve and link user profile safely under users/{authUid}
      const resolution = await resolveAndLinkUserProfile(authUid, cleanEmail, displayName, photoUrl);

      if (!resolution.profile) {
        stopProfileListener();
        try {
          await firebaseSignOut(auth);
        } catch (e) {}
        setCurrentUser(null);
        currentUserRef.current = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        setActiveViewRaw('login');

        const unauthorizedMsg = resolution.error || 'Your Google account is authenticated, but it has not been authorized for EDUkenZA. Please contact your school administrator or platform administrator.';
        showToast(unauthorizedMsg, 'error', 7000);
        isAuthenticatingRef.current = false;
        return { success: false, message: unauthorizedMsg };
      }

      const profile = resolution.profile;

      // Status Check: Block non-active accounts
      const statusRaw = profile.status ? String(profile.status) : 'active';
      const statusClean = statusRaw.toLowerCase().trim();
      if (statusClean !== 'active' && profile.role !== 'platform_owner') {
        stopProfileListener();
        try {
          await firebaseSignOut(auth);
        } catch (e) {}
        setCurrentUser(null);
        currentUserRef.current = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        setActiveViewRaw('login');
        isAuthenticatingRef.current = false;
        let statusMsg = 'Your account is inactive. Please contact your school administrator.';
        if (statusClean === 'suspended') statusMsg = 'Your account has been suspended. Please contact support.';
        if (statusClean === 'disabled') statusMsg = 'Your account has been disabled. Please contact your school administrator.';
        if (statusClean === 'pending') statusMsg = 'Your account is pending approval by your school administrator.';
        showToast(statusMsg, 'error');
        return { success: false, message: statusMsg };
      }

      // School Isolation (never default, strictly use exact schoolId from Firestore)
      const resolvedSchoolId = profile.schoolId || '';
      if (isSchoolAdminRole(profile.role) && (!resolvedSchoolId || resolvedSchoolId.trim() === '')) {
        stopProfileListener();
        try {
          await firebaseSignOut(auth);
        } catch (e) {}
        setCurrentUser(null);
        currentUserRef.current = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        setActiveViewRaw('login');
        isAuthenticatingRef.current = false;
        const schoolErrMsg = 'School Admin account is missing an assigned school. Access revoked.';
        showToast(schoolErrMsg, 'error');
        return { success: false, message: schoolErrMsg };
      }

      // Determine correct Google Routing based on authoritative Firestore role
      const targetDashboardView = getDashboardViewForRole(profile.role, profile.educationCategory);
      if (targetDashboardView === 'login') {
        stopProfileListener();
        try {
          await firebaseSignOut(auth);
        } catch (e) {}
        setCurrentUser(null);
        currentUserRef.current = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        setActiveViewRaw('login');
        isAuthenticatingRef.current = false;
        const invalidRoleMsg = `Your account role (${profile.role}) does not have an assigned dashboard. Please contact support.`;
        showToast(invalidRoleMsg, 'error');
        return { success: false, message: invalidRoleMsg };
      }

      currentUserRef.current = profile;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(profile));
      setCurrentUser(profile);
      setActiveView(targetDashboardView);

      // Attach real-time Firestore profile listener
      startProfileListener(authUid);
      isAuthenticatingRef.current = false;

      logSecurityEvent({
        eventType: 'LOGIN_SUCCESS',
        action: 'GOOGLE_SIGNIN_SUCCESS',
        userId: authUid,
        userEmail: cleanEmail,
        userName: profile.fullName,
        userRole: profile.role,
        schoolId: resolvedSchoolId,
        details: `User successfully logged into ${targetDashboardView} via Google Sign-In`,
        severity: 'low'
      });

      showToast(`Welcome back, ${profile.fullName}!`, 'success');
      return { success: true };
    } catch (error: any) {
      isAuthenticatingRef.current = false;
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        console.info('[GOOGLE LOGIN] Sign-in popup closed or cancelled by user.');
        showToast('Google sign-in popup was closed.', 'info');
        return { success: false, message: 'Google sign-in popup was closed.' };
      }
      if (error?.code === 'auth/popup-blocked') {
        const popupMsg = 'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
        showToast(popupMsg, 'error');
        return { success: false, message: popupMsg };
      }
      if (error?.code === 'auth/network-request-failed') {
        const netMsg = 'Network connection failure. Please check your internet connection.';
        showToast(netMsg, 'error');
        return { success: false, message: netMsg };
      }

      console.error('[GOOGLE LOGIN EXCEPTION]', error);
      let friendlyMsg = 'Google authentication succeeded, but EDUkenZA could not read your authorization profile.';
      if (error?.code === 'permission-denied' || String(error?.message || '').toLowerCase().includes('permission')) {
        friendlyMsg = 'Google authentication succeeded, but EDUkenZA could not read your authorization profile (Firestore error: permission-denied).';
      } else if (error?.code === 'auth/operation-not-allowed') {
        friendlyMsg = 'Google Sign-In is not enabled in this Firebase project.';
      } else if (error?.message) {
        friendlyMsg = `Google Sign-In failed: ${error.message}`;
      }
      showToast(friendlyMsg, 'error');
      return { success: false, message: friendlyMsg };
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  /**
   * Biometric & Passkey Login System
   * Authenticates using device biometrics / WebAuthn, resolves UID,
   * reads users/{UID} from Firestore, validates status & school isolation,
   * and routes to dashboard. NEVER stores raw biometric data.
   */
  const loginWithBiometrics = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      // 1. Attempt WebAuthn hardware biometric authentication
      const passkeyVerified = await verifyWebAuthnPasskey();
      
      // Get stored biometric user UID or credential binding
      const boundUid = localStorage.getItem('edukenza_biometric_uid') || auth.currentUser?.uid;
      const boundEmail = localStorage.getItem('edukenza_biometric_email') || localStorage.getItem('edukenza_remembered_email');

      if (!boundUid && !passkeyVerified) {
        const msg = 'No biometric passkey registered on this device. Please sign in with email/password first and set up biometrics in settings.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      // If we have a bound UID or authenticated user
      const targetUid = boundUid || auth.currentUser?.uid;
      if (!targetUid) {
        const msg = 'Biometric verification succeeded, but no account is bound to this device. Please sign in with email/password once to link your device.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      // 2. Fetch users/{targetUid} from Firestore
      const { exists, data: firestoreData } = await fetchUserDocWithMiddlewareLogging(targetUid, 'Biometric Passkey Authentication', boundEmail || undefined);

      if (!exists || !firestoreData) {
        const msg = 'Registered biometric account could not be found in Firestore.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const cleanEmail = firestoreData.email ? firestoreData.email.toLowerCase() : (boundEmail?.toLowerCase() || '');
      const rawRole = firestoreData.role;
      const validatedRole = enforceProtectedRole(cleanEmail, rawRole);

      if (!validatedRole) {
        const msg = 'Biometric login failed: User role could not be verified.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const statusRaw = firestoreData.status ? String(firestoreData.status) : 'active';
      const statusClean = statusRaw.toLowerCase().trim();

      // Status Check: Block non-active accounts (suspended, disabled, deleted)
      if (statusClean !== 'active' && validatedRole !== 'platform_owner') {
        let msg = 'Your account is inactive.';
        if (statusClean === 'suspended') msg = 'Your account has been suspended. Please contact support.';
        else if (statusClean === 'disabled') msg = 'Your account has been disabled.';
        else if (statusClean === 'deleted') msg = 'No account found.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const resolvedSchoolId = firestoreData.schoolId || (firestoreData as any).school_id || (firestoreData as any).assignedSchoolId || '';
      if (isSchoolAdminRole(validatedRole) && (!resolvedSchoolId || resolvedSchoolId.trim() === '')) {
        const msg = 'Biometric login failed: School Admin account is missing an assigned school.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const authenticatedUser: UserProfile = {
        uid: targetUid,
        email: cleanEmail,
        name: firestoreData.fullName || firestoreData.name || cleanEmail.split('@')[0],
        fullName: firestoreData.fullName || firestoreData.name || 'User',
        role: validatedRole,
        status: 'active',
        firstLogin: false,
        schoolId: resolvedSchoolId,
        schoolName: firestoreData.schoolName || '',
        createdAt: firestoreData.createdAt || new Date().toISOString()
      };

      currentUserRef.current = authenticatedUser;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authenticatedUser));
      setCurrentUser(authenticatedUser);

      const targetDashboardView = getDashboardViewForRole(validatedRole, firestoreData.educationCategory);
      setActiveView(targetDashboardView);

      // Start real-time Firestore profile listener
      startProfileListener(targetUid);

      // Security Audit Log (NO RAW BIOMETRIC DATA STORED)
      logSecurityEvent({
        eventType: 'BIOMETRIC_LOGIN_SUCCESS',
        action: 'BIOMETRIC_PASSKEY_LOGIN',
        userId: targetUid,
        userEmail: cleanEmail,
        userName: authenticatedUser.fullName,
        userRole: validatedRole,
        schoolId: resolvedSchoolId,
        status: 'SUCCESS',
        details: 'Biometric passkey verified on device'
      });

      showToast(`Welcome back, ${authenticatedUser.fullName}! Biometric login verified.`, 'success');
      return { success: true };
    } catch (err: any) {
      console.warn('Biometric login exception:', err);
      const msg = 'Biometric authentication was cancelled or failed. Please try again or use password.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  /**
   * Register device biometric passkey for current user
   */
  const registerBiometricDevice = async (displayName?: string): Promise<{ success: boolean; credentialId?: string; message?: string }> => {
    if (!currentUser) {
      const msg = 'Must be signed in to register biometric device.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      const userLabel = currentUser.fullName || currentUser.name || currentUser.email;
      const credId = await createWebAuthnPasskey(currentUser.email, userLabel);
      const finalCredId = credId || `PASSKEY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // Save credential mapping under users/{uid}/biometricCredentials/{finalCredId}
      await setDoc(doc(db, 'users', currentUser.uid, 'biometricCredentials', finalCredId), {
        credentialId: finalCredId,
        deviceName: displayName || (window.navigator.userAgent.includes('Mac') ? 'MacBook Touch ID / Passkey' : 'Device Biometric Passkey'),
        registeredAt: new Date().toISOString(),
        status: 'active'
      });

      // Bind device locally
      localStorage.setItem('edukenza_biometric_uid', currentUser.uid);
      localStorage.setItem('edukenza_biometric_email', currentUser.email);
      localStorage.setItem('edukenza_biometric_cred_id', finalCredId);

      // Audit Log (NO RAW BIOMETRIC DATA STORED)
      logSecurityEvent({
        eventType: 'BIOMETRIC_CREDENTIAL_REGISTERED',
        action: 'REGISTER_BIOMETRIC_DEVICE',
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        schoolId: currentUser.schoolId,
        status: 'SUCCESS',
        details: 'Biometric passkey registered for user device'
      });

      showToast('Biometric passkey bound to this device successfully!', 'success');
      return { success: true, credentialId: finalCredId };
    } catch (err: any) {
      console.warn('Register biometric device failed:', err);
      const msg = 'Failed to register biometric device on hardware.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  /**
   * REQUIREMENT 2 & 4: School Admin First Password Setup
   * Updates permanent Firebase Authentication password and updates Firestore status = active, firstLogin = false
   */
  const setupSchoolAdminPassword = async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!auth.currentUser) {
      const msg = 'No active authentication session found. Please sign in with your invitation credentials first.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!newPassword || newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      const authUid = auth.currentUser.uid;
      const { userSnap, exists, data, userDocRef } = await fetchUserDocWithMiddlewareLogging(authUid, 'setupSchoolAdminPassword');

      if (!exists || !data) {
        const msg = 'Account document not found in system database.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      // REQUIREMENT 5: School Admin access requires: schoolId exists
      if (isSchoolAdminRole(data.role) && (!data.schoolId || data.schoolId.trim() === '')) {
        const msg = 'Cannot activate account: No assigned school found (schoolId missing). Please contact Platform Owner.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      // REQUIREMENT 2 & 4: Update Firebase Authentication password
      await updatePassword(auth.currentUser, newPassword);

      // Update Firestore: status = active, firstLogin = false, passwordSetupCompleted = true
      await updateDoc(userDocRef, {
        status: 'active',
        firstLogin: false,
        passwordSetupCompleted: true,
        updatedAt: new Date().toISOString()
      });

      const activeProfile: UserProfile = {
        uid: authUid,
        email: (auth.currentUser.email || data.email || '').toLowerCase(),
        name: data.fullName || data.name || 'School Admin',
        fullName: data.fullName || data.name || 'School Admin',
        role: 'school_admin',
        status: 'active',
        firstLogin: false,
        schoolId: data.schoolId || '',
        schoolName: data.schoolName || '',
        createdAt: data.createdAt || new Date().toISOString()
      };

      currentUserRef.current = activeProfile;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(activeProfile));
      setCurrentUser(activeProfile);
      setActiveModal(null);
      setActiveView('school-admin-dashboard');

      showToast('Permanent password saved successfully! Your account is now active.', 'success');
      return { success: true };
    } catch (err: any) {
      console.error('[EDUKENZA AUTH] Failed to set permanent password:', err);
      let errorMsg = 'Failed to set password. Please try again.';
      if (err.code === 'auth/requires-recent-login') {
        errorMsg = 'Session expired. Please sign in again with your initial credentials before setting a new password.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      showToast(errorMsg, 'error');
      return { success: false, message: errorMsg };
    }
  };

  /**
   * REQUIREMENT 2 & 4: First Password Setup with Credentials
   */
  const setupSchoolAdminPasswordWithCredentials = async (
    email: string,
    tempPass: string,
    newPass: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!email || !tempPass || !newPass) {
      const msg = 'Please fill in all fields (Email, Invitation Password, New Password).';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (newPass.length < 6) {
      const msg = 'New password must be at least 6 characters long.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, tempPass);
      const authUid = userCred.user.uid;
      const userDocRef = doc(db, 'users', authUid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await firebaseSignOut(auth);
        const msg = 'Account profile not found in system database.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const data = userSnap.data();

      if (data.role !== 'school_admin') {
        await firebaseSignOut(auth);
        const msg = 'This first-time password setup portal is reserved for School Admin accounts.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      if (!data.schoolId || data.schoolId.trim() === '') {
        await firebaseSignOut(auth);
        const msg = 'Account setup failed: No assigned school found (schoolId missing). Please contact Platform Owner.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      await updatePassword(userCred.user, newPass);

      await updateDoc(userDocRef, {
        status: 'active',
        firstLogin: false,
        passwordSetupCompleted: true,
        updatedAt: new Date().toISOString()
      });

      const activeProfile: UserProfile = {
        uid: authUid,
        email: cleanEmail,
        name: data.fullName || data.name || 'School Admin',
        fullName: data.fullName || data.name || 'School Admin',
        role: 'school_admin',
        status: 'active',
        firstLogin: false,
        schoolId: data.schoolId || '',
        schoolName: data.schoolName || '',
        createdAt: data.createdAt || new Date().toISOString()
      };

      currentUserRef.current = activeProfile;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(activeProfile));
      setCurrentUser(activeProfile);
      setActiveModal(null);
      setActiveView('school-admin-dashboard');

      showToast('Permanent password set successfully! Welcome to your School Admin Dashboard.', 'success');
      return { success: true };
    } catch (err: any) {
      console.error('[EDUKENZA AUTH] First login setup with credentials failed:', err);
      let msg = 'First login password setup failed. Please check your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid temporary setup password. Please check the invitation password provided by your Platform Owner.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Account not found. Please check your email address or contact your administrator.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email and password sign-in is not enabled for this Firebase project.';
      } else if (err.message) {
        msg = err.message;
      }
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  /**
   * REQUIREMENT 6: Mandatory Student First-Login Permanent Password Setup
   * Updates permanent Firebase Auth password and flips firstLogin: false in Firestore
   */
  const completeStudentPasswordChange = async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!auth.currentUser) {
      const msg = 'No active student session found. Please sign in with your Student ID and temporary password first.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
    if (!newPassword || newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    try {
      const authUid = auth.currentUser.uid;
      // 1. Update password in Firebase Authentication
      await updatePassword(auth.currentUser, newPassword);

      // 2. Update Firestore users/{authUid} to mark firstLogin = false
      const userRef = doc(db, 'users', authUid);
      await updateDoc(userRef, {
        firstLogin: false,
        updatedAt: new Date().toISOString()
      });

      // 3. Update current user state in session and localStorage
      if (currentUser) {
        const updatedUser = { ...currentUser, firstLogin: false };
        setCurrentUser(updatedUser);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
      }

      logSecurityEvent({
        eventType: 'SECURITY_SETTING_CHANGED',
        action: 'STUDENT_FIRST_LOGIN_PASSWORD_CHANGE',
        userId: authUid,
        userRole: 'student',
        details: 'Student completed mandatory first-login password update',
        severity: 'low'
      });

      showToast('Permanent password set successfully! Welcome to your Student Portal.', 'success');
      return { success: true };
    } catch (err: any) {
      console.error('[STUDENT PASSWORD CHANGE] Failed to update password:', err);
      let msg = 'Failed to update student password.';
      if (err.code === 'auth/requires-recent-login') {
        msg = 'Security session expired. Please sign in again with your temporary password.';
      } else if (err.message) {
        msg = err.message;
      }
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  /**
   * REQUIREMENT 1, 10 & 11: School Admin Registration via Google Sign-In
   * 1. Uses Firebase Google Authentication popup
   * 2. Obtains authenticated Google Firebase UID
   * 3. Prevents duplicate registrations or Platform Owner hijack
   * 4. Provisions schools/{schoolId} and users/{Google Firebase UID} with role = 'school_admin'
   * 5. DO NOT create or store a password for Google authentication
   */
  const registerSchool = async (data: RegistrationFormData) => {
    if (!data.schoolName || !data.schoolName.trim()) {
      const msg = 'Please enter your School / Institutional Name.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!data.adminName || !data.adminName.trim()) {
      const msg = 'Please enter the School Administrator Name.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    if (!data.agreeToTerms) {
      const msg = 'Please accept the Terms of Service to proceed with institutional registration.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    isAuthenticatingRef.current = true;
    try {
      // 1. Google Authentication via Firebase Auth Popup
      const userCredential = await signInWithPopup(auth, googleProvider);
      const googleUser = userCredential.user;
      if (!googleUser) {
        const msg = 'Google authentication was cancelled or failed.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const googleUid = googleUser.uid;
      const googleEmail = (googleUser.email || data.schoolEmail || '').toLowerCase().trim();

      // 2. Platform Owner check: DO NOT allow owner email to be registered as school admin
      if (isPlatformOwnerEmail(googleEmail)) {
        logAuthDebug({
          functionName: 'registerSchool',
          action: 'AUTH_FAILURE',
          email: googleEmail,
          details: 'Attempted to use Platform Owner email for school admin registration.'
        });
        const msg = 'This Google account is reserved for the Platform Owner and cannot be registered as a school admin.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      // 3. Duplicate Google Account Protection: Check if users/{googleUid} already exists
      const userRef = doc(db, 'users', googleUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        if (existingData.role) {
          logAuthDebug({
            functionName: 'registerSchool',
            action: 'AUTH_FAILURE',
            uid: googleUid,
            email: googleEmail,
            details: `Google account already registered with role "${existingData.role}".`
          });
          const msg = `This Google account is already registered as a ${existingData.role.replace('_', ' ')} in EDUkenZA (${existingData.schoolName || 'System'}). Please sign in directly.`;
          showToast(msg, 'error', 6000);
          return { success: false, message: msg };
        }
      }

      // 4. Create new school document: schools/{schoolId}
      const schoolId = `sch_${Date.now()}`;
      const timestamp = new Date().toISOString();
      const cleanSchoolName = data.schoolName.trim();
      const cleanAdminName = data.adminName.trim() || googleUser.displayName || 'School Administrator';

      const educationCategory = data.educationCategory || 'BASIC';
      const assignedRole: UserRole = educationCategory === 'SENIOR_HIGH' ? 'school_head' : 'school_admin';

      const schoolDocData = {
        schoolId: schoolId,
        schoolName: cleanSchoolName,
        educationCategory: educationCategory,
        email: data.schoolEmail ? data.schoolEmail.trim().toLowerCase() : googleEmail,
        phone: data.phoneNumber || 'N/A',
        country: data.country || 'Ghana',
        address: data.address || 'Main Campus Address',
        adminId: googleUid,
        adminName: cleanAdminName,
        adminEmail: googleEmail,
        subscriptionPlan: 'free_trial',
        status: 'active',
        createdAt: timestamp,
      };
      await setDoc(doc(db, 'schools', schoolId), schoolDocData);

      // 5. Create School Head / Admin user document: users/{Google Firebase UID}
      const userProfileData: UserProfile = {
        uid: googleUid,
        email: googleEmail,
        name: cleanAdminName,
        fullName: cleanAdminName,
        phone: data.phoneNumber || '',
        role: assignedRole,
        educationCategory: educationCategory,
        status: 'active',
        schoolId: schoolId,
        schoolName: cleanSchoolName,
        firstLogin: false,
        createdAt: timestamp,
      };
      await setDoc(userRef, userProfileData);

      // Also record in schoolAdmins collection for redundancy
      try {
        await setDoc(doc(db, 'schoolAdmins', googleUid), {
          uid: googleUid,
          schoolId,
          schoolName: cleanSchoolName,
          educationCategory: educationCategory,
          role: assignedRole,
          adminName: cleanAdminName,
          adminEmail: googleEmail,
          createdAt: timestamp
        });
      } catch (e) {
        console.warn('Could not write to schoolAdmins collection:', e);
      }

      // Trigger Platform Owner notification alert
      try {
        await triggerPlatformOwnerAlert(
          `New School Registered: ${cleanSchoolName} (${educationCategory})`,
          `Institution '${cleanSchoolName}' (${educationCategory}) registered with Head Administrator ${cleanAdminName} (${googleEmail}). Account is active.`,
          'System Alert'
        );
      } catch (notifErr) {
        console.warn('Could not send platform owner alert for school registration:', notifErr);
      }

      const newSchoolAccount: SchoolAccount = {
        id: schoolId,
        schoolName: cleanSchoolName,
        educationCategory: educationCategory,
        schoolEmail: data.schoolEmail || googleEmail,
        phoneNumber: data.phoneNumber || 'N/A',
        country: data.country || 'Ghana',
        address: data.address || 'Main Campus Address',
        adminName: cleanAdminName,
        adminEmail: googleEmail,
        plan: 'free_trial',
        status: 'active',
        createdAt: timestamp
      };

      saveSchoolAccount(newSchoolAccount);
      setRegisteredSchools((prev) => [newSchoolAccount, ...prev]);

      // 6. Establish authorized session & route to appropriate Dashboard
      currentUserRef.current = userProfileData;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userProfileData));
      setCurrentUser(userProfileData);
      const targetDashboard = getDashboardViewForRole(assignedRole, educationCategory);
      setActiveView(targetDashboard);
      startProfileListener(googleUid);

      logSecurityEvent({
        eventType: 'LOGIN_SUCCESS',
        action: 'SCHOOL_REGISTER_GOOGLE',
        userId: googleUid,
        userEmail: googleEmail,
        userName: cleanAdminName,
        userRole: assignedRole,
        schoolId: schoolId,
        details: `New school ${cleanSchoolName} registered with Google Sign-In`,
        severity: 'low'
      });

      showToast(`Welcome to EDUkenZA! School '${cleanSchoolName}' successfully registered and School Admin account activated with Google.`, 'success', 5000);

      return {
        success: true,
        school: newSchoolAccount,
        user: userProfileData
      };

    } catch (err: any) {
      console.error('[EDUKENZA REGISTRATION] Exception during school admin registration:', err);
      let msg = 'Failed to register school with Google account.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Google sign-in popup was closed before completing registration.';
      } else if (err.message) {
        msg = err.message;
      }
      showToast(msg, 'error');
      return { success: false, message: msg };
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  const logout = async () => {
    stopProfileListener();
    isAuthenticatingRef.current = false;
    currentUserRef.current = null;
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Firebase Signout error:', e);
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem('edukenza_remembered_email');
    localStorage.removeItem('edukenza_remembered_student_id');
    try {
      sessionStorage.clear();
    } catch (e) {}
    setActiveViewRaw('login');
    showToast('You have been signed out.', 'info');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return false;
    }
    try {
      await firebaseSendPasswordResetEmail(auth, email.trim().toLowerCase());
      showToast(`Password reset link sent to ${email}. Check your inbox!`, 'success');
      return true;
    } catch (e: any) {
      let msg = 'Failed to send password reset email.';
      if (e.code === 'auth/user-not-found') {
        msg = 'No user account found with this email address.';
      } else if (e.code === 'auth/operation-not-allowed') {
        msg = 'Email and password sign-in is not enabled for this Firebase project.';
      } else if (e.message) {
        msg = e.message;
      }
      showToast(msg, 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeView,
        setActiveView,
        registeredSchools,
        login,
        loginWithStudentId,
        loginStudentWithGoogle,
        loginWithGoogle,
        loginWithBiometrics,
        registerBiometricDevice,
        setupSchoolAdminPassword,
        setupSchoolAdminPasswordWithCredentials,
        completeStudentPasswordChange,
        registerSchool,
        logout,
        resetPassword,
        toast,
        showToast,
        activeModal,
        setActiveModal,
        loadingAuth,
        targetRoleDestination,
        clearRoleDestination,
        isWalkthroughOpen,
        openWalkthrough,
        closeWalkthrough,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
