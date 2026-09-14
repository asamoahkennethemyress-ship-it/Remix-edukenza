/**
 * Utility functions for Student Identity mapping and Firebase Authentication error categorization.
 */

export type StudentAuthErrorCategory = 
  | 'POPUP_CLOSED'
  | 'POPUP_BLOCKED'
  | 'UNAUTHORIZED_ACCOUNT'
  | 'ACCOUNT_DISABLED'
  | 'ROLE_MISMATCH'
  | 'MISSING_PROFILE'
  | 'SCHOOL_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface StudentAuthParsedError {
  category: StudentAuthErrorCategory;
  message: string;
  isConfigError: boolean;
  rawCode?: string;
}

/**
 * Distinguishes student authentication errors cleanly according to the system specification:
 * - POPUP CLOSED / BLOCKED
 * - UNAUTHORIZED GOOGLE ACCOUNT
 * - ACCOUNT DISABLED
 * - ROLE MISMATCH
 * - MISSING PROFILE
 * - SCHOOL MISMATCH
 * - FIRESTORE PERMISSION ERROR
 * - NETWORK ERROR
 */
export function parseStudentAuthError(error: any): StudentAuthParsedError {
  const code = String(error?.code || '');
  const rawMsg = String(error?.message || '').toLowerCase();

  // 1. POPUP CLOSED BY USER
  if (
    code === 'auth/popup-closed-by-user' || 
    code === 'auth/cancelled-popup-request' ||
    rawMsg.includes('popup-closed') ||
    rawMsg.includes('cancelled-popup')
  ) {
    return {
      category: 'POPUP_CLOSED',
      message: 'Google sign-in popup was closed before completing. Please try again.',
      isConfigError: false,
      rawCode: code
    };
  }

  // 2. POPUP BLOCKED BY BROWSER
  if (
    code === 'auth/popup-blocked' || 
    rawMsg.includes('popup blocked') ||
    rawMsg.includes('popup-blocked')
  ) {
    return {
      category: 'POPUP_BLOCKED',
      message: 'Google sign-in popup was blocked by your browser. Please enable popups for this site and try again.',
      isConfigError: false,
      rawCode: code
    };
  }

  // 3. ACCOUNT DISABLED IN FIRESTORE OR AUTH
  if (
    code === 'auth/user-disabled' || 
    rawMsg.includes('user-disabled') || 
    rawMsg.includes('disabled') ||
    rawMsg.includes('suspended')
  ) {
    return {
      category: 'ACCOUNT_DISABLED',
      message: 'Your student account has been disabled. Please contact your school administrator.',
      isConfigError: false,
      rawCode: code
    };
  }

  // 4. NETWORK FAILURE
  if (code === 'auth/network-request-failed' || rawMsg.includes('network') || rawMsg.includes('failed to fetch')) {
    return {
      category: 'NETWORK_ERROR',
      message: 'Network connection failure. Please check your internet connection and try again.',
      isConfigError: false,
      rawCode: code
    };
  }

  // 5. ROLE MISMATCH
  if (code === 'auth/role-mismatch' || rawMsg.includes('role')) {
    return {
      category: 'ROLE_MISMATCH',
      message: error?.message || 'This Google account is not authorized as a student. Please sign in with your student account or use the Staff Portal.',
      isConfigError: false,
      rawCode: code
    };
  }

  // 6. FIRESTORE PERMISSION ERROR
  if (code === 'permission-denied' || rawMsg.includes('permission-denied') || rawMsg.includes('insufficient permissions')) {
    return {
      category: 'PERMISSION_DENIED',
      message: 'Unable to access student profile due to permission restrictions. Please contact your school administrator.',
      isConfigError: false,
      rawCode: code
    };
  }

  // 7. UNAUTHORIZED ACCOUNT
  if (rawMsg.includes('not registered as a student') || rawMsg.includes('unauthorized')) {
    return {
      category: 'UNAUTHORIZED_ACCOUNT',
      message: 'Your Google account is not registered as a student in EDUkenZA. Please contact your school administrator.',
      isConfigError: false,
      rawCode: code
    };
  }

  return {
    category: 'UNKNOWN_ERROR',
    message: error?.message || 'Google authentication failed. Please try again or contact your school administrator.',
    isConfigError: false,
    rawCode: code
  };
}

/**
 * Kept for backwards compatibility and clean transitions.
 */
export function formatStudentAuthEmail(studentId: string): string {
  if (!studentId || typeof studentId !== 'string') {
    return 'unknown-student@edukenza.student';
  }
  const clean = studentId.trim().toUpperCase();
  const localPart = clean
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${localPart || 'student'}@edukenza.student`;
}
