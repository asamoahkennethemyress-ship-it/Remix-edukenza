import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export type SecurityEventType = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'ROLE_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_ACTIVATED'
  | 'ACCOUNT_DEACTIVATED'
  | 'SENSITIVE_DATA_ACCESS'
  | 'BACKUP_CREATED'
  | 'RESTORE_EXECUTED'
  | 'SETTINGS_CHANGED'
  | 'SECURITY_SETTING_CHANGED'
  | 'BIOMETRIC_LOGIN_SUCCESS'
  | 'BIOMETRIC_CREDENTIAL_REGISTERED';

export interface SecurityEventPayload {
  eventType: SecurityEventType;
  action: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  schoolId?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details: string;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: string;
}

/**
 * Persists a security audit event to Firestore / auditLogs collection
 */
export async function logSecurityEvent(payload: SecurityEventPayload): Promise<void> {
  const timestamp = payload.timestamp || new Date().toISOString();
  const eventRecord = {
    ...payload,
    timestamp,
    platform: 'EDUkenZA SaaS',
    environment: 'production_hardened',
  };

  try {
    const logsRef = collection(db, 'auditLogs');
    await addDoc(logsRef, eventRecord);
    console.log(`[SECURITY AUDIT LOG] Recorded event "${payload.eventType}" (${payload.severity}) for ${payload.userEmail || payload.userId || 'system'}`);
  } catch (err) {
    console.warn(`[SECURITY AUDIT LOG WARNING] Failed to record audit log:`, err);
  }
}

/**
 * Rate Limiter and Brute-Force Login Tracker
 * Tracks failed login attempts per email in memory and localStorage
 */
const FAILED_LOGIN_STORAGE_KEY = 'edukenza_failed_login_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

interface FailedAttemptRecord {
  count: number;
  lastAttemptAt: string;
  lockedUntil?: string;
}

export function trackFailedLoginAttempt(email: string): { isLocked: boolean; remainingAttempts: number; lockedUntil?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };

  try {
    const raw = localStorage.getItem(FAILED_LOGIN_STORAGE_KEY);
    const records: Record<string, FailedAttemptRecord> = raw ? JSON.parse(raw) : {};
    const existing = records[cleanEmail] || { count: 0, lastAttemptAt: new Date().toISOString() };

    const now = new Date();

    // Check if previously locked out and lockout expired
    if (existing.lockedUntil && new Date(existing.lockedUntil) < now) {
      existing.count = 0;
      delete existing.lockedUntil;
    }

    existing.count += 1;
    existing.lastAttemptAt = now.toISOString();

    if (existing.count >= MAX_FAILED_ATTEMPTS) {
      const lockUntilDate = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      existing.lockedUntil = lockUntilDate.toISOString();

      // Log Security Alert
      logSecurityEvent({
        eventType: 'LOGIN_FAILED',
        action: 'BRUTE_FORCE_LOCKOUT_TRIGGERED',
        userEmail: cleanEmail,
        details: `Account temporarily locked due to ${existing.count} consecutive failed login attempts. Locked until ${lockUntilDate.toLocaleTimeString()}.`,
        severity: 'high'
      });
    }

    records[cleanEmail] = existing;
    localStorage.setItem(FAILED_LOGIN_STORAGE_KEY, JSON.stringify(records));

    const isLocked = Boolean(existing.lockedUntil && new Date(existing.lockedUntil) > now);
    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - existing.count);

    return {
      isLocked,
      remainingAttempts: remaining,
      lockedUntil: existing.lockedUntil
    };
  } catch (e) {
    console.error('Failed login tracking error:', e);
    return { isLocked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
}

export function clearFailedLoginAttempts(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return;

  try {
    const raw = localStorage.getItem(FAILED_LOGIN_STORAGE_KEY);
    if (!raw) return;
    const records: Record<string, FailedAttemptRecord> = JSON.parse(raw);
    if (records[cleanEmail]) {
      delete records[cleanEmail];
      localStorage.setItem(FAILED_LOGIN_STORAGE_KEY, JSON.stringify(records));
    }
  } catch (e) {
    console.error('Clear failed attempts error:', e);
  }
}

export function isAccountLockedDueToRateLimit(email: string): { isLocked: boolean; lockedUntil?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { isLocked: false };

  try {
    const raw = localStorage.getItem(FAILED_LOGIN_STORAGE_KEY);
    if (!raw) return { isLocked: false };
    const records: Record<string, FailedAttemptRecord> = JSON.parse(raw);
    const rec = records[cleanEmail];
    if (!rec || !rec.lockedUntil) return { isLocked: false };

    const now = new Date();
    if (new Date(rec.lockedUntil) > now) {
      return { isLocked: true, lockedUntil: rec.lockedUntil };
    } else {
      clearFailedLoginAttempts(cleanEmail);
      return { isLocked: false };
    }
  } catch (e) {
    return { isLocked: false };
  }
}
