export interface LogParams {
  functionName: string;
  action: 
    | 'USER_CREATION' 
    | 'USER_UPDATE' 
    | 'ROLE_ASSIGNMENT' 
    | 'LOGIN' 
    | 'FIRESTORE_READ' 
    | 'FIRESTORE_WRITE' 
    | 'FIRESTORE_DELETE'
    | 'AUTH_SUCCESS' 
    | 'AUTH_FAILURE' 
    | 'REDIRECT_DECISION';
  uid?: string | null;
  email?: string | null;
  role?: string | null;
  collectionName?: string | null;
  details?: string;
  error?: any;
}

/**
  Comprehensive Debug Logger for Authentication, User Management, and Firestore Writes.
  Provides explicit structured logging with UID, Email, Role, Collection, and Function.
 */
export function logAuthDebug(params: LogParams): void {
  const timestamp = new Date().toISOString();
  const uidStr = params.uid ? `UID: ${params.uid}` : 'UID: N/A';
  const emailStr = params.email ? `Email: ${params.email}` : 'Email: N/A';
  const roleStr = params.role ? `Role: ${params.role}` : 'Role: N/A';
  const colStr = params.collectionName ? `Collection: ${params.collectionName}` : 'Collection: N/A';
  const detailsStr = params.details ? `| Details: ${params.details}` : '';

  const formattedLog = `[EDUKENZA DEBUG ${timestamp}] [${params.action}] [Fn: ${params.functionName}] | ${uidStr} | ${emailStr} | ${roleStr} | ${colStr} ${detailsStr}`;

  if (params.error) {
    console.warn(`${formattedLog} | Error:`, params.error);
  } else {
    console.log(formattedLog);
  }
}
