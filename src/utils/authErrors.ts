/**
 * Centralized Firebase Authentication Error Diagnostics
 * Maps Firebase Auth error codes to precise, actionable, and user-friendly messages.
 */

export interface AuthDiagnosticResult {
  code: string;
  message: string;
  isConfigurationError: boolean;
  technicalDetails?: string;
}

export function parseAuthError(error: any): AuthDiagnosticResult {
  const code = error?.code || 'auth/unknown';
  const rawMessage = error?.message || '';

  let friendlyMessage = 'Authentication failed. Please verify your credentials and try again.';
  let isConfigurationError = false;

  switch (code) {
    case 'auth/operation-not-allowed':
      friendlyMessage = 'Email and password sign-in is not enabled for this Firebase project.';
      isConfigurationError = true;
      break;

    case 'auth/invalid-credential':
      friendlyMessage = 'Invalid email or password.';
      break;

    case 'auth/user-not-found':
      friendlyMessage = 'No account found with this email address.';
      break;

    case 'auth/wrong-password':
      friendlyMessage = 'Incorrect password.';
      break;

    case 'auth/user-disabled':
      friendlyMessage = 'Your account has been disabled. Please contact your administrator.';
      break;

    case 'auth/too-many-requests':
      friendlyMessage = 'Access temporarily disabled due to too many failed attempts. Please try again later.';
      break;

    case 'auth/network-request-failed':
      friendlyMessage = 'Unable to connect. Check your internet connection.';
      break;

    case 'auth/invalid-api-key':
      friendlyMessage = 'Firebase authentication is not configured correctly (Invalid API key).';
      isConfigurationError = true;
      break;

    case 'auth/app-not-authorized':
      friendlyMessage = 'Firebase authentication is not authorized for this domain.';
      isConfigurationError = true;
      break;

    case 'auth/configuration-not-found':
      friendlyMessage = 'Firebase authentication configuration was not found.';
      isConfigurationError = true;
      break;

    case 'auth/invalid-email':
      friendlyMessage = 'Please enter a valid email address.';
      break;

    case 'auth/weak-password':
      friendlyMessage = 'Password must be at least 6 characters long.';
      break;

    case 'auth/email-already-in-use':
      friendlyMessage = 'An account with this email address already exists.';
      break;

    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      friendlyMessage = 'Sign-in popup was closed before completing.';
      break;

    case 'auth/requires-recent-login':
      friendlyMessage = 'This operation requires recent authentication. Please log in again.';
      break;

    default:
      if (rawMessage.includes('operation-not-allowed')) {
        friendlyMessage = 'Email and password sign-in is not enabled for this Firebase project.';
        isConfigurationError = true;
      } else if (rawMessage) {
        friendlyMessage = rawMessage;
      }
      break;
  }

  return {
    code,
    message: friendlyMessage,
    isConfigurationError,
    technicalDetails: rawMessage !== friendlyMessage ? rawMessage : undefined
  };
}
